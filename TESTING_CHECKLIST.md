# ✅ Authentication System Testing Checklist

Use this checklist to verify all authentication features are working correctly.

## 🔧 Prerequisites

- [ ] Server running on http://localhost:8080
- [ ] Client running on http://localhost:5173
- [ ] MongoDB connected and running
- [ ] Gmail SMTP configured in server/.env
- [ ] Admin account created via `node scripts/create-admin.js`

---

## 1️⃣ Admin Authentication Flow

### Admin Login
- [ ] Navigate to http://localhost:5173/login/admin
- [ ] Enter SUPER_ADMIN_EMAIL and password
- [ ] Click "Log In"
- [ ] **Expected:** Redirected to `/admin` dashboard
- [ ] **Expected:** See username/email in navbar
- [ ] **Expected:** See "Logout" button

### Admin Logout
- [ ] While logged in as admin, click "Logout"
- [ ] **Expected:** Redirected to `/login`
- [ ] **Expected:** Token cleared from localStorage
- [ ] Try accessing `/admin` directly
- [ ] **Expected:** Redirected to `/login`

### Admin Forgot Password
- [ ] Go to http://localhost:5173/login/admin
- [ ] Click "Forgot your password?"
- [ ] Enter SUPER_ADMIN_EMAIL
- [ ] Click "Send OTP"
- [ ] **Expected:** Success message shown
- [ ] Check email inbox (or ADMIN_RECOVERY_EMAIL if set)
- [ ] **Expected:** Receive email with 6-digit OTP
- [ ] Enter the OTP and click "Verify Code"
- [ ] **Expected:** Proceed to password reset step
- [ ] Enter new password (meet strength requirements)
- [ ] Confirm password
- [ ] Click "Reset Password"
- [ ] **Expected:** Success message, redirected to login
- [ ] Login with new password
- [ ] **Expected:** Successful login

---

## 2️⃣ Regular User Authentication Flow

### User Login
- [ ] Navigate to http://localhost:5173/login
- [ ] Enter user email/username and password
- [ ] Click "Log In"
- [ ] **Expected:** Redirected to `/dashboard`
- [ ] **Expected:** See username/email in navbar
- [ ] **Expected:** Cannot access `/admin`

### User Logout
- [ ] While logged in as user, click "Logout"
- [ ] **Expected:** Redirected to `/login`
- [ ] **Expected:** Token cleared

