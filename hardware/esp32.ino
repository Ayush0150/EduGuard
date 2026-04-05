/* ================================================================
   EduGuard ESP32 – Unified Classroom Firmware
   ----------------------------------------------------------------
   - All Arduino sensor/actuator logic runs directly on ESP32
   - RTC DS3231, PIR, Gas sensor, Buttons, LEDs, Buzzer
   - WiFi auto-reconnect (non-blocking)
   - Persistent WebSocket to backend with heartbeat
   - Structured JSON telemetry (arduino/device/wifi/gsm/esp)
   - Two-way control: dashboard ↔ ESP32 with ack
   - Anti-spam SMS latch with missed-call on emergency
   - Full button debouncing (40 ms)
   - 10-sample gas averaging for noise immunity
   - Direct-drive buzzer: proven fast siren + bell pattern
   - Throttled gas reads (every 250 ms)
   - Zero blocking delays — socketAwareWait() everywhere
   - WDT protected, anti-recursion guarded
   - Full remote settings via dashboard WebSocket commands
   ================================================================ */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Wire.h>
#include "RTClib.h"
#include "esp_system.h"
#include "esp_task_wdt.h"
#include "esp_idf_version.h"
#include <Preferences.h>
#include <cstring>

/* ================ PIN MAPPING ================ */
#define PIR_PIN          27
#define MANUAL_BTN       14
#define AC_BTN           12
#define EM_BTN           13
#define TEACHER_LED      25
#define SYSTEM_LED       33
#define AC_LED           18
#define EM_LED           19
#define GAS_SENSOR       34
#define BUZZER           26
#define SIM_TX           4
#define SIM_RX           5

/* ================ NETWORK CONFIGURATION ================ */
const char* ssid       = "POCO M2";
const char* password   = "ayush@0150";
const char* ws_host    = "172.23.173.105";
const uint16_t ws_port = 8080;

#define FW_VERSION       "6.0.0-SETTINGS"
#define WDT_TIMEOUT      10

/* ================ CONFIGURABLE SETTINGS (runtime-mutable) ================ */
/* Phone numbers — per alert type */
char phoneEmergency[16]  = "9260963100";
char phoneAbsent[16]     = "9260963100";
char phoneWashroom[16]   = "9260963100";
char phoneAC[16]         = "9260963100";

/* Timing (milliseconds stored internally) */
unsigned long cfgPeriodDuration = 60000UL;   // default 60 s
unsigned long cfgGraceDuration  = 10000UL;   // default 10 s
unsigned long cfgCallDuration   = 5000UL;    // default 5  s

/* Sensor thresholds */
int cfgGasHigh = 3000;

/* Schedule */
int cfgTotalPeriods = 10;

/* Classroom identity */
char cfgClassroom[8] = "706";

/* Feature toggles */
bool cfgHwEnabled   = true;
bool cfgGsmEnabled  = true;
bool cfgCallEnabled = true;

/* Emergency buzzer duration (milliseconds) */
unsigned long cfgEmBuzzerDuration = 5000UL;   // default 5 s

/* Auto reboot (daily) */
bool cfgAutoReboot   = false;
int  cfgAutoRebootH  = 3;   // hour (0-23)
int  cfgAutoRebootM  = 0;   // minute (0-59)
bool autoRebootDone  = false; // latch so we only reboot once per minute

/* SMS templates — customisable via dashboard, placeholders: {room} {time} {period} {gas} {date} */
char smsTplEmergency[161] = "EMERGENCY Room {room}";
char smsTplAbsent[161]    = "Teacher Absent {room}";
char smsTplAC[161]        = "AC Req Room {room}";
char smsTplWashroom[161]  = "Washroom Dirty {room}";

/* ================ FIXED TIMING CONSTANTS ================ */
#define PIR_STABLE_TIME      120UL
#define PIR_IGNORE_TIME      300UL
#define ACTIVE_DURATION      5000UL
#define SMS_ACK_TIMEOUT      5000UL
#define DEBOUNCE_TIME        40UL

#define BELL_ON_TIME         150UL
#define BELL_GAP_TIME        400UL
#define SIREN_INTERVAL       80UL
#define WASH_SMS_COOLDOWN    20000UL   /* 20 s gas SMS cooldown */

#define WIFI_RETRY_INTERVAL  5000UL
#define GSM_CHECK_INTERVAL   60000UL
#define WIFI_HEALTH_INTERVAL 15000UL
#define GSM_HEALTH_INTERVAL  10000UL
#define ESP_HEALTH_INTERVAL  1000UL



/* ================ SENSOR CONSTANTS ================ */
#define GAS_SAMPLES          10
#define GAS_READ_INTERVAL    250UL
#define GAS_HIGH_CONFIRM     5000UL    /* gas must stay HIGH 5 s before trigger */
#define GAS_LOW_CONFIRM      10000UL   /* gas must stay LOW 10 s before unlatch */
#define GAS_WARMUP_TIME      30000UL   /* 30 s warm-up after boot — ignore gas readings */

/* ================ STATE OBJECTS ================ */
RTC_DS3231 rtc;
WebSocketsClient webSocket;
HardwareSerial sim800(1);

/* ================ STATE VARIABLES ================ */
unsigned long bootTime        = 0;
unsigned long periodStart    = 0, lastTelemetry = 0;
unsigned long acStart        = 0, emStart       = 0, dirtyStart  = 0, absentStart = 0;
unsigned long bellLast       = 0, sirenLast     = 0;
unsigned long lastWiFiCheck  = 0, lastGsmRecheck = 0;
unsigned long lastWifiHealth = 0, lastGsmHealth  = 0, lastEspHealth = 0;
unsigned long pirHighStart   = 0, callStartTime  = 0;

unsigned long smsSentToday = 0;
unsigned long smsSentMonth = 0;
int smsCounterYear = 0;
int smsCounterMonth = 0;
bool smsDailyResetDone = false;

uint32_t minFreeHeap    = 0xFFFFFFFF;
uint16_t wifiReconnects = 0;
int  currentGasValue    = 0;
int  periodNumber       = 1, periodTime = 0, bellToggles = 0;

bool teacherPresent = false, teacherLocked   = false;
bool teacherConfirmed = false, teacherAbsentPulse = false;

bool acActive  = false, emActive  = false, bellActive = false;
bool acPulse   = false, emPulse   = false;
bool dirtyActive = false, washLatched = false;

bool rtcOk      = true,  wsConnected  = false;
bool gsmReady   = false, buzzerState  = false;
bool deviceInfoSent = false, callInProgress = false;
bool configSynced   = false;   // send config once after WS connect
bool templatesSynced = false;  // send SMS templates once after WS connect

unsigned long lastGasRead = 0;

/* Button debounce (from Arduino) */
bool acReady      = true, emReady      = true, manualReady     = true;
unsigned long acDebounce = 0, emDebounce = 0, manualDebounce = 0;

/* Anti-recursion guard */
bool inLogic = false;

/* Alert flags */
bool pendingAcSms  = false, pendingEmSms   = false, pendingEmCall   = false;
bool pendingWashSms = false, pendingAbsentSms = false;
bool emSmsSent      = false;  /* latch: true once SMS sent/abandoned for this emergency press */

/* Per-period SMS latches */
bool absentLatched = false;
unsigned long washLastSmsAt = 0;   /* cooldown: last washroom SMS timestamp */

char jsonBuf[768];

/* NVS Preferences for persistent settings */
Preferences prefs;

/* =========================================================
   FORWARD DECLARATIONS
   ========================================================= */
void runClassroomLogic();
void sendTelemetry();

inline bool emergencyPending() {
    return pendingEmSms || pendingEmCall || emActive;
}

void markSmsSuccess() {
    if (rtcOk) {
        DateTime t = rtc.now();
        int y = t.year();
        int m = t.month();
        if (smsCounterYear == 0 || smsCounterMonth == 0) {
            smsCounterYear = y;
            smsCounterMonth = m;
        } else if (y != smsCounterYear || m != smsCounterMonth) {
            smsCounterYear = y;
            smsCounterMonth = m;
            smsSentMonth = 0;
        }
    }

    smsSentToday++;
    smsSentMonth++;

    /* Persist counters to NVS so they survive reboot / re-upload */
    prefs.begin("eduguard", false);
    prefs.putULong("smsDay",  smsSentToday);
    prefs.putULong("smsMon",  smsSentMonth);
    prefs.putInt("smsCY",     smsCounterYear);
    prefs.putInt("smsCM",     smsCounterMonth);
    prefs.end();
}

