#include <WiFi.h>
#include <HTTPClient.h>

/* ================= SERIAL ================= */
HardwareSerial arduinoSerial(2);   // RX=16 TX=17
HardwareSerial sim800(1);          // RX=4  TX=5

/* ================= WIFI ================= */
const char* ssid = "ACTFIBERNET";
const char* password = "act12345";

/* ================= SERVER ================= */
const char* serverURL = "http://192.168.0.112:8080/device";
const char* controlURL = "http://192.168.0.112:8080/control?device=CLASSROOM-706";

/* ================= NUMBERS ================= */
String AC_NUM    = "9260963100";
String EM_NUM    = "9260963100";
String CLEAN_NUM = "9260963100";
String HOD_NUM   = "9260963100";

/* ================= STATE ================= */
String serialLine = "";

unsigned long lastHealth = 0;
unsigned long lastWiFiCheck = 0;
unsigned long lastGSMCheck = 0;
unsigned long lastControlCheck = 0;

#define CONTROL_INTERVAL 1000
#define HEALTH_INTERVAL 20000

bool gsmReady = false;

/* ===== Anti-Spam Latches ===== */
bool acLatched = false;
bool emLatched = false;
bool washLatched = false;
bool absentLatched = false;

/* ================================================= */
/* ================= GSM SECTION =================== */
/* ================================================= */

String readSIM(unsigned long timeout = 3000) {
  String response = "";
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (sim800.available()) {
      response += char(sim800.read());
    }
    delay(2);
  }
  response.trim();
  return response;
}

void checkGSM() {
  if (millis() - lastGSMCheck < 15000) return;
  lastGSMCheck = millis();

  sim800.println("AT");
  String response = readSIM(2000);
  gsmReady = (response.indexOf("OK") != -1);
}

bool sendSMS(String number, String message) {
  if (!gsmReady) return false;

  sim800.println("AT+CMGF=1");
  delay(200);

  sim800.print("AT+CMGS=\"");
  sim800.print(number);
  sim800.println("\"");
  delay(300);

  sim800.print(message);
  delay(200);
  sim800.write(26);

  String response = readSIM(6000);
  if (response.indexOf("+CMGS") != -1) return true;

  // Retry once only
  delay(2000);

  sim800.print("AT+CMGS=\"");
  sim800.print(number);
  sim800.println("\"");
  delay(300);

  sim800.print(message);
  delay(200);
  sim800.write(26);

  response = readSIM(6000);
  return response.indexOf("+CMGS") != -1;
}

void missedCall(String number) {
  if (!gsmReady) return;

  sim800.print("ATD");
  sim800.print(number);
  sim800.println(";");
  delay(5000);   // 5 sec only
  sim800.println("ATH");
}

/* ================================================= */
/* ================= NETWORK ======================= */
/* ================================================= */

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  if (millis() - lastWiFiCheck > 5000) {
    lastWiFiCheck = millis();
    WiFi.disconnect();
    WiFi.begin(ssid, password);
  }
}

bool sendToServer(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "text/plain");
  http.setTimeout(4000);

  int httpCode = http.POST(payload);

  http.end();
  return (httpCode >= 200 && httpCode < 300);
}

/* ================================================= */
/* ================= HEALTH ======================== */
/* ================================================= */

void sendHealth() {

  if (millis() - lastHealth < HEALTH_INTERVAL) return;
  lastHealth = millis();

  String gsmSignal = "0";
  String gsmBatt = "0";
  String gsmOp = "";

  if (gsmReady) {

    sim800.println("AT+CSQ");
    String csq = readSIM();
    int s = csq.indexOf("+CSQ:");
    if (s != -1) gsmSignal = csq.substring(s + 6, s + 8);

    sim800.println("AT+CBC");
    String cbc = readSIM();
    int b1 = cbc.indexOf(",");
    if (b1 != -1) {
      int b2 = cbc.indexOf(",", b1 + 1);
      if (b2 != -1)
        gsmBatt = cbc.substring(b1 + 1, b2);
    }

    sim800.println("AT+COPS?");
    String cops = readSIM();
    int q1 = cops.indexOf("\"");
    if (q1 != -1) {
      int q2 = cops.indexOf("\"", q1 + 1);
      if (q2 != -1)
        gsmOp = cops.substring(q1 + 1, q2);
    }
  }

  String health =
    "health:gsmSignal=" + gsmSignal +
    ",gsmBatt=" + gsmBatt +
    ",gsmOp=" + gsmOp +
    ",wifiRSSI=" + String(WiFi.RSSI()) +
    ",wifiStatus=" + String(WiFi.status()) +
    ",uptime=" + String(millis() / 1000);

  sendToServer(health);
}

