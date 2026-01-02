# 🎓 EduGuard - Smart Campus Monitoring System

**EduGuard** is a comprehensive IoT-based Smart Campus Monitoring System (SCMS) with secure authentication, role-based access control, and Gmail-integrated password recovery.

---

## 🚀 Quick Start

**New here?** → Read [START_HERE.md](./START_HERE.md) first!

### Ultra-Quick Setup (5 minutes)

1. **Configure Gmail & Admin**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env: Set SUPER_ADMIN_EMAIL, SMTP_PASS, JWT_SECRET
   ```

2. **Install & Create Admin**
   ```bash
   npm install
   node scripts/create-admin.js
   ```

3. **Run Everything**
   ```bash
   # Terminal 1 (server):
   npm run dev

   # Terminal 2 (client):
   cd ../client
   npm install
   npm run dev
   ```

4. **Access**
   - Admin: http://localhost:5173/login/admin
   - Users: http://localhost:5173/login

**For detailed setup:** See [QUICKSTART.md](./QUICKSTART.md)

---

## 🎯 Features

### Core IoT Modules
- 🚽 **Washroom Air Quality Monitoring** - Real-time environmental monitoring
- 👨‍🏫 **Teacher Presence Detection** - Automated attendance tracking
- 🚨 **Emergency Alert System** - Instant campus-wide notifications
- ❄️ **Smart AC Control** - Remote HVAC management via guard interface

### Authentication & Security
- 🔐 **Dual Login Portals** - Separate user and admin authentication
- 📧 **Gmail OTP Password Recovery** - Secure email-based password reset
- 👥 **Role-Based Access Control (RBAC)** - 6 role types with strict permissions
- 🛡️ **Advanced Security** - JWT, bcrypt, rate limiting, inactive user blocking
- 📊 **Admin Dashboard** - Complete user management (create, edit, activate/deactivate, delete)

### Access Control
- **Admin Roles:** `SUPER_ADMIN`, `ADMIN` → Access `/admin` routes only
- **User Roles:** `USER`, `SECURITY`, `MAINTENANCE`, `PRINCIPAL` → Access `/dashboard` only
- **Strict Separation:** Admins cannot access user routes and vice versa

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** TailwindCSS with dark mode
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Features:** Protected routes, role-based navigation, responsive design

### Backend
- **Runtime:** Node.js with Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT + bcrypt
- **Email:** Nodemailer (Gmail SMTP)
- **Validation:** Zod
- **Security:** express-rate-limit, helmet, CORS

---

## 📋 Project Structure

```
eduguard-iot/
├── client/               # React frontend
│   ├── src/
│   │   ├── features/    # Feature modules (auth, dashboard)
│   │   └── core/        # Shared utilities (auth, layout, http)
│   └── package.json
│
├── server/              # Node.js backend
│   ├── src/
│   │   ├── modules/    # Feature modules (auth, admin, users)
│   │   └── core/       # Core utilities (middlewares, security, config)
│   ├── scripts/        # Admin creation & reset scripts
│   └── package.json
│
└── docs/               # Documentation (you are here)
    ├── START_HERE.md              ← Read this first!
    ├── QUICKSTART.md              5-minute setup
    ├── SETUP_GUIDE.md             Complete documentation
    ├── TESTING_CHECKLIST.md       100+ test cases
    ├── IMPLEMENTATION_SUMMARY.md  Technical details
    ├── GMAIL_SETUP.md             Gmail configuration
    └── EMAIL_SETUP.md             Email service setup