void updateSmsCounterResets() {
    if (!rtcOk) return;

    DateTime t = rtc.now();
    int y = t.year();
    int m = t.month();
    int hh = t.hour();
    int mm = t.minute();

    if (smsCounterYear == 0 || smsCounterMonth == 0) {
        smsCounterYear = y;
        smsCounterMonth = m;
    }

    if (y != smsCounterYear || m != smsCounterMonth) {
        smsCounterYear = y;
        smsCounterMonth = m;
        smsSentMonth = 0;
        smsDailyResetDone = false;
    }

    if (hh == 23 && mm == 59) {
        if (!smsDailyResetDone) {
            smsSentToday = 0;
            smsDailyResetDone = true;
        }
    } else {
        smsDailyResetDone = false;
    }
}

/* =========================================================
   UTILITY — Non-blocking aware helpers
   ========================================================= */
void socketAwareWait(unsigned long ms) {
    unsigned long t = millis();
    while (millis() - t < ms) {
        webSocket.loop();
        runClassroomLogic();
        sendTelemetry();
        esp_task_wdt_reset();
        delay(1);
    }
}

bool smartFindAny(const char* target1, const char* target2, unsigned long timeout) {
    String buffer = "";
    unsigned long start = millis();
    while (millis() - start < timeout) {
        while (sim800.available()) {
            buffer += (char)sim800.read();
            if (buffer.length() > 256) {
                buffer.remove(0, buffer.length() - 256);
            }
        }
        if ((target1 != NULL && buffer.indexOf(target1) != -1) ||
            (target2 != NULL && buffer.indexOf(target2) != -1)) {
            return true;
        }
        webSocket.loop();
        runClassroomLogic();
        sendTelemetry();
        esp_task_wdt_reset();
        delay(1);
    }
    return false;
}

/* Full-response reader for GSM health queries */
void readSIM(char* out, size_t maxLen, unsigned long timeout) {
    size_t idx = 0;
    unsigned long t = millis();
    while (millis() - t < timeout && idx < maxLen - 1) {
        if (emergencyPending()) break;
        webSocket.loop();
        runClassroomLogic();
        sendTelemetry();
        esp_task_wdt_reset();
        while (sim800.available() && idx < maxLen - 1) {
            out[idx++] = sim800.read();
        }
        delay(1);
    }
    out[idx] = '\0';
}

void copyWsPayload(char* out, size_t outSize, const uint8_t* payload, size_t length) {
    if (outSize == 0) return;
    size_t n = length;
    if (n >= outSize) n = outSize - 1;
    memcpy(out, payload, n);
    out[n] = '\0';
}

bool extractFirstDigitLine(const char* src, char* dst, size_t dstSize) {
    if (!src || !dst || dstSize == 0) return false;

    const char* p = src;
    while (*p) {
        while (*p == '\r' || *p == '\n') p++;
        if (!*p) break;

        const char* lineStart = p;
        bool hasDigit = false;
        bool isSimple = true;

        while (*p && *p != '\r' && *p != '\n') {
            if (*p >= '0' && *p <= '9') {
                hasDigit = true;
            } else if (*p != ' ' && *p != ',') {
                isSimple = false;
            }
            p++;
        }

        if (hasDigit && isSimple) {
            size_t i = 0;
            const char* q = lineStart;
            while (q < p && i < dstSize - 1) {
                if (*q >= '0' && *q <= '9') {
                    dst[i++] = *q;
                }
                q++;
            }
            dst[i] = '\0';
            return i > 0;
        }
    }

    return false;
}

bool isValidGsmField(const char* value) {
    if (!value) return false;

    while (*value == ' ' || *value == '\t' || *value == '\r' || *value == '\n') value++;
    if (*value == '\0') return false;

    if (strcmp(value, "N/A") == 0 || strcmp(value, "NA") == 0 || strcmp(value, "ERROR") == 0) return false;
    if (strstr(value, "CME ERROR") || strstr(value, "CMS ERROR")) return false;

    return true;
}

void setIfValid(char* target, size_t targetSize, const char* candidate) {
    if (!target || targetSize == 0 || !candidate) return;
    if (!isValidGsmField(candidate)) return;
    strncpy(target, candidate, targetSize - 1);
    target[targetSize - 1] = '\0';
}

/* =========================================================
   GAS SENSOR — 10-sample average for stability
   ========================================================= */
int readGasAverage() {
    long sum = 0;
    for (int i = 0; i < GAS_SAMPLES; i++) {
        sum += analogRead(GAS_SENSOR);
        delayMicroseconds(100);
    }
    return sum / GAS_SAMPLES;
}

/* =========================================================
   SMS TEMPLATE RENDERER — replaces {room},{time},{period},{gas},{date}
   ========================================================= */
void renderTemplate(const char* tpl, char* out, size_t outSize) {
    size_t oi = 0;
    const char* p = tpl;
    while (*p && oi < outSize - 1) {
        if (*p == '{') {
            if (strncmp(p, "{room}", 6) == 0) {
                for (const char* r = cfgClassroom; *r && oi < outSize - 1; r++) out[oi++] = *r;
                p += 6; continue;
            }
            if (strncmp(p, "{time}", 6) == 0) {
                if (rtcOk) { DateTime t = rtc.now(); int w = snprintf(out + oi, outSize - oi, "%02d:%02d:%02d", t.hour(), t.minute(), t.second()); if (w > 0) oi += w; }
                p += 6; continue;
            }
            if (strncmp(p, "{period}", 8) == 0) {
                int w = snprintf(out + oi, outSize - oi, "%d", periodNumber);
                if (w > 0) oi += w;
                p += 8; continue;
            }
            if (strncmp(p, "{gas}", 5) == 0) {
                int w = snprintf(out + oi, outSize - oi, "%d", currentGasValue);
                if (w > 0) oi += w;
                p += 5; continue;
            }
            if (strncmp(p, "{date}", 6) == 0) {
                if (rtcOk) { DateTime t = rtc.now(); int w = snprintf(out + oi, outSize - oi, "%02d/%02d/%04d", t.day(), t.month(), t.year()); if (w > 0) oi += w; }
                p += 6; continue;
            }
        }
        out[oi++] = *p++;
    }
    out[oi] = '\0';
}

/* =========================================================
   GSM INTERFACE
   ========================================================= */
void checkGSM() {
    while (sim800.available()) { sim800.read(); }
    sim800.println("AT");
    gsmReady = smartFindAny("OK", NULL, 500);
}

bool execSMS(const char* msg, const char* phoneNum) {
    if (!gsmReady) return false;

    /* Flush any stale data from SIM800 serial buffer */
    while (sim800.available()) { sim800.read(); }

    sim800.println("AT+CMGF=1");
    if (!smartFindAny("OK", NULL, 500)) return false;

    sim800.printf("AT+CMGS=\"%s\"\r", phoneNum);
    if (!smartFindAny(">", NULL, 500)) return false;

    sim800.print(msg);
    sim800.write(26);

    return smartFindAny("+CMGS", "OK", SMS_ACK_TIMEOUT);
}

bool startEmergencyCall() {
    if (!gsmReady || callInProgress || !cfgCallEnabled) return false;

    while (sim800.available()) { sim800.read(); }
    sim800.println("AT");
    if (!smartFindAny("OK", NULL, 600)) return false;

    while (sim800.available()) { sim800.read(); }

    sim800.printf("ATD%s;\r", phoneEmergency);
    bool dialAccepted = smartFindAny("OK", "CONNECT", 2500);
    if (!dialAccepted) return false;

    callStartTime = millis();
    callInProgress = true;
    return true;
}

