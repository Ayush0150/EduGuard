# EduGuard — Project Presentation & Viva Preparation Guide

---

## PART 1: PRESENTATION SCRIPT (What to Say)

---

### SLIDE 1: Title Slide

**Say:**

> "Good morning/afternoon everyone. My name is Ayush Rai and today I'm presenting **EduGuard** — an IoT-based Smart Classroom Monitoring and Alert System. This is a full-stack project that combines embedded hardware, a real-time backend, and a modern web dashboard to solve real classroom management problems."

---

### SLIDE 2: Problem Statement

**Say:**

> "In traditional educational institutions, there are several recurring problems:
>
> 1. **Teacher attendance tracking is manual and unreliable** — there's no real-time way to know if a teacher has actually arrived in the classroom.
> 2. **Emergency response is slow** — if there's a gas leak or an emergency, the communication chain is long and delayed.
> 3. **No centralised monitoring** — principals, HODs, and security have no dashboard to see what's happening across classrooms in real time.
> 4. **Infrastructure requests depend on verbal complaints** — students requesting AC or reporting washroom issues has no formal, fast channel.
>
> EduGuard solves all of these with a single hardware unit per classroom connected to a central web dashboard via WebSocket."

---

### SLIDE 3: Project Objectives

**Say:**

> "The key objectives of EduGuard are:
>
> 1. **Automated teacher attendance** using PIR motion detection with configurable grace periods.
> 2. **Real-time multi-channel alerts** — SMS, missed calls, buzzer sirens, LED indicators, and web notifications — all triggered automatically.
> 3. **Centralised dashboard** for live monitoring of classroom status, gas levels, attendance, and device health.
> 4. **Remote configuration** — every parameter on the hardware can be changed from the web dashboard, no physical access needed.
> 5. **Comprehensive analytics** — event logging, reports with date filters, and export to PDF, Excel, CSV, and JSON.
> 6. **Role-based secure access** — 6-role hierarchy with admin two-factor authentication."

---

### SLIDE 4: System Architecture

**Say:**

> "Let me walk you through the architecture. EduGuard has three main layers:
>
> **Layer 1 — Hardware (ESP32 Microcontroller):**
> The ESP32 is the brain of each classroom unit. It connects to a PIR motion sensor for teacher presence, an MQ gas sensor for air quality, three physical buttons for manual attendance, AC requests, and emergency triggers, a buzzer for bells and sirens, four LEDs for status indication, a DS3231 RTC for precision timekeeping, and a SIM800L GSM module for sending SMS alerts and making missed calls.
>
> **Layer 2 — Backend Server (Node.js + Express + MongoDB):**
> The server runs on port 8080 and hosts both the REST API and a WebSocket server. It handles authentication, event logging, SMS counter persistence, and acts as the relay between the ESP32 hardware and the web dashboard.
>
> **Layer 3 — Web Dashboard (React + Vite + Tailwind CSS):**
> A modern single-page application that provides real-time monitoring, device settings, analytics reports, user management, and an AI chatbot assistant.
>
> The communication flow is: ESP32 sends JSON telemetry at 1 Hz over WebSocket → Server broadcasts to all connected dashboards → Dashboard can send control commands back through the server to the ESP32 → ESP32 acknowledges every command."

---

### SLIDE 5: Hardware Design

**Say:**

> "On the hardware side, the ESP32 runs a 1,800-line Arduino firmware. I want to highlight some key design decisions:
>
> **Zero-blocking architecture** — traditional Arduino code uses `delay()` which freezes everything. EduGuard uses a custom `socketAwareWait()` function that continues processing WebSocket messages, telemetry, and classroom logic even during waits. This means the system never misses a command or sensor reading.
>
> **Watchdog Timer** — a 10-second hardware watchdog ensures the system recovers automatically from any hang or crash.
>
> **Anti-spam SMS latching** — each alert type can only trigger one SMS per activation cycle. Even if a sensor oscillates, you won't get 50 texts.
>
> **NVS Persistence** — all 30+ configuration settings and SMS counters are saved to the ESP32's non-volatile flash memory. If power is lost or firmware is re-uploaded, everything is preserved.
>
> **Gas detection with hysteresis** — instead of a simple threshold, I use a 10-sample moving average, a 5-second sustained-high confirmation, and a separate lower reset threshold with 300-point hysteresis. This eliminates false alarms from sensor noise.
>
> **Teacher attendance with PIR** — the PIR signal must remain stable for 120 milliseconds before counting as valid detection. There's a configurable grace period after each period starts. If no presence is detected within the grace period, the teacher is marked absent, an SMS is sent immediately, and physical inputs are locked — only the dashboard can override this."

