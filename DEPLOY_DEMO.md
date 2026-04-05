# EduGuard Hardware Demo Deployment Guide

This guide is for a free demo deployment, not a production deployment.

Recommended stack:

- Frontend: Render Static Site
- Backend: Render Web Service
- Database: MongoDB Atlas Free (M0)
- Login for demo: regular demo user
- Hardware for demo: original ESP32 board

Important demo limits:

- Render free web services spin down after 15 minutes of inactivity.
- Render free web services cannot send SMTP on ports `25`, `465`, or `587`.
- Because of that, admin OTP email login will not work on Render free unless you replace SMTP with an HTTP email provider.
- Once your ESP32 is connected and sending heartbeat/telemetry over WebSocket, it should keep the free backend awake because Render counts WebSocket traffic as inbound traffic.

## 1. Create accounts

Create free accounts on:

- Render
- MongoDB Atlas
- GitHub, if your repo is not already on GitHub

## 2. Push this project to GitHub

From the project root:

```bash
git add .
git commit -m "Prepare EduGuard for demo deployment"
git push
```

If your repo is not connected to GitHub yet, create a GitHub repo first, then:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

## 3. Create a free MongoDB Atlas database

1. Log in to MongoDB Atlas.
2. Create a new project.
3. Create a free `M0` cluster.
4. Create a database user and save the username and password.
5. In Network Access, add `0.0.0.0/0` for the demo.
6. Copy the connection string.
7. Replace `<password>` in the connection string with your actual password.

Example:

```text
mongodb+srv://demo-user:YourPassword@cluster0.xxxxx.mongodb.net/eduguard?retryWrites=true&w=majority
```

## 4. Create the backend on Render

1. Open Render Dashboard.
2. Click `New` -> `Web Service`.
3. Connect your GitHub repo.
4. Select the repo.
5. Configure:

```text
Name: eduguard-api
Root Directory: server
Environment: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

6. Add environment variables:

```text
NODE_ENV=production
PORT=10000
MONGODB_URI=<your atlas connection string>
JWT_SECRET=<a long random secret, 32+ chars>
DEVICE_WS_SECRET=<a long random secret for the ESP32, 16+ chars>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=<your frontend URL, add later after frontend is created>
SUPER_ADMIN_EMAIL=admin@example.com
```

Notes:

- Do not add SMTP variables for the free demo unless you move away from Render free SMTP restrictions.
- Render injects its own port, but setting `PORT=10000` is still a clean default for this app.

7. Deploy the service.
8. After deploy succeeds, open:

```text
https://your-backend.onrender.com/health
```

It should return JSON showing the API is alive.

## 5. Create the frontend on Render

1. In Render Dashboard, click `New` -> `Static Site`.
2. Connect the same GitHub repo.
3. Configure:

```text
Name: eduguard-web
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: dist
```

4. Add environment variables:

```text
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

5. Deploy the site.
6. Copy the frontend URL.

## 6. Update backend CORS

Go back to the backend Render service and set:

```text
CLIENT_ORIGIN=https://your-frontend.onrender.com
```

Then redeploy the backend service.

## 7. Create a demo login user

Run this locally from the project root:

```bash
cd server
MONGODB_URI="<your atlas connection string>" npm run create-demo-user
```

Default demo credentials created by the script:

```text
Email: demo@eduguard.local
Username: demo-user
Password: Demo@1234
Role: USER
```

You can customize them:

```bash
cd server
MONGODB_URI="<your atlas connection string>" \
DEMO_USER_EMAIL="demo@example.com" \
DEMO_USER_USERNAME="demo-user" \
DEMO_USER_PASSWORD="Demo@1234" \
DEMO_USER_ROLE="USER" \
npm run create-demo-user
```

## 8. Log in to the hosted demo

Open the frontend URL and use the normal user login page:

```text
/login
```

Use the demo user credentials you created in step 7.

Do not use admin login for the free Render demo unless you have replaced the OTP email system.

