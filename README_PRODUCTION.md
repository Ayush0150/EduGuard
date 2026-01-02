# EduGuard IoT - Production-Ready Security & Monitoring System

A secure, scalable, and production-ready authentication and user management system built with the MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Features

- **Secure Authentication**: JWT-based auth with bcrypt password hashing
- **Role-Based Access Control (RBAC)**: Admin, User, Security, Maintenance, and Principal roles
- **Password Reset Flow**: Secure OTP-based password recovery with email delivery
- **Admin Dashboard**: Complete user management (CRUD operations)
- **Production-Ready**: Comprehensive logging, error handling, security headers
- **Optimized Performance**: Lazy loading, code splitting, database indexing
- **Security Hardening**: Rate limiting, input sanitization, CORS, Helmet
- **Gmail Integration**: Configured for Gmail SMTP with App Password support

## 📋 Prerequisites

- **Node.js**: v18+ recommended
- **MongoDB**: v6+ or MongoDB Atlas account
- **Gmail Account**: For sending password reset emails (with App Password)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd EduGuard-Iot

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

#### Server Configuration

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb://localhost:27017/eduguard
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173

# Super Admin
SUPER_ADMIN_EMAIL=admin@example.com
ADMIN_RECOVERY_EMAIL=recovery@example.com

# Gmail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

#### Client Configuration

```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 3. Create Admin Account

```bash
cd server
node scripts/create-admin.js
```

Follow the prompts to create your first admin account.

### 4. Start Development Servers

```bash
# Terminal 1: Start server (from server directory)
npm run dev

# Terminal 2: Start client (from client directory)
npm run dev
```

- **Client**: http://localhost:5174
- **Server**: http://localhost:8080
- **Admin Login**: http://localhost:5174/login/admin

## 🔐 Gmail Setup for Password Reset

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. **Update** `server/.env`:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

## 📁 Project Structure

```
EduGuard-Iot/
├── client/                 # React frontend
│   ├── src/
│   │   ├── core/          # Core utilities (auth, http, layout)
│   │   ├── features/      # Feature modules (auth, dashboard)
│   │   └── assets/        # Images and static files
│   ├── package.json
│   └── vite.config.js     # Optimized Vite configuration
├── server/                # Node.js backend
│   ├── src/
│   │   ├── core/         # Core modules (config, middleware, security)
│   │   ├── modules/      # Feature modules (auth, admin, users)
│   │   └── app.js
│   ├── scripts/          # Utility scripts (create-admin, etc.)
│   └── package.json
└── README.md
```

## 🎯 User Roles & Permissions

| Role          | Access Level | Capabilities                         |
|---------------|--------------|--------------------------------------|
| SUPER_ADMIN   | Full         | All admin operations, system config  |
| ADMIN         | High         | User management, system monitoring   |
| PRINCIPAL     | Medium       | View users, limited management       |
| SECURITY      | Medium       | Security monitoring, user status     |
| MAINTENANCE   | Low          | Basic monitoring                     |
| USER          | Basic        | Personal dashboard only              |

## 🚀 Production Deployment

### Environment Configuration

1. **Server** (`server/.env`):
   ```env
   NODE_ENV=production
   PORT=8080
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=complex-random-secret-key
   CLIENT_ORIGIN=https://your-domain.com
   ```

2. **Client** (`client/.env.production`):
   ```env
   VITE_API_BASE_URL=https://api.your-domain.com
   ```

### Build for Production

```bash
# Build client
cd client
npm run build

# The build output will be in client/dist/

# Start server in production mode
cd ../server
NODE_ENV=production npm start
```

### Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Enable MongoDB authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable rate limiting (already configured)
- [ ] Set up monitoring and logging
- [ ] Regular security updates
- [ ] Backup strategy

## 🧪 Testing

```bash
# Server tests (when implemented)
cd server
npm test

# Client tests (when implemented)
cd client
npm test
```

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/admin/login` - Admin login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Password Reset
- `POST /api/v1/auth/forgot-password/request-otp` - Request OTP
- `POST /api/v1/auth/forgot-password/verify-otp` - Verify OTP
- `POST /api/v1/auth/forgot-password/reset` - Reset password

### Admin Operations (Requires Auth + Admin Role)
- `GET /api/v1/admin/users` - List all users
- `POST /api/v1/admin/users` - Create user
- `GET /api/v1/admin/users/:id` - Get user by ID
- `PUT /api/v1/admin/users/:id` - Update user
- `DELETE /api/v1/admin/users/:id` - Delete user
- `PATCH /api/v1/admin/users/:id/toggle` - Toggle user status

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based auth with expiration
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **Input Validation**: Zod schema validation
- **Audit Logging**: Comprehensive security event logging
- **OTP Expiration**: Time-limited one-time passwords

## 🔧 Maintenance Scripts

```bash
cd server

# Create a new admin user
node scripts/create-admin.js

# Delete all regular users (keep admins)
node scripts/delete-regular-users.js

# Reset bootstrap admin account
node scripts/reset-bootstrap-admin.js
```

## 📊 Performance Optimizations

- **Frontend**: Lazy loading, code splitting, optimized bundles
- **Backend**: Database indexing, query optimization, connection pooling
- **Caching**: Static asset caching, API response optimization
- **Compression**: Gzip compression enabled

## 🐛 Troubleshooting

### Email Not Sending
- Verify Gmail App Password is correct
- Check SMTP settings in `.env`
- Ensure 2FA is enabled on Gmail
- Check server logs for detailed error messages

### Login Issues
- Verify MongoDB connection
- Check JWT_SECRET is set
- Ensure user account is active
- Check browser console for errors

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Clear Vite cache: `rm -rf client/.vite`

## 📄 License

ISC

## 👥 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ for secure education monitoring**
