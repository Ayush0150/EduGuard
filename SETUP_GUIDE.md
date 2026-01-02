# EduGuard Authentication System - Complete Setup Guide

This guide will help you set up the complete authentication system with Gmail-based password recovery and strict role-based access control.

## 🎯 Features Implemented

### Authentication & Security
- ✅ JWT-based authentication with token expiry
- ✅ Secure password hashing with bcrypt
- ✅ Gmail-based OTP email delivery for password reset
- ✅ Rate limiting on authentication endpoints
- ✅ Inactive user check (prevents deactivated users from logging in)
- ✅ Separate login flows for users (`/login`) and admin (`/login/admin`)

### Role-Based Access Control (RBAC)
- ✅ **Admin roles:** `SUPER_ADMIN`, `ADMIN` (full access to `/admin` routes)
- ✅ **User roles:** `USER`, `SECURITY`, `MAINTENANCE`, `PRINCIPAL` (access to `/dashboard` routes)
- ✅ Strict route protection: admins cannot access user routes and vice versa
- ✅ Only the email in `SUPER_ADMIN_EMAIL` can access admin panel

### Admin User Management
- ✅ Create users with role assignment (USER, SECURITY, MAINTENANCE, PRINCIPAL)
- ✅ Edit user details (username, email, password, role)
- ✅ Activate/Deactivate users (inactive users cannot login)
- ✅ Delete users
- ✅ View all users with status and role indicators

### Frontend Features
- ✅ Universal navbar with role-aware navigation
- ✅ Logout functionality across all pages
- ✅ Forgot password flow with OTP verification (3-step process)
- ✅ Consistent, modern UI with dark mode support

---

## 📋 Prerequisites

Before starting, ensure you have:
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- A Gmail account for sending OTP emails

---

## 🔧 Step 1: Gmail App Password Setup

To send OTP emails, you need to generate a Gmail App Password:

1. **Enable 2-Step Verification:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password:**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" as the app
   - Select "Other" as the device and name it "EduGuard"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Save for later:**
   - You'll use this password in your `.env` file as `SMTP_PASS`

---

## 🚀 Step 2: Server Setup

### 2.1 Install Dependencies

```bash
cd server
npm install
```

### 2.2 Configure Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cp .env.example .env
```

Edit `server/.env` with your actual values:

```env
# Environment
NODE_ENV=development

# Server
PORT=8080

# Database
MONGODB_URI=mongodb://localhost:27017/eduguard

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Client
CLIENT_ORIGIN=http://localhost:5173

# Admin Configuration (CRITICAL)
# Replace with YOUR actual admin email address
SUPER_ADMIN_EMAIL=your-admin@example.com

# Optional: Recovery email for admin password reset
# If not set, OTP will be sent to SUPER_ADMIN_EMAIL
ADMIN_RECOVERY_EMAIL=

# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=eduguard.noreply@gmail.com
SMTP_PASS=your-gmail-app-password-here
MAIL_FROM=EduGuard Security <eduguard.noreply@gmail.com>
```

**Important Notes:**
- Replace `SUPER_ADMIN_EMAIL` with **your actual email** (this is the ONLY admin account)
- Replace `SMTP_PASS` with the 16-character App Password from Step 1
- Replace `JWT_SECRET` with a strong random string (minimum 32 characters)
- If you want admin password reset OTP sent to a different email, set `ADMIN_RECOVERY_EMAIL`

### 2.3 Create the Admin Account

Run the admin creation script:

```bash
node scripts/create-admin.js
```

This will:
- Create an admin account with the email from `SUPER_ADMIN_EMAIL`
- Set a default password (you'll be prompted to change it)
- Assign `SUPER_ADMIN` role

**If you need to reset the admin account:**

```bash
node scripts/reset-bootstrap-admin.js
```

### 2.4 Start the Server

```bash
npm run dev
```

Server will start on `http://localhost:8080`

---

## 🎨 Step 3: Client Setup

### 3.1 Install Dependencies

```bash
cd client
npm install
```

### 3.2 Start the Client

```bash
npm run dev
```

Client will start on `http://localhost:5173`

---

## 🧪 Step 4: Testing the System

### Test 1: Admin Login

1. Go to `http://localhost:5173/login/admin`
2. Login with your `SUPER_ADMIN_EMAIL` and password
3. You should be redirected to `/admin`
4. Verify you can see the admin dashboard

### Test 2: Create a Regular User

1. In admin dashboard, click "Create User"
2. Fill in:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test@1234`
   - Role: `USER`
3. Click "Create User"

### Test 3: Regular User Login

1. Logout from admin
2. Go to `http://localhost:5173/login`
3. Login with `test@example.com` and password
4. You should be redirected to `/dashboard`
5. Regular users **cannot** access `/admin`

### Test 4: Forgot Password (User)

1. Logout
2. Go to `/login` and click "Forgot your password?"
3. Enter the user's email (`test@example.com`)
4. Click "Send OTP"
5. Check email for 6-digit OTP
6. Enter OTP and new password
7. Try logging in with new password

### Test 5: Forgot Password (Admin)