---

### SLIDE 6: Backend Architecture

**Say:**

> "The backend follows a modular architecture. Let me highlight the key components:
>
> **Authentication system** — supports 6 roles: Super Admin, Admin, Principal, Security, Maintenance, and User. Admin login uses **two-factor authentication** — after entering credentials, a 6-digit OTP is sent via email, which must be verified within 5 minutes.
>
> **Password security** — all passwords are hashed with bcrypt at 12 salt rounds. OTPs are SHA-256 hashed before storage. There's brute-force protection with account lockout after 10 failed attempts.
>
> **Rate limiting** — login attempts are limited to 20 per 15 minutes, OTP requests to 3 per minute, and general API calls to 100 per 15 minutes.
>
> **WebSocket server** — handles device registration, telemetry relay, command routing, and heartbeat monitoring. If a device goes silent for 15 seconds, it's automatically marked offline.
>
> **SMS counter persistence** — this is interesting. The ESP32 maintains volatile SMS counters that reset on reboot. The server is the authoritative source of truth. It uses a **delta-based algorithm** — it computes the difference between the incoming device counter and the last known value, then adds only the delta to the server total. This means device reboots don't lose the count.
>
> **Event deduplication** — events have a 3-second dedup window to prevent near-simultaneous duplicate entries from network retries.
>
> **Input sanitization** — all user inputs are stripped of HTML tags and JavaScript protocol handlers to prevent XSS attacks."

---

### SLIDE 7: Frontend Dashboard

**Say:**

> "The dashboard is built with React 19 and provides these main sections:
>
> **Live Monitoring Dashboard** — shows real-time classroom data: teacher presence, current period, gas level, all sensor states. Data updates at 1 Hz via WebSocket with freshness tracking — if no data arrives for 12 seconds, the device is shown as offline.
>
> **GSM Module Page** — displays signal strength, carrier info, battery voltage, registration status, SIM details, and SMS analytics (today and this month) with pulse animations.
>
> **Reports Page** — full analytics with date range filters, 6 metric cards for different event types, a paginated event table, and **4 export formats**: PDF with auto-table formatting using jsPDF, Excel using SheetJS, CSV, and raw JSON.
>
> **Settings Page** — this is the most powerful page. You can configure every single ESP32 parameter remotely: phone numbers for each alert type, period duration, grace period, gas threshold, feature toggles, SMS templates with live placeholder preview, classroom number, and even schedule automatic reboots. Every change is sent over WebSocket with command acknowledgement.
>
> **Admin Panel** — user CRUD operations with role-based access control. Only super admins can create, edit, or delete users.
>
> **Built-in Chatbot** — a floating AI assistant on every page that answers questions about the system using keyword-based NLP with 20+ intents. It can query the events database and provide contextual responses."

---

### SLIDE 8: Key Features Demo Flow

**Say (while showing live demo):**