## 9. Connect the original ESP32 hardware

Open [hardware/esp32.ino](/Users/ayushrai/Projects/EduGuard/hardware/esp32.ino).

At the top of the file, update these values:

```cpp
const char* ssid       = "YOUR_WIFI_NAME";
const char* password   = "YOUR_WIFI_PASSWORD";
const char* ws_host    = "your-backend.onrender.com";
const char* ws_device_secret = "CHANGE_ME_DEVICE_SECRET";
const uint16_t ws_port = 443;
const char* ws_path    = "/";
const bool ws_use_tls  = true;
```

Use your real backend hostname only. Example:

```cpp
const char* ws_host = "eduguard-api.onrender.com";
```

Important:

- Do not put `https://` or `wss://` into `ws_host`.
- `ws_device_secret` must exactly match backend `DEVICE_WS_SECRET`.
- Keep `ws_port = 443`.
- Keep `ws_use_tls = true` for hosted internet use.
- The firmware now uses a built-in CA certificate for secure `wss` connections.

## 10. Upload the firmware to the ESP32

In Arduino IDE:

1. Install or confirm these libraries:
   - `WebSockets` by Markus Sattler / Links2004
   - `RTClib`
2. Select the correct board, usually `ESP32 Dev Module`.
3. Select the correct serial port.
4. Open [hardware/esp32.ino](/Users/ayushrai/Projects/EduGuard/hardware/esp32.ino).
5. Click `Verify`.
6. Click `Upload`.

If upload succeeds, open the Serial Monitor at `115200`.

## 11. Confirm the ESP32 connects to the hosted backend

In the Serial Monitor, you want to see:

- Wi-Fi connected
- secure WebSocket connection attempt
- device registration
- ongoing telemetry activity

Then open your hosted frontend and log in with the demo user.

After the board connects, your dashboard should begin showing live telemetry from the real device.

## 12. If the dashboard does not show data

Check these first:

1. The ESP32 and your laptop/phone are on internet-connected Wi-Fi.
2. `ws_host` exactly matches the backend hostname.
3. You did not include `https://` in `ws_host`.
4. `ws_port` is `443`.
5. `ws_use_tls` is `true`.
6. The backend `/health` URL works in the browser.
7. The frontend env vars are correct:
   - `VITE_API_BASE_URL=https://your-backend.onrender.com`
   - `VITE_WS_URL=wss://your-backend.onrender.com`

## 13. Demo checklist

Before presenting:

1. Open the backend `/health` URL and confirm it works.
2. Open the frontend and log in with the demo user.
3. Power the ESP32 and confirm it joins Wi-Fi.
4. Confirm live telemetry appears in the dashboard.
5. Check Dashboard, GSM, WiFi, Reports, and Settings pages.
6. If the backend slept before the board connected, wait for Render to spin it back up.

## 14. Common issues

### Frontend loads, but login or API calls fail

Check:

- `VITE_API_BASE_URL`
- backend service is awake
- backend `CLIENT_ORIGIN` exactly matches the frontend URL

### Dashboard loads, but live telemetry never connects

Check:

- `VITE_WS_URL=wss://your-backend.onrender.com`
- backend is awake
- browser console for WebSocket errors
- ESP32 Serial Monitor output

### ESP32 never connects

Check:

- Wi-Fi name and password in [esp32.ino](/Users/ayushrai/Projects/EduGuard/hardware/esp32.ino)
- `ws_host` is only the hostname
- `ws_port=443`
- `ws_use_tls=true`
- the backend service is deployed and reachable

If you still get TLS handshake failures, your host certificate chain may differ from the built-in CA assumption. In that case, tell me the exact hosting domain you used and the Serial Monitor error text, and I’ll adjust the certificate setup for that host.

### Admin login does not work

Expected on Render free if you rely on SMTP OTP.

Use normal user login for the demo.

### Render backend sleeps

Expected on the free tier after 15 minutes idle.

Open the backend URL once, wait for wake-up, then refresh the frontend.