1. Go to `/login/admin` and click "Forgot your password?"
2. Enter your `SUPER_ADMIN_EMAIL`
3. Check email (or `ADMIN_RECOVERY_EMAIL` if set) for OTP
4. Complete password reset

### Test 6: User Management

1. Login as admin
2. In admin dashboard:
   - **Edit User:** Click "Edit" on a user, change email/role
   - **Deactivate User:** Click "Deactivate"
   - **Try logging in as deactivated user:** Should fail with "Account is inactive"
   - **Reactivate User:** Click "Activate"
   - **Delete User:** Click "Delete" (requires confirmation)

### Test 7: Route Protection

1. Login as admin, try to access `/dashboard` → should redirect to `/admin`
2. Login as user, try to access `/admin` → should show "Access Denied" or redirect

---

## 🔐 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting
- Login attempts: 10 per 15 minutes per IP
- Auth endpoints: 100 requests per 15 minutes per IP

### OTP Security
- 6-digit numeric code
- Expires in 10 minutes
- One-time use only

### JWT Tokens
- Stored in localStorage
- Expiry: 7 days (configurable via `JWT_EXPIRES_IN`)
- Automatically checked on protected routes

---

## 🗂️ Project Structure

```
server/
├── src/
│   ├── modules/
│   │   ├── auth/          # Login, logout, forgot-password
│   │   ├── admin/         # User management (CRUD)
│   │   └── users/         # User model
│   └── core/
│       ├── middlewares/
│       │   └── auth.js    # requireAuth, requireRole, requireNonAdminUser
│       └── config/
│           └── env.js     # Environment configuration
├── scripts/
│   ├── create-admin.js
│   └── reset-bootstrap-admin.js
└── .env

client/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   └── pages/
│   │   │       ├── LoginPage.jsx
│   │   │       ├── AdminLoginPage.jsx
│   │   │       └── ForgotPasswordPage.jsx
│   │   └── dashboard/
│   │       ├── pages/
│   │       │   ├── AdminDashboard.jsx   # User list
│   │       │   ├── CreateUser.jsx
│   │       │   ├── EditUser.jsx
│   │       │   └── DashboardHome.jsx    # Regular user dashboard
│   │       └── services/
│   │           └── adminUserApi.js
│   └── core/
│       ├── auth/
│       │   ├── ProtectedRoute.jsx       # Route protection
│       │   └── tokenStorage.js
│       └── layout/
│           └── DashboardNavbar.jsx      # Universal navbar
└── App.jsx                              # Route configuration
```

---

## 🛠️ Troubleshooting

### Issue: "Email service is not configured"

**Solution:**
- Verify `SMTP_USER` and `SMTP_PASS` are set in `server/.env`
- Ensure you're using the Gmail App Password, not your regular password
- Check Gmail 2FA is enabled

### Issue: "Admin access restricted"

**Solution:**
- Verify `SUPER_ADMIN_EMAIL` in `.env` matches the email you're logging in with
- Email comparison is case-insensitive and trimmed
- Run `node scripts/reset-bootstrap-admin.js` to recreate admin

### Issue: "Account is inactive or does not exist"

**Solution:**
- Check if the user's `isActive` field is `true` in MongoDB
- Admin can reactivate users from the admin dashboard

### Issue: Regular user sees "Access Denied" immediately after login

**Solution:**
- Verify the user's role is NOT `ADMIN` or `SUPER_ADMIN`
- Check `/dashboard` route protection in `App.jsx`

### Issue: Admin redirected to `/dashboard`

**Solution:**
- Ensure you're logging in via `/login/admin`, not `/login`
- Check `ProtectedRoute.jsx` for admin redirect logic

---

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/admin/login` - Admin login
- `POST /api/v1/auth/logout` - Logout (clears client token)
- `GET /api/v1/auth/me` - Get current user info

### Password Reset (User)
- `POST /api/v1/auth/forgot-password/request-otp` - Request OTP
- `POST /api/v1/auth/forgot-password/verify-otp` - Verify OTP
- `POST /api/v1/auth/forgot-password/reset` - Reset password

### Password Reset (Admin)
- `POST /api/v1/auth/admin/forgot-password/request-otp` - Request OTP
- `POST /api/v1/auth/admin/forgot-password/verify-otp` - Verify OTP
- `POST /api/v1/auth/admin/forgot-password/reset` - Reset password

### User Management (Admin Only)
- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/users/:id` - Get user by ID
- `POST /api/v1/admin/users` - Create user
- `PUT /api/v1/admin/users/:id` - Update user
- `DELETE /api/v1/admin/users/:id` - Delete user
- `PATCH /api/v1/admin/users/:id/toggle` - Toggle user active status

---

## 🎉 You're All Set!

Your EduGuard authentication system is now fully configured with:
- ✅ Secure Gmail-based OTP password recovery
- ✅ Strict role-based access control
- ✅ Complete admin user management
- ✅ Production-ready security features

For production deployment, remember to:
1. Change `JWT_SECRET` to a strong random string
2. Set `NODE_ENV=production`
3. Use a production MongoDB instance
4. Enable HTTPS
5. Review and adjust rate limits if needed

---

## 📞 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs: `npm run dev` in the server directory
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

---

**Last Updated:** January 2026
**Version:** 1.0.0