> "Let me walk you through the key workflows:
>
> 1. **System boots** → ESP32 connects to WiFi, establishes WebSocket, registers with device ID, sends initial telemetry burst.
> 2. **Period starts** → Grace timer begins. If the PIR detects the teacher within grace period, LED turns on, teacher is marked present.
> 3. **Grace expires, no teacher** → Teacher marked absent, SMS sent immediately to HOD's phone, buzzer sounds, status shows on dashboard.
> 4. **Emergency button pressed** → Siren sound activates, SMS sent, then missed call made to emergency number. Dashboard shows emergency alert.
> 5. **Gas level rises** → After 5 seconds of sustained high reading (with 10-sample averaging), SMS is sent, dashboard shows gas alert.
> 6. **Dashboard override** → Admin clicks 'Mark Present' on dashboard → command goes to ESP32 → ESP32 unlocks attendance → acknowledges back.
> 7. **Settings change** → Change phone number on Settings page → saved to ESP32's NVS flash instantly."

---

### SLIDE 9: Security Measures

**Say:**

> "Security was a primary concern throughout development:
>
> - **JWT authentication** with proper issuer, audience claims, and minimal payload design
> - **Admin two-factor authentication** via email OTP
> - **bcrypt password hashing** with 12 salt rounds
> - **Rate limiting** at multiple granularities — login, OTP, password reset, general API
> - **Brute-force protection** with account lockout
> - **Helmet middleware** for security headers — Content Security Policy, HSTS, X-Content-Type-Options
> - **Input sanitization** — strips HTML, script injection, and limits payload size to 1000 characters
> - **Zod validation** on all request bodies — type-safe schema validation
> - **CORS** with strict origin policy in production
> - **WebSocket protocol validation** — only valid JSON packets are processed, malformed data is dropped
> - **Request tracing** — every request gets a unique ID for audit logging"

---

### SLIDE 10: Technology Stack Summary

**Say:**

> "To summarise the technology stack:
>
> | Layer     | Technologies                                                             |
> | --------- | ------------------------------------------------------------------------ | --- |
> | Hardware  | ESP32, DS3231 RTC, SIM800L GSM, PIR HC-SR501, MQ Gas Sensor              |
> | Firmware  | Arduino C++, WebSocketsClient, Preferences (NVS), WDT                    |
> | Backend   | Node.js, Express 5, Mongoose 9, ws, JWT, bcrypt, Zod, Helmet, Nodemailer |
> | Frontend  | React 19, Vite 7, Tailwind CSS 3, React Router 7, Axios, jsPDF, SheetJS  |
> | Database  | MongoDB Atlas (4 collections)                                            |
> | Protocols | WebSocket (real-time), REST API (CRUD), SMTP (email), GSM (SMS + voice)  | "   |

---

### SLIDE 11: Challenges & Solutions

**Say:**

> "Some key challenges I faced:
>
> 1. **Boot-time false absent SMS** — When the ESP32 boots, the `millis()` timer already shows ~17 seconds by the time GSM initialises. This exceed the grace period and triggered a false absent alert. Solution: I set the period start time early in the boot sequence.
> 2. **SMS counters resetting on reboot** — Since ESP32 volatile memory clears on restart. Solution: Two-layer approach — NVS persistence on the ESP32, plus delta-based server-side tracking as the authoritative source.
> 3. **Gas sensor noise** — Raw analog readings are noisy. Solution: 10-sample averaging, throttled reads at 250ms intervals, and hysteresis-based state transitions with time confirmation.
> 4. **WebSocket reliability** — Connections drop due to WiFi issues. Solution: Auto-reconnect with exponential backoff on the client, heartbeat monitoring with stale connection cleanup on the server.
> 5. **Race conditions in period transitions** — Stale timing variables from the previous period could trigger false absent alerts at the start of new periods. Solution: Explicit variable reset at period boundaries."

---

### SLIDE 12: Future Scope

**Say:**

> "The system can be extended with:
>
> - **Multi-classroom deployment** — central dashboard monitoring all rooms simultaneously
> - **Face recognition** for teacher identification instead of PIR
> - **Mobile app** with push notifications
> - **CCTV integration** for visual attendance verification
> - **Analytics ML** for predicting absenteeism patterns
> - **Solar + battery backup** for power-independent operation
> - **LoRa mesh networking** for buildings without WiFi coverage"

---

### SLIDE 13: Conclusion

**Say:**

