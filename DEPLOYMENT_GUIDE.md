# 🚀 Production Deployment Guide

Complete guide for deploying EduGuard IoT to production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Setup](#database-setup)
3. [Server Deployment](#server-deployment)
4. [Client Deployment](#client-deployment)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)

## Pre-Deployment Checklist

### Security
- [ ] Generate strong, unique JWT_SECRET (min 64 characters)
- [ ] Change all default passwords
- [ ] Set NODE_ENV=production
- [ ] Configure MongoDB authentication
- [ ] Set up firewall rules
- [ ] Enable SSL/TLS certificates
- [ ] Configure SMTP with App Password
- [ ] Review and set appropriate CORS origins

### Environment Files
- [ ] Create production `.env` files
- [ ] Never commit `.env` files to version control
- [ ] Use environment-specific secrets
- [ ] Document all required environment variables

### Code Review
- [ ] Remove console.log statements (except logger)
- [ ] Remove development-only code
- [ ] Update API endpoints to production URLs
- [ ] Verify all error messages are user-friendly
- [ ] Test all critical paths

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create Cluster**
   - Go to https://cloud.mongodb.com
   - Create a new cluster (M0 free tier or higher)
   - Choose region closest to your server

2. **Configure Network Access**
   - Add your server IP address
   - Or allow access from anywhere (0.0.0.0/0) with strong authentication

3. **Create Database User**
   ```
   Username: eduguard_user
   Password: <generate-strong-password>
   Roles: Read and write to any database
   ```

4. **Get Connection String**
   ```
   mongodb+srv://eduguard_user:<password>@cluster0.xxxxx.mongodb.net/eduguard?retryWrites=true&w=majority
   ```

5. **Update server/.env**
   ```env
   MONGODB_URI=mongodb+srv://eduguard_user:yourpassword@cluster0.xxxxx.mongodb.net/eduguard
   ```

### Self-Hosted MongoDB

1. **Install MongoDB**
   ```bash
   # Ubuntu/Debian
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt update
   sudo apt install -y mongodb-org
   ```

2. **Configure Authentication**
   ```bash
   # Start MongoDB without auth
   sudo systemctl start mongod

   # Connect and create admin user
   mongosh
   ```

   ```javascript
   use admin
   db.createUser({
     user: "admin",
     pwd: "strong-password",
     roles: ["root"]
   })

   use eduguard
   db.createUser({
     user: "eduguard_user",
     pwd: "strong-password",
     roles: ["readWrite"]
   })
   ```

3. **Enable Authentication**
   ```bash
   sudo nano /etc/mongod.conf
   ```

   Add:
   ```yaml
   security:
     authorization: enabled
   ```

   Restart MongoDB:
   ```bash
   sudo systemctl restart mongod
   ```

4. **Update Connection String**
   ```env
   MONGODB_URI=mongodb://eduguard_user:password@localhost:27017/eduguard?authSource=eduguard
   ```

## Server Deployment

### Option 1: VPS (Ubuntu/Debian)

1. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Install PM2**
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone Repository**
   ```bash
   cd /var/www
   sudo git clone <your-repo> eduguard
   cd eduguard/server
   sudo npm install --production
   ```

5. **Configure Environment**
   ```bash
   sudo nano .env
   ```

   Set production values:
   ```env
   NODE_ENV=production
   PORT=8080
   MONGODB_URI=<your-production-mongodb-uri>
   JWT_SECRET=<64-character-random-string>
   CLIENT_ORIGIN=https://yourdomain.com
   SUPER_ADMIN_EMAIL=admin@yourdomain.com
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=<app-password>
   ```

6. **Create Admin User**
   ```bash
   node scripts/create-admin.js
   ```

7. **Start with PM2**
   ```bash
   pm2 start src/server.js --name eduguard-api
   pm2 save
   pm2 startup
   ```

8. **Configure Nginx Reverse Proxy**
   ```bash
   sudo apt install -y nginx
   sudo nano /etc/nginx/sites-available/eduguard-api
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/eduguard-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create App**
   ```bash
   cd server
   heroku create eduguard-api
   ```

3. **Add MongoDB**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret
   heroku config:set CLIENT_ORIGIN=https://your-client-domain.com
   heroku config:set SUPER_ADMIN_EMAIL=admin@example.com
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 3: Docker

1. **Create Dockerfile** (server/Dockerfile)
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 8080
   CMD ["node", "src/server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t eduguard-api .
   docker run -d -p 8080:8080 --env-file .env --name eduguard-api eduguard-api
   ```

## Client Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure**
   ```bash
   cd client
   ```

   Create `vercel.json`:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_BASE_URL production
   # Enter: https://api.yourdomain.com
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Build Project**
   ```bash
   cd client
   npm run build
   ```

2. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   netlify login
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. **Configure Redirects**

   Create `client/public/_redirects`:
   ```
   /*    /index.html   200
   ```

### Option 3: VPS with Nginx

1. **Build**
   ```bash
   cd client
   npm run build
   ```

2. **Copy to Server**
   ```bash
   sudo cp -r dist/* /var/www/eduguard-client/
   ```

3. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/eduguard-client
   ```

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/eduguard-client;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/eduguard-client /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

1. **Install Certbot**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain Certificates**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

3. **Auto-Renewal**
   ```bash
   sudo certbot renew --dry-run
   ```

## Monitoring & Maintenance

### Server Monitoring with PM2

```bash
# View logs
pm2 logs eduguard-api

# Monitor resources
pm2 monit

# View status
pm2 status

# Restart
pm2 restart eduguard-api
```

### Database Backups

**MongoDB Atlas**
- Automatic backups enabled by default
- Configure backup schedule in Atlas dashboard

**Self-Hosted**
```bash
# Create backup script
sudo nano /usr/local/bin/backup-mongo.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://eduguard_user:password@localhost:27017/eduguard" --out="$BACKUP_DIR/backup_$DATE"
# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/backup-mongo.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-mongo.sh
```

### Log Rotation

```bash
sudo nano /etc/logrotate.d/eduguard
```

```
/var/www/eduguard/server/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Health Checks

Create monitoring endpoint (optional):
```javascript
// server/src/app.js
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

### Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Post-Deployment

1. **Test All Features**
   - [ ] User login
   - [ ] Admin login
   - [ ] Password reset flow
   - [ ] User management (CRUD)
   - [ ] Email delivery

2. **Monitor Performance**
   - Check response times
   - Monitor database queries
   - Review error logs
   - Check memory usage

3. **Security Audit**
   - Test rate limiting
   - Verify SSL/TLS
   - Check CORS configuration
   - Test authentication flows

4. **Documentation**
   - Update internal documentation
   - Create user guides
   - Document admin procedures

---

## Support

For deployment issues, please refer to:
- [Server README](../server/README.md)
- [Client README](../client/README.md)
- [Main README](../README.md)
