# Email Configuration for Password Reset

## Admin Password Reset Workflow

The admin can reset their password using OTP sent via email. Here's how to set it up:

### 1. Gmail App Password Setup

Since you're using `eduguard.noreply@gmail.com`, follow these steps:

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/

2. **Enable 2-Factor Authentication** (if not already enabled)
   - Go to Security → 2-Step Verification
   - Follow the prompts to enable it

3. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "EduGuard"
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

4. **Update .env File**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=eduguard.noreply@gmail.com
   SMTP_PASS=abcdefghijklmnop  # Replace with your actual app password (remove spaces)
   MAIL_FROM=EduGuard Security <eduguard.noreply@gmail.com>

   # Locks admin access to ONLY this email (recommended)
   SUPER_ADMIN_EMAIL=eduguard.noreply@gmail.com
   ```

5. **Restart the Server**
   - The server needs to be restarted after updating .env

### 2. Password Reset Flow

**For Admin Users:**

1. Navigate to: `http://localhost:5174/admin/forgot-password`

2. **Step 1: Enter Email**
   - Enter: `eduguard.noreply@gmail.com`
   - Click "Send OTP"
   - System sends 6-digit OTP to email (expires in 10 minutes)

3. **Step 2: Verify OTP**
   - Check your Gmail inbox for email from EduGuard
   - Enter the 6-digit code
   - Click "Verify OTP"

4. **Step 3: Reset Password**
   - Enter new password (must meet requirements):
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one lowercase letter
     - At least one number
     - At least one special character
   - Confirm password
   - Click "Reset password"

5. **Success**
   - Password updated successfully
   - Redirected to admin login
   - Can now login with new password

### 3. Features

✅ **Professional Email Template** - Branded email with OTP
✅ **Auto-dismiss Messages** - Success/error messages disappear after 5 seconds
✅ **Animated Notifications** - Smooth slide-down animations
✅ **Security Icons** - Visual feedback for errors and success
✅ **OTP Expiration** - 10-minute time limit
✅ **Password Validation** - Real-time strength checking
✅ **Dynamic Routing** - Back to correct login page (admin/regular)

### 4. Logout Functionality

**Admin Dashboard Logout:**
- Click "Logout" button in header
- Clears authentication token
- Redirects to admin login page
- Session completely cleared

### 5. Security Notes

- OTP is hashed using SHA-256 before storage
- Reset tokens are hashed before database storage
- Passwords are hashed using bcrypt with salt rounds
- All sensitive operations use secure HTTP-only cookies
- CORS configured to only allow requests from client origin

### 6. Troubleshooting

**Email not sending:**
- Verify Gmail App Password is correct (no spaces)
- Check SMTP_USER matches the email address
- Ensure 2FA is enabled on Google account
- Check server logs for nodemailer errors

**OTP not received:**
- Check spam/junk folder
- Wait a few minutes (Gmail may delay)
- Verify email address is correct
- Check server logs for send errors

**Login fails after reset:**
- Ensure password meets all requirements
- Try clearing browser cache
- Verify server is running
- Check MongoDB connection

## Current Credentials

**Admin Account:**
- Username: `wannabeiyoush`
- Email: `eduguard.noreply@gmail.com`
- Password: `Ayush@0150`

To test password reset, use the email address above.