### User Forgot Password
- [ ] Go to http://localhost:5173/forgot-password
- [ ] Enter user email
- [ ] Click "Send OTP"
- [ ] **Expected:** Success message (even if email doesn't exist - security)
- [ ] Check email inbox
- [ ] **Expected:** Receive OTP email
- [ ] Complete password reset flow
- [ ] **Expected:** Can login with new password

### Inactive User Cannot Login
- [ ] Admin: Deactivate a user from admin dashboard
- [ ] Try logging in as that deactivated user
- [ ] **Expected:** "Account is inactive or does not exist" error
- [ ] **Expected:** Cannot access any protected routes

---

## 3️⃣ Role-Based Access Control

### Admin → User Route Protection
- [ ] Login as admin
- [ ] Try accessing http://localhost:5173/dashboard directly
- [ ] **Expected:** Redirected to `/admin`
- [ ] **Expected:** Admins cannot access user-only routes

### User → Admin Route Protection
- [ ] Login as regular user
- [ ] Try accessing http://localhost:5173/admin directly
- [ ] **Expected:** "Access Denied" page or redirect
- [ ] Try `/admin/users/create`
- [ ] **Expected:** Blocked (403 or redirect)

### Unauthenticated Access
- [ ] Logout completely
- [ ] Try accessing `/dashboard`
- [ ] **Expected:** Redirected to `/login`
- [ ] Try accessing `/admin`
- [ ] **Expected:** Redirected to `/login`

---

## 4️⃣ Admin User Management

### Create User
- [ ] Login as admin
- [ ] Navigate to admin dashboard
- [ ] Click "Create User"
- [ ] Fill in:
  - Username: `testuser1`
  - Email: `test1@example.com`
  - Password: `Test@1234`
  - Role: `USER`
- [ ] Click "Create User"
- [ ] **Expected:** Redirected to admin dashboard
- [ ] **Expected:** New user appears in list

### Create User - Duplicate Email
- [ ] Try creating another user with same email
- [ ] **Expected:** Error "A user with that email or username already exists"

### Create User - Admin Role Restricted
- [ ] Try selecting "ADMIN" role (should not be available)
- [ ] **Expected:** Only non-admin roles available (USER, SECURITY, MAINTENANCE, PRINCIPAL)

### Edit User
- [ ] Click "Edit" on a user
- [ ] Change username
- [ ] Change email to a new, unique email
- [ ] Change role
- [ ] Leave password empty (to keep current password)
- [ ] Click "Save Changes"
- [ ] **Expected:** User updated successfully
- [ ] **Expected:** Redirected to admin dashboard
- [ ] Verify user can still login with old password

### Edit User - Update Password
- [ ] Edit a user
- [ ] Enter a new password
- [ ] Click "Save Changes"
- [ ] **Expected:** Password updated
- [ ] Verify user can login with NEW password
- [ ] Verify user CANNOT login with old password

### Activate/Deactivate User
- [ ] Click "Deactivate" on an active user
- [ ] **Expected:** Confirmation dialog
- [ ] Confirm deactivation
- [ ] **Expected:** User status shows "Inactive"
- [ ] Try logging in as that user
- [ ] **Expected:** "Account is inactive" error
- [ ] Click "Activate" to reactivate
- [ ] **Expected:** User status shows "Active"
- [ ] Try logging in as that user
- [ ] **Expected:** Successful login

### Delete User
- [ ] Click "Delete" on a user
- [ ] **Expected:** Confirmation dialog
- [ ] Confirm deletion
- [ ] **Expected:** User removed from list
- [ ] Try logging in as deleted user
- [ ] **Expected:** Login fails

---

## 5️⃣ Security Features

### Password Strength Validation
- [ ] Try creating user with weak password: `1234`
- [ ] **Expected:** Error or validation message
- [ ] Try password without uppercase: `test@1234`
- [ ] **Expected:** Rejected
- [ ] Try password without special char: `Test1234`
- [ ] **Expected:** Rejected
- [ ] Use strong password: `Test@1234`
- [ ] **Expected:** Accepted

### Rate Limiting (Optional - requires many attempts)
- [ ] Try logging in with wrong password 10+ times
- [ ] **Expected:** After 10 attempts, "Too many failed attempts" message
- [ ] Wait 15 minutes or use different IP
- [ ] **Expected:** Can try again

### JWT Token Expiry
- [ ] Login successfully
- [ ] Manually change token expiry in JWT (or wait for JWT_EXPIRES_IN duration)
- [ ] Try accessing protected route
- [ ] **Expected:** Redirected to login

### Email OTP Expiry
- [ ] Request password reset OTP
- [ ] Wait 11+ minutes (OTP expires in 10 minutes)
- [ ] Try using the OTP
- [ ] **Expected:** "Code has expired" error

---

## 6️⃣ UI/UX Features

### Universal Navbar
- [ ] Login as admin
- [ ] **Expected:** Navbar shows "Admin" link and email
- [ ] **Expected:** "Logout" button present
- [ ] Login as user
- [ ] **Expected:** Navbar shows "Dashboard" link and email
- [ ] **Expected:** "Logout" button present

### Dark Mode (if implemented)
- [ ] Toggle dark mode
- [ ] **Expected:** All pages properly styled in dark mode
- [ ] **Expected:** Consistent theme across navigation

### Responsive Design
- [ ] Test on mobile viewport (resize browser or use dev tools)
- [ ] **Expected:** All pages responsive
- [ ] **Expected:** Forms, tables, buttons work properly

### Error Messages
- [ ] Test various error scenarios
- [ ] **Expected:** Clear, user-friendly error messages
- [ ] **Expected:** Errors auto-dismiss after 5 seconds

### Success Messages
- [ ] Complete successful actions (create user, update, etc.)
- [ ] **Expected:** Success messages shown
- [ ] **Expected:** Messages auto-dismiss after 3 seconds

---

## 7️⃣ Email Delivery

### OTP Email Format
- [ ] Request password reset OTP
- [ ] Check email
- [ ] **Expected:** Professional email template
- [ ] **Expected:** 6-digit code clearly displayed
- [ ] **Expected:** "From" shows "EduGuard Security"
- [ ] **Expected:** Expiry time mentioned (10 minutes)
- [ ] **Expected:** Security message present

### OTP Email Delivery Speed
- [ ] Request OTP
- [ ] Start timer
- [ ] **Expected:** Email arrives within 30 seconds
- [ ] If delayed, check spam folder

### Admin Recovery Email (if set)
- [ ] If `ADMIN_RECOVERY_EMAIL` is set in .env
- [ ] Admin requests password reset
- [ ] **Expected:** OTP sent to ADMIN_RECOVERY_EMAIL, not SUPER_ADMIN_EMAIL

---

## 8️⃣ Edge Cases

### Multiple Simultaneous Sessions
- [ ] Login as admin in Browser 1
- [ ] Login as admin in Browser 2 (or incognito)
- [ ] Logout from Browser 1
- [ ] Try using Browser 2
- [ ] **Expected:** Both sessions work independently (JWT is stateless)

### Browser Refresh
- [ ] Login successfully
- [ ] Refresh page (F5)
- [ ] **Expected:** Still logged in
- [ ] **Expected:** No redirect to login

### Back Button After Logout
- [ ] Login and navigate to dashboard
- [ ] Logout
- [ ] Press browser back button
- [ ] **Expected:** Redirected to login (token cleared)

### Direct URL Access
- [ ] Logout
- [ ] Type `/admin` or `/dashboard` in address bar
- [ ] **Expected:** Redirected to login
- [ ] Login as user
- [ ] Type `/admin` in address bar
- [ ] **Expected:** Access denied or redirect

---

## 9️⃣ Database Integrity

### User Data Persistence
- [ ] Create a user via admin dashboard
- [ ] Restart server
- [ ] **Expected:** User still exists
- [ ] **Expected:** Can login successfully

### Password Hashing
- [ ] Check MongoDB directly (MongoDB Compass or CLI)
- [ ] View user documents
- [ ] **Expected:** `passwordHash` field is hashed (not plain text)
- [ ] **Expected:** Hash is bcrypt format (starts with `$2b$`)

### Sensitive Data Protection
- [ ] Check user document in MongoDB
- [ ] **Expected:** No plain-text passwords stored
- [ ] **Expected:** OTP stored as hash (resetOtpHash)
- [ ] **Expected:** Reset token stored as hash (resetTokenHash)

---

## 🔟 Production Readiness

### Environment Variables
- [ ] Check server/.env has all required vars
- [ ] **Expected:** No default/example values in production
- [ ] **Expected:** Strong JWT_SECRET (32+ chars)
- [ ] **Expected:** Correct SUPER_ADMIN_EMAIL

### Error Handling
- [ ] Stop MongoDB
- [ ] Try accessing any API endpoint
- [ ] **Expected:** Graceful error message, no crash
- [ ] Restart MongoDB
- [ ] **Expected:** Server reconnects automatically

### Logging (Development)
- [ ] Check server console during OTP request
- [ ] **Expected:** No sensitive data logged in production
- [ ] **Expected:** Proper error logging

---

## ✅ Final Verification

- [ ] All admin features work correctly
- [ ] All user features work correctly
- [ ] Role-based access control enforced
- [ ] Email OTP delivery working
- [ ] Security features operational
- [ ] UI/UX polished and responsive
- [ ] No console errors (browser or server)
- [ ] Database properly storing data

---

## 📊 Testing Summary

**Total Tests:** ~100
**Date Tested:** ___________
**Tested By:** ___________
**Results:** Pass / Fail

**Issues Found:**
1. ________________________________
2. ________________________________
3. ________________________________

**Notes:**
_____________________________________
_____________________________________
_____________________________________

---

## 🎉 Success Criteria

✅ All critical paths work without errors
✅ Security features prevent unauthorized access
✅ Email delivery functioning correctly
✅ Admin can manage users completely
✅ Users have proper access to their dashboard
✅ No data leaks or security vulnerabilities

**System Status:** Ready for Production / Needs Fixes

---

**Need Help?** See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for troubleshooting.
