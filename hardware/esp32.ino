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

/* ================ TIMING =============== */
#define WIFI_HEALTH_INTERVAL   15000   // 15 s
#define GSM_HEALTH_INTERVAL    30000   // 30 s
#define ESP_HEALTH_INTERVAL    20000   // 20 s
#define WIFI_CHECK_INTERVAL     5000   //  5 s

/* ================ STATE ================ */
bool gsmReady       = false;
bool wsConnected    = false;
uint16_t wifiReconnects = 0;

unsigned long lastWifiHealth = 0;
unsigned long lastGsmHealth  = 0;
unsigned long lastEspHealth  = 0;
unsigned long lastWiFiCheck  = 0;

/* SMS anti-spam latches */
bool acLatched     = false;
bool emLatched     = false;
bool washLatched   = false;
bool absentLatched = false;

/* Serial receive buffer (avoids dynamic String allocation) */
char serialBuf[512];
int  serialIdx = 0;

/* Reusable JSON send buffer */
char jsonBuf[600];

/* =========================================================
   HELPERS — non-blocking wait that keeps WS alive
   ========================================================= */

void socketAwareWait(unsigned long ms) {
  unsigned long t = millis();
  while (millis() - t < ms) {
    webSocket.loop();
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

/* =========================================================
   JSON builder helpers (avoids String concatenation)
   ========================================================= */

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
      webSocket.sendTXT("{\"type\":\"register\",\"device\":\"CLASSROOM-706\"}");
      break;

    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      wsConnected = false;
      break;

    case WStype_TEXT: {
      /* -- Parse incoming control command -- */
      /* Packet: {"type":"control","command":"AC_REQUEST"} */

      /* Quick reject: must contain "control" */
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

      /* Find "command":"VALUE" */
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

      /* Extract command into a stack buffer */
      char cmd[64];
      memcpy(cmd, payload + cmdStart, cmdLen);
      cmd[cmdLen] = '\0';

      /* Forward to Arduino */
      arduinoSerial.println(cmd);
      Serial.print("[CTRL] -> Arduino: ");
      Serial.println(cmd);

      /* Send ACK back to server */
      snprintf(jsonBuf, sizeof(jsonBuf),
        "{\"type\":\"control_ack\",\"device\":\"CLASSROOM-706\",\"command\":\"%s\"}",
        cmd);
      wsSendBuf();
      break;
    }

    case WStype_PING:
      /* library auto-responds with PONG */
      break;

    case WStype_PONG:
      break;

    default:
      break;
  }
}

/* =========================================================
   GSM helpers
   ========================================================= */