> "EduGuard demonstrates a complete IoT ecosystem — from hardware sensors to cloud-connected dashboards. It solves real problems in educational institutions with reliable, automated monitoring and multi-channel alerting. The system is fully configurable, secure, and built for real-world deployment. Thank you."

---

---

## PART 2: VIVA QUESTIONS & ANSWERS (50 Questions)

---

### Category 1: Project Overview

**Q1: What is EduGuard?**

> EduGuard is an IoT-based Smart Classroom Monitoring and Alert System. It uses an ESP32 microcontroller with multiple sensors to monitor teacher attendance, detect emergencies, track air quality, and handle student requests. All data is sent in real-time via WebSocket to a Node.js backend that relays it to a React web dashboard.

**Q2: What problem does your project solve?**

> It solves four main problems: (1) manual and unreliable teacher attendance tracking, (2) slow emergency response in classrooms, (3) lack of centralised real-time monitoring for administrators, and (4) no formal system for infrastructure requests like AC or washroom alerts.

**Q3: What makes your project different from existing solutions?**

> Most attendance systems are manual or use biometric at the door. EduGuard tracks actual in-classroom presence using PIR sensors. It combines attendance, gas detection, emergency alerts, and facility requests into a single hardware unit. It has multi-channel alerting (SMS + missed call + buzzer + web), full remote configuration, and enterprise-grade security with role-based access control.

**Q4: What is the scope of this project?**

> It covers the full IoT stack: hardware (sensor integration, GSM module, RTC clock), firmware (1800 lines of Arduino C++), backend (REST API + WebSocket server + MongoDB), and frontend (React SPA with real-time dashboard, reports, admin panel). It's production-ready for single-classroom deployment and architecturally designed for multi-classroom scaling.

**Q5: Who are the target users?**

> Primarily educational institutions — school/college administrators, principals, HODs, and security staff. The 6-role system (Super Admin, Admin, Principal, Security, Maintenance, User) maps directly to institutional hierarchy.

---

### Category 2: Hardware & IoT

**Q6: Why did you choose ESP32 over Arduino Uno or Raspberry Pi?**

> ESP32 has built-in WiFi and Bluetooth, dual-core processor at 240 MHz, 520 KB SRAM, NVS flash storage, hardware watchdog timer, and costs around ₹500. Arduino Uno lacks WiFi and has only 2 KB RAM — not enough for WebSocket communication. Raspberry Pi is overkill and costs 5x more for this use case.

**Q7: How does PIR-based attendance work?**

> The PIR sensor (HC-SR501) detects infrared radiation changes caused by human movement. When a period starts, a grace timer begins. If the PIR detects stable motion (HIGH for at least 120ms to filter noise), the teacher is marked present. If the grace period expires with no detection, the teacher is latched as absent and an SMS is immediately sent.

**Q8: What happens after a teacher is marked absent?**

> The `absentLatched` flag is set to `true`. This prevents physical inputs (PIR and manual button) from changing the status — only the dashboard's "Force Present" command can override it. An SMS is sent to the HOD's phone number immediately. The dashboard shows the absent status persistently until the next period resets everything.

**Q9: How does your gas detection avoid false alarms?**

> I use a four-layer approach: (1) 10-sample moving average to smooth noise, (2) reads throttled to every 250ms to reduce jitter, (3) 5-second sustained-high confirmation before triggering, (4) hysteresis — triggers at `threshold` but only resets at `threshold - 300`. This prevents oscillation at the boundary.

**Q10: What is the SIM800L and how do you use it?**

> SIM800L is a GSM/GPRS module that provides cellular network access via a SIM card. I use it for two purposes: sending SMS alerts (for teacher absent, emergency, AC request, gas alert) using AT commands, and making missed calls to the emergency contact. It communicates with the ESP32 via UART at 9600 baud.

**Q11: What is NVS and why do you use it?**

> NVS stands for Non-Volatile Storage — it's the ESP32's flash-based key-value store (similar to EEPROM but more robust). I store all 30+ configuration parameters (phone numbers, timing values, thresholds, feature toggles, SMS templates, classroom ID) and SMS counters there, so they survive power cycles, reboots, and even firmware re-uploads.

