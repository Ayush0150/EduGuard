# 📧 Gmail App Password Setup for Password Reset

## Quick Setup (5 minutes)

### Step 1: Enable 2-Factor Authentication
1. Go to: https://myaccount.google.com/security
2. Under "Signing in to Google", click "2-Step Verification"
3. Follow the prompts to enable it (you'll need your phone)

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. You may need to sign in again
3. Under "Select app", choose "Mail"
4. Under "Select device", choose "Other (Custom name)"
5. Type: **EduGuard**
6. Click **Generate**
7. Google will show a 16-character password like: `abcd efgh ijkl mnop`
8. **Copy this password** (remove spaces)

### Step 3: Update .env File
1. Open: `server/.env`
2. Find the SMTP section
3. Uncomment the lines (remove the `#` at the start)
4. Replace `SMTP_PASS` with your app password:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=eduguard.noreply@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM=EduGuard Security <eduguard.noreply@gmail.com>
```

### Step 4: Restart Server
Stop and restart the Node.js server to load the new configuration.

## Testing Password Reset

1. Go to: http://localhost:5174/admin/forgot-password
2. Enter: `eduguard.noreply@gmail.com`
3. Click "Send OTP"
4. Check your Gmail inbox for the 6-digit code
5. Enter the code and set a new password

## Troubleshooting

**"Less secure app access" error:**
- This is outdated. Use App Passwords instead (steps above)

**Email not arriving:**
- Check spam/junk folder
- Wait 2-3 minutes (Gmail may delay)
- Verify SMTP_USER matches your Gmail address
- Check server console for error messages

**"Authentication failed" error:**
- Double-check app password (no spaces)
- Ensure 2FA is enabled on Google account
- Try generating a new app password

**Still not working:**
- Check server console logs
- Verify all SMTP settings are uncommented
- Ensure no typos in .env file
- Restart server after changes

## Alternative: Development Mode

If you just want to test without email, the server logs the OTP to console in development mode:

```bash
SMTP not configured; OTP (dev only): 123456
```

Look for this message in your server terminal and use that code.

## Security Notes

- Never commit `.env` file to git
- Keep app password secret
- Use different app passwords for different apps
- Revoke app passwords you're not using
- Regular Gmail password still works normally
