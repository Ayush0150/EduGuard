/* ================================================================
   EduGuard ESP32 – Enterprise Real-Time Firmware
   ----------------------------------------------------------------
   - WiFi auto-reconnect (non-blocking)
   - Persistent WebSocket connection to backend
   - Structured JSON telemetry (arduino / wifi / gsm / esp categories)
   - Two-way control: dashboard → ESP32 → Arduino → ack
   - Anti-spam SMS latch with missed-call on emergency
   - Zero blocking delays — uses socketAwareWait() everywhere
   - Avoids String fragmentation with char-buffer serialisation
   ================================================================ */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include "esp_system.h"

/* ================ FORWARD DECLARATIONS ================ */
void processArduinoSerial();
void handleAlerts(const char* line);
void processPendingAlerts();

/* ================ SERIAL ================ */
HardwareSerial arduinoSerial(2);   // RX=16 TX=17
HardwareSerial sim800(1);          // RX=4  TX=5
WebSocketsClient webSocket;

/* ================ WIFI ================= */
const char* ssid     = "ACTFIBERNET";
const char* password = "act12345";

/* ================ SERVER =============== */
const char* ws_host = "192.168.0.112";
const uint16_t ws_port = 8080;

/* ================ PHONE NUMBERS ======== */
const char* AC_NUM    = "9260963100";
const char* EM_NUM    = "9260963100";
const char* CLEAN_NUM = "9260963100";
const char* HOD_NUM   = "9260963100";

/* ================ FIRMWARE ============== */
#define FW_VERSION  "2.1.1"

/* ================ TIMING =============== */
#define WIFI_HEALTH_INTERVAL   15000   // 15 s
#define GSM_HEALTH_INTERVAL    30000   // 30 s
#define ESP_HEALTH_INTERVAL    20000   // 20 s
#define WIFI_CHECK_INTERVAL     5000   //  5 s
#define GSM_RECHECK_INTERVAL   60000   // 60 s — retry GSM init if not ready

/* ================ STATE ================ */
bool gsmReady       = false;
bool wsConnected    = false;
bool deviceInfoSent = false;
uint16_t wifiReconnects = 0;
uint32_t minFreeHeap = 0xFFFFFFFF;

unsigned long lastWifiHealth = 0;
unsigned long lastGsmHealth  = 0;
unsigned long lastEspHealth  = 0;
unsigned long lastWiFiCheck  = 0;
unsigned long lastGsmRecheck = 0;

/* SMS anti-spam latches */
bool acLatched     = false;
bool emLatched     = false;
bool washLatched   = false;
bool absentLatched = false;

/* Pending Task Flags (Decouples execution from serial reading) */
bool pendingAcSms     = false;
bool pendingEmSms     = false;
bool pendingEmCall    = false;
bool pendingWashSms   = false;
bool pendingAbsentSms = false;

/* Serial receive buffer */
char serialBuf[512];
int  serialIdx = 0;
bool isProcessingSerial = false; // Anti-recursion lock

/* Reusable JSON send buffer */
char jsonBuf[768];


/* =========================================================
   CONTINUOUS DATA STREAMING FIX
   ========================================================= */

void processArduinoSerial() {
  if (isProcessingSerial) return;
  isProcessingSerial = true;

  while (arduinoSerial.available()) {
    char c = arduinoSerial.read();

    if (c == '\n') {
      serialBuf[serialIdx] = '\0';

      if (serialIdx > 0 && strncmp(serialBuf, "class:706", 9) == 0) {
        /* Send as structured JSON telemetry */
        snprintf(jsonBuf, sizeof(jsonBuf),
          "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"arduino\","
          "\"payload\":\"%s\"}",
          serialBuf);

        if (wsConnected) webSocket.sendTXT(jsonBuf);

        /* Check alert conditions (Now only sets flags, doesn't block!) */
        handleAlerts(serialBuf);
      }

      serialIdx = 0;
    }
    else if (c != '\r' && serialIdx < (int)sizeof(serialBuf) - 1) {
      serialBuf[serialIdx++] = c;
    }
  }

  isProcessingSerial = false;
}

/* =========================================================
   HELPERS — non-blocking wait
   ========================================================= */