**Q12: What is a Watchdog Timer and why is it needed?**

> A Watchdog Timer (WDT) is a hardware countdown timer that automatically resets the MCU if it isn't periodically "kicked" (fed/reset). I set a 10-second WDT. If the firmware hangs due to a bug, infinite loop, or hardware issue, the WDT triggers a reset and the system recovers automatically. My `socketAwareWait()` function feeds the WDT on every iteration.

**Q13: What sensors and actuators are in your system?**

> Sensors: PIR motion sensor (pin 27), MQ gas sensor (analog pin 34), DS3231 RTC (I²C). Actuators: buzzer (pin 26) for bells and sirens, 4 LEDs — Teacher (25, green), System (33), AC (18), Emergency (19). User input: 3 push buttons — manual attendance (14), AC request (12), emergency (13), all debounced at 40ms.

**Q14: How does the period bell system work?**

> The buzzer rings a pattern matching the current period number — period 3 gets 3 beeps. The firmware tracks period transitions using the configured duration. When a period ends, it auto-advances the period counter, plays the bell, resets all attendance flags, and starts the grace timer for the new period.

---

### Category 3: Backend & Database

**Q15: Why Node.js with Express?**

> Node.js is ideal for IoT backends because of its event-driven, non-blocking I/O model — perfect for handling WebSocket connections from multiple devices simultaneously. Express provides a minimal, fast HTTP framework. The `ws` library gives raw WebSocket performance without Socket.IO overhead.

**Q16: Why MongoDB over SQL databases?**

> IoT telemetry data is semi-structured and varies by sensor type. MongoDB's flexible schema handles this naturally. It also has excellent performance for write-heavy workloads (1 Hz telemetry from each device), good aggregation pipeline for analytics, and Mongoose provides type safety and validation.

**Q17: Explain your WebSocket architecture.**

> The server runs a single `WebSocketServer` on port 8080 alongside Express. Devices send a `register` message with their ID. The server maintains a `Map<deviceId, WebSocket>` for routing. Telemetry messages from devices are broadcast to all non-device (dashboard) clients. Control commands from dashboards are routed to the target device. ACK messages from devices are broadcast back to dashboards.

**Q18: How does the SMS counter delta algorithm work?**

> The server stores: `smsToday` (authoritative total), `lastDeviceToday` (last raw value from ESP32). When new telemetry arrives with `incomingToday=5` and `lastDeviceToday=3`, delta = 5-3 = 2. Server adds 2 to its authoritative total. If the device reboots and sends `incomingToday=1` (less than `lastDeviceToday=5`), the server knows it restarted and uses `incomingToday` as the delta instead.

**Q19: How do you handle authentication?**

> Standard users log in with username/password → receive a JWT token. Admin users have two-factor authentication: first they enter credentials, then receive a 6-digit OTP via email (valid for 5 minutes, SHA-256 hashed before storage). After OTP verification, they receive their JWT. All routes check the JWT in the Authorization header and verify the user's role.

**Q20: What are the 6 roles and how do they work?**

> SUPER_ADMIN (full access), ADMIN (user management), PRINCIPAL (reports + monitoring), SECURITY (monitoring), MAINTENANCE (device management), USER (basic dashboard). Each API route specifies required roles. The `auth` middleware decodes the JWT, verifies the role against the allowed list, and rejects unauthorized requests.

**Q21: How do you prevent brute-force attacks?**

> Three layers: (1) Rate limiting — 20 login attempts per 15 minutes per IP, (2) Login attempt store — tracks consecutive failures per username, locks account after 10 failures, (3) OTP rate limiting — only 3 OTP requests per minute. Additionally, passwords use bcrypt with 12 salt rounds making offline cracking extremely slow.

**Q22: Explain your event deduplication.**

> When an event is created, the server checks for any existing event of the same type, device, and timestamp within a 3-second window. If a duplicate is found, it returns the existing event instead of creating a new one. This prevents network retries or rapid re-transmissions from creating duplicate entries.

