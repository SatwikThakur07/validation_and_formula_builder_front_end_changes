# How to Test the Latest Changes

## 📋 Overview
This guide explains how to test the latest changes to the Upload, Validate, and Formula Builder modules.

## 🚀 Quick Start

### 1. **Test on Localhost (Development)**

```bash
# Start the frontend dev server
cd reconcii-devyani_poc
npm run dev

# Open browser console (F12) to see debug logs
# Navigate to: http://localhost:5173
```

**What to Check:**
- Open browser console (F12 → Console tab)
- You should see debug logs like:
  ```
  [AxiosInstance] Request URL: /api/uploader/upload
  [AxiosInstance] isLocalhost: true
  [AxiosInstance] Uploader routing to: http://localhost:8034
  ```

### 2. **Test on Staging Server**

1. **Deploy the dist folder** to your staging server
2. **Open browser console** (F12 → Console tab)
3. **Test each module:**

#### ✅ Test Upload Module
1. Navigate to Uploads page
2. Select a datasource
3. Upload a file
4. **Check console logs:**
   - Should see: `[AxiosInstance] Request URL: /devyani-service/api/uploader/upload`
   - Should see: `[AxiosInstance] Uploader routing to: https://devyaniuploadapi.corepeelers.com`
5. **Expected:** File uploads successfully, no 404 errors

#### ✅ Test Validate Module
1. Navigate to Uploads page
2. Click "Validate" button
3. **Check console logs:**
   - Should see: `[AxiosInstance] Request URL: /devyani-service/api/uploader/validate-columns`
   - Should see: `[AxiosInstance] Uploader routing to: https://devyaniuploadapi.corepeelers.com`
4. **Expected:** Column validation works, shows DB columns and Excel columns

#### ✅ Test Formula Builder Module
1. Navigate to Formula Builder page
2. **Check console logs:**
   - Should see: `[AxiosInstance] Request URL: /devyani-service/api/reconciliation/api/v1/tenderList`
   - Should see: `[AxiosInstance] Formula Builder routing to: https://devyaniuploadapi.corepeelers.com`
3. **Expected:** Tender list loads, no 404 errors

## 🔍 Debugging

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `[AxiosInstance]` logs
4. Check Network tab for actual API calls

### Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "XHR" or "Fetch"
4. Click on failed requests (red)
5. Check:
   - **Request URL:** Should match expected pattern
   - **Status:** Should be 200 (not 404)
   - **Response:** Should contain data

### Common Issues

#### ❌ 404 Error on Upload
**Problem:** Request going to wrong base URL
**Solution:** Check console logs - should route to `reconciiBaseURL` for staging

#### ❌ 404 Error on Validate
**Problem:** URL pattern not matching
**Solution:** Verify URL includes `/uploader/validate-columns`

#### ❌ 404 Error on Formula Builder
**Problem:** Reconciliation endpoint not routing correctly
**Solution:** Check URL includes `/reconciliation/api/v1/`

## 📝 Testing Checklist

- [ ] Login works
- [ ] Upload page loads
- [ ] File upload works (no 404)
- [ ] Validate button works (no 404)
- [ ] Column validation shows DB columns
- [ ] Formula Builder page loads
- [ ] Tender list loads (no 404)
- [ ] Tender-wise tables load (no 404)
- [ ] Save formula works (no 404)
- [ ] All console logs show correct routing

## 🛠️ Manual Testing Steps

### Step 1: Test Upload
```bash
1. Go to Uploads page
2. Select datasource: "ZOMATO" (or any available)
3. Select client: "Devyani" (or any available)
4. Choose a file
5. Click "Upload"
6. Check: Should see success message, no 404 errors
```

### Step 2: Test Validate
```bash
1. Go to Uploads page
2. Click "Validate" button (without uploading file first)
3. Check: Should see DB columns on left side
4. Upload a file and click "Validate"
5. Check: Should see both DB columns and Excel columns
```

### Step 3: Test Formula Builder
```bash
1. Go to Formula Builder page
2. Check: Tender dropdown should populate
3. Select a tender (e.g., "Zomato")
4. Check: Data source dropdown should populate
5. Check: Columns should load for selected data source
6. Build a formula and save
7. Check: Should save successfully, no 404 errors
```

## 🔧 API Endpoint Testing

### Test Upload Endpoint
```bash
# Using curl
curl -X POST "https://devyaniuploadapi.corepeelers.com/devyani-service/api/uploader/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@test.xlsx" \
  -F "datasource=ZOMATO" \
  -F "type=orders"
```

### Test Validate Endpoint
```bash
# Without file (should return DB columns)
curl -X POST "https://devyaniuploadapi.corepeelers.com/devyani-service/api/uploader/validate-columns" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "datasource=ZOMATO"
```

### Test Formula Builder Endpoint
```bash
# Get tender list
curl -X GET "https://devyaniuploadapi.corepeelers.com/devyani-service/api/reconciliation/api/v1/tenderList" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Expected Results

### ✅ Success Indicators
- No 404 errors in browser console
- API calls return 200 status
- Data loads correctly
- Debug logs show correct routing
- Network tab shows correct base URLs

### ❌ Failure Indicators
- 404 errors in console
- "Network Error" messages
- Empty data responses
- Wrong base URL in network tab
- Debug logs show incorrect routing

## 🚨 If Tests Fail

1. **Check nginx configuration** on server
2. **Verify backend endpoints** are deployed
3. **Check browser console** for specific error messages
4. **Verify API tokens** are valid
5. **Check network tab** for actual request URLs
6. **Review debug logs** to see routing decisions

## 📦 Deployment Checklist

Before deploying dist folder:
- [ ] All tests pass locally
- [ ] Console logs show correct routing
- [ ] No 404 errors in development
- [ ] Dist folder rebuilt with latest changes
- [ ] Nginx configuration updated on server
- [ ] Backend endpoints deployed

## 🎯 Quick Test Script

```javascript
// Run in browser console on staging
console.log('Testing API endpoints...');

// Test 1: Check if uploader endpoint is accessible
fetch('/devyani-service/api/uploader/datasource', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => console.log('Uploader endpoint:', r.status === 200 ? '✅ OK' : '❌ Failed'))
.catch(e => console.log('Uploader endpoint: ❌ Error', e));

// Test 2: Check if formula builder endpoint is accessible
fetch('/devyani-service/api/reconciliation/api/v1/tenderList', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => console.log('Formula Builder endpoint:', r.status === 200 ? '✅ OK' : '❌ Failed'))
.catch(e => console.log('Formula Builder endpoint: ❌ Error', e));
```

---

**Last Updated:** Nov 17, 2024
**Dist Folder:** `reconcii-devyani_poc/dist/`
**Build Time:** Latest build includes all routing fixes

