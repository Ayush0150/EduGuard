# 🔐 Fixed Admin Setup Guide

## Admin Credentials

**Email:** `eduguard.noreply@gmail.com`
**Default Password:** `Ayush@0150`
**Role:** SUPER_ADMIN

## Quick Setup (First Time)

### 1. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `.env` and set these values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/eduguard

# Security (generate a strong random key)
JWT_SECRET=your-super-secret-jwt-key-at-least-64-characters-long

# Fixed Admin Email
SUPER_ADMIN_EMAIL=eduguard.noreply@gmail.com

# Gmail App Password (for password reset emails)
SMTP_USER=eduguard.noreply@gmail.com
SMTP_PASS=your-16-char-gmail-app-password
```

### 2. Get Gmail App Password

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Create app password for "Mail"
5. Copy the 16-character password
6. Paste it as `SMTP_PASS` in `.env`

### 3. Setup Admin Account

```bash
npm install
npm run setup-admin
```

This will create the admin account with:
- Email: `eduguard.noreply@gmail.com`
- Password: `Ayush@0150`

### 4. Start Server

```bash
# Terminal 1 - Server
npm run dev

# Terminal 2 - Client
cd ../client
npm install
npm run dev
```

### 5. Login

Go to: http://localhost:5174/login/admin

- Email: `eduguard.noreply@gmail.com`
- Password: `Ayush@0150`

## 🔄 Reset Password

### Option 1: Via Script (Recommended)

```bash
cd server
npm run reset-admin-password
```

Enter new password when prompted (must have uppercase, lowercase, number, and symbol).

### Option 2: Via Forgot Password Flow

1. Go to http://localhost:5174/admin/forgot-password
2. Enter email: `eduguard.noreply@gmail.com`
3. Check inbox for 6-digit OTP code
4. Enter OTP on the website
5. Set new password

## 📋 Admin Commands

| Command | Description |
|---------|-------------|
| `npm run setup-admin` | Create/verify fixed admin account |
| `npm run reset-admin-password` | Reset admin password via CLI |
| `npm run dev` | Start development server |
| `npm start` | Start production server |

## 🔒 Security Notes

1. **Change the default password** immediately after first login
2. **Keep your Gmail App Password secure** - don't share it
3. **Use a strong JWT_SECRET** - at least 64 random characters
4. **Enable 2FA on Gmail** for the admin email account
5. **Never commit `.env` file** to version control

## 🐛 Troubleshooting

### Can't login as admin

**Check .env file:**
```bash
cat server/.env | grep SUPER_ADMIN_EMAIL
# Should show: SUPER_ADMIN_EMAIL=eduguard.noreply@gmail.com
```

**Verify admin exists:**
```bash
cd server
node -e "
import('mongoose').then(m => m.default.connect('mongodb://localhost:27017/eduguard')).then(() =>
  import('./src/modules/users/user.model.js').then(u =>
    u.User.findOne({email: 'eduguard.noreply@gmail.com'}).then(admin => {
      console.log(admin ? '✅ Admin exists' : '❌ Admin not found');
      process.exit();
    })
  )
)
"
```

If admin doesn't exist:
```bash
npm run setup-admin
```

### Password reset email not working

1. **Verify Gmail App Password** is correct in `.env`
2. **Check SMTP settings:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=eduguard.noreply@gmail.com
   SMTP_PASS=your-actual-16-char-app-password
   ```
3. **Check server logs** for detailed error messages
4. **Try port 587** if 465 doesn't work:
   ```env
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

### "Declaration or statement expected" error

This was already fixed. If you see it:
1. Delete `node_modules` in server
2. Run `npm install` again
3. Restart the dev server

## 📝 Password Requirements

When changing password:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (e.g., @, #, $, !, etc.)

Example strong passwords:
- `SecurePass@123`
- `MyAdmin#2026`
- `EduGuard!Strong99`

## 🎯 Quick Test

After setup, test everything works:

1. **Login Test**
   - Go to http://localhost:5174/login/admin
   - Login with credentials
   - Should see Admin Dashboard

2. **Create User Test**
   - Click "Manage Users"
   - Click "Create New User"
   - Fill form and submit
   - Should see new user in list

3. **Password Reset Test**
   - Logout
   - Go to Forgot Password
   - Enter admin email
   - Check inbox for OTP
   - Complete reset flow

All working? ✅ **You're ready to go!**

## 🚀 Next Steps

1. Change the default password
2. Configure Gmail App Password
3. Create regular users for your team
4. Review security settings
5. Deploy to production (see DEPLOYMENT_GUIDE.md)

---

**Need help?** Check the main [QUICK_START.md](../QUICK_START.md) or [README_PRODUCTION.md](../README_PRODUCTION.md)