**Q23: How does the heartbeat mechanism work?**

> The server pings every WebSocket client every 10 seconds. Each client has a `isAlive` flag that's set to `true` on pong. Before the next ping, any client with `isAlive=false` is terminated (dead connection). For devices, the server also sends a `device_status: offline` message to all dashboards.

---

### Category 4: Frontend & UI

**Q24: Why React with Vite?**

> React 19 is the industry standard for SPAs with the largest ecosystem. Vite provides near-instant hot module replacement during development, ES module-based dev server (no bundling during dev), and optimised production builds. Together they provide the best developer experience and performance.

**Q25: How does the real-time dashboard work?**

> A `TelemetryProvider` context wraps all dashboard pages. On mount, it opens a WebSocket connection. Incoming telemetry (key=value format) is parsed into React state and distributed to all child components via context. A freshness watchdog (12-second timeout with 3-tick debounce) marks the device as offline if no data arrives. Last telemetry is cached in localStorage (throttled at 5s) for instant page loads.

**Q26: How do you handle WebSocket reconnection?**

> Exponential backoff — starts at 1 second, doubles each attempt up to 30 seconds. An `onclose` handler triggers a reconnect timer. The `onopen` handler immediately requests current device config. The UI shows connection status (connected/reconnecting/offline) with coloured indicators.

**Q27: How does the reports export work?**

> Four formats: (1) **PDF** using jsPDF with auto-table plugin — generates properly formatted tables with headers, (2) **Excel** using SheetJS (xlsx library) — creates .xlsx workbooks, (3) **CSV** — plain comma-separated text, (4) **JSON** — raw event data. All support date-range filtering and event type filtering.

**Q28: What is the Settings page capable of?**

> It can remotely configure: 4 phone numbers (emergency, absent, AC, washroom), period duration, grace period, total periods, gas threshold, classroom number, emergency buzzer duration, hardware/GSM/call feature toggles, auto-reboot schedule, 4 SMS templates with live placeholder preview, factory reset, and system restart. Every change is sent via WebSocket with ACK confirmation.

**Q29: How does the chatbot work?**

> It uses keyword-based NLP on the server. Messages are matched against 20+ intent patterns (attendance, gas, emergency, reports, etc.). The chatbot can query the MongoDB events database for contextual responses. If no intent matches, it provides a helpful fallback. Responses are rendered with markdown-lite formatting on the frontend.

---

### Category 5: Communication Protocols

**Q30: Why WebSocket over HTTP polling or MQTT?**

> WebSocket provides full-duplex, persistent connection with minimal overhead — ideal for 1 Hz telemetry. HTTP polling would waste bandwidth with constant requests. MQTT requires a separate broker (Mosquitto) and adds infrastructure complexity. WebSocket over the existing HTTP server keeps the architecture simpler while providing real-time bidirectional communication.

**Q31: What is the message protocol format?**

> All messages are JSON with a `type` field: `register` (device announces itself), `telemetry` (sensor data with `category` and `payload` fields), `control` (command from dashboard with `command` field), `control_ack` (device confirms execution), `device_status` (server sends online/offline events).

**Q32: How does the ESP32 communicate with SIM800L?**

> Via UART (Serial) at 9600 baud. The ESP32 sends AT commands (industry-standard modem commands): `AT+CMGF=1` sets SMS text mode, `AT+CMGS="number"` starts SMS sending, `ATD number;` makes a voice call. Responses are parsed with a custom `smartFindAny()` function that watches for success/error markers with timeout.

**Q33: How is telemetry structured?**

> Six categories: (1) **arduino** — classroom state (period, attendance, gas, button states) at 1 Hz, (2) **wifi** — RSSI, IP, channel, SSID every 15s, (3) **gsm** — signal, carrier, battery, registration every 10s, (4) **esp** — heap, temperature, CPU frequency every 1s, (5) **device** — firmware version, chip info (once after connect), (6) **config** — all settings (once after connect and on change).