void socketAwareWait(unsigned long ms) {
  unsigned long t = millis();
  while (millis() - t < ms) {
    webSocket.loop();
    processArduinoSerial(); // Process sensors while waiting
    delay(1);
  }
}

/* =========================================================
   WiFi — non-blocking reconnect
   ========================================================= */

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  wsConnected = false;

  if (millis() - lastWiFiCheck < WIFI_CHECK_INTERVAL) return;
  lastWiFiCheck = millis();

  WiFi.disconnect();
  WiFi.begin(ssid, password);
  wifiReconnects++;
}

void wsSendBuf() {
  if (wsConnected) webSocket.sendTXT(jsonBuf);
}

/* =========================================================
   WebSocket event handler
   ========================================================= */

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {

  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] Connected");
      wsConnected = true;
      deviceInfoSent = false;
      webSocket.sendTXT("{\"type\":\"register\",\"device\":\"CLASSROOM-706\"}");
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      wsConnected = false;
      break;

    case WStype_TEXT: {
      bool isControl = false;
      for (size_t i = 0; i + 8 < length; i++) {
        if (payload[i] == 'c' && payload[i+1] == 'o' && payload[i+2] == 'n'
            && payload[i+3] == 't' && payload[i+4] == 'r' && payload[i+5] == 'o'
            && payload[i+6] == 'l' && payload[i+7] == '"') {
          isControl = true;
          break;
        }
      }
      if (!isControl) break;

      const char* needle = "\"command\":\"";
      const int needleLen = 11;
      int cmdStart = -1;

      for (size_t i = 0; i + needleLen < length; i++) {
        bool match = true;
        for (int j = 0; j < needleLen; j++) {
          if (payload[i + j] != needle[j]) { match = false; break; }
        }
        if (match) { cmdStart = i + needleLen; break; }
      }

      if (cmdStart < 0) break;

      int cmdEnd = -1;
      for (size_t i = cmdStart; i < length; i++) {
        if (payload[i] == '"') { cmdEnd = i; break; }
      }
      if (cmdEnd <= cmdStart) break;

      int cmdLen = cmdEnd - cmdStart;
      if (cmdLen <= 0 || cmdLen > 60) break;

      char cmd[64];
      memcpy(cmd, payload + cmdStart, cmdLen);
      cmd[cmdLen] = '\0';

      arduinoSerial.println(cmd);
      Serial.print("[CTRL] -> Arduino: ");
      Serial.println(cmd);

      snprintf(jsonBuf, sizeof(jsonBuf),
        "{\"type\":\"control_ack\",\"device\":\"CLASSROOM-706\",\"command\":\"%s\"}",
        cmd);
      wsSendBuf();
      break;
    }

    case WStype_PING:
    case WStype_PONG:
    default:
      break;
  }
}

/* =========================================================
   GSM helpers
   ========================================================= */

void readSIM(char* out, size_t maxLen, unsigned long timeout) {
  size_t idx = 0;
  unsigned long t = millis();
  while (millis() - t < timeout && idx < maxLen - 1) {
    webSocket.loop();
    processArduinoSerial();
    while (sim800.available() && idx < maxLen - 1) {
      out[idx++] = sim800.read();
    }
    delay(1);
  }
  out[idx] = '\0';
}

void checkGSM() {
  char resp[64];
  sim800.println("AT");
  readSIM(resp, sizeof(resp), 2000);
  gsmReady = (strstr(resp, "OK") != NULL);
}

bool sendSMS(const char* number, const char* msg) {
  if (!gsmReady) return false;

  char resp[128];

  sim800.println("AT+CMGF=1");
  socketAwareWait(200);

  sim800.print("AT+CMGS=\"");
  sim800.print(number);
  sim800.println("\"");
  socketAwareWait(300);

  sim800.print(msg);
  socketAwareWait(200);
  sim800.write(26);

  readSIM(resp, sizeof(resp), 6000);
  return (strstr(resp, "+CMGS") != NULL);
}

bool missedCall(const char* number) {
  if (!gsmReady) return false;

  char resp[64];
  sim800.print("ATD");
  sim800.print(number);
  sim800.println(";");

  socketAwareWait(20000);  // ring ~20 s

  sim800.println("ATH");
  readSIM(resp, sizeof(resp), 3000);
  return true;
}