void processAlerts() {
    /* Skip all GSM operations when GSM is disabled */
    if (!cfgGsmEnabled) return;

    unsigned long now = millis();

    if (callInProgress && (millis() - callStartTime >= cfgCallDuration)) {
        sim800.println("ATH");
        smartFindAny("OK", NULL, 1000);   /* wait for hang-up ack */
        while (sim800.available()) { sim800.read(); }  /* flush */
        callInProgress = false;
        Serial.println("[CALL] Hung up after cfgCallDuration");
    }

    bool hasPendingAlert = pendingEmSms || pendingEmCall || pendingAcSms || pendingWashSms || pendingAbsentSms;
    if (!gsmReady && hasPendingAlert) {
        checkGSM();
    }

    if (!gsmReady) return;

    /* Emergency call starts only after emergency SMS phase is done */
    if (pendingEmCall && !pendingEmSms && !callInProgress) {
        if (!cfgCallEnabled) {
            pendingEmCall = false;
        } else {
            startEmergencyCall();
            pendingEmCall = false;
        }
        return;
    }

    /* Build dynamic SMS messages using templates */
    char smsMsg[161];

    /* One SMS transaction per loop to avoid long GSM monopolization */
    if (pendingEmSms) {
        /* Already sent for this activation — skip */
        if (emSmsSent) {
            pendingEmSms = false;
            return;
        }

        renderTemplate(smsTplEmergency, smsMsg, sizeof(smsMsg));

        if (execSMS(smsMsg, phoneEmergency)) {
            markSmsSuccess();
        } else {
            Serial.println("[SMS] Emergency SMS failed");
        }
        /* Latch after single attempt — no retries, no spam */
        pendingEmSms = false;
        emSmsSent    = true;
        if (cfgCallEnabled && !callInProgress) {
            pendingEmCall = true;
        }
        return;
    }

    if (pendingAbsentSms && teacherLocked) {
        pendingAbsentSms   = false;
        teacherAbsentPulse = false;
        absentLatched      = false;
        return;
    }

    if (pendingAbsentSms) {
        renderTemplate(smsTplAbsent, smsMsg, sizeof(smsMsg));
        if (execSMS(smsMsg, phoneAbsent)) markSmsSuccess();
        pendingAbsentSms = false;
        return;
    }

    if (pendingAcSms) {
        renderTemplate(smsTplAC, smsMsg, sizeof(smsMsg));
        if (execSMS(smsMsg, phoneAC)) markSmsSuccess();
        pendingAcSms = false;
        return;
    }

    if (pendingWashSms) {
        renderTemplate(smsTplWashroom, smsMsg, sizeof(smsMsg));
        if (execSMS(smsMsg, phoneWashroom)) markSmsSuccess();
        pendingWashSms = false;
        washLastSmsAt = millis();   /* start cooldown */
        return;
    }
}

/* =========================================================
   WIFI — Non-blocking reconnect
   ========================================================= */
void ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    wsConnected = false;

    if (millis() - lastWiFiCheck < WIFI_RETRY_INTERVAL) return;
    lastWiFiCheck = millis();

    WiFi.disconnect();
    WiFi.begin(ssid, password);
    wifiReconnects++;
}

/* =========================================================
   CLASSROOM LOGIC — Sensors + Actuators + Buzzer
   ========================================================= */
void runClassroomLogic() {
    if (inLogic) return;            /* Anti-recursion guard */
    inLogic = true;

    /* Skip all hardware logic when disabled */
    if (!cfgHwEnabled) {
        /* Make sure buzzer and LEDs are off when HW is disabled */
        digitalWrite(BUZZER, LOW);
        digitalWrite(TEACHER_LED, LOW);
        digitalWrite(AC_LED, LOW);
        digitalWrite(EM_LED, LOW);
        bellActive = false;
        emActive = false;
        acActive = false;
        inLogic = false;
        return;
    }

    unsigned long now = millis();
    periodTime = (now - periodStart) / 1000;

    updateSmsCounterResets();

    /* Throttled gas read — every 250 ms instead of every loop */
    if (now - lastGasRead >= GAS_READ_INTERVAL) {
        lastGasRead     = now;
        currentGasValue = readGasAverage();
    }

    /* --- Period Reset --- */
    if (now - periodStart >= cfgPeriodDuration) {
        periodNumber = (periodNumber % cfgTotalPeriods) + 1;
        periodStart  = now;
        periodTime   = 0;              /* recalculate — prevent stale value from triggering grace check */

        teacherPresent = teacherLocked = teacherConfirmed = teacherAbsentPulse = false;
        absentLatched  = false;
        pendingAbsentSms = false;
        digitalWrite(TEACHER_LED, LOW);

        bellActive  = true;
        bellToggles = periodNumber * 2;
        bellLast    = now;
        buzzerState = true;
        digitalWrite(BUZZER, HIGH);      /* Immediate first beep */
    }

    /* --- PIR Sensing (stable-time filter) --- */
    bool pirValid = false;
    if (!teacherPresent && !teacherConfirmed && !absentLatched) {
        if (digitalRead(PIR_PIN)) {
            if (pirHighStart == 0) pirHighStart = now;
            if (now - pirHighStart >= PIR_STABLE_TIME) pirValid = true;
        } else {
            pirHighStart = 0;
        }
    }

    /* --- Manual Button (debounced) --- */
    /* After grace-time absence is latched, physical button is ignored.
       Only the dashboard TEACHER_FORCE_PRESENT command can override. */
    if (!digitalRead(MANUAL_BTN) && manualReady && now - manualDebounce > DEBOUNCE_TIME && !absentLatched) {
        manualDebounce = now;
        manualReady    = false;
        teacherConfirmed = true;
        teacherPresent   = true;
        teacherLocked    = true;
        teacherAbsentPulse = false;
        pendingAbsentSms   = false;
        digitalWrite(TEACHER_LED, HIGH);
    }
    if (digitalRead(MANUAL_BTN)) manualReady = true;

    /* --- Teacher Logic --- */
    if (!teacherLocked) {
        if (pirValid || teacherConfirmed) {
            teacherPresent   = true;
            teacherConfirmed = true;
            teacherAbsentPulse = false;
            pendingAbsentSms   = false;
            absentLatched      = false;
            digitalWrite(TEACHER_LED, HIGH);
        }

        if (!teacherPresent && periodTime >= (int)(cfgGraceDuration / 1000)) {
            if (!absentLatched) {
                absentLatched      = true;
                teacherAbsentPulse = true;
                absentStart        = now;
                pendingAbsentSms   = true;
                teacherPresent     = false;
                teacherConfirmed   = false;
                pirHighStart       = 0;
                digitalWrite(TEACHER_LED, LOW);
            }
        }
    }

    if (teacherAbsentPulse && now - absentStart >= cfgGraceDuration)
        teacherAbsentPulse = false;

    /* --- AC Request (debounced, single-trigger while active) --- */
    if (!digitalRead(AC_BTN) && acReady && now - acDebounce > DEBOUNCE_TIME && !acActive) {
        acDebounce = now;
        acReady    = false;
        acActive   = acPulse = true;
        acStart    = now;
        digitalWrite(AC_LED, HIGH);
        pendingAcSms = true;
    }
    if (digitalRead(AC_BTN)) acReady = true;

    if (acActive && now - acStart >= ACTIVE_DURATION) {
        acActive = acPulse = false;
        digitalWrite(AC_LED, LOW);
    }

    /* --- Emergency Request (debounced, one SMS per press) --- */
    if (!digitalRead(EM_BTN) && emReady && now - emDebounce > DEBOUNCE_TIME) {
        emDebounce = now;
        emReady    = false;
        if (!emActive) {
            /* Fresh emergency — full activation */
            emActive   = emPulse = true;
            emStart    = now;
            sirenLast  = 0;              /* Force immediate first siren tone */
            digitalWrite(EM_LED, HIGH);
            pendingEmSms  = true;
            pendingEmCall = false;
            emSmsSent     = false;       /* Reset latch for new emergency */
            bellActive   = false;
            digitalWrite(BUZZER, LOW);       /* Stop any bell immediately */
        }
        /* No re-trigger — one SMS per press, no spam */
    }
    if (digitalRead(EM_BTN)) emReady = true;

    if (emActive && now - emStart >= cfgEmBuzzerDuration) {
        emActive = emPulse = false;
        emSmsSent = false;               /* Reset latch so next press can send */
        digitalWrite(EM_LED, LOW);
        digitalWrite(BUZZER, LOW);       /* Ensure buzzer stops with siren */
    }

    /* --- Gas Sensor (5 s high confirm, 10 s low confirm, 20 s SMS cooldown) --- */
    static unsigned long gasHighStart = 0;
    static unsigned long gasLowStart  = 0;

    /* Skip gas detection during 30 s warm-up period after boot */
    if (now - bootTime >= GAS_WARMUP_TIME) {

    bool washCooldownOk = (washLastSmsAt == 0) || (now - washLastSmsAt >= WASH_SMS_COOLDOWN);

    if (currentGasValue > cfgGasHigh) {
        gasLowStart = 0;                 /* reset low-side timer */
        if (gasHighStart == 0)
            gasHighStart = now;
        if (!washLatched && (now - gasHighStart >= GAS_HIGH_CONFIRM)) {
            washLatched    = true;
            dirtyActive    = true;
            dirtyStart     = now;
            if (washCooldownOk)
                pendingWashSms = true;   /* SMS only if cooldown elapsed */
        }
    } else {
        gasHighStart = 0;                /* gas dropped — reset high-side timer */
    }

    if (dirtyActive && now - dirtyStart >= ACTIVE_DURATION)
        dirtyActive = false;

    /* Unlatch only after gas stays below (threshold − 300) for 10 s continuously.
       Hysteresis: trigger at cfgGasHigh, reset at cfgGasHigh − 300 (e.g. 3000/2700). */
    int gasResetLevel = cfgGasHigh - 300;
    if (currentGasValue < gasResetLevel) {
        if (gasLowStart == 0)
            gasLowStart = now;
        if (washLatched && (now - gasLowStart >= GAS_LOW_CONFIRM)) {
            washLatched = false;
            gasHighStart = 0;            /* fully reset so next spike re-triggers */
        }
    } else {
        gasLowStart = 0;
    }

    } /* end warm-up guard */

    /* --- BUZZER CONTROL (direct-drive, matches proven Arduino pattern) --- */
    if (emActive) {
        /* Emergency siren — rapid toggling buzzer */
        if (now - sirenLast >= SIREN_INTERVAL) {
            sirenLast = now;
            buzzerState = !buzzerState;
            digitalWrite(BUZZER, buzzerState);
        }
    } else if (bellActive) {
        /* Use short ON + longer GAP so each beep is distinct and countable */
        unsigned long bellWait = buzzerState ? BELL_ON_TIME : BELL_GAP_TIME;
        if (now - bellLast >= bellWait) {
            bellLast = now;
            bellToggles--;
            if (bellToggles > 0) {
                buzzerState = !buzzerState;
                digitalWrite(BUZZER, buzzerState);
            } else {
                bellActive = false;
                digitalWrite(BUZZER, LOW);
            }
        }
    } else {
        digitalWrite(BUZZER, LOW);
    }

    inLogic = false;
}