---

### Category 6: Security

**Q34: How are passwords stored?**

> Passwords are hashed using bcrypt with 12 salt rounds before storage. Bcrypt internally generates a random salt, so identical passwords produce different hashes. During login, the plaintext password is compared against the stored hash using `bcrypt.compare()`. Raw passwords are never stored or logged.

**Q35: How does your JWT implementation work?**

> I use `jsonwebtoken` library. The token payload contains only `sub` (user ID) and `role` — minimal by design. The token includes `issuer` and `audience` claims for validation. The signing secret is validated at startup to ensure minimum length. Tokens have explicit expiry times. In production, the secret must meet security requirements.

**Q36: What is Helmet and what does it protect against?**

> Helmet is an Express middleware that sets HTTP security headers: Content-Security-Policy (prevents XSS by restricting script sources), Strict-Transport-Security (forces HTTPS), X-Content-Type-Options (prevents MIME sniffing), X-Frame-Options (prevents clickjacking), and removes X-Powered-By (hides technology stack).

**Q37: How do you validate user input?**

> Two layers: (1) **Zod schemas** — define expected shapes, types, and constraints for all request bodies. Invalid requests are rejected with specific error messages before reaching business logic. (2) **Sanitization middleware** — strips HTML tags, `javascript:` protocol, and limits input length to 1000 characters.

**Q38: What OWASP Top 10 vulnerabilities have you addressed?**

> (1) Broken Access Control → role-based middleware on every route, (2) Cryptographic Failures → bcrypt + JWT + SHA-256 OTP hashing, (3) Injection → Zod validation + Mongoose parameterized queries + input sanitization, (4) Insecure Design → principle of least privilege, minimal JWT payload, (5) Security Misconfiguration → Helmet, CORS, production env checks, (6) Identification/Auth Failures → 2FA, brute-force protection, rate limiting, (7) Software Integrity → explicit dependency versions.

---

### Category 7: Database Design

**Q39: What collections does your database have?**

> Four collections: (1) **users** — usernames, emails, hashed passwords, roles, active status, OTP hashes, reset tokens, (2) **events** — classroom events with type, category, severity, meta, device ID, timestamps (indexed), (3) **smscounters** — per-device SMS tracking with day/month totals and delta-based sync fields, (4) **suggestions** — user feedback with name, message, category, and workflow status.

**Q40: How do you handle day/month counter rollovers?**

> The server stores `lastDailyReset` (date string) and `lastMonthlyReset` (month string). On each telemetry update, it compares the current date against these stored dates. If the day changed, the daily counter resets. If the month changed, both counters reset. The fields are backfilled on first use to prevent false rollovers from empty legacy records.

**Q41: What is your indexing strategy?**

> Events are indexed on `type`, `device`, and `ts` (timestamp) for fast filtering and range queries in the reports page. Users are indexed on `username` and `email` for unique lookups. SMS counters are indexed on `device` for per-device lookups. These indexes optimize the most frequent query patterns.

---

### Category 8: Architecture & Design Patterns

**Q42: What design patterns have you used?**

> (1) **Observer pattern** — WebSocket pub/sub for telemetry broadcast, (2) **Factory pattern** — `createApp()` function builds the Express instance with all middleware, (3) **Module pattern** — each feature (auth, admin, events, sms) is a self-contained module with controller/service/routes/validation, (4) **Context pattern** — React Context for global telemetry state, (5) **Command pattern** — WebSocket control messages as command objects with ACK responses.

**Q43: How is your server code organized?**

> It follows a modular layered architecture: `core/` contains shared infrastructure (config, database, auth middleware, security utilities, validation). `modules/` contains feature modules, each with its own controller (HTTP handlers), service (business logic), routes (Express router), and validation (Zod schemas). This separation of concerns makes each module independently testable and modifiable.

**Q44: What is the difference between REST API and WebSocket in your project?**

