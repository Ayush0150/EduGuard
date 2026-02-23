#include <Wire.h>
#include "RTClib.h"

RTC_DS3231 rtc;

/* ========= PINS ========= */
#define PIR_PIN        12
#define MANUAL_BTN      4
#define AC_BTN          5
#define EM_BTN          6

#define TEACHER_LED     7
#define SYSTEM_LED      8
#define AC_LED          9
#define EM_LED         10
#define BUZZER         A2
#define GAS_SENSOR     A0

/* ========= SETTINGS ========= */
#define PERIOD_DURATION      60000UL
#define GRACE_DURATION       10000UL
#define SERIAL_INTERVAL       1000UL
#define MAX_PERIODS             10

#define GAS_HIGH              500
#define GAS_LOW               350

#define ACTIVE_DURATION       3000UL
#define ABSENT_DURATION      10000UL
#define PIR_IGNORE_TIME       1000UL

#define BELL_INTERVAL          200UL
#define SIREN_INTERVAL          80UL
#define DEBOUNCE_TIME           40UL

/* ========= STATE ========= */
unsigned long periodStart = 0;
unsigned long lastSerial = 0;

unsigned long acStart = 0;
unsigned long emStart = 0;
unsigned long dirtyStart = 0;
unsigned long absentStart = 0;
unsigned long bellLast = 0;
unsigned long sirenLast = 0;

int periodNumber = 1;
int periodTime = 0;
int bellToggles = 0;

bool teacherPresent = false;
bool teacherLocked = false;
bool teacherConfirmed = false;

bool teacherAbsentPulse = false;
bool teacherAbsentLatched = false;

bool acActive = false;
bool emActive = false;
bool bellActive = false;

bool acPulse = false;
bool emPulse = false;

bool dirtyActive = false;
bool dirtyLatched = false;

bool rtcOk = true;
bool buzzerState = false;

/* ========= BUTTON CONTROL ========= */
bool acReady = true;
bool emReady = true;
bool manualReady = true;

unsigned long acDebounce = 0;
unsigned long emDebounce = 0;
unsigned long manualDebounce = 0;

/* ========= SAFE SERIAL BUFFER ========= */
char cmdBuffer[40];
byte cmdIndex = 0;

/* ========= GAS ========= */
int readGasAverage() {
  long sum = 0;
  for (byte i = 0; i < 10; i++) {
    sum += analogRead(GAS_SENSOR);
  }
  return sum / 10;
}

/* ========= PERIOD BELL ========= */
void startBell(int count) {
  bellActive = true;
  bellToggles = count * 2;
  bellLast = millis();
  buzzerState = true;
  digitalWrite(BUZZER, HIGH);
}

/* ========= WEB COMMAND HANDLER ========= */
void handleCommand(const char* cmd) {

  if (strcmp(cmd, "AC_REQUEST") == 0) {
    if (!acActive) {
      acActive = true;
      acPulse = true;
      acStart = millis();
      digitalWrite(AC_LED, HIGH);
    }
  }

  else if (strcmp(cmd, "EMERGENCY_REQ") == 0) {
    if (!emActive) {
      emActive = true;
      emPulse = true;
      emStart = millis();
      digitalWrite(EM_LED, HIGH);
      bellActive = false;
      digitalWrite(BUZZER, LOW);
    }
  }

  else if (strcmp(cmd, "WASHROOM_REQUEST") == 0) {
    dirtyLatched = true;
    dirtyActive = true;
    dirtyStart = millis();
  }

  else if (strcmp(cmd, "TEACHER_FORCE_PRESENT") == 0) {
    teacherConfirmed = true;
    teacherPresent = true;
    teacherLocked = true;
    digitalWrite(TEACHER_LED, HIGH);
  }
}