/* =========================================================
   TELEMETRY — Classroom sensor payload (1 Hz)
   ========================================================= */
void sendTelemetry() {
    if (!wsConnected || millis() - lastTelemetry < 1000) return;
    lastTelemetry = millis();

    int h = 0, m = 0, s = 0;
    if (rtcOk) {
        DateTime t = rtc.now();
        h = t.hour(); m = t.minute(); s = t.second();
    }

    char payload[512];
    snprintf(payload, sizeof(payload),
      "class:%s,P:%d,PT:%d,TP:%d,AC:%d,EM:%d,GS:%d,T:%02d:%02d:%02d,"
      "isSystemActive:%s,isPresent:%s,isTeacherAbsent:%s,"
      "isACReq:%s,isEmergencyReq:%s,isWashroomDirty:%s",
      cfgClassroom,
      periodNumber, periodTime, teacherPresent, acActive, emActive, currentGasValue,
      h, m, s,
      (rtcOk && cfgHwEnabled) ? "true" : "false",
      teacherConfirmed ? "true" : "false",
      (periodTime < (int)(cfgGraceDuration / 1000) ? "null" : (absentLatched ? "true" : "false")),
      acPulse ? "true" : "false",
      emPulse ? "true" : "false",
      dirtyActive ? "true" : "false"
    );

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"arduino\",\"payload\":\"%s\"}",
      cfgClassroom, payload
    );
    webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   HEALTH — Device Info (sent once after connect)
   ========================================================= */
void sendDeviceInfo() {
    if (!wsConnected || deviceInfoSent) return;

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"device\","
      "\"payload\":\"firmware=%s,chip=%s,rev=%d,cores=%d,sdk=%s,mac=%s,flashMB=%u\"}",
      cfgClassroom,
      FW_VERSION,
      ESP.getChipModel(),
      ESP.getChipRevision(),
      ESP.getChipCores(),
      ESP.getSdkVersion(),
      WiFi.macAddress().c_str(),
      ESP.getFlashChipSize() / (1024 * 1024));

    if (webSocket.sendTXT(jsonBuf)) {
        deviceInfoSent = true;
        Serial.println("[INFO] Device info sent");
    }
}

/* =========================================================
   CONFIG SYNC — Send current settings to dashboard
   ========================================================= */
void sendConfigSync() {
    if (!wsConnected || configSynced) return;

    char payload[512];
    snprintf(payload, sizeof(payload),
      "hwEnabled=%s,gsmEnabled=%s,callEnabled=%s,"
      "phoneEmergency=%s,phoneAbsent=%s,phoneWashroom=%s,phoneAC=%s,"
      "periodDuration=%lu,graceDuration=%lu,callDuration=%lu,"
      "gasThreshold=%d,totalPeriods=%d,classroom=%s,"
      "emBuzzerDuration=%lu,autoReboot=%s,autoRebootH=%d,autoRebootM=%d",
      cfgHwEnabled   ? "true" : "false",
      cfgGsmEnabled  ? "true" : "false",
      cfgCallEnabled ? "true" : "false",
      phoneEmergency, phoneAbsent, phoneWashroom, phoneAC,
      cfgPeriodDuration / 1000,   /* send as seconds to dashboard */
      cfgGraceDuration  / 1000,
      cfgCallDuration   / 1000,
      cfgGasHigh,
      cfgTotalPeriods,
      cfgClassroom,
      cfgEmBuzzerDuration / 1000,
      cfgAutoReboot ? "true" : "false",
      cfgAutoRebootH,
      cfgAutoRebootM
    );

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"config\",\"payload\":\"%s\"}",
      cfgClassroom, payload
    );

    if (webSocket.sendTXT(jsonBuf)) {
        configSynced = true;
        Serial.println("[INFO] Config synced to dashboard");
    }
}

/* =========================================================
   SMS TEMPLATES SYNC — Send current templates to dashboard
   ========================================================= */
