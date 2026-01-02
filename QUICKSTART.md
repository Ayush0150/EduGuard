# 🚀 Quick Start Guide - EduGuard Authentication

Get your EduGuard authentication system up and running in 5 minutes!

## ⚡ Prerequisites

- Node.js installed
- MongoDB running
- Gmail account with App Password ready

---

## 📦 Step 1: Install Dependencies (2 minutes)

### Server
```bash
cd server
npm install
```

### Client
```bash
cd client
npm install
```

---

## ⚙️ Step 2: Configure Server (2 minutes)

### Create .env file
```bash
cd server
cp .env.example .env
```

### Edit server/.env - REQUIRED CHANGES:

```env
# 🔐 Change these 3 CRITICAL values:
SUPER_ADMIN_EMAIL=your-actual-email@example.com
SMTP_PASS=your-16-char-gmail-app-password
JWT_SECRET=your-super-secret-random-string-min-32-chars

# ✅ These defaults work for local development:
MONGODB_URI=mongodb://localhost:27017/eduguard
SMTP_USER=eduguard.noreply@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
CLIENT_ORIGIN=http://localhost:5173
```

**Getting Gmail App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Enable 2FA if not enabled
3. Create app password for "Mail"
4. Copy the 16-character password

---

## 👤 Step 3: Create Your Admin Account (1 minute)

```bash
cd server
node scripts/create-admin.js
```

Follow the prompts:
- Username: (press Enter for "admin" or type your own)
- Password: Create a strong password (min 8 chars, uppercase, lowercase, number, special char)

**Example:**
```
Enter username (default: admin): myadmin
Enter password: MySecure@Pass123
```

✅ Your admin account is created!

---

## 🎯 Step 4: Start Everything (30 seconds)

### Terminal 1 - Server:
```bash
cd server
npm run dev
```
Server runs on: `http://localhost:8080`

### Terminal 2 - Client:
```bash
cd client
npm run dev
```
Client runs on: `http://localhost:5173`

---

## ✅ Step 5: Test It Works!

### 1. Admin Login
- Go to: http://localhost:5173/login/admin
- Login with your `SUPER_ADMIN_EMAIL` and password
- You should see the Admin Dashboard

### 2. Create a Regular User
- Click "Create User"
- Fill in details with role "USER"
- Click "Create User"

### 3. Regular User Login
- Logout
- Go to: http://localhost:5173/login
- Login with the user you just created
- You should see the User Dashboard

### 4. Test Forgot Password
- Logout
- Click "Forgot your password?"
- Enter email
- Check email for 6-digit OTP
- Complete password reset

---

## 🎉 You're Done!

Your authentication system is fully operational!

### What You Can Do Now:

**As Admin (/admin):**
- ✅ Create users
- ✅ Edit user details
- ✅ Activate/Deactivate users
- ✅ Delete users
- ✅ Reset your password via email OTP

**As Regular User (/dashboard):**
- ✅ Login with credentials
- ✅ Access user dashboard
- ✅ Reset password via email OTP
- ✅ Logout

---

## 🔧 Common Issues

### "Email service not configured"
- Check `SMTP_PASS` is the Gmail App Password (16 chars), not your regular password
- Verify `SMTP_USER` is set

### "Admin access restricted"
- Verify you're using the exact email from `SUPER_ADMIN_EMAIL`
- Check server/.env file

### "Account is inactive"
- User was deactivated by admin
- Admin can reactivate from admin dashboard

### Server won't start
- Check MongoDB is running: `mongod` or MongoDB Compass
- Verify `MONGODB_URI` in .env

---

## 📚 Next Steps

For detailed documentation, see:
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup with all features explained
- **[GMAIL_SETUP.md](./GMAIL_SETUP.md)** - Gmail configuration details
- **[README.md](./README.md)** - Project overview

---

## 🆘 Need Help?

1. Check server console for error messages
2. Check browser console (F12) for client errors
3. Verify all .env variables are set correctly
4. Review [SETUP_GUIDE.md](./SETUP_GUIDE.md) for troubleshooting

---

**Your admin login URL:** http://localhost:5173/login/admin
**Your user login URL:** http://localhost:5173/login

**Happy coding! 🎊**