/* =========================================================
   TELEMETRY SENDERS
   ========================================================= */

void sendDeviceInfo() {
  if (!wsConnected || deviceInfoSent) return;
  deviceInfoSent = true;

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
  wsSendBuf();
  Serial.println("[INFO] Device info sent");
}

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
  wsSendBuf();
}

void sendGsmHealth() {
  if (!wsConnected) return;
  if (millis() - lastGsmHealth < GSM_HEALTH_INTERVAL) return;
  lastGsmHealth = millis();

  char signal[16]   = "N/A";
  char oper[32]     = "N/A";
  char batt[16]     = "N/A";
  char regStat[8]   = "N/A";
  char imei[20]     = "N/A";
  char iccid[24]    = "N/A";
  char simStat[8]   = "N/A";
  char netMode[8]   = "N/A";
  char resp[128];

  if (gsmReady) {
    sim800.println("AT+CSQ");
    readSIM(resp, sizeof(resp), 2000);
    char* p = strstr(resp, "+CSQ:");
    if (p) {
      p += 5;
      while (*p == ' ') p++;
      int i = 0;
      while (*p && *p != ',' && *p != '\r' && i < 15) signal[i++] = *p++;
      signal[i] = '\0';
    }

    sim800.println("AT+COPS?");
    readSIM(resp, sizeof(resp), 2000);
    p = strstr(resp, "\"");
    if (p) {
      p++;
      int i = 0;
      while (*p && *p != '"' && i < 31) oper[i++] = *p++;
      oper[i] = '\0';
    }

    sim800.println("AT+CBC");
    readSIM(resp, sizeof(resp), 2000);
    p = strstr(resp, "+CBC:");
    if (p) {
      p += 5;
      while (*p == ' ') p++;
      int i = 0;
      while (*p && *p != '\r' && i < 15) batt[i++] = *p++;
      batt[i] = '\0';
    }

    sim800.println("AT+CREG?");
    readSIM(resp, sizeof(resp), 2000);
    p = strstr(resp, "+CREG:");
    if (p) {
      p += 6;
      while (*p == ' ') p++;
      int i = 0;
      while (*p && *p != '\r' && i < 7) regStat[i++] = *p++;
      regStat[i] = '\0';
    }

    sim800.println("AT+GSN");
    readSIM(resp, sizeof(resp), 2000);
    p = resp;
    while (*p == '\r' || *p == '\n') p++;
    if (*p) {
      int i = 0;
      while (*p && *p != '\r' && *p != '\n' && i < 19) imei[i++] = *p++;
      imei[i] = '\0';
    }

    sim800.println("AT+CCID");
    readSIM(resp, sizeof(resp), 2000);
    p = resp;
    while (*p == '\r' || *p == '\n') p++;
    if (*p) {
      int i = 0;
      while (*p && *p != '\r' && *p != '\n' && i < 23) iccid[i++] = *p++;
      iccid[i] = '\0';
    }

    sim800.println("AT+CPIN?");
    readSIM(resp, sizeof(resp), 2000);
    p = strstr(resp, "+CPIN:");
    if (p) {
      p += 6;
      while (*p == ' ') p++;
      int i = 0;
      while (*p && *p != '\r' && i < 7) simStat[i++] = *p++;
      simStat[i] = '\0';
    }

    sim800.println("AT+COPS?");
    readSIM(resp, sizeof(resp), 2000);
    p = strstr(resp, "+COPS:");
    if (p) {
      int commas = 0;
      char* q = p;
      while (*q && *q != '\r') {
        if (*q == ',') commas++;
        if (commas == 3) {
          q++;
          switch (*q) {
            case '0': strcpy(netMode, "GSM");   break;
            case '2': strcpy(netMode, "3G");    break;
            case '3': strcpy(netMode, "EDGE");  break;
            case '7': strcpy(netMode, "LTE");   break;
            default:  netMode[0] = *q; netMode[1] = '\0'; break;
          }
          break;
        }
        q++;
      }
    }
  }

  snprintf(jsonBuf, sizeof(jsonBuf),
    "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"gsm\","
    "\"payload\":\"signal=%s,operator=%s,battery=%s,reg=%s,imei=%s,iccid=%s,sim=%s,net=%s,gsmReady=%s\"}",
    signal, oper, batt, regStat, imei, iccid, simStat, netMode,
    gsmReady ? "true" : "false");
  wsSendBuf();
}

