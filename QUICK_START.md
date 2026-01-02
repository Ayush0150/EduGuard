# ⚡ Quick Start Checklist

Complete this checklist to get your EduGuard IoT system running.

## 📋 Pre-Setup

- [ ] Node.js v18+ installed (`node --version`)
- [ ] MongoDB installed or Atlas account created
- [ ] Gmail account with 2FA enabled (for password reset emails)
- [ ] Code editor (VS Code recommended)

## 🔧 Installation (5 minutes)

### 1. Install Dependencies

```bash
# Server
cd server
npm install

# Client (in new terminal)
cd client
npm install
```

## ⚙️ Configuration (10 minutes)

### 2. Server Environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` - **REQUIRED FIELDS**:

```env
# Database - Local or MongoDB Atlas
MONGODB_URI=mongodb://localhost:27017/eduguard

# Security - Generate random 64+ character string
JWT_SECRET=your-super-secret-jwt-key-change-this

# Admin Email - Your admin login email
SUPER_ADMIN_EMAIL=admin@example.com

# Gmail - For password reset
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### 3. Client Environment

```bash
cd client
cp .env.example .env
```

Keep default or customize:
```env
VITE_API_BASE_URL=http://localhost:8080
```

### 4. Gmail App Password Setup

1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy 16-character password to `SMTP_PASS` in `server/.env`

## 👤 Create Admin Account (2 minutes)

```bash
cd server
node scripts/create-admin.js
```

Enter:
- Username (e.g., `admin`)
- Email (must match `SUPER_ADMIN_EMAIL` in `.env`)
- Password (8+ chars, uppercase, lowercase, number, symbol)

## 🚀 Start Development (1 minute)

### Terminal 1 - Server
```bash
cd server
npm run dev
```
✅ Server running on http://localhost:8080

### Terminal 2 - Client
```bash
cd client
npm run dev
```
✅ Client running on http://localhost:5174

## ✅ Verify Installation (5 minutes)

### 1. Test User Login
- [ ] Go to http://localhost:5174
- [ ] Should redirect to `/login`
- [ ] Try logging in with regular user (if you have one)

### 2. Test Admin Login
- [ ] Go to http://localhost:5174/login/admin
- [ ] Login with admin credentials
- [ ] Should see Admin Dashboard
- [ ] Click "Manage Users" - should see user list

### 3. Test Password Reset
- [ ] Go to http://localhost:5174/forgot-password
- [ ] Enter your admin email
- [ ] Check inbox for OTP code
- [ ] Enter OTP to verify
- [ ] Set new password
- [ ] Should be able to login with new password

### 4. Test User Management
- [ ] Login as admin
- [ ] Go to Admin → Create User
- [ ] Fill form and create test user
- [ ] Edit user
- [ ] Toggle user status
- [ ] Delete user

## 🎉 You're Ready!

If all tests pass, your system is fully operational.

## 🐛 Troubleshooting

### Server won't start
```bash
# Check MongoDB is running
mongosh  # or 'mongo' for older versions

# If not running
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Email not sending
1. Verify Gmail App Password (not regular password)
2. Check `SMTP_USER` and `SMTP_PASS` in `.env`
3. Check server logs for detailed error
4. Try port 587 instead of 465:
   ```env
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

### Can't login as admin
1. Verify `SUPER_ADMIN_EMAIL` matches admin account email
2. Check MongoDB has the admin user:
   ```bash
   mongosh
   use eduguard
   db.users.find({ role: "SUPER_ADMIN" })
   ```
3. Try resetting admin password:
   ```bash
   cd server
   node scripts/reset-bootstrap-admin.js
   ```

### Port already in use
```bash
# Find and kill process on port 8080
npx kill-port 8080  # or
lsof -ti:8080 | xargs kill -9  # macOS/Linux

# Or change port in server/.env
PORT=8081
```

## 📚 Next Steps

1. **Read Documentation**
   - [README_PRODUCTION.md](README_PRODUCTION.md) - Full feature overview
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment
   - [SECURITY_OPTIMIZATIONS.md](SECURITY_OPTIMIZATIONS.md) - Security details

2. **Customize**
   - Update branding (logo, colors)
   - Add more user roles as needed
   - Customize email templates

3. **Deploy to Production**
   - Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
   - Set up SSL/TLS
   - Configure production database
   - Enable monitoring

## 🆘 Need Help?

- Check server logs: `server/` directory
- Check browser console: F12 → Console
- Review error messages carefully
- Refer to documentation files

---

**Happy Coding! 🚀**
