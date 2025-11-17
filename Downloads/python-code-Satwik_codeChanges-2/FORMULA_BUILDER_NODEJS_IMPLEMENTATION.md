# Formula Builder Endpoints - Node.js Backend Implementation

## Summary

All Formula Builder endpoints have been successfully implemented in the Node.js backend (`reconcii_admin_backend-devyani_poc`).

## Endpoints Implemented

### 1. GET `/api/node/reconciliation/tenderList`
- **Purpose**: Get list of distinct tenders (data_source values) from `customised_db_fields` table
- **Controller**: `getTenderList` in `reco.controller.js`
- **Response Format**: Array of formatted tender names
  ```json
  ["POS Orders", "Zomato", ...]
  ```
- **Implementation Details**:
  - Queries `customised_db_fields` table for distinct `data_source` values
  - Formats tender names: replaces `_` with spaces, title case, keeps "POS" uppercase
  - Uses `db.bercos` (main database) for query

### 2. POST `/api/node/reconciliation/tenderWisetables`
- **Purpose**: Get tender-wise tables and columns from `customised_db_fields` table
- **Controller**: `getTenderWiseTables` in `reco.controller.js`
- **Request Body**:
  ```json
  {
    "tenders": ["ZOMATO"] // or "ZOMATO,POS Orders"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "data": [
      {
        "tender": "ZOMATO",
        "dataSourceWiseColumns": [
          {
            "dataSourceName": "ZOMATO",
            "tableName": "zomato_table",
            "columns": [
              {
                "excelColumnName": "amount",
                "dbColumnName": "amount",
                "columnName": "amount"
              }
            ]
          }
        ]
      }
    ]
  }
  ```
- **Implementation Details**:
  - Normalizes tenders (handles both array and comma-separated string)
  - Formats tender names for database query (spaces → underscores, uppercase)
  - Groups data by tender → dataSource → columns
  - Uses `db.customised_db_fields` model

### 3. POST `/api/node/reconciliation/recologics/save`
- **Purpose**: Save recologics formulas to the `reco_logics` table
- **Controller**: `saveRecologics` in `reco.controller.js`
- **Request Body**:
  ```json
  {
    "tenders": ["ZOMATO"] // or "ZOMATO,POS Orders",
    "recoData": [
      {
        "id": 1,
        "logicName": "Test Formula",
        "formula": "SUM(Column1)",
        "dataset": "zomato_table"
      }
    ],
    "effectiveFrom": "2024-01-01",
    "effectiveTo": "2099-12-31",
    "effectiveType": "business_date",
    "id": null // Optional, for updates
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "Formula saved successfully",
    "id": 123
  }
  ```
- **Implementation Details**:
  - Normalizes tenders to comma-separated string
  - Converts `recoData` array to JSON string (with indent=2) for storage in `recologic` column
  - Supports both INSERT (new) and UPDATE (if `id` provided) operations
  - Uses `db.reco_logics` model

### 4. GET `/api/node/reconciliation/recologics/getAll`
- **Purpose**: Get all saved recologics formulas, optionally filtered by tenders
- **Controller**: `getAllRecologics` in `reco.controller.js`
- **Query Parameters**:
  - `tenders` (optional): Comma-separated string or array of tender names
- **Response Format**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 123,
        "tenders": ["ZOMATO"],
        "recoData": [...],
        "effectiveFrom": "2024-01-01",
        "effectiveTo": "2099-12-31",
        "effectiveType": "business_date",
        "status": "UPDATED",
        "createdBy": "admin",
        "createdDate": "2024-01-01 10:00:00",
        "updatedDate": "2024-01-01 10:00:00"
      }
    ]
  }
  ```
- **Implementation Details**:
  - Parses `recologic` JSON column back to array
  - Filters by tenders if provided (using LIKE pattern matching)
  - Uses `db.reco_logics` model

### 5. GET `/api/node/reconciliation/recologics/get`
- **Purpose**: Get recologics formulas by topic/tender
- **Controller**: `getRecologicsByTopic` in `reco.controller.js`
- **Query Parameters**:
  - `tenders` (optional): Comma-separated string or array of tender names
  - `topic` (optional): Filter by topic/logicName/dataset
- **Response Format**: Same as `getAllRecologics`
- **Implementation Details**:
  - Filters `recoData` array by topic if provided
  - Only returns records with matching data

### 6. GET `/api/node/reconciliation/datasource`
- **Purpose**: Get datasource for mapping (similar to uploader datasource endpoint)
- **Controller**: `getDatasourceForMapping` in `reco.controller.js`
- **Response Format**:
  ```json
  {
    "success": true,
    "data": [
      {
        "category": "3PO",
        "tenders": [
          {
            "tender": "ZOMATO",
            "types": [
              {
                "type": "default",
                "dataSource": "ZOMATO"
              }
            ]
          }
        ]
      }
    ]
  }
  ```
- **Implementation Details**:
  - Queries `data_source` table from main database
  - Falls back to `customised_db_fields` if `data_source` table doesn't exist
  - Groups by category → tender → type
  - Uses `db.bercos` for raw SQL queries

## Files Modified

1. **`reconcii_admin_backend-devyani_poc/src/controllers/reco.controller.js`**
   - Added 6 new controller functions for Formula Builder endpoints
   - All functions include comprehensive error handling and logging

2. **`reconcii_admin_backend-devyani_poc/src/routes/reco.routes.js`**
   - Added 6 new routes for Formula Builder endpoints
   - All routes are mounted under `/api/node/reconciliation`

## Database Models Used

- `db.customised_db_fields` - For tender list and tender-wise tables
- `db.reco_logics` - For saving and retrieving formulas
- `db.bercos` - For raw SQL queries (tenderList, datasource)

## Compatibility

All endpoints are compatible with:
- Frontend expectations (matching `vikas_sir_config` format)
- Python backend implementation (same request/response formats)
- Existing database schema

## Testing

To test the endpoints:

1. **Start Node.js backend**:
   ```bash
   cd reconcii_admin_backend-devyani_poc
   npm start
   ```

2. **Test endpoints**:
   - `GET http://localhost:8080/api/node/reconciliation/tenderList`
   - `POST http://localhost:8080/api/node/reconciliation/tenderWisetables` (with `{"tenders": ["ZOMATO"]}`)
   - `POST http://localhost:8080/api/node/reconciliation/recologics/save` (with formula data)
   - `GET http://localhost:8080/api/node/reconciliation/recologics/getAll?tenders=ZOMATO`
   - `GET http://localhost:8080/api/node/reconciliation/recologics/get?tenders=ZOMATO&topic=test`
   - `GET http://localhost:8080/api/node/reconciliation/datasource`

## Next Steps

1. Test all endpoints from the frontend
2. Verify database queries return expected data
3. Test save/update functionality
4. Verify Formula Builder module works end-to-end