void sendEspHealth() {
  if (!wsConnected) return;
  if (millis() - lastEspHealth < ESP_HEALTH_INTERVAL) return;
  lastEspHealth = millis();

  uint32_t freeNow = ESP.getFreeHeap();
  if (freeNow < minFreeHeap) minFreeHeap = freeNow;

  esp_reset_reason_t reason = esp_reset_reason();

  snprintf(jsonBuf, sizeof(jsonBuf),
    "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"esp\","
    "\"payload\":\"heap=%u,minHeap=%u,cpuMHz=%u,flashKB=%u,resetReason=%d,uptime=%lu,temp=%.1f,cores=%d\"}",
    freeNow,
    minFreeHeap,
    ESP.getCpuFreqMHz(),
    ESP.getFlashChipSize() / 1024,
    (int)reason,
    millis() / 1000,
    temperatureRead(),
    ESP.getChipCores());
  wsSendBuf();
}

/* =========================================================
   SMS Alert Logic (Now only flags tasks, does not block)
   ========================================================= */

void handleAlerts(const char* line) {
  if (strstr(line, "isACReq:true") && !acLatched) {
    pendingAcSms = true;
    acLatched = true;
  }
  if (strstr(line, "isACReq:false")) acLatched = false;

  if (strstr(line, "isEmergencyReq:true") && !emLatched) {
    pendingEmSms = true;
    pendingEmCall = true;
    emLatched = true;
  }
  if (strstr(line, "isEmergencyReq:false")) emLatched = false;

  if (strstr(line, "isWashroomDirty:true") && !washLatched) {
    pendingWashSms = true;
    washLatched = true;
  }
  if (strstr(line, "isWashroomDirty:false")) washLatched = false;

  if (strstr(line, "isTeacherAbsent:true") && !absentLatched) {
    pendingAbsentSms = true;
    absentLatched = true;
  }
  if (strstr(line, "isTeacherAbsent:false")) absentLatched = false;
}

/* Executes pending GSM tasks outside the serial lock */
void processPendingAlerts() {
  if (pendingAcSms) {
    sendSMS(AC_NUM, "AC request Classroom 706");
    pendingAcSms = false;
  }
  if (pendingEmSms) {
    sendSMS(EM_NUM, "EMERGENCY Classroom 706");
    pendingEmSms = false;
  }
  if (pendingEmCall) {
    missedCall(EM_NUM);
    pendingEmCall = false;
  }
  if (pendingWashSms) {
    sendSMS(CLEAN_NUM, "Washroom dirty Classroom 706");
    pendingWashSms = false;
  }
  if (pendingAbsentSms) {
    sendSMS(HOD_NUM, "Teacher absent Classroom 706");
    pendingAbsentSms = false;
  }
}

/* =========================================================
   SETUP
   ========================================================= */

void setup() {
  Serial.begin(115200);
  arduinoSerial.begin(9600, SERIAL_8N1, 16, 17);
  sim800.begin(9600, SERIAL_8N1, 4, 5);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 10000) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] Connected  IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] Initial connect failed — will retry");
  }

  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 2);

  socketAwareWait(2000);
  checkGSM();
  Serial.print("[GSM] Ready: ");
  Serial.println(gsmReady ? "YES" : "NO");
}

/* =========================================================
   LOOP — fully non-blocking
   ========================================================= */

void loop() {
  ensureWiFi();
  webSocket.loop();

  sendDeviceInfo();

  if (!gsmReady && millis() - lastGsmRecheck >= GSM_RECHECK_INTERVAL) {
    lastGsmRecheck = millis();
    checkGSM();
    if (gsmReady) Serial.println("[GSM] Late init succeeded");
  }

  sendWifiHealth();
  sendGsmHealth();
  sendEspHealth();

  /* 1. Reads incoming data and sets flags instantly */
  processArduinoSerial();

  /* 2. Executes calls/SMS safely without blocking new data */
  processPendingAlerts();
}
