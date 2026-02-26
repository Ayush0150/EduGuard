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
   ================================================================ */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Wire.h>
#include "RTClib.h"
#include "esp_system.h"
#include "esp_task_wdt.h"
#include "esp_idf_version.h"
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

/* ================ CONFIGURATION ================ */
const char* ssid       = "ACTFIBERNET";
const char* password   = "act12345";
const char* ws_host    = "192.168.0.112";
const uint16_t ws_port = 8080;
#define ADMIN_NUM        "9260963100"

#define FW_VERSION       "5.1.0-UNIFIED-FIXED"
#define WDT_TIMEOUT      10

/* ================ TIMING CONSTANTS ================ */
#define PERIOD_DURATION      60000UL
#define GRACE_DURATION       10000UL
#define PIR_STABLE_TIME      120UL
#define PIR_IGNORE_TIME      300UL
#define ACTIVE_DURATION      3000UL
#define CALL_DURATION        5000UL
#define SMS_ACK_TIMEOUT      5000UL
#define DEBOUNCE_TIME        40UL
#define ABSENT_SMS_CONFIRM   5000UL
#define ABSENT_SMS_MAX_RETRY 3
#define EM_SMS_MAX_RETRY     3
#define EM_CALL_MAX_RETRY    3
#define EM_RETRY_INTERVAL    800UL

#define BELL_ON_TIME         150UL    // How long each beep sounds
#define BELL_GAP_TIME        400UL    // Silence between beeps (so students can count)
#define SIREN_INTERVAL       80UL     // Siren wail toggle rate (matches proven Arduino)

#define WIFI_RETRY_INTERVAL  5000UL
#define GSM_CHECK_INTERVAL   60000UL
#define WIFI_HEALTH_INTERVAL 15000UL
#define GSM_HEALTH_INTERVAL  10000UL
#define ESP_HEALTH_INTERVAL  1000UL

/* ================ SENSOR THRESHOLDS ================ */
#define GAS_HIGH         2000
#define GAS_LOW          1400
#define GAS_SAMPLES      10
#define GAS_READ_INTERVAL    250UL     // Read gas every 250 ms (optimization)

/* ================ STATE OBJECTS ================ */
RTC_DS3231 rtc;
WebSocketsClient webSocket;
HardwareSerial sim800(1);

/* ================ STATE VARIABLES ================ */
unsigned long periodStart    = 0, lastTelemetry = 0;
unsigned long acStart        = 0, emStart       = 0, dirtyStart  = 0, absentStart = 0;
unsigned long bellLast       = 0, sirenLast     = 0;
unsigned long lastWiFiCheck  = 0, lastGsmRecheck = 0;
unsigned long lastWifiHealth = 0, lastGsmHealth  = 0, lastEspHealth = 0;
unsigned long pirHighStart   = 0, callStartTime  = 0;
unsigned long absentCheckStart = 0;
unsigned long emLastAttempt  = 0;

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

unsigned long lastGasRead = 0;

/* Button debounce (from Arduino) */
bool acReady      = true, emReady      = true, manualReady     = true;
unsigned long acDebounce = 0, emDebounce = 0, manualDebounce = 0;

/* Anti-recursion guard */
bool inLogic = false;

/* Alert flags with retry logic */
int  acSmsRetry = 0, emSmsRetry = 0, washSmsRetry = 0, absentSmsRetry = 0;
int  emCallRetry = 0;
bool pendingAcSms  = false, pendingEmSms   = false, pendingEmCall   = false;
bool pendingWashSms = false, pendingAbsentSms = false;

/* Per-period SMS latches */
bool absentLatched = false;

char jsonBuf[768];

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
   GSM INTERFACE
   ========================================================= */
void checkGSM() {
    while (sim800.available()) { sim800.read(); }
    sim800.println("AT");
    gsmReady = smartFindAny("OK", NULL, 500);
}

bool execSMS(const char* msg) {
    if (!gsmReady) return false;

    sim800.println("AT+CMGF=1");
    smartFindAny("OK", NULL, 500);

    sim800.printf("AT+CMGS=\"%s\"\r", ADMIN_NUM);
    smartFindAny(">", NULL, 500);

    sim800.print(msg);
    sim800.write(26);

    return smartFindAny("+CMGS", "OK", SMS_ACK_TIMEOUT);
}

bool startEmergencyCall() {
    if (!gsmReady || callInProgress) return false;

    while (sim800.available()) { sim800.read(); }
    sim800.println("AT");
    if (!smartFindAny("OK", NULL, 600)) return false;

    while (sim800.available()) { sim800.read(); }

    sim800.printf("ATD%s;\r", ADMIN_NUM);
    bool dialAccepted = smartFindAny("OK", "CONNECT", 2500);
    if (!dialAccepted) return false;

    callStartTime = millis();
    callInProgress = true;
    return true;
}

