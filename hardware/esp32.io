#include <WiFi.h>
#include <HTTPClient.h>

HardwareSerial arduinoSerial(2);

#define RXD2 16
#define TXD2 17

const char* ssid     = "ACTFIBERNET";
const char* password = "act12345";

const char* serverURL = "http://192.168.0.112:8080/device";

String incomingLine = "";

void setup() {

  Serial.begin(115200);
  arduinoSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  Serial.println("WiFi Connected");
  Serial.println(WiFi.localIP());
}

void loop() {

  while (arduinoSerial.available()) {

    char c = arduinoSerial.read();

    if (c == '\n') {

      incomingLine.trim();

      if (incomingLine.length() > 10 && WiFi.status() == WL_CONNECTED) {

        HTTPClient http;
        http.begin(serverURL);
        http.addHeader("Content-Type", "text/plain");

        int httpCode = http.POST(incomingLine);

        Serial.println("Sent: " + incomingLine);
        Serial.println("HTTP Code: " + String(httpCode));

        http.end();
      }

      incomingLine = "";
    }
    else if (c != '\r') {
      incomingLine += c;
    }
  }
}