void sendSmsTemplatesSync() {
    if (!wsConnected || templatesSynced) return;

    /* Static buffers — keeps them off the stack to avoid stack overflow
       on the ESP32 loopTask (only 8 KB).  These are only touched here
       so static is safe even though they persist between calls. */
    static char tplPayload[700];
    snprintf(tplPayload, sizeof(tplPayload),
      "tplEmergency=%s|tplAbsent=%s|tplAC=%s|tplWashroom=%s",
      smsTplEmergency, smsTplAbsent, smsTplAC, smsTplWashroom);

    static char tplBuf[900];
    snprintf(tplBuf, sizeof(tplBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"smsTemplates\",\"payload\":\"%s\"}",
      cfgClassroom, tplPayload);

    if (webSocket.sendTXT(tplBuf)) {
        templatesSynced = true;
        Serial.println("[INFO] SMS templates synced");
    }
}

/* =========================================================
   PERSISTENT SETTINGS — NVS save / load
   ========================================================= */
void saveSettings() {
    prefs.begin("eduguard", false);   /* read-write */
    prefs.putString("phEm",     phoneEmergency);
    prefs.putString("phAbs",    phoneAbsent);
    prefs.putString("phWash",   phoneWashroom);
    prefs.putString("phAC",     phoneAC);
    prefs.putULong("periodDur", cfgPeriodDuration);
    prefs.putULong("graceDur",  cfgGraceDuration);
    prefs.putULong("callDur",   cfgCallDuration);
    prefs.putInt("gasHigh",     cfgGasHigh);
    prefs.putInt("totalPer",    cfgTotalPeriods);
    prefs.putString("classroom",cfgClassroom);
    prefs.putBool("hwEn",       cfgHwEnabled);
    prefs.putBool("gsmEn",      cfgGsmEnabled);
    prefs.putBool("callEn",     cfgCallEnabled);
    prefs.putULong("emBuzzDur", cfgEmBuzzerDuration);
    prefs.putBool("autoReb",    cfgAutoReboot);
    prefs.putInt("autoRebH",    cfgAutoRebootH);
    prefs.putInt("autoRebM",    cfgAutoRebootM);
    prefs.putString("tplEm",    smsTplEmergency);
    prefs.putString("tplAbs",   smsTplAbsent);
    prefs.putString("tplAC",    smsTplAC);
    prefs.putString("tplWash",  smsTplWashroom);
    prefs.putULong("smsDay",    smsSentToday);
    prefs.putULong("smsMon",    smsSentMonth);
    prefs.putInt("smsCY",       smsCounterYear);
    prefs.putInt("smsCM",       smsCounterMonth);
    prefs.end();
    Serial.println("[NVS] Settings saved");
}

void loadSettings() {
    prefs.begin("eduguard", true);   /* read-only */
    /* Only load if namespace has been written before (check a known key) */
    if (prefs.isKey("phEm")) {
        prefs.getString("phEm",     phoneEmergency, sizeof(phoneEmergency));
        prefs.getString("phAbs",    phoneAbsent,    sizeof(phoneAbsent));
        prefs.getString("phWash",   phoneWashroom,  sizeof(phoneWashroom));
        prefs.getString("phAC",     phoneAC,        sizeof(phoneAC));
        cfgPeriodDuration   = prefs.getULong("periodDur", cfgPeriodDuration);
        cfgGraceDuration    = prefs.getULong("graceDur",  cfgGraceDuration);
        cfgCallDuration     = prefs.getULong("callDur",   cfgCallDuration);
        cfgGasHigh          = prefs.getInt("gasHigh",     cfgGasHigh);
        cfgTotalPeriods     = prefs.getInt("totalPer",    cfgTotalPeriods);
        prefs.getString("classroom",cfgClassroom, sizeof(cfgClassroom));
        cfgHwEnabled        = prefs.getBool("hwEn",       cfgHwEnabled);
        cfgGsmEnabled       = prefs.getBool("gsmEn",      cfgGsmEnabled);
        cfgCallEnabled      = prefs.getBool("callEn",     cfgCallEnabled);
        cfgEmBuzzerDuration = prefs.getULong("emBuzzDur", cfgEmBuzzerDuration);
        cfgAutoReboot       = prefs.getBool("autoReb",    cfgAutoReboot);
        cfgAutoRebootH      = prefs.getInt("autoRebH",    cfgAutoRebootH);
        cfgAutoRebootM      = prefs.getInt("autoRebM",    cfgAutoRebootM);
        prefs.getString("tplEm",    smsTplEmergency, sizeof(smsTplEmergency));
        prefs.getString("tplAbs",   smsTplAbsent,    sizeof(smsTplAbsent));
        prefs.getString("tplAC",    smsTplAC,        sizeof(smsTplAC));
        prefs.getString("tplWash",  smsTplWashroom,  sizeof(smsTplWashroom));
        smsSentToday    = prefs.getULong("smsDay",  0);
        smsSentMonth    = prefs.getULong("smsMon",  0);
        smsCounterYear  = prefs.getInt("smsCY",     0);
        smsCounterMonth = prefs.getInt("smsCM",     0);
        Serial.println("[NVS] Settings loaded from flash");
    } else {
        Serial.println("[NVS] No saved settings — using defaults");
    }
    prefs.end();
}

/* =========================================================
   FACTORY RESET — Restore all settings to defaults + clear NVS
   ========================================================= */
void factoryReset() {
    /* Clear NVS first */
    prefs.begin("eduguard", false);
    prefs.clear();
    prefs.end();
    Serial.println("[NVS] Cleared");

    strncpy(phoneEmergency, "9260963100", sizeof(phoneEmergency));
    strncpy(phoneAbsent,    "9260963100", sizeof(phoneAbsent));
    strncpy(phoneWashroom,  "9260963100", sizeof(phoneWashroom));
    strncpy(phoneAC,        "9260963100", sizeof(phoneAC));
    cfgPeriodDuration = 60000UL;
    cfgGraceDuration  = 10000UL;
    cfgCallDuration   = 5000UL;
    cfgGasHigh        = 3000;
    cfgTotalPeriods   = 10;
    strncpy(cfgClassroom, "706", sizeof(cfgClassroom));
    cfgHwEnabled      = true;
    cfgGsmEnabled     = true;
    cfgCallEnabled    = true;
    cfgEmBuzzerDuration = 5000UL;
    cfgAutoReboot     = false;
    cfgAutoRebootH    = 3;
    cfgAutoRebootM    = 0;
    strncpy(smsTplEmergency, "EMERGENCY Room {room}", sizeof(smsTplEmergency));
    strncpy(smsTplAbsent,    "Teacher Absent {room}",  sizeof(smsTplAbsent));
    strncpy(smsTplAC,        "AC Req Room {room}",     sizeof(smsTplAC));
    strncpy(smsTplWashroom,  "Washroom Dirty {room}",  sizeof(smsTplWashroom));
    smsSentToday    = 0;
    smsSentMonth    = 0;
    smsCounterYear  = 0;
    smsCounterMonth = 0;
    Serial.println("[INFO] Factory reset — rebooting...");
    delay(500);
    ESP.restart();
}

/* =========================================================
   HEALTH — WiFi (15 s)
   ========================================================= */
void sendWifiHealth() {
    if (!wsConnected) return;
    if (millis() - lastWifiHealth < WIFI_HEALTH_INTERVAL) return;
    lastWifiHealth = millis();

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"wifi\","
      "\"payload\":\"rssi=%d,ip=%s,reconnects=%u,uptime=%lu,channel=%d,ssid=%s,mac=%s\"}",
      cfgClassroom,
      WiFi.RSSI(),
      WiFi.localIP().toString().c_str(),
      wifiReconnects,
      millis() / 1000,
      WiFi.channel(),
      WiFi.SSID().c_str(),
      WiFi.BSSIDstr().c_str());
    webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   HEALTH — GSM (10 s, detailed AT queries)
   ========================================================= */
void sendGsmHealth() {
    if (!wsConnected) return;
    /* Skip GSM health when GSM is disabled */
    if (!cfgGsmEnabled) return;
    if (callInProgress || pendingEmSms || pendingEmCall || pendingAcSms || pendingWashSms || pendingAbsentSms) return;
    if (millis() - lastGsmHealth < GSM_HEALTH_INTERVAL) return;
    lastGsmHealth = millis();

    static char lastSignal[16] = "N/A";
    static char lastOper[32]   = "N/A";
    static char lastBatt[16]   = "N/A";
    static char lastReg[8]     = "N/A";
    static char lastImei[20]   = "N/A";
    static char lastIccid[24]  = "N/A";
    static char lastSim[8]     = "N/A";
    static char lastNet[8]     = "N/A";

    char signal[16];
    char oper[32];
    char batt[16];
    char regStat[8];
    char imei[20];
    char iccid[24];
    char simStat[8];
    char netMode[8];
    char resp[128];
    char candidate[32];

    strncpy(signal, lastSignal, sizeof(signal) - 1); signal[sizeof(signal) - 1] = '\0';
    strncpy(oper,   lastOper,   sizeof(oper) - 1);   oper[sizeof(oper) - 1] = '\0';
    strncpy(batt,   lastBatt,   sizeof(batt) - 1);   batt[sizeof(batt) - 1] = '\0';
    strncpy(regStat,lastReg,    sizeof(regStat) - 1);regStat[sizeof(regStat) - 1] = '\0';
    strncpy(imei,   lastImei,   sizeof(imei) - 1);   imei[sizeof(imei) - 1] = '\0';
    strncpy(iccid,  lastIccid,  sizeof(iccid) - 1);  iccid[sizeof(iccid) - 1] = '\0';
    strncpy(simStat,lastSim,    sizeof(simStat) - 1);simStat[sizeof(simStat) - 1] = '\0';
    strncpy(netMode,lastNet,    sizeof(netMode) - 1);netMode[sizeof(netMode) - 1] = '\0';

    if (gsmReady) {
        /* Macro-like lambda: abort health check if emergency triggered mid-read.
           Flush serial so pending SMS starts with clean buffer. */
        #define GSM_HEALTH_BAIL() do { \
            if (emergencyPending()) { \
                while (sim800.available()) sim800.read(); \
                goto gsmHealthDone; \
            } \
        } while(0)

        /* Signal strength */
        sim800.println("AT+CSQ");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        char* p = strstr(resp, "+CSQ:");
        if (p) {
            p += 5; while (*p == ' ') p++;
            int i = 0;
            while (*p && *p != ',' && *p != '\r' && *p != '\n' && i < (int)sizeof(candidate) - 1) {
                if (*p >= '0' && *p <= '9') candidate[i++] = *p;
                p++;
            }
            candidate[i] = '\0';
            setIfValid(signal, sizeof(signal), candidate);
        }

        /* Operator + network mode */
        sim800.println("AT+COPS?");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        p = strstr(resp, "\"");
        if (p) {
            p++;
            int i = 0;
            while (*p && *p != '"' && i < (int)sizeof(candidate) - 1) candidate[i++] = *p++;
            candidate[i] = '\0';
            setIfValid(oper, sizeof(oper), candidate);
        }

        p = strstr(resp, "+COPS:");
        if (p) {
            int commas = 0;
            char* q = p;
            while (*q && *q != '\r' && *q != '\n') {
                if (*q == ',') commas++;
                if (commas == 3) {
                    q++;
                    switch (*q) {
                        case '0': setIfValid(netMode, sizeof(netMode), "GSM");  break;
                        case '2': setIfValid(netMode, sizeof(netMode), "3G");   break;
                        case '3': setIfValid(netMode, sizeof(netMode), "EDGE"); break;
                        case '7': setIfValid(netMode, sizeof(netMode), "LTE");  break;
                        default: break;
                    }
                    break;
                }
                q++;
            }
        }

        /* Battery */
        sim800.println("AT+CBC");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        p = strstr(resp, "+CBC:");
        if (p) {
            p += 5; while (*p == ' ') p++;
            int i = 0;
            while (*p && *p != '\r' && *p != '\n' && i < (int)sizeof(candidate) - 1) candidate[i++] = *p++;
            candidate[i] = '\0';
            setIfValid(batt, sizeof(batt), candidate);
        }

        /* Registration status */
        sim800.println("AT+CREG?");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        p = strstr(resp, "+CREG:");
        if (p) {
            p += 6; while (*p == ' ') p++;
            int i = 0;
            while (*p && *p != '\r' && *p != '\n' && i < (int)sizeof(candidate) - 1) candidate[i++] = *p++;
            candidate[i] = '\0';
            setIfValid(regStat, sizeof(regStat), candidate);
        }

        /* IMEI */
        sim800.println("AT+GSN");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        if (extractFirstDigitLine(resp, candidate, sizeof(candidate))) {
            setIfValid(imei, sizeof(imei), candidate);
        }

        /* ICCID */
        sim800.println("AT+CCID");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        if (extractFirstDigitLine(resp, candidate, sizeof(candidate))) {
            setIfValid(iccid, sizeof(iccid), candidate);
        }

        /* SIM status */
        sim800.println("AT+CPIN?");
        readSIM(resp, sizeof(resp), 1000);
        GSM_HEALTH_BAIL();
        p = strstr(resp, "+CPIN:");
        if (p) {
            p += 6; while (*p == ' ') p++;
            int i = 0;
            while (*p && *p != '\r' && *p != '\n' && i < (int)sizeof(candidate) - 1) candidate[i++] = *p++;
            candidate[i] = '\0';
            setIfValid(simStat, sizeof(simStat), candidate);
        }

        #undef GSM_HEALTH_BAIL
    }

gsmHealthDone:

    strncpy(lastSignal, signal, sizeof(lastSignal) - 1); lastSignal[sizeof(lastSignal) - 1] = '\0';
    strncpy(lastOper,   oper,   sizeof(lastOper) - 1);   lastOper[sizeof(lastOper) - 1] = '\0';
    strncpy(lastBatt,   batt,   sizeof(lastBatt) - 1);   lastBatt[sizeof(lastBatt) - 1] = '\0';
    strncpy(lastReg,    regStat,sizeof(lastReg) - 1);    lastReg[sizeof(lastReg) - 1] = '\0';
    strncpy(lastImei,   imei,   sizeof(lastImei) - 1);   lastImei[sizeof(lastImei) - 1] = '\0';
    strncpy(lastIccid,  iccid,  sizeof(lastIccid) - 1);  lastIccid[sizeof(lastIccid) - 1] = '\0';
    strncpy(lastSim,    simStat,sizeof(lastSim) - 1);    lastSim[sizeof(lastSim) - 1] = '\0';
    strncpy(lastNet,    netMode,sizeof(lastNet) - 1);    lastNet[sizeof(lastNet) - 1] = '\0';

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"gsm\","
            "\"payload\":\"signal=%s,operator=%s,battery=%s,reg=%s,imei=%s,iccid=%s,sim=%s,net=%s,gsmReady=%s,smsToday=%lu,smsMonth=%lu\"}",
      cfgClassroom,
      signal, oper, batt, regStat, imei, iccid, simStat, netMode,
            gsmReady ? "true" : "false",
            smsSentToday,
            smsSentMonth);
    webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   HEALTH — ESP internals (1 s)
   ========================================================= */
