#!/bin/bash

# Zenith Trader Database Backup Script
# This script creates daily backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="postgres"
DB_PORT="5432"
DB_NAME="zenith_trader_prod"
DB_USER="zenith_user"
DB_PASSWORD="${POSTGRES_PASSWORD}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/zenith_trader_backup_$TIMESTAMP.sql"
COMPRESSED_BACKUP_FILE="$BACKUP_FILE.gz"

echo "Starting database backup at $(date)"

# Create database backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --format=custom \
    --file="$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "Backup completed: $COMPRESSED_BACKUP_FILE"

# Remove old backups (keep last 7 days)
find "$BACKUP_DIR" -name "zenith_trader_backup_*.sql.gz" -mtime +7 -delete

echo "Old backups cleaned up"

# Verify backup integrity
echo "Verifying backup integrity..."
gunzip -t "$COMPRESSED_BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "Backup verification successful"
else
    echo "Backup verification failed"
    exit 1
fi

echo "Backup process completed successfully at $(date)"
