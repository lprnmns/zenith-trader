#!/bin/bash

# Zenith Trader Production Deployment Script
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="zenith-trader"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# Logging
LOG_FILE="deploy.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "${BLUE}🚀 Zenith Trader Production Deployment${NC}"
echo "Timestamp: $(date)"
echo "=================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found"
    print_warning "Please copy production.env.example to .env and configure it"
    exit 1
fi

print_status "Prerequisites check passed"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs backups nginx/ssl monitoring/grafana/dashboards monitoring/grafana/datasources

# Generate SSL certificates (self-signed for testing)
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    print_warning "SSL certificates not found, generating self-signed certificates..."
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=TR/ST=Istanbul/L=Istanbul/O=Zenith Trader/CN=localhost"
    print_status "SSL certificates generated"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose -f "$DOCKER_COMPOSE_FILE" pull

# Build application
print_status "Building application..."
docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache

# Start services
print_status "Starting services..."
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check if all containers are running
if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Exit"; then
    print_error "Some containers failed to start"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs
    exit 1
fi

# Check application health
print_status "Checking application health..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_status "Application is healthy"
        break
    else
        if [ $i -eq 10 ]; then
            print_error "Application health check failed after 10 attempts"
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs app
            exit 1
        fi
        print_warning "Health check attempt $i failed, retrying..."
        sleep 10
    fi
done

# Run database migrations
print_status "Running database migrations..."
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app npx prisma migrate deploy

# Generate Prisma client
print_status "Generating Prisma client..."
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app npx prisma generate

# Create initial admin user if not exists
print_status "Setting up initial admin user..."
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupAdmin() {
    try {
        const adminExists = await prisma.user.findFirst({
            where: { role: 'admin' }
        });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await prisma.user.create({
                data: {
                    email: 'admin@zenith.com',
                    password: hashedPassword,
                    role: 'admin'
                }
            });
            console.log('Admin user created: admin@zenith.com / admin123');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Error setting up admin user:', error);
    } finally {
        await prisma.\$disconnect();
    }
}

setupAdmin();
"

# Setup monitoring dashboards
print_status "Setting up monitoring dashboards..."
if [ -d "monitoring/grafana/dashboards" ]; then
    # Create basic dashboard configuration
    cat > monitoring/grafana/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'Zenith Trader'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF
fi

# Setup datasources
if [ -d "monitoring/grafana/datasources" ]; then
    cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
fi

# Final health check
print_status "Performing final health check..."
sleep 10

# Check all endpoints
endpoints=(
    "http://localhost:3000/health"
    "http://localhost:3000/metrics"
    "http://localhost:9091" # Prometheus
    "http://localhost:3001" # Grafana
)

for endpoint in "${endpoints[@]}"; do
    if curl -f "$endpoint" > /dev/null 2>&1; then
        print_status "✅ $endpoint is accessible"
    else
        print_warning "⚠️ $endpoint is not accessible"
    fi
done

# Display deployment summary
echo ""
echo -e "${BLUE}🎉 Deployment Summary${NC}"
echo "=================================="
echo -e "${GREEN}✅ Application: http://localhost:3000${NC}"
echo -e "${GREEN}✅ Health Check: http://localhost:3000/health${NC}"
echo -e "${GREEN}✅ Metrics: http://localhost:3000/metrics${NC}"
echo -e "${GREEN}✅ Prometheus: http://localhost:9091${NC}"
echo -e "${GREEN}✅ Grafana: http://localhost:3001${NC}"
echo ""
echo -e "${YELLOW}📋 Default Admin Credentials:${NC}"
echo "Email: admin@zenith.com"
echo "Password: admin123"
echo ""
echo -e "${YELLOW}📋 Important Notes:${NC}"
echo "1. Change default admin password immediately"
echo "2. Configure SSL certificates for production"
echo "3. Set up proper backup schedule"
echo "4. Monitor system resources"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo "View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
echo "Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
echo "Restart services: docker-compose -f $DOCKER_COMPOSE_FILE restart"
echo "Backup database: docker-compose -f $DOCKER_COMPOSE_FILE exec backup /backup.sh"
echo ""
echo -e "${GREEN}🚀 Deployment completed successfully!${NC}"
echo "Log file: $LOG_FILE"