/* Non-blocking SIM800 response reader */
void readSIM(char* out, size_t maxLen, unsigned long timeout) {
  size_t idx = 0;
  unsigned long t = millis();
  while (millis() - t < timeout && idx < maxLen - 1) {
    webSocket.loop();
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

/* Missed call via ATD + hangup after 4 rings (~20 s) */
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
   TELEMETRY SENDERS — structured JSON with categories
   ========================================================= */

void sendWifiHealth() {
  if (!wsConnected) return;
  if (millis() - lastWifiHealth < WIFI_HEALTH_INTERVAL) return;
  lastWifiHealth = millis();

  snprintf(jsonBuf, sizeof(jsonBuf),
    "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"wifi\","
    "\"payload\":\"wifi:rssi=%d,ip=%s,reconnects=%u,uptime=%lu\"}",
    WiFi.RSSI(),
    WiFi.localIP().toString().c_str(),
    wifiReconnects,
    millis() / 1000);
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
  char resp[128];

  if (gsmReady) {
    /* Signal quality */
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

    /* Operator */
    sim800.println("AT+COPS?");
    readSIM(resp, sizeof(resp), 2000);
    p = strstr(resp, "\"");
    if (p) {
      p++;
      int i = 0;
      while (*p && *p != '"' && i < 31) oper[i++] = *p++;
      oper[i] = '\0';
    }

    /* Battery */
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

    /* Registration status */
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

    /* IMEI */
    sim800.println("AT+GSN");
    readSIM(resp, sizeof(resp), 2000);
    /* Response is just the IMEI number followed by OK */
    p = resp;
    while (*p == '\r' || *p == '\n') p++;
    if (*p) {
      int i = 0;
      while (*p && *p != '\r' && *p != '\n' && i < 19) imei[i++] = *p++;
      imei[i] = '\0';
    }

    /* ICCID */
    sim800.println("AT+CCID");
    readSIM(resp, sizeof(resp), 2000);
    p = resp;
    while (*p == '\r' || *p == '\n') p++;
    if (*p) {
      int i = 0;
      while (*p && *p != '\r' && *p != '\n' && i < 23) iccid[i++] = *p++;
      iccid[i] = '\0';
    }
  }

  snprintf(jsonBuf, sizeof(jsonBuf),
    "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"gsm\","
    "\"payload\":\"gsm:signal=%s,operator=%s,battery=%s,reg=%s,imei=%s,iccid=%s\"}",
    signal, oper, batt, regStat, imei, iccid);
  wsSendBuf();
}

void sendEspHealth() {
  if (!wsConnected) return;
  if (millis() - lastEspHealth < ESP_HEALTH_INTERVAL) return;
  lastEspHealth = millis();

  esp_reset_reason_t reason = esp_reset_reason();

  snprintf(jsonBuf, sizeof(jsonBuf),
    "{\"type\":\"telemetry\",\"device\":\"CLASSROOM-706\",\"category\":\"esp\","
    "\"payload\":\"esp:heap=%u,cpuMHz=%u,flashKB=%u,resetReason=%d,uptime=%lu\"}",
    ESP.getFreeHeap(),
    ESP.getCpuFreqMHz(),
    ESP.getFlashChipSize() / 1024,
    (int)reason,
    millis() / 1000);
  wsSendBuf();
}

/* =========================================================
   SMS Alert Logic with anti-spam latching
   ========================================================= */

void handleAlerts(const char* line) {
  /* AC Request */
  if (strstr(line, "isACReq:true") && !acLatched) {
    if (sendSMS(AC_NUM, "AC request Classroom 706")) acLatched = true;
  }
  if (strstr(line, "isACReq:false")) acLatched = false;

  /* Emergency — SMS + missed call */
  if (strstr(line, "isEmergencyReq:true") && !emLatched) {
    if (sendSMS(EM_NUM, "EMERGENCY Classroom 706")) {
      missedCall(EM_NUM);
      emLatched = true;
    }
  }
  if (strstr(line, "isEmergencyReq:false")) emLatched = false;

  /* Washroom dirty */
  if (strstr(line, "isWashroomDirty:true") && !washLatched) {
    if (sendSMS(CLEAN_NUM, "Washroom dirty Classroom 706")) washLatched = true;
  }
  if (strstr(line, "isWashroomDirty:false")) washLatched = false;

  /* Teacher absent */
  if (strstr(line, "isTeacherAbsent:true") && !absentLatched) {
    if (sendSMS(HOD_NUM, "Teacher absent Classroom 706")) absentLatched = true;
  }
  if (strstr(line, "isTeacherAbsent:false")) absentLatched = false;
}

/* =========================================================
   SETUP
   ========================================================= */

void setup() {
  Serial.begin(115200);
  arduinoSerial.begin(9600, SERIAL_8N1, 16, 17);
  sim800.begin(9600, SERIAL_8N1, 4, 5);

  /* Non-blocking WiFi connect — we poll in loop via ensureWiFi() */
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  /* Wait up to 10 s for initial WiFi (acceptable at boot) */
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

  /* WebSocket */
  webSocket.begin(ws_host, ws_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
  webSocket.enableHeartbeat(15000, 3000, 2);  // ping every 15 s, timeout 3 s, 2 retries

  /* GSM */
  socketAwareWait(2000);  // let SIM800 boot
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

  /* ── Periodic health telemetry ─────────────────────── */
  sendWifiHealth();
  sendGsmHealth();
  sendEspHealth();

  /* ── Arduino serial telemetry ──────────────────────── */
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

        /* Check alert conditions */
        handleAlerts(serialBuf);
      }

      serialIdx = 0;
    }
    else if (c != '\r' && serialIdx < (int)sizeof(serialBuf) - 1) {
      serialBuf[serialIdx++] = c;
    }
  }
}
