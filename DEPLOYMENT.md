# 🚀 Zenith Trader Production Deployment Guide

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Backend Deployment (Azure)](#backend-deployment-azure)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Database Setup](#database-setup)
6. [Environment Variables](#environment-variables)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Checklist](#security-checklist)

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│    Azure VM     │────▶│  External APIs  │
│   (Frontend)    │     │   (Backend)     │     │  (OKX, Zerion)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (Database)    │
                        └─────────────────┘
```

## 📦 Prerequisites

### Local Machine
- Docker & Docker Compose
- Azure CLI
- Vercel CLI (`npm i -g vercel`)
- Git

### Azure Account
- Active Azure subscription
- Resource group created
- VM quota available (Standard_B2s or higher)

### Vercel Account
- Vercel account (free tier works)
- GitHub repository connected

## 🖥️ Backend Deployment (Azure)

### Step 1: Prepare Environment Variables

Create `.env.production` file:

```bash
# Database
DB_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://zenith:${DB_PASSWORD}@localhost:5432/zenith_trader_db

# API Keys
ZERION_API_KEY=your_zerion_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
OKX_API_KEY=your_okx_api_key
OKX_API_SECRET=your_okx_api_secret
OKX_PASSPHRASE=your_okx_passphrase

# Security
JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars
ENCRYPTION_KEY=your_encryption_key_64_hex_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=https://your-frontend.vercel.app/auth/success
GOOGLE_FAILURE_REDIRECT=https://your-frontend.vercel.app/auth/error
```

### Step 2: Deploy to Azure VM

#### Option A: Automated Deployment

```bash
# Make script executable
chmod +x scripts/deploy-azure.sh

# Run deployment
./scripts/deploy-azure.sh
```

#### Option B: Manual Deployment

1. **Create Azure VM:**
```bash
# Create resource group
az group create --name zenith-trader-rg --location westeurope

# Create VM
az vm create \
  --resource-group zenith-trader-rg \
  --name zenith-trader-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username zenithAdmin \
  --generate-ssh-keys

# Open ports
az vm open-port --port 80 --resource-group zenith-trader-rg --name zenith-trader-vm
az vm open-port --port 443 --resource-group zenith-trader-rg --name zenith-trader-vm
az vm open-port --port 3001 --resource-group zenith-trader-rg --name zenith-trader-vm
```

2. **SSH into VM:**
```bash
ssh zenithAdmin@<VM_IP_ADDRESS>
```

3. **Install Docker:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes
exit
```

4. **Clone Repository:**
```bash
git clone https://github.com/your-username/zenith-trader.git
cd zenith-trader
```

5. **Setup Environment:**
```bash
# Copy production env file
cp .env.example .env.production
# Edit with your actual values
nano .env.production
```

6. **Start Services:**
```bash
# Build and start containers
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Update API URL in frontend:**
```typescript
// frontend/project/src/config.ts
export const API_URL = process.env.VITE_API_URL || 'https://your-azure-vm-ip:3001/api';
```

2. **Build locally to test:**
```bash
cd frontend/project
npm install
npm run build
```

### Step 2: Deploy to Vercel

#### Option A: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend/project
vercel

# Follow prompts to:
# - Link to existing project or create new
# - Set production environment
# - Configure environment variables
```

#### Option B: Via GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import GitHub repository
4. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables:
   - `VITE_API_URL`: Your Azure VM URL
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID

## 🗄️ Database Setup

### Initial Setup

```bash
# SSH into Azure VM
ssh zenithAdmin@<VM_IP>

# Connect to database container
docker exec -it zenith-postgres psql -U zenith -d zenith_trader_db

# Verify tables
\dt

# Exit
\q
```

### Backup Strategy

Create backup script on VM:

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/home/zenithAdmin/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec zenith-postgres pg_dump -U zenith zenith_trader_db | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /home/zenithAdmin/backup.sh
```

## 🔑 Environment Variables

### Backend (.env.production)
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://... |
| OKX_API_KEY | OKX API key | 82cf6d49-... |
| OKX_API_SECRET | OKX API secret | D34E625E... |
| OKX_PASSPHRASE | OKX passphrase | YourPass123 |
| JWT_SECRET | JWT signing secret | random_32_chars |
| ENCRYPTION_KEY | Data encryption key | 64_hex_chars |

### Frontend (Vercel Environment)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | https://vm-ip:3001/api |
| VITE_GOOGLE_CLIENT_ID | Google OAuth Client | 849472268951-... |

## 📊 Monitoring & Maintenance

### Health Checks

1. **Backend Health:**
```bash
curl http://<VM_IP>:3001/api/health
```

2. **Docker Status:**
```bash
docker-compose -f docker-compose.production.yml ps
```

3. **PM2 Status (inside container):**
```bash
docker exec zenith-backend pm2 status
```

### Logs

```bash
# All logs
docker-compose -f docker-compose.production.yml logs

# Backend logs only
docker-compose -f docker-compose.production.yml logs backend

# Follow logs
docker-compose -f docker-compose.production.yml logs -f backend
```

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

## 🔧 Troubleshooting

### Common Issues

1. **Port already in use:**
```bash
# Find process using port
sudo lsof -i :3001
# Kill process
sudo kill -9 <PID>
```

2. **Database connection errors:**
```bash
# Check PostgreSQL status
docker exec zenith-postgres pg_isready
# Restart database
docker-compose -f docker-compose.production.yml restart postgres
```

3. **Out of memory:**
```bash
# Check memory usage
free -h
# Restart services
docker-compose -f docker-compose.production.yml restart
```

4. **SSL/HTTPS issues:**
```bash
# Install Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong, unique passwords for all services
- [ ] Enable firewall (ufw)
- [ ] Configure fail2ban for SSH
- [ ] Use SSH keys instead of passwords
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Enable HTTPS with SSL certificate
- [ ] Restrict database access to localhost only
- [ ] Regular backups configured
- [ ] Monitor logs for suspicious activity
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] No sensitive data in Git repository

## 📞 Support

For issues or questions:
1. Check logs first
2. Review this documentation
3. Check GitHub issues
4. Contact team lead

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Azure VM
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            cd ~/zenith-trader
            git pull origin main
            docker-compose -f docker-compose.production.yml down
            docker-compose -f docker-compose.production.yml build
            docker-compose -f docker-compose.production.yml up -d
```

---

**Last Updated:** December 2024
**Version:** 1.0.0