void setup() {

  Serial.begin(9600);

  if (!rtc.begin()) rtcOk = false;

  pinMode(PIR_PIN, INPUT);
  pinMode(MANUAL_BTN, INPUT_PULLUP);
  pinMode(AC_BTN, INPUT_PULLUP);
  pinMode(EM_BTN, INPUT_PULLUP);

  pinMode(TEACHER_LED, OUTPUT);
  pinMode(SYSTEM_LED, OUTPUT);
  pinMode(AC_LED, OUTPUT);
  pinMode(EM_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(SYSTEM_LED, HIGH);

  periodStart = millis();
  startBell(periodNumber);
}

void loop() {

  unsigned long now = millis();

  /* ===== SAFE SERIAL RECEIVE ===== */
  while (Serial.available()) {
    char c = Serial.read();

    if (c == '\n') {
      cmdBuffer[cmdIndex] = '\0';
      handleCommand(cmdBuffer);
      cmdIndex = 0;
    }
    else if (c != '\r' && cmdIndex < sizeof(cmdBuffer) - 1) {
      cmdBuffer[cmdIndex++] = c;
    }
  }

  /* ===== PERIOD RESET ===== */
  if (now - periodStart >= PERIOD_DURATION) {

    periodNumber = (periodNumber % MAX_PERIODS) + 1;
    periodStart = now;

    teacherPresent = false;
    teacherLocked = false;
    teacherConfirmed = false;

    teacherAbsentPulse = false;
    teacherAbsentLatched = false;

    digitalWrite(TEACHER_LED, LOW);
    startBell(periodNumber);
  }

  periodTime = (now - periodStart) / 1000;

  /* ===== BELL ===== */
  if (bellActive && !emActive) {
    if (now - bellLast >= BELL_INTERVAL) {
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
  }

  /* ===== PIR ===== */
  static unsigned long pirHighStart = 0;
  static bool pirValid = false;

  if (now - periodStart > PIR_IGNORE_TIME) {

    if (digitalRead(PIR_PIN)) {
      if (!pirHighStart) pirHighStart = now;
      if (!pirValid && now - pirHighStart >= 300)
        pirValid = true;
    } else {
      pirHighStart = 0;
      pirValid = false;
    }

  } else {
    pirHighStart = 0;
    pirValid = false;
  }

  /* ===== MANUAL ===== */
  if (!digitalRead(MANUAL_BTN) && manualReady &&
      now - manualDebounce > DEBOUNCE_TIME) {

    manualDebounce = now;
    manualReady = false;

    if (periodTime < (GRACE_DURATION / 1000)) {
      teacherConfirmed = true;
      teacherPresent = true;
      digitalWrite(TEACHER_LED, HIGH);
    }
  }
  if (digitalRead(MANUAL_BTN)) manualReady = true;

  /* ===== TEACHER LOGIC ===== */
  if (!teacherLocked) {

    if ((pirValid || teacherConfirmed) &&
        periodTime < (GRACE_DURATION / 1000)) {

      teacherPresent = true;
      teacherConfirmed = true;
      digitalWrite(TEACHER_LED, HIGH);
    }

    if (!teacherPresent &&
        periodTime >= (GRACE_DURATION / 1000)) {

      teacherLocked = true;

      if (!teacherAbsentLatched) {
        teacherAbsentLatched = true;
        teacherAbsentPulse = true;
        absentStart = now;
      }
    }
  }

  if (teacherAbsentPulse &&
      now - absentStart >= ABSENT_DURATION)
    teacherAbsentPulse = false;

  /* ===== AC BUTTON ===== */
  if (!digitalRead(AC_BTN) && acReady &&
      now - acDebounce > DEBOUNCE_TIME && !acActive) {

    acDebounce = now;
    acReady = false;

    acActive = true;
    acPulse = true;
    acStart = now;
    digitalWrite(AC_LED, HIGH);
  }
  if (digitalRead(AC_BTN)) acReady = true;

  if (acActive && now - acStart >= ACTIVE_DURATION) {
    acActive = false;
    acPulse = false;
    digitalWrite(AC_LED, LOW);
  }

  /* ===== EMERGENCY ===== */
  if (!digitalRead(EM_BTN) && emReady &&
      now - emDebounce > DEBOUNCE_TIME && !emActive) {

    emDebounce = now;
    emReady = false;

    emActive = true;
    emPulse = true;
    emStart = now;

    digitalWrite(EM_LED, HIGH);
    bellActive = false;
    digitalWrite(BUZZER, LOW);
  }
  if (digitalRead(EM_BTN)) emReady = true;

  if (emActive) {

    if (now - sirenLast >= SIREN_INTERVAL) {
      sirenLast = now;
      buzzerState = !buzzerState;
      digitalWrite(BUZZER, buzzerState);
    }

    if (now - emStart >= ACTIVE_DURATION) {
      emActive = false;
      emPulse = false;
      digitalWrite(EM_LED, LOW);
      digitalWrite(BUZZER, LOW);
    }
  }

  /* ===== GAS ===== */
  int gasValue = readGasAverage();

  if (gasValue > GAS_HIGH && !dirtyLatched) {
    dirtyLatched = true;
    dirtyActive = true;
    dirtyStart = now;
  }

  if (dirtyActive && now - dirtyStart >= ACTIVE_DURATION)
    dirtyActive = false;

  if (gasValue < GAS_LOW)
    dirtyLatched = false;

  /* ===== SERIAL OUTPUT ===== */
  if (now - lastSerial >= SERIAL_INTERVAL) {

    lastSerial = now;

    int h=0,m=0,s=0;
    if (rtcOk) {
      DateTime t = rtc.now();
      h = t.hour(); m = t.minute(); s = t.second();
    }

    Serial.print("class:706,P:"); Serial.print(periodNumber);
    Serial.print(",PT:"); Serial.print(periodTime);
    Serial.print(",TP:"); Serial.print(teacherPresent);
    Serial.print(",AC:"); Serial.print(acActive);
    Serial.print(",EM:"); Serial.print(emActive);
    Serial.print(",GS:"); Serial.print(gasValue);

    Serial.print(",T:");
    if(h<10) Serial.print("0"); Serial.print(h); Serial.print(":");
    if(m<10) Serial.print("0"); Serial.print(m); Serial.print(":");
    if(s<10) Serial.print("0"); Serial.print(s);

    Serial.print(",isSystemActive:"); Serial.print(rtcOk ? "true":"false");
    Serial.print(",isPresent:"); Serial.print(teacherConfirmed ? "true":"false");

    Serial.print(",isTeacherAbsent:");
    if(periodTime<10) Serial.print("null");
    else Serial.print(teacherAbsentPulse ? "true":"false");

    Serial.print(",isACReq:"); Serial.print(acPulse ? "true":"false");
    Serial.print(",isEmergencyReq:"); Serial.print(emPulse ? "true":"false");
    Serial.print(",isWashroomDirty:"); Serial.print(dirtyActive ? "true":"false");
    Serial.println();
  }
}
