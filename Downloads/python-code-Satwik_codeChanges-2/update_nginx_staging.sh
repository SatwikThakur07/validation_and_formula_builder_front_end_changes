#!/bin/bash

# Nginx Configuration Update Script for Staging Server
# This script safely updates nginx configuration with new routing rules

set -e  # Exit on error

NGINX_CONFIG="/etc/nginx/sites-available/devyani"
BACKUP_DIR="/etc/nginx/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/devyani.backup.${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Nginx Configuration Update Script ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if nginx config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}Error: Nginx config file not found at $NGINX_CONFIG${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup current configuration
echo -e "${YELLOW}Creating backup...${NC}"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
echo ""

# Check if the new routes already exist
if grep -q "location = /devyani-service/api/upload" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}Warning: Some routes already exist. Skipping duplicate entries.${NC}"
    echo ""
fi

# Find the insertion point (after /api/uploader location block)
INSERT_LINE=$(grep -n "location /api/uploader" "$NGINX_CONFIG" | tail -1 | cut -d: -f1)
if [ -z "$INSERT_LINE" ]; then
    echo -e "${RED}Error: Could not find insertion point. Please update manually.${NC}"
    exit 1
fi

# Calculate line number after the /api/uploader block (usually +10 lines)
INSERT_LINE=$((INSERT_LINE + 10))

# Create temporary file with new configuration
TEMP_FILE=$(mktemp)

# Copy everything before insertion point
head -n "$INSERT_LINE" "$NGINX_CONFIG" > "$TEMP_FILE"

# Add new routes
cat >> "$TEMP_FILE" << 'EOF'

    # Route /devyani-service/api/upload to /api/uploader/upload (matches vikas_sir_config)
    location = /devyani-service/api/upload {
        proxy_pass http://python_api/api/uploader/upload;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Increase timeouts for file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        client_max_body_size 100M;
    }

    # Route /devyani-service/api/uploader/* to /api/uploader/* for staging compatibility
    location /devyani-service/api/uploader {
        proxy_pass http://python_api/api/uploader;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Increase timeouts for file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        client_max_body_size 100M;
    }

    # Route /devyani-service/api/* to /api/* for other endpoints (datasource, etc.)
    location /devyani-service/api {
        proxy_pass http://python_api/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        client_max_body_size 100M;
    }
EOF

# Copy everything after insertion point
tail -n +$((INSERT_LINE + 1)) "$NGINX_CONFIG" >> "$TEMP_FILE"

# Test the new configuration
echo -e "${YELLOW}Testing nginx configuration...${NC}"
if nginx -t -c /etc/nginx/nginx.conf 2>&1 | grep -q "test is successful"; then
    echo -e "${GREEN}✓ Configuration test passed${NC}"
    echo ""
    
    # Replace original config with new one
    mv "$TEMP_FILE" "$NGINX_CONFIG"
    echo -e "${GREEN}✓ Configuration updated${NC}"
    echo ""
    
    # Ask for confirmation before reloading
    read -p "Reload nginx now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Reloading nginx...${NC}"
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
        echo ""
        echo -e "${GREEN}=== Update Complete ===${NC}"
        echo ""
        echo "New routes added:"
        echo "  - /devyani-service/api/upload → /api/uploader/upload"
        echo "  - /devyani-service/api/uploader/* → /api/uploader/*"
        echo "  - /devyani-service/api/* → /api/*"
    else
        echo -e "${YELLOW}Configuration updated but not reloaded. Run 'sudo systemctl reload nginx' when ready.${NC}"
    fi
else
    echo -e "${RED}✗ Configuration test failed!${NC}"
    echo -e "${RED}Restoring backup...${NC}"
    cp "$BACKUP_FILE" "$NGINX_CONFIG"
    rm "$TEMP_FILE"
    echo -e "${YELLOW}Original configuration restored. Please check the error messages above.${NC}"
    exit 1
fi