void sendEspHealth() {
    if (!wsConnected) return;
    if (millis() - lastEspHealth < ESP_HEALTH_INTERVAL) return;
    lastEspHealth = millis();

    int h = 0, m = 0, s = 0;
    if (rtcOk) {
        DateTime t = rtc.now();
        h = t.hour(); m = t.minute(); s = t.second();
    }

    uint32_t freeNow = ESP.getFreeHeap();
    if (freeNow < minFreeHeap) minFreeHeap = freeNow;

    esp_reset_reason_t reason = esp_reset_reason();

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-%s\",\"category\":\"esp\","
            "\"payload\":\"heap=%u,minHeap=%u,cpuMHz=%u,flashKB=%u,resetReason=%d,uptime=%lu,temp=%.1f,cores=%d,rssi=%d,time=%02d:%02d:%02d\"}",
      cfgClassroom,
      freeNow,
      minFreeHeap,
      ESP.getCpuFreqMHz(),
      ESP.getFlashChipSize() / 1024,
      (int)reason,
      millis() / 1000,
      temperatureRead(),
      ESP.getChipCores(),
            WiFi.RSSI(),
            h, m, s);
    webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   AUTO REBOOT — Check RTC against configured reboot time
   ========================================================= */
void checkAutoReboot() {
    if (!cfgAutoReboot || !rtcOk) return;

    DateTime t = rtc.now();
    int hh = t.hour();
    int mm = t.minute();

    if (hh == cfgAutoRebootH && mm == cfgAutoRebootM) {
        if (!autoRebootDone) {
            autoRebootDone = true;
            Serial.println("[INFO] Auto-reboot triggered");
            delay(200);
            ESP.restart();
        }
    } else {
        autoRebootDone = false;
    }
}

