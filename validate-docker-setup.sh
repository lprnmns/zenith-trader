#!/bin/bash

# Docker Setup Validation Script for Zenith Trader Backend
# This script validates the Docker configuration before building

echo "🔍 Validating Docker setup for Zenith Trader Backend..."

# Check if required files exist
echo "📁 Checking required files..."
required_files=("Dockerfile" "docker-compose.yml" ".env.docker" "package.json" "prisma/schema.prisma")

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check Docker configuration
echo "🐳 Checking Docker configuration..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    docker --version
else
    echo "❌ Docker is not installed"
    exit 1
fi

if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed"
    docker-compose --version
else
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Validate Dockerfile syntax
echo "🔧 Validating Dockerfile syntax..."
if docker run --rm -i hadolint/hadolint < Dockerfile 2>/dev/null; then
    echo "✅ Dockerfile syntax is valid"
else
    echo "⚠️  Dockerfile syntax validation failed (continuing anyway)"
fi

# Validate docker-compose.yml
echo "🔧 Validating docker-compose.yml..."
if docker-compose --env-file .env.docker config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml is valid"
else
    echo "❌ docker-compose.yml is invalid"
    docker-compose --env-file .env.docker config
    exit 1
fi

# Check environment variables
echo "🔑 Checking environment variables..."
required_env_vars=("NODE_ENV" "DATABASE_URL" "REDIS_URL" "JWT_SECRET" "ENCRYPTION_KEY")

for var in "${required_env_vars[@]}"; do
    if grep -q "^$var=" .env.docker; then
        echo "✅ $var is set in .env.docker"
    else
        echo "❌ $var is missing from .env.docker"
        exit 1
    fi
done

# Check Docker networks and volumes
echo "🌐 Checking Docker configuration..."
echo "Networks: $(grep -A 10 'networks:' docker-compose.yml | grep 'driver:' | head -1)"
echo "Volumes: $(grep -A 5 'volumes:' docker-compose.yml | grep -E 'postgres_data|redis_data')"

echo "🎉 Docker setup validation completed successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Run: docker-compose --env-file .env.docker up app postgres redis -d --build"
echo "2. Check status: docker-compose ps"
echo "3. View logs: docker-compose logs -f app"
echo "4. Stop services: docker-compose down"