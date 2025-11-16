# Server Restart Required

The save recologics endpoint has been added but the server needs to be restarted to register the new route.

## To Fix the 404 Error:

1. **Stop the current Python server** (if running):
   - Press `Ctrl+C` in the terminal where the server is running

2. **Restart the server**:
   ```bash
   cd python
   python -m uvicorn app.main:app --reload --port 8034
   ```

3. **Verify the endpoint is registered**:
   - The endpoint should now be available at: `http://localhost:8034/api/reconciliation/api/v1/recologics/save`
   - Check server logs for: `[RECOLOGICS] Save endpoint hit` when you try to save

## Endpoint Details:

- **Path**: `/api/v1/recologics/save`
- **Full URL (localhost)**: `http://localhost:8034/api/reconciliation/api/v1/recologics/save`
- **Method**: POST
- **Request Format**: Matches vikas_sir_config
  ```json
  {
    "tenders": ["ZOMATO"],
    "recoData": [{...formula objects...}],
    "effectiveFrom": "2024-01-01",
    "effectiveTo": "2099-12-31",
    "effectiveType": "business_date"
  }
  ```

## After Restart:

The "Save Formula" button should work without the 404 error.

