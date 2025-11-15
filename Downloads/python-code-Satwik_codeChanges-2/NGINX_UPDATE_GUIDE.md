# Nginx Configuration Update Guide for Staging Server

## Overview
This guide provides step-by-step instructions to update the nginx configuration on the staging server to support the new endpoint routing.

## Changes Required

### New Routes to Add

1. **Upload Endpoint Route** (matches vikas_sir_config):
   - Route: `/devyani-service/api/upload` → `/api/uploader/upload`

2. **Uploader Endpoints Route**:
   - Route: `/devyani-service/api/uploader/*` → `/api/uploader/*`

3. **General API Route**:
   - Route: `/devyani-service/api/*` → `/api/*`

## Step-by-Step Instructions

### Option 1: Manual Update (Recommended for Production)

1. **SSH into the staging server**
   ```bash
   ssh user@staging-server
   ```

2. **Backup current nginx configuration**
   ```bash
   sudo cp /etc/nginx/sites-available/devyani /etc/nginx/sites-available/devyani.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **Edit nginx configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/devyani
   # OR
   sudo vi /etc/nginx/sites-available/devyani
   ```

4. **Add the following location blocks** (add them after the existing `/api/uploader` location block, around line 86):

   ```nginx
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
   ```

5. **Test nginx configuration**
   ```bash
   sudo nginx -t
   ```
   Expected output: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

6. **If test passes, reload nginx**
   ```bash
   sudo systemctl reload nginx
   # OR
   sudo service nginx reload
   ```

7. **Verify the changes are active**
   ```bash
   sudo nginx -T | grep -A 10 "devyani-service/api"
   ```

### Option 2: Using the Provided Script

1. **Copy the update script to staging server**
   ```bash
   scp update_nginx_staging.sh user@staging-server:/tmp/
   ```

2. **SSH into staging server**
   ```bash
   ssh user@staging-server
   ```

3. **Make script executable and run**
   ```bash
   chmod +x /tmp/update_nginx_staging.sh
   sudo /tmp/update_nginx_staging.sh
   ```

## Important Notes

1. **Order Matters**: The location blocks must be in this order:
   - `/devyani-service/api/upload` (exact match, `=`)
   - `/devyani-service/api/uploader` (prefix match)
   - `/devyani-service/api` (prefix match, catch-all)

2. **Upstream Configuration**: Ensure `python_api` upstream is defined:
   ```nginx
   upstream python_api {
       server localhost:8034;
   }
   ```

3. **Backup First**: Always backup before making changes

4. **Test Before Reload**: Always run `nginx -t` before reloading

## Verification

After updating, test the endpoints:

```bash
# Test upload endpoint
curl -X POST https://devyaniuploadapi.corepeelers.com/devyani-service/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test.xlsx" \
  -F "datasource=ZOMATO"

# Test validate-columns endpoint
curl -X POST https://devyaniuploadapi.corepeelers.com/devyani-service/api/uploader/validate-columns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "datasource=ZOMATO" \
  -F "file=@test.xlsx"
```

## Rollback

If something goes wrong:

```bash
# Restore backup
sudo cp /etc/nginx/sites-available/devyani.backup.* /etc/nginx/sites-available/devyani

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Support

If you encounter issues:
1. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Check nginx access logs: `sudo tail -f /var/log/nginx/access.log`
3. Verify upstream is running: `curl http://localhost:8034/health`

