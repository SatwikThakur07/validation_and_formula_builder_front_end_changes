#!/usr/bin/env node

/**
 * Comprehensive Frontend Test Script - Localhost
 * Tests login, upload, validate, and formula builder 10 times each
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8034';
const FRONTEND_URL = 'http://localhost:3012';

// Test credentials (adjust as needed)
const TEST_CREDENTIALS = {
  username: 'admin', // Change to your test username
  password: 'admin'  // Change to your test password
};

let authToken = null;
let testResults = {
  login: { success: 0, fail: 0, errors: [] },
  upload: { success: 0, fail: 0, errors: [] },
  validate: { success: 0, fail: 0, errors: [] },
  formulaBuilder: { success: 0, fail: 0, errors: [] }
};

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Login
async function testLogin(attempt) {
  log(`\n[TEST ${attempt}/10] Testing Login...`, 'cyan');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/auth/access/token`,
      {
        username: TEST_CREDENTIALS.username,
        password: TEST_CREDENTIALS.password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && (response.data.access_token || response.data.data?.access_token)) {
      authToken = response.data.access_token || response.data.data.access_token;
      log(`✓ Login successful - Token received`, 'green');
      testResults.login.success++;
      return true;
    } else {
      log(`✗ Login failed - No token in response`, 'red');
      testResults.login.fail++;
      testResults.login.errors.push(`Attempt ${attempt}: No token in response`);
      return false;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
    log(`✗ Login failed: ${errorMsg}`, 'red');
    testResults.login.fail++;
    testResults.login.errors.push(`Attempt ${attempt}: ${errorMsg}`);
    return false;
  }
}

// Test 2: Upload
async function testUpload(attempt) {
  log(`\n[TEST ${attempt}/10] Testing Upload...`, 'cyan');
  
  if (!authToken) {
    log(`✗ Upload skipped - No auth token`, 'yellow');
    testResults.upload.fail++;
    testResults.upload.errors.push(`Attempt ${attempt}: No auth token`);
    return false;
  }

  try {
    // Create a dummy file for testing
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    // Create a test file if it doesn't exist
    const testFilePath = path.join(__dirname, 'test_upload.xlsx');
    if (!fs.existsSync(testFilePath)) {
      log(`⚠ Creating dummy test file...`, 'yellow');
      // Create minimal Excel file content (you may need to create a real Excel file)
      fs.writeFileSync(testFilePath, Buffer.from('dummy content'));
    }

    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath));
    
    const response = await axios.post(
      `${BASE_URL}/api/uploader/upload?datasource=ZOMATO&client=devyani`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data && response.status === 200) {
      log(`✓ Upload successful`, 'green');
      testResults.upload.success++;
      return response.data.data?.uploadedFiles?.[0]?.id || null;
    } else {
      log(`✗ Upload failed - Invalid response`, 'red');
      testResults.upload.fail++;
      testResults.upload.errors.push(`Attempt ${attempt}: Invalid response`);
      return null;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
    log(`✗ Upload failed: ${errorMsg}`, 'red');
    testResults.upload.fail++;
    testResults.upload.errors.push(`Attempt ${attempt}: ${errorMsg}`);
    return null;
  }
}

// Test 3: Validate Columns
async function testValidate(attempt, uploadId) {
  log(`\n[TEST ${attempt}/10] Testing Validate Columns...`, 'cyan');
  
  if (!authToken) {
    log(`✗ Validate skipped - No auth token`, 'yellow');
    testResults.validate.fail++;
    testResults.validate.errors.push(`Attempt ${attempt}: No auth token`);
    return false;
  }

  try {
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    const testFilePath = path.join(__dirname, 'test_upload.xlsx');
    if (!fs.existsSync(testFilePath)) {
      log(`⚠ Test file not found, skipping validate`, 'yellow');
      testResults.validate.fail++;
      testResults.validate.errors.push(`Attempt ${attempt}: Test file not found`);
      return false;
    }

    const formData = new FormData();
    if (uploadId) {
      formData.append('upload_id', uploadId.toString());
    } else {
      formData.append('file', fs.createReadStream(testFilePath));
    }
    formData.append('datasource', 'ZOMATO');
    formData.append('client', 'devyani');

    const response = await axios.post(
      `${BASE_URL}/api/uploader/validate-columns`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (response.data && response.status === 200) {
      log(`✓ Validate successful`, 'green');
      testResults.validate.success++;
      return true;
    } else {
      log(`✗ Validate failed - Invalid response`, 'red');
      testResults.validate.fail++;
      testResults.validate.errors.push(`Attempt ${attempt}: Invalid response`);
      return false;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
    log(`✗ Validate failed: ${errorMsg}`, 'red');
    testResults.validate.fail++;
    testResults.validate.errors.push(`Attempt ${attempt}: ${errorMsg}`);
    return false;
  }
}

// Test 4: Formula Builder - Get Tender List
async function testFormulaBuilderTenderList(attempt) {
  log(`\n[TEST ${attempt}/10] Testing Formula Builder - Tender List...`, 'cyan');
  
  if (!authToken) {
    log(`✗ Formula Builder skipped - No auth token`, 'yellow');
    testResults.formulaBuilder.fail++;
    testResults.formulaBuilder.errors.push(`Attempt ${attempt}: No auth token`);
    return null;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/api/reconciliation/api/v1/tenderList`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.status === 200) {
      const tenders = response.data.data || response.data || [];
      log(`✓ Tender list loaded: ${tenders.length} tender(s)`, 'green');
      return tenders.length > 0 ? tenders[0] : null;
    } else {
      log(`✗ Tender list failed - Invalid response`, 'red');
      testResults.formulaBuilder.fail++;
      testResults.formulaBuilder.errors.push(`Attempt ${attempt}: Invalid response`);
      return null;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
    log(`✗ Tender list failed: ${errorMsg}`, 'red');
    testResults.formulaBuilder.fail++;
    testResults.formulaBuilder.errors.push(`Attempt ${attempt}: ${errorMsg}`);
    return null;
  }
}

// Test 5: Formula Builder - Get Datasets
async function testFormulaBuilderDatasets(attempt, tender) {
  log(`\n[TEST ${attempt}/10] Testing Formula Builder - Datasets for ${tender}...`, 'cyan');
  
  if (!authToken) {
    log(`✗ Datasets skipped - No auth token`, 'yellow');
    testResults.formulaBuilder.fail++;
    return false;
  }

  if (!tender) {
    log(`✗ Datasets skipped - No tender`, 'yellow');
    testResults.formulaBuilder.fail++;
    return false;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/api/reconciliation/api/v1/tenderWisetables`,
      { tenders: [tender] },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data && response.status === 200) {
      const data = response.data.data || response.data;
      let datasetCount = 0;
      let columnCount = 0;

      if (Array.isArray(data) && data.length > 0) {
        data.forEach(tenderData => {
          const dataSources = tenderData?.dataSourceWiseColumns || [];
          if (Array.isArray(dataSources)) {
            datasetCount += dataSources.length;
            dataSources.forEach(ds => {
              const cols = ds?.columns || ds?.columnList || [];
              if (Array.isArray(cols)) {
                columnCount += cols.length;
              }
            });
          }
        });
      }

      if (datasetCount > 0) {
        log(`✓ Datasets loaded: ${datasetCount} dataset(s), ${columnCount} column(s)`, 'green');
        testResults.formulaBuilder.success++;
        return true;
      } else {
        log(`✗ No datasets found`, 'yellow');
        testResults.formulaBuilder.fail++;
        testResults.formulaBuilder.errors.push(`Attempt ${attempt}: No datasets found`);
        return false;
      }
    } else {
      log(`✗ Datasets failed - Invalid response`, 'red');
      testResults.formulaBuilder.fail++;
      testResults.formulaBuilder.errors.push(`Attempt ${attempt}: Invalid response`);
      return false;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
    log(`✗ Datasets failed: ${errorMsg}`, 'red');
    testResults.formulaBuilder.fail++;
    testResults.formulaBuilder.errors.push(`Attempt ${attempt}: ${errorMsg}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('COMPREHENSIVE FRONTEND TEST - LOCALHOST', 'blue');
  log('Testing all flows 10 times each', 'blue');
  log('='.repeat(60), 'blue');

  for (let i = 1; i <= 10; i++) {
    log(`\n${'='.repeat(60)}`, 'yellow');
    log(`ROUND ${i}/10`, 'yellow');
    log('='.repeat(60), 'yellow');

    // Test Login
    const loginSuccess = await testLogin(i);
    await sleep(500);

    if (loginSuccess) {
      // Test Upload
      const uploadId = await testUpload(i);
      await sleep(500);

      // Test Validate
      await testValidate(i, uploadId);
      await sleep(500);

      // Test Formula Builder
      const tender = await testFormulaBuilderTenderList(i);
      await sleep(500);
      if (tender) {
        await testFormulaBuilderDatasets(i, tender);
      }
    }

    await sleep(1000); // Wait between rounds
  }

  // Print summary
  log('\n' + '='.repeat(60), 'blue');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(60), 'blue');
  
  log(`\nLogin: ${testResults.login.success}/10 successful, ${testResults.login.fail}/10 failed`, 
    testResults.login.success === 10 ? 'green' : 'red');
  if (testResults.login.errors.length > 0) {
    log('Login Errors:', 'red');
    testResults.login.errors.forEach(err => log(`  - ${err}`, 'red'));
  }

  log(`\nUpload: ${testResults.upload.success}/10 successful, ${testResults.upload.fail}/10 failed`, 
    testResults.upload.success === 10 ? 'green' : 'red');
  if (testResults.upload.errors.length > 0) {
    log('Upload Errors:', 'red');
    testResults.upload.errors.forEach(err => log(`  - ${err}`, 'red'));
  }

  log(`\nValidate: ${testResults.validate.success}/10 successful, ${testResults.validate.fail}/10 failed`, 
    testResults.validate.success === 10 ? 'green' : 'red');
  if (testResults.validate.errors.length > 0) {
    log('Validate Errors:', 'red');
    testResults.validate.errors.forEach(err => log(`  - ${err}`, 'red'));
  }

  log(`\nFormula Builder: ${testResults.formulaBuilder.success}/10 successful, ${testResults.formulaBuilder.fail}/10 failed`, 
    testResults.formulaBuilder.success === 10 ? 'green' : 'red');
  if (testResults.formulaBuilder.errors.length > 0) {
    log('Formula Builder Errors:', 'red');
    testResults.formulaBuilder.errors.forEach(err => log(`  - ${err}`, 'red'));
  }

  const totalSuccess = testResults.login.success + testResults.upload.success + 
                       testResults.validate.success + testResults.formulaBuilder.success;
  const totalTests = 40; // 10 tests × 4 flows

  log(`\n${'='.repeat(60)}`, 'blue');
  log(`OVERALL: ${totalSuccess}/${totalTests} tests passed`, 
    totalSuccess === totalTests ? 'green' : 'yellow');
  log('='.repeat(60), 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