```

---

## 🔐 Security Features

✅ **Only YOUR email** (set in `SUPER_ADMIN_EMAIL`) can access admin panel
✅ **Gmail-based OTP** for secure password recovery (6-digit, 10-min expiry)
✅ **Inactive users blocked** at authentication layer
✅ **Strong passwords enforced** (8+ chars, uppercase, lowercase, number, special char)
✅ **Rate limiting** prevents brute force attacks (10 attempts per 15 min)
✅ **Bcrypt hashing** for all passwords
✅ **JWT tokens** with configurable expiry (default: 7 days)
✅ **SHA-256 hashed** OTP and reset tokens in database

---

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Gmail account with App Password

### Setup

1. **Clone & Install**
   ```bash
   git clone <your-repo>
   cd eduguard-iot

   # Server
   cd server && npm install

   # Client
   cd ../client && npm install
   ```

2. **Configure Environment**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Create Admin Account**
   ```bash
   node scripts/create-admin.js
   # Follow prompts
   ```

4. **Run Development Servers**
   ```bash
   # Terminal 1: Server (port 8080)
   cd server && npm run dev

   # Terminal 2: Client (port 5173)
   cd client && npm run dev
   ```

**Detailed instructions:** [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## 🎮 Usage

### Admin Portal
1. Login: http://localhost:5173/login/admin
2. Use your `SUPER_ADMIN_EMAIL` and password
3. Access admin dashboard to:
   - View all users
   - Create new users (with non-admin roles)
   - Edit user details (username, email, password, role)
   - Activate/Deactivate users
   - Delete users

### User Portal
1. Login: http://localhost:5173/login
2. Use credentials created by admin
3. Access user dashboard (admins cannot access this)

### Password Recovery
- Users: Click "Forgot password?" on login page
- Admin: Click "Forgot password?" on admin login page
- Enter email → Receive 6-digit OTP → Verify → Reset password

---

## 📚 Documentation

| Document | Purpose | Time |
|----------|---------|------|
| [START_HERE.md](./START_HERE.md) | **Start here!** Overview & quick links | 2 min |
| [QUICKSTART.md](./QUICKSTART.md) | Fast 5-step setup guide | 5 min |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Complete setup & troubleshooting | 30 min |
| [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) | 100+ test cases to verify system | 1-2 hours |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Technical implementation details | 15 min |
| [GMAIL_SETUP.md](./GMAIL_SETUP.md) | Gmail App Password configuration | 5 min |
| [EMAIL_SETUP.md](./EMAIL_SETUP.md) | Email service setup details | 10 min |

---

## 🌐 API Endpoints

### Authentication
```
POST   /api/v1/auth/login                              User login
POST   /api/v1/auth/admin/login                        Admin login
POST   /api/v1/auth/logout                             Logout
GET    /api/v1/auth/me                                 Get current user
```

### Password Reset
```
POST   /api/v1/auth/forgot-password/request-otp       Request OTP (user)
POST   /api/v1/auth/forgot-password/verify-otp        Verify OTP (user)
POST   /api/v1/auth/forgot-password/reset             Reset password (user)
POST   /api/v1/auth/admin/forgot-password/request-otp Admin OTP request
POST   /api/v1/auth/admin/forgot-password/verify-otp  Admin OTP verify
POST   /api/v1/auth/admin/forgot-password/reset       Admin password reset
```

### User Management (Admin Only)
```
GET    /api/v1/admin/users           List all users
GET    /api/v1/admin/users/:id       Get user by ID
POST   /api/v1/admin/users           Create user
PUT    /api/v1/admin/users/:id       Update user
DELETE /api/v1/admin/users/:id       Delete user
PATCH  /api/v1/admin/users/:id/toggle Toggle active status
```

---

## 🧪 Testing

Run comprehensive tests using the [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md):

- ✅ Authentication flows (login, logout, forgot password)
- ✅ Role-based access control
- ✅ Admin user management (CRUD)
- ✅ Email OTP delivery
- ✅ Security features
- ✅ UI/UX functionality
- ✅ Edge cases

**Total Test Cases:** 100+

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Email service not configured" | Set `SMTP_PASS` with Gmail App Password in `.env` |
| "Admin access restricted" | Verify `SUPER_ADMIN_EMAIL` matches your login email |
| "Account is inactive" | Admin must reactivate from dashboard |
| Server won't start | Check MongoDB is running, verify `.env` exists |
| Email not arriving | Check spam folder, verify SMTP settings |

**Full troubleshooting:** [SETUP_GUIDE.md](./SETUP_GUIDE.md) → Troubleshooting section

---

## 🎓 Development Team

**Project:** Smart Campus Monitoring System (SCMS)
**Institution:** [Your College Name]
**Type:** IoT-Based College Project

---

## 📄 License

This project is for educational purposes as part of a college IoT project.

---

## 🎉 Status

✅ **Production Ready**
✅ **Security Hardened**
✅ **Fully Documented**
✅ **Tested & Verified**

**Last Updated:** January 2, 2026
**Version:** 1.0.0

---

## 🚀 Get Started

1. Read [START_HERE.md](./START_HERE.md)
2. Follow [QUICKSTART.md](./QUICKSTART.md)
3. Login and start managing users!

**Questions?** Check the documentation or troubleshooting guide.

---

**Happy Monitoring! 🎓🔐📊**