/* ================================================= */
/* ================= CONTROL ======================= */
/* ================================================= */

void checkControl() {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(controlURL);
  int code = http.GET();

  if (code == 200) {
    String cmd = http.getString();
    cmd.trim();

    if (cmd.length() > 0) {
      Serial.println("CMD FROM SERVER: " + cmd);
      arduinoSerial.println(cmd);
    }
  }

  http.end();
}

/* ================================================= */
/* ================= SETUP ========================= */
/* ================================================= */

void setup() {

  Serial.begin(115200);

  arduinoSerial.begin(9600, SERIAL_8N1, 16, 17);
  sim800.begin(9600, SERIAL_8N1, 4, 5);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  Serial.println("WiFi Connected");
  Serial.println(WiFi.localIP());

  checkGSM();
}

/* ================================================= */
/* ================= LOOP ========================== */
/* ================================================= */

void loop() {

  ensureWiFi();
  checkGSM();
  sendHealth();

  // Controlled polling (very important)
  if (millis() - lastControlCheck > CONTROL_INTERVAL) {
    lastControlCheck = millis();
    checkControl();
  }

  /* ===== MANUAL COMMAND FROM SERIAL MONITOR ===== */
  if (Serial.available()) {
    String manualCmd = Serial.readStringUntil('\n');
    manualCmd.trim();
    if (manualCmd.length() > 0) {
      Serial.println("MANUAL CMD: " + manualCmd);
      arduinoSerial.println(manualCmd);
    }
  }

  /* ===== ARDUINO DATA ===== */
  while (arduinoSerial.available()) {

    char c = arduinoSerial.read();

    if (c == '\n') {

      serialLine.trim();

      if (serialLine.startsWith("class:706")) {

        sendToServer(serialLine);

        /* ===== AC ===== */
        if (serialLine.indexOf("isACReq:true") != -1 && !acLatched) {
          if (sendSMS(AC_NUM, "AC request from Classroom 706"))
            acLatched = true;
        }
        if (serialLine.indexOf("isACReq:false") != -1)
          acLatched = false;

        /* ===== EMERGENCY ===== */
        if (serialLine.indexOf("isEmergencyReq:true") != -1 && !emLatched) {
          if (sendSMS(EM_NUM, "Emergency in Classroom 706")) {
            missedCall(EM_NUM);
            emLatched = true;
          }
        }
        if (serialLine.indexOf("isEmergencyReq:false") != -1)
          emLatched = false;

        /* ===== WASHROOM ===== */
        if (serialLine.indexOf("isWashroomDirty:true") != -1 && !washLatched) {
          if (sendSMS(CLEAN_NUM, "Washroom dirty alert"))
            washLatched = true;
        }
        if (serialLine.indexOf("isWashroomDirty:false") != -1)
          washLatched = false;

        /* ===== TEACHER ABSENT ===== */
        if (serialLine.indexOf("isTeacherAbsent:true") != -1 && !absentLatched) {
          if (sendSMS(HOD_NUM, "Teacher absent in Classroom 706"))
            absentLatched = true;
        }
        if (serialLine.indexOf("isTeacherAbsent:false") != -1)
          absentLatched = false;
      }

      serialLine = "";
    }
    else if (c != '\r') {
      serialLine += c;
    }
  }
}