void processAlerts() {
    unsigned long now = millis();

    if (callInProgress && (millis() - callStartTime >= CALL_DURATION)) {
        sim800.println("ATH");
        callInProgress = false;
    }

    bool hasPendingAlert = pendingEmSms || pendingEmCall || pendingAcSms || pendingWashSms || pendingAbsentSms;
    if (!gsmReady && hasPendingAlert) {
        checkGSM();
    }

    if (!gsmReady) return;

    /* Emergency call starts only after emergency SMS phase is done */
    if (pendingEmCall && !pendingEmSms && !callInProgress) {
        if (now - emLastAttempt >= EM_RETRY_INTERVAL) {
            emLastAttempt = now;
            if (startEmergencyCall()) {
                pendingEmCall = false;
                emCallRetry = 0;
            } else if (emCallRetry >= EM_CALL_MAX_RETRY) {
                pendingEmCall = false;
                emCallRetry = 0;
            } else {
                emCallRetry++;
            }
        }
        return;
    }

    /* One SMS transaction per loop to avoid long GSM monopolization */
    if (pendingEmSms) {
        bool emSmsSent = execSMS("EMERGENCY Room 706");
        if (emSmsSent) {
            markSmsSuccess();
            pendingEmSms = false;
            emSmsRetry = 0;
            if (!callInProgress) {
                pendingEmCall = true;
                emCallRetry = 0;
                emLastAttempt = 0;
            } else {
                pendingEmCall = true;
            }
        } else if (emSmsRetry >= EM_SMS_MAX_RETRY) {
            pendingEmSms = false;
            emSmsRetry = 0;
            pendingEmCall = false;
        } else {
            emSmsRetry++;
        }
        return;
    }

    if (pendingAbsentSms && teacherLocked) {
        pendingAbsentSms   = false;
        absentSmsRetry     = 0;
        teacherAbsentPulse = false;
        absentLatched      = false;
        absentCheckStart   = 0;
        return;
    }

    if (pendingAbsentSms) {
        if (execSMS("Teacher Absent 706")) {
            markSmsSuccess();
            pendingAbsentSms = false;
            absentSmsRetry = 0;
        } else if (absentSmsRetry >= ABSENT_SMS_MAX_RETRY) {
            pendingAbsentSms = false;
            absentSmsRetry = 0;
        } else {
            absentSmsRetry++;
        }
        return;
    }

    if (pendingAcSms) {
        bool sent = execSMS("AC Req Room 706");
        if (sent) {
            markSmsSuccess();
            pendingAcSms = false;
            acSmsRetry = 0;
        } else if (acSmsRetry >= 1) {
            pendingAcSms = false;
            acSmsRetry = 0;
        } else {
            acSmsRetry++;
        }
        return;
    }

    if (pendingWashSms) {
        bool sent = execSMS("Washroom Dirty 706");
        if (sent) {
            markSmsSuccess();
            pendingWashSms = false;
            washSmsRetry = 0;
        } else if (washSmsRetry >= 1) {
            pendingWashSms = false;
            washSmsRetry = 0;
        } else {
            washSmsRetry++;
        }
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

    unsigned long now = millis();
    periodTime = (now - periodStart) / 1000;

    updateSmsCounterResets();

    /* Throttled gas read — every 250 ms instead of every loop */
    if (now - lastGasRead >= GAS_READ_INTERVAL) {
        lastGasRead     = now;
        currentGasValue = readGasAverage();
    }

    /* --- Period Reset --- */
    if (now - periodStart >= PERIOD_DURATION) {
        periodNumber = (periodNumber % 10) + 1;
        periodStart  = now;

        teacherPresent = teacherLocked = teacherConfirmed = teacherAbsentPulse = false;
        absentLatched  = false;
        absentCheckStart = 0;
        pendingAbsentSms = false;
        absentSmsRetry   = 0;
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
    if (!digitalRead(MANUAL_BTN) && manualReady && now - manualDebounce > DEBOUNCE_TIME) {
        manualDebounce = now;
        manualReady    = false;
        teacherConfirmed = true;
        teacherPresent   = true;
        teacherLocked    = true;
        teacherAbsentPulse = false;
        pendingAbsentSms   = false;
        absentSmsRetry     = 0;
        absentLatched      = false;
        absentCheckStart   = 0;
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
            absentSmsRetry     = 0;
            absentLatched      = false;
            absentCheckStart   = 0;
            digitalWrite(TEACHER_LED, HIGH);
        }

        if (!teacherPresent && periodTime >= (GRACE_DURATION / 1000)) {
            if (absentCheckStart == 0) {
                absentCheckStart = now;
            }

            if (!absentLatched && (now - absentCheckStart >= ABSENT_SMS_CONFIRM)) {
                absentLatched      = true;
                teacherAbsentPulse = true;
                absentStart        = now;
                pendingAbsentSms   = true;
                teacherPresent     = false;
                teacherConfirmed   = false;
                pirHighStart       = 0;
                digitalWrite(TEACHER_LED, LOW);
            }
        } else {
            absentCheckStart = 0;
        }
    }

    if (teacherAbsentPulse && now - absentStart >= GRACE_DURATION)
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

    /* --- Emergency Request (debounced, single-trigger while active) --- */
    if (!digitalRead(EM_BTN) && emReady && now - emDebounce > DEBOUNCE_TIME && !emActive) {
        emDebounce = now;
        emReady    = false;
        emActive   = emPulse = true;
        emStart    = now;
        sirenLast  = 0;              /* Force immediate first siren tone */
        digitalWrite(EM_LED, HIGH);
        pendingEmSms = true;
        pendingEmCall = false;
        emSmsRetry = 0;
        emCallRetry = 0;
        emLastAttempt = 0;
        bellActive   = false;
        digitalWrite(BUZZER, LOW);       /* Stop any bell immediately */
    }
    if (digitalRead(EM_BTN)) emReady = true;

    if (emActive && now - emStart >= ACTIVE_DURATION) {
        emActive = emPulse = false;
        digitalWrite(EM_LED, LOW);
        digitalWrite(BUZZER, LOW);       /* Ensure buzzer stops with siren */
    }

    /* --- Gas Sensor (hysteresis latch) --- */
    if (currentGasValue > GAS_HIGH && !washLatched) {
        washLatched  = true;
        dirtyActive  = true;
        dirtyStart   = now;
        pendingWashSms = true;
    }
    if (dirtyActive && now - dirtyStart >= ACTIVE_DURATION)
        dirtyActive = false;
    if (currentGasValue < GAS_LOW)
        washLatched = false;

    /* --- BUZZER CONTROL (direct-drive, matches proven Arduino pattern) --- */
    if (emActive) {
        /* Fast toggling siren wail — direct HIGH/LOW drive */
        if (now - sirenLast >= SIREN_INTERVAL) {
            sirenLast   = now;
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
      "class:706,P:%d,PT:%d,TP:%d,AC:%d,EM:%d,GS:%d,T:%02d:%02d:%02d,"
      "isSystemActive:%s,isPresent:%s,isTeacherAbsent:%s,"
      "isACReq:%s,isEmergencyReq:%s,isWashroomDirty:%s",
      periodNumber, periodTime, teacherPresent, acActive, emActive, currentGasValue,
      h, m, s,
      rtcOk ? "true" : "false",
      teacherConfirmed ? "true" : "false",
      (periodTime < (int)(GRACE_DURATION / 1000) ? "null" : (teacherAbsentPulse ? "true" : "false")),
      acPulse ? "true" : "false",
      emPulse ? "true" : "false",
      dirtyActive ? "true" : "false"
    );

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"arduino\",\"payload\":\"%s\"}",
      payload
    );
    webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   HEALTH — Device Info (sent once after connect)
   ========================================================= */
void sendDeviceInfo() {
    if (!wsConnected || deviceInfoSent) return;

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"device\","
      "\"payload\":\"firmware=%s,chip=%s,rev=%d,cores=%d,sdk=%s,mac=%s,flashMB=%u\"}",
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
   HEALTH — WiFi (15 s)
   ========================================================= */
void sendWifiHealth() {
    if (!wsConnected) return;
    if (millis() - lastWifiHealth < WIFI_HEALTH_INTERVAL) return;
    lastWifiHealth = millis();

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"wifi\","
      "\"payload\":\"rssi=%d,ip=%s,reconnects=%u,uptime=%lu,channel=%d,ssid=%s,mac=%s\"}",
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
        /* Signal strength */
        sim800.println("AT+CSQ");
        readSIM(resp, sizeof(resp), 1000);
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
        if (extractFirstDigitLine(resp, candidate, sizeof(candidate))) {
            setIfValid(imei, sizeof(imei), candidate);
        }

        /* ICCID */
        sim800.println("AT+CCID");
        readSIM(resp, sizeof(resp), 1000);
        if (extractFirstDigitLine(resp, candidate, sizeof(candidate))) {
            setIfValid(iccid, sizeof(iccid), candidate);
        }

        /* SIM status */
        sim800.println("AT+CPIN?");
        readSIM(resp, sizeof(resp), 1000);
        p = strstr(resp, "+CPIN:");
        if (p) {
            p += 6; while (*p == ' ') p++;
            int i = 0;
            while (*p && *p != '\r' && *p != '\n' && i < (int)sizeof(candidate) - 1) candidate[i++] = *p++;
            candidate[i] = '\0';
            setIfValid(simStat, sizeof(simStat), candidate);
        }
    }

    strncpy(lastSignal, signal, sizeof(lastSignal) - 1); lastSignal[sizeof(lastSignal) - 1] = '\0';
    strncpy(lastOper,   oper,   sizeof(lastOper) - 1);   lastOper[sizeof(lastOper) - 1] = '\0';
    strncpy(lastBatt,   batt,   sizeof(lastBatt) - 1);   lastBatt[sizeof(lastBatt) - 1] = '\0';
    strncpy(lastReg,    regStat,sizeof(lastReg) - 1);    lastReg[sizeof(lastReg) - 1] = '\0';
    strncpy(lastImei,   imei,   sizeof(lastImei) - 1);   lastImei[sizeof(lastImei) - 1] = '\0';
    strncpy(lastIccid,  iccid,  sizeof(lastIccid) - 1);  lastIccid[sizeof(lastIccid) - 1] = '\0';
    strncpy(lastSim,    simStat,sizeof(lastSim) - 1);    lastSim[sizeof(lastSim) - 1] = '\0';
    strncpy(lastNet,    netMode,sizeof(lastNet) - 1);    lastNet[sizeof(lastNet) - 1] = '\0';

    snprintf(jsonBuf, sizeof(jsonBuf),
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"gsm\","
            "\"payload\":\"signal=%s,operator=%s,battery=%s,reg=%s,imei=%s,iccid=%s,sim=%s,net=%s,gsmReady=%s,smsToday=%lu,smsMonth=%lu\"}",
      signal, oper, batt, regStat, imei, iccid, simStat, netMode,
            gsmReady ? "true" : "false",
            smsSentToday,
            smsSentMonth);
    webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   HEALTH — ESP internals (10 s)
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
      "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"esp\","
            "\"payload\":\"heap=%u,minHeap=%u,cpuMHz=%u,flashKB=%u,resetReason=%d,uptime=%lu,temp=%.1f,cores=%d,rssi=%d,time=%02d:%02d:%02d\"}",
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
   WEBSOCKET EVENT HANDLER
   ========================================================= */
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    if (type == WStype_CONNECTED) {
        Serial.println("[WS] Connected");
        wsConnected    = true;
        deviceInfoSent = false;
        webSocket.sendTXT("{\"type\":\"register\",\"device\":\"CLASSROOM-706\"}");
    }
    else if (type == WStype_DISCONNECTED) {
        Serial.println("[WS] Disconnected");
        wsConnected    = false;
        deviceInfoSent = false;
    }
    else if (type == WStype_TEXT) {
        char cmd[160];
        copyWsPayload(cmd, sizeof(cmd), payload, length);
        bool handled = false;

        if (strstr(cmd, "AC_REQUEST")) {
            if (!acActive) {
                acActive = acPulse = true;
                acStart  = millis();
                digitalWrite(AC_LED, HIGH);
                pendingAcSms = true;
            }
            handled = true;
        }
        else if (strstr(cmd, "EMERGENCY_REQ")) {
            if (!emActive) {
                emActive = emPulse = true;
                emStart  = millis();
                sirenLast = 0;
                digitalWrite(EM_LED, HIGH);
                pendingEmSms = true;
                pendingEmCall = false;
                emSmsRetry = 0;
                emCallRetry = 0;
                emLastAttempt = 0;
                bellActive = false;
                digitalWrite(BUZZER, LOW);
            }
            handled = true;
        }
        else if (strstr(cmd, "WASHROOM_REQUEST")) {
            if (!dirtyActive) {
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
            absentSmsRetry     = 0;
            absentLatched      = false;
            absentCheckStart   = 0;
            digitalWrite(TEACHER_LED, HIGH);
            handled = true;
        }

        if (handled) {
            snprintf(jsonBuf, sizeof(jsonBuf),
              "{\"type\":\"control_ack\",\"device\":\"CLASSROOM-706\",\"payload\":\"%s\"}", cmd);
            webSocket.sendTXT(jsonBuf);
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
    sendWifiHealth();
    sendGsmHealth();
    sendEspHealth();

    /* Periodic GSM re-check if not ready */
    if (!gsmReady && millis() - lastGsmRecheck >= GSM_CHECK_INTERVAL) {
        lastGsmRecheck = millis();
        checkGSM();
        if (gsmReady) Serial.println("[GSM] Late init succeeded");
    }
}