/* =========================================================
   WEBSOCKET EVENT HANDLER
   ========================================================= */
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    if (type == WStype_CONNECTED) {
        Serial.println("[WS] Connected");
        wsConnected    = true;
        deviceInfoSent = false;
        configSynced   = false;
        templatesSynced = false;
        snprintf(jsonBuf, sizeof(jsonBuf),
          "{\"type\":\"register\",\"device\":\"CLASSROOM-%s\"}", cfgClassroom);
        webSocket.sendTXT(jsonBuf);
    }
    else if (type == WStype_DISCONNECTED) {
        Serial.println("[WS] Disconnected");
        wsConnected    = false;
        deviceInfoSent = false;
        configSynced   = false;
        templatesSynced = false;
    }
    else if (type == WStype_TEXT) {
        char cmd[256];
        copyWsPayload(cmd, sizeof(cmd), payload, length);
        bool handled = false;

        /* ── Existing control commands ── */
        if (strstr(cmd, "AC_REQUEST")) {
            if (!acActive && cfgHwEnabled) {
                acActive = acPulse = true;
                acStart  = millis();
                digitalWrite(AC_LED, HIGH);
                pendingAcSms = true;
            }
            handled = true;
        }
        else if (strstr(cmd, "EMERGENCY_REQ")) {
            if (cfgHwEnabled && !emActive) {
                /* Fresh emergency — full activation */
                emActive = emPulse = true;
                emStart  = millis();
                sirenLast = 0;
                digitalWrite(EM_LED, HIGH);
                pendingEmSms  = true;
                pendingEmCall = false;
                emSmsSent     = false;
                bellActive = false;
                digitalWrite(BUZZER, LOW);
            }
            /* No re-trigger from WS — one SMS per activation */
            handled = true;
        }
        else if (strstr(cmd, "WASHROOM_REQUEST")) {
            if (!dirtyActive && cfgHwEnabled) {
                dirtyActive = true;
                dirtyStart  = millis();
                pendingWashSms = true;
            }
            handled = true;
        }
        else if (strstr(cmd, "TEACHER_FORCE_PRESENT")) {
            teacherConfirmed = teacherPresent = teacherLocked = true;
            teacherAbsentPulse = false;
            pendingAbsentSms   = false;
            absentLatched      = false;
            digitalWrite(TEACHER_LED, HIGH);
            handled = true;
        }

        /* ── Settings: Hardware Enable/Disable ── */
        else if (strstr(cmd, "HW_ENABLE")) {
            cfgHwEnabled = true;
            Serial.println("[CFG] Hardware ENABLED");
            handled = true;
        }
        else if (strstr(cmd, "HW_DISABLE")) {
            cfgHwEnabled = false;
            Serial.println("[CFG] Hardware DISABLED");
            handled = true;
        }

        /* ── Settings: GSM Enable/Disable ── */
        else if (strstr(cmd, "GSM_ENABLE")) {
            cfgGsmEnabled = true;
            Serial.println("[CFG] GSM ENABLED");
            handled = true;
        }
        else if (strstr(cmd, "GSM_DISABLE")) {
            cfgGsmEnabled = false;
            Serial.println("[CFG] GSM DISABLED");
            handled = true;
        }

        /* ── Settings: Missed Call Enable/Disable ── */
        else if (strstr(cmd, "CALL_ENABLE")) {
            cfgCallEnabled = true;
            Serial.println("[CFG] Missed call ENABLED");
            handled = true;
        }
        else if (strstr(cmd, "CALL_DISABLE")) {
            cfgCallEnabled = false;
            Serial.println("[CFG] Missed call DISABLED");
            handled = true;
        }

        /* ── Settings: Auto Reboot Enable/Disable ── */
        else if (strstr(cmd, "AUTO_REBOOT_ENABLE")) {
            cfgAutoReboot = true;
            autoRebootDone = false;
            Serial.println("[CFG] Auto-reboot ENABLED");
            handled = true;
        }
        else if (strstr(cmd, "AUTO_REBOOT_DISABLE")) {
            cfgAutoReboot = false;
            Serial.println("[CFG] Auto-reboot DISABLED");
            handled = true;
        }

        /* ── Settings: Phone Numbers ── */
        else if (strstr(cmd, "SET_PHONE_EMERGENCY:")) {
            char* val = strstr(cmd, "SET_PHONE_EMERGENCY:") + 20;
            char num[16]; int i = 0;
            while (*val && *val != '"' && *val != '}' && i < 15) {
                if (*val >= '0' && *val <= '9') num[i++] = *val;
                val++;
            }
            num[i] = '\0';
            if (i >= 10) {
                strncpy(phoneEmergency, num, sizeof(phoneEmergency) - 1);
                phoneEmergency[sizeof(phoneEmergency) - 1] = '\0';
                Serial.printf("[CFG] Phone Emergency: %s\n", phoneEmergency);
            }
            handled = true;
        }
        else if (strstr(cmd, "SET_PHONE_ABSENT:")) {
            char* val = strstr(cmd, "SET_PHONE_ABSENT:") + 17;
            char num[16]; int i = 0;
            while (*val && *val != '"' && *val != '}' && i < 15) {
                if (*val >= '0' && *val <= '9') num[i++] = *val;
                val++;
            }
            num[i] = '\0';
            if (i >= 10) {
                strncpy(phoneAbsent, num, sizeof(phoneAbsent) - 1);
                phoneAbsent[sizeof(phoneAbsent) - 1] = '\0';
                Serial.printf("[CFG] Phone Absent: %s\n", phoneAbsent);
            }
            handled = true;
        }
        else if (strstr(cmd, "SET_PHONE_WASHROOM:")) {
            char* val = strstr(cmd, "SET_PHONE_WASHROOM:") + 19;
            char num[16]; int i = 0;
            while (*val && *val != '"' && *val != '}' && i < 15) {
                if (*val >= '0' && *val <= '9') num[i++] = *val;
                val++;
            }
            num[i] = '\0';
            if (i >= 10) {
                strncpy(phoneWashroom, num, sizeof(phoneWashroom) - 1);
                phoneWashroom[sizeof(phoneWashroom) - 1] = '\0';
                Serial.printf("[CFG] Phone Washroom: %s\n", phoneWashroom);
            }
            handled = true;
        }
        else if (strstr(cmd, "SET_PHONE_AC:")) {
            char* val = strstr(cmd, "SET_PHONE_AC:") + 13;
            char num[16]; int i = 0;
            while (*val && *val != '"' && *val != '}' && i < 15) {
                if (*val >= '0' && *val <= '9') num[i++] = *val;
                val++;
            }
            num[i] = '\0';
            if (i >= 10) {
                strncpy(phoneAC, num, sizeof(phoneAC) - 1);
                phoneAC[sizeof(phoneAC) - 1] = '\0';
                Serial.printf("[CFG] Phone AC: %s\n", phoneAC);
            }
            handled = true;
        }

        /* ── Settings: Time Sync ── */
        else if (strstr(cmd, "SET_TIME:")) {
            char* val = strstr(cmd, "SET_TIME:") + 9;
            int hh = -1, mm = -1;
            char tbuf[6]; int ti = 0;
            while (*val && *val != '"' && *val != '}' && ti < 5) {
                tbuf[ti++] = *val++;
            }
            tbuf[ti] = '\0';
            if (sscanf(tbuf, "%d:%d", &hh, &mm) == 2 && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                if (rtcOk) {
                    DateTime now = rtc.now();
                    rtc.adjust(DateTime(now.year(), now.month(), now.day(), hh, mm, 0));
                    Serial.printf("[CFG] RTC set to %02d:%02d\n", hh, mm);
                }
            }
            handled = true;
        }

        /* ── Settings: Total Periods ── */
        else if (strstr(cmd, "SET_TOTAL_PERIODS:")) {
            char* val = strstr(cmd, "SET_TOTAL_PERIODS:") + 18;
            int v = atoi(val);
            if (v >= 1 && v <= 15) {
                cfgTotalPeriods = v;
                Serial.printf("[CFG] Total periods: %d\n", cfgTotalPeriods);
            }
            handled = true;
        }

        /* ── Settings: Period Duration (received in seconds) ── */
        else if (strstr(cmd, "SET_PERIOD_DURATION:")) {
            char* val = strstr(cmd, "SET_PERIOD_DURATION:") + 20;
            long v = atol(val);
            if (v >= 30 && v <= 7200) {
                cfgPeriodDuration = (unsigned long)v * 1000UL;
                Serial.printf("[CFG] Period duration: %lu ms\n", cfgPeriodDuration);
            }
            handled = true;
        }

        /* ── Settings: Gas Threshold ── */
        else if (strstr(cmd, "SET_GAS_THRESHOLD:")) {
            char* val = strstr(cmd, "SET_GAS_THRESHOLD:") + 18;
            int v = atoi(val);
            if (v >= 500 && v <= 5000) {
                cfgGasHigh = v;
                Serial.printf("[CFG] Gas threshold: %d\n", cfgGasHigh);
            }
            handled = true;
        }

        /* ── Settings: Grace Duration (received in seconds) ── */
        else if (strstr(cmd, "SET_GRACE_DURATION:")) {
            char* val = strstr(cmd, "SET_GRACE_DURATION:") + 19;
            long v = atol(val);
            if (v >= 5 && v <= 600) {
                cfgGraceDuration = (unsigned long)v * 1000UL;
                Serial.printf("[CFG] Grace duration: %lu ms\n", cfgGraceDuration);
            }
            handled = true;
        }

        /* ── Settings: Call Duration (received in seconds) ── */
        else if (strstr(cmd, "SET_CALL_DURATION:")) {
            char* val = strstr(cmd, "SET_CALL_DURATION:") + 18;
            long v = atol(val);
            if (v >= 1 && v <= 60) {
                cfgCallDuration = (unsigned long)v * 1000UL;
                Serial.printf("[CFG] Call duration: %lu ms\n", cfgCallDuration);
            }
            handled = true;
        }

        /* ── Settings: Classroom Number ── */
        else if (strstr(cmd, "SET_CLASSROOM:")) {
            char* val = strstr(cmd, "SET_CLASSROOM:") + 14;
            char room[8]; int i = 0;
            while (*val && *val != '"' && *val != '}' && *val != ' ' && i < 6) {
                room[i++] = *val++;
            }
            room[i] = '\0';
            if (i > 0) {
                strncpy(cfgClassroom, room, sizeof(cfgClassroom) - 1);
                cfgClassroom[sizeof(cfgClassroom) - 1] = '\0';
                Serial.printf("[CFG] Classroom: %s\n", cfgClassroom);
            }
            handled = true;
        }

        /* ── Settings: Auto Reboot Time ── */
        else if (strstr(cmd, "SET_AUTO_REBOOT_TIME:")) {
            char* val = strstr(cmd, "SET_AUTO_REBOOT_TIME:") + 21;
            int hh = -1, mm = -1;
            char tbuf[6]; int ti = 0;
            while (*val && *val != '"' && *val != '}' && ti < 5) {
                tbuf[ti++] = *val++;
            }
            tbuf[ti] = '\0';
            if (sscanf(tbuf, "%d:%d", &hh, &mm) == 2 && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
                cfgAutoRebootH = hh;
                cfgAutoRebootM = mm;
                autoRebootDone = false;
                Serial.printf("[CFG] Auto-reboot time: %02d:%02d\n", cfgAutoRebootH, cfgAutoRebootM);
            }
            handled = true;
        }

        /* ── Settings: Emergency Buzzer Duration (received in seconds) ── */
        else if (strstr(cmd, "SET_EM_BUZZER_DURATION:")) {
            char* val = strstr(cmd, "SET_EM_BUZZER_DURATION:") + 23;
            long v = atol(val);
            if (v >= 1 && v <= 120) {
                cfgEmBuzzerDuration = (unsigned long)v * 1000UL;
                Serial.printf("[CFG] EM buzzer duration: %lu ms\n", cfgEmBuzzerDuration);
            }
            handled = true;
        }

        /* ── Settings: SMS Templates ── */
        else if (strstr(cmd, "SET_SMS_TPL_EMERGENCY:")) {
            char* val = strstr(cmd, "SET_SMS_TPL_EMERGENCY:") + 22;
            if (strlen(val) > 0 && strlen(val) <= 160) {
                strncpy(smsTplEmergency, val, sizeof(smsTplEmergency) - 1);
                smsTplEmergency[sizeof(smsTplEmergency) - 1] = '\0';
                Serial.printf("[CFG] SMS tpl emergency: %s\n", smsTplEmergency);
            }
            handled = true;
        }
        else if (strstr(cmd, "SET_SMS_TPL_ABSENT:")) {
            char* val = strstr(cmd, "SET_SMS_TPL_ABSENT:") + 19;
            if (strlen(val) > 0 && strlen(val) <= 160) {
                strncpy(smsTplAbsent, val, sizeof(smsTplAbsent) - 1);
                smsTplAbsent[sizeof(smsTplAbsent) - 1] = '\0';
                Serial.printf("[CFG] SMS tpl absent: %s\n", smsTplAbsent);
            }
            handled = true;
        }
        else if (strstr(cmd, "SET_SMS_TPL_AC:")) {
            char* val = strstr(cmd, "SET_SMS_TPL_AC:") + 15;
            if (strlen(val) > 0 && strlen(val) <= 160) {
                strncpy(smsTplAC, val, sizeof(smsTplAC) - 1);
                smsTplAC[sizeof(smsTplAC) - 1] = '\0';
                Serial.printf("[CFG] SMS tpl AC: %s\n", smsTplAC);
            }
            handled = true;
        }
        else if (strstr(cmd, "SET_SMS_TPL_WASHROOM:")) {
            char* val = strstr(cmd, "SET_SMS_TPL_WASHROOM:") + 21;
            if (strlen(val) > 0 && strlen(val) <= 160) {
                strncpy(smsTplWashroom, val, sizeof(smsTplWashroom) - 1);
                smsTplWashroom[sizeof(smsTplWashroom) - 1] = '\0';
                Serial.printf("[CFG] SMS tpl washroom: %s\n", smsTplWashroom);
            }
            handled = true;
        }

        /* ── Device Actions ── */
        else if (strstr(cmd, "DEVICE_FACTORY_RESET")) {
            /* Send ack BEFORE reset */
            snprintf(jsonBuf, sizeof(jsonBuf),
              "{\"type\":\"control_ack\",\"device\":\"CLASSROOM-%s\",\"payload\":\"DEVICE_FACTORY_RESET\"}", cfgClassroom);
            webSocket.sendTXT(jsonBuf);
            delay(200);
            factoryReset();
            return;   /* never reached */
        }
        else if (strstr(cmd, "DEVICE_RESTART")) {
            snprintf(jsonBuf, sizeof(jsonBuf),
              "{\"type\":\"control_ack\",\"device\":\"CLASSROOM-%s\",\"payload\":\"DEVICE_RESTART\"}", cfgClassroom);
            webSocket.sendTXT(jsonBuf);
            delay(200);
            Serial.println("[INFO] Dashboard-triggered restart");
            ESP.restart();
            return;   /* never reached */
        }

        /* ── Settings: Request Config (dashboard asks for current config) ── */
        else if (strstr(cmd, "GET_CONFIG")) {
            configSynced    = false;   /* force re-send */
            templatesSynced = false;
            handled = true;
        }

        if (handled) {
            snprintf(jsonBuf, sizeof(jsonBuf),
              "{\"type\":\"control_ack\",\"device\":\"CLASSROOM-%s\",\"payload\":\"%s\"}", cfgClassroom, cmd);
            webSocket.sendTXT(jsonBuf);

            /* Re-sync config & templates to dashboard after any setting change */
            configSynced    = false;
            templatesSynced = false;

            /* Persist to NVS if this was a settings command (not an action) */
            bool isAction = strstr(cmd, "AC_REQUEST")
                         || strstr(cmd, "EMERGENCY_REQ")
                         || strstr(cmd, "WASHROOM_REQUEST")
                         || strstr(cmd, "TEACHER_FORCE_PRESENT")
                         || strstr(cmd, "GET_CONFIG")
                         || strstr(cmd, "DEVICE_RESTART")
                         || strstr(cmd, "DEVICE_FACTORY_RESET");
            if (!isAction) {
                saveSettings();
            }
        }
    }
}

