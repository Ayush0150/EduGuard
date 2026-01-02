# ✅ Admin Account Setup Complete!

## Your Fixed Admin Credentials

**Email:** `eduguard.noreply@gmail.com`
**Password:** `Ayush@0150`
**Username:** `admin`
**Role:** `SUPER_ADMIN`

## 🎯 Quick Access

**Admin Login URL:** http://localhost:5174/login/admin

## ✅ What's Been Set Up

1. ✅ Fixed admin account created with your specified email
2. ✅ Password set to `Ayush@0150`
3. ✅ Username configured as `admin`
4. ✅ SUPER_ADMIN role assigned
5. ✅ Account is active and ready to use

## 🔄 How to Reset Password in Future

### Option 1: Via Command Line (Fastest)
```bash
cd server
npm run reset-admin-password
```
Enter your new password when prompted.

### Option 2: Via Forgot Password Page
1. Go to http://localhost:5174/admin/forgot-password
2. Enter: `eduguard.noreply@gmail.com`
3. Check inbox for 6-digit OTP
4. Enter OTP on website
5. Set new password

## 📧 Email Configuration Required

For password reset to work via email, you need to:

1. **Enable Gmail App Password:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Go to App Passwords
   - Generate password for "Mail"

2. **Update `.env` file:**
   ```env
   SMTP_USER=eduguard.noreply@gmail.com
   SMTP_PASS=your-16-char-app-password-here
   SUPER_ADMIN_EMAIL=eduguard.noreply@gmail.com
   ```

3. **Restart server** after updating `.env`

## 🚀 Start Using the System

1. **Start Server** (if not running):
   ```bash
   cd server
   npm run dev
   ```

2. **Start Client** (in new terminal):
   ```bash
   cd client
   npm run dev
   ```

3. **Login:**
   - Open http://localhost:5174/login/admin
   - Email: `eduguard.noreply@gmail.com`
   - Password: `Ayush@0150`

4. **Create Users:**
   - Click "Manage Users"
   - Click "Create New User"
   - Fill in details and submit

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run setup-admin` | Create/verify admin account |
| `npm run reset-admin-password` | Reset password via CLI |
| `npm run dev` | Start development server |

## 🔒 Security Reminders

- ⚠️ **Change the default password** after first login
- ⚠️ Keep your Gmail App Password secure
- ⚠️ Never share or commit your `.env` file
- ⚠️ Use strong passwords (8+ chars, upper, lower, number, symbol)

## 📚 Documentation

- [ADMIN_SETUP.md](ADMIN_SETUP.md) - Complete admin setup guide
- [QUICK_START.md](QUICK_START.md) - General setup guide
- [README_PRODUCTION.md](README_PRODUCTION.md) - Full feature documentation

---

**Status: ✅ READY TO USE**

Your admin account is configured and ready. You can now login and start managing users!