> REST API handles stateless operations: login, user management, event queries, report data. These are request-response with authentication. WebSocket handles real-time operations: live telemetry streaming, device control commands, acknowledgements, and device status notifications. These require persistent connections and bidirectional communication.

---

### Category 9: Testing & Debugging

**Q45: How did you test the system?**

> (1) Hardware testing — physical sensor triggers with Serial Monitor output, (2) WebSocket testing — `test_temp.cjs` script simulates an ESP32 device, (3) API testing — Postman/curl for all REST endpoints, (4) End-to-end — full flow from hardware to dashboard with SMS verification, (5) Edge cases — boot-time races, period transitions, device reboots, network disconnections.

**Q46: What were the trickiest bugs?**

> (1) Boot-time false absent — `millis()` was already 17 seconds during GSM init, exceeding grace period. Fixed by setting `periodStart = millis()` early in setup. (2) Period-transition stale timing — `periodTime` variable was computed before the period reset but used after, holding a stale value. Fixed by resetting to zero in the period transition block. (3) Missing import — `patchPayloadWithAuthCounters` was called but never imported, silently failing and causing SMS counters to show 0.

---

### Category 10: Advanced / Conceptual

**Q47: How would you scale this to 100 classrooms?**

> (1) Each ESP32 registers with a unique device ID (`CLASSROOM-<room>`). The server already routes by device ID. (2) MongoDB handles concurrent writes well. (3) Add Redis for WebSocket pub/sub if multiple server instances are needed. (4) Dashboard already filters by device — add a room selector dropdown. (5) Consider MQTT with a broker for more efficient fan-out at scale.

**Q48: What are the limitations of your system?**

> (1) PIR detects motion, not identity — can't distinguish teacher from student. (2) Single device per classroom — no redundancy. (3) GSM module is 2G — carrier support is declining in some regions. (4) WiFi dependency — no offline fallback for dashboard access. (5) SMS charges — each alert costs money.

**Q49: How does your system handle power failure?**

> ESP32 restarts automatically when power returns. NVS flash retains all configuration. The server's MongoDB retains all event history and SMS counter totals. The delta-based counter algorithm handles the device sending fresh counts from zero. The dashboard detects the device as offline during the outage and shows the last cached data.

**Q50: If you had 6 more months, what would you add?**

> (1) RFID/NFC teacher identification cards for positive identification, (2) Mobile app with push notifications (React Native), (3) Historical trend analysis with charts and predictions, (4) Video integration — snapshot on emergency for verification, (5) Voice alerts through classroom speakers, (6) Battery backup with UPS for the ESP32 unit, (7) OTA firmware updates via WiFi instead of USB re-upload.

---

---

## PART 3: QUICK REFERENCE CARD (For Last-Minute Revision)

### Numbers to Remember

- **1,800+ lines** of Arduino firmware
- **6 roles** in the access control system
- **4 alert types** (Emergency, Teacher Absent, AC Request, Gas/Washroom)
- **4 export formats** (PDF, Excel, CSV, JSON)
- **6 telemetry categories** (arduino, wifi, gsm, esp, device, config)
- **30+ remote settings** configurable from dashboard
- **1 Hz** telemetry rate
- **12** bcrypt salt rounds
- **10-second** watchdog timer
- **120ms** PIR stable-time filter
- **10-sample** gas averaging window
- **3-second** event deduplication window
- **5-minute** OTP expiry
- **4 MongoDB collections** (users, events, smscounters, suggestions)

### Tech Stack One-Liner

> "ESP32 with Arduino C++, Node.js + Express for the backend, React + Vite for the frontend, MongoDB for the database, WebSocket for real-time communication, and SIM800L GSM for SMS alerts."

### One-Sentence Project Summary

> "EduGuard is an IoT-based smart classroom monitoring system that uses an ESP32 microcontroller with PIR, gas, and GSM sensors to automate teacher attendance tracking, emergency alerts, and facility requests, with real-time data displayed on a secure React dashboard connected via WebSocket."

---

**Good luck with your presentation! You've built an impressive full-stack IoT project.**