/* =========================================================
   SETUP
   ========================================================= */
void setup() {
    Serial.begin(115200);
    sim800.begin(9600, SERIAL_8N1, SIM_TX, SIM_RX);
    Wire.begin(21, 22);

    /* Load persistent settings from NVS (before anything uses them) */
    loadSettings();

    /* Anchor periodStart early so that socketAwareWait() / runClassroomLogic()
       called during GSM init don't see a stale periodStart=0 and falsely
       trigger grace-timeout absent SMS before the first period even begins. */
    periodStart = millis();

    /* Watchdog */
    #if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
        esp_task_wdt_config_t wdt_config = {
            .timeout_ms    = WDT_TIMEOUT * 1000,
            .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
            .trigger_panic = true
        };
        esp_task_wdt_init(&wdt_config);
    #else
        esp_task_wdt_init(WDT_TIMEOUT, true);
    #endif
    esp_task_wdt_add(NULL);

    /* GPIO */
    pinMode(PIR_PIN,    INPUT_PULLDOWN);
    pinMode(MANUAL_BTN, INPUT_PULLUP);
    pinMode(AC_BTN,     INPUT_PULLUP);
    pinMode(EM_BTN,     INPUT_PULLUP);

    pinMode(TEACHER_LED, OUTPUT);
    pinMode(SYSTEM_LED,  OUTPUT);
    pinMode(AC_LED,      OUTPUT);
    pinMode(EM_LED,      OUTPUT);
    pinMode(BUZZER,      OUTPUT);

    digitalWrite(SYSTEM_LED, HIGH);

    /* WiFi */
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    unsigned long startWifi = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 15000) {
        esp_task_wdt_reset();
        delay(500);
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WiFi] Connected  IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("[WiFi] Initial connect failed - will retry");
    }

    /* WebSocket */
    webSocket.begin(ws_host, ws_port, "/");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(3000);
    webSocket.enableHeartbeat(15000, 3000, 2);

    /* RTC */
    if (!rtc.begin()) rtcOk = false;
    if (rtcOk) {
        DateTime now = rtc.now();
        smsCounterYear = now.year();
        smsCounterMonth = now.month();
    }

    /* GSM init (with 2 s warm-up wait) */
    socketAwareWait(2000);
    checkGSM();
    Serial.print("[GSM] Ready: ");
    Serial.println(gsmReady ? "YES" : "NO");

    /* Record boot time for sensor warm-up */
    bootTime    = millis();

    /* First period */
    periodStart = millis();
    bellActive  = true;
    bellToggles = periodNumber * 2;
    bellLast    = millis();
    buzzerState = true;
    digitalWrite(BUZZER, HIGH);
}

/* =========================================================
   LOOP — Fully non-blocking
   ========================================================= */
void loop() {
    esp_task_wdt_reset();

    ensureWiFi();
    webSocket.loop();

    runClassroomLogic();
    processAlerts();

    sendTelemetry();

    sendDeviceInfo();
    sendConfigSync();
    sendSmsTemplatesSync();
    sendWifiHealth();
    sendGsmHealth();
    sendEspHealth();

    checkAutoReboot();

    /* Periodic GSM re-check if not ready */
    if (cfgGsmEnabled && !gsmReady && millis() - lastGsmRecheck >= GSM_CHECK_INTERVAL) {
        lastGsmRecheck = millis();
        checkGSM();
        if (gsmReady) Serial.println("[GSM] Late init succeeded");
    }
}
