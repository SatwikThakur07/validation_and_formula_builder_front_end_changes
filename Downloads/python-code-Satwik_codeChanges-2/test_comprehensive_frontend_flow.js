#!/usr/bin/env node

/**
 * Comprehensive Frontend Flow Test
 * Simulates human behavior testing Login, Upload, Validate, and Formula Builder 10 times each
 * This script tests the complete flow as a human would interact with the frontend
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URLS = {
  sso: 'https://devyanissoapi.corepeelers.com',
  upload: 'https://devyaniuploadapi.corepeelers.com',
  admin: 'https://devyaniadminapi.corepeelers.com',
  reco: 'https://devyanirecoapi.corepeelers.com'
};

// Test credentials - UPDATE THESE
const TEST_CREDENTIALS = {
  username: 'test_user', // UPDATE
  password: 'test_password' // UPDATE
};

// Test results
const results = {
  login: { passed: 0, failed: 0, errors: [] },
  upload: { passed: 0, failed: 0, errors: [] },
  validate: { passed: 0, failed: 0, errors: [] },
  formulaBuilder: { passed: 0, failed: 0, errors: [] }
};

let authToken = null;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test Login
async function testLogin(attempt) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`LOGIN TEST - Attempt #${attempt}`, 'cyan');
  log(`${'='.repeat(70)}`, 'cyan');
  
  try {
    await delay(1000 + Math.random() * 1000);
    
    const response = await axios.post(
      `${BASE_URLS.sso}/devyani-sso-service/api/v1/auth/access/token`,
      {
        username: TEST_CREDENTIALS.username,
        password: TEST_CREDENTIALS.password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (response.status === 200 && response.data?.access_token) {
      authToken = response.data.access_token;
      log(`✅ LOGIN SUCCESSFUL`, 'green');
      results.login.passed++;
      return { success: true, token: authToken };
    } else {
      const error = response.data?.detail || response.data?.message || `Status: ${response.status}`;
      log(`❌ LOGIN FAILED: ${error}`, 'red');
      results.login.failed++;
      results.login.errors.push(error);
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    log(`❌ LOGIN ERROR: ${errorMsg}`, 'red');
    results.login.failed++;
    results.login.errors.push(errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Test Upload
async function testUpload(attempt) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`UPLOAD TEST - Attempt #${attempt}`, 'cyan');
  log(`${'='.repeat(70)}`, 'cyan');
  
  if (!authToken) {
    log(`❌ SKIPPED: No auth token`, 'yellow');
    results.upload.failed++;
    results.upload.errors.push('No auth token');
    return { success: false, error: 'No auth token' };
  }
  
  try {
    await delay(1000 + Math.random() * 1000);
    
    // Create a test file
    const testFileContent = 'Test,Data,Column\n1,2,3\n4,5,6';
    const testFilePath = path.join(__dirname, `test_upload_${Date.now()}.csv`);
    fs.writeFileSync(testFilePath, testFileContent);
    
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath));
    
    const response = await axios.post(
      `${BASE_URLS.upload}/devyani-service/api/upload?datasource=MPR&client=devyani`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        validateStatus: () => true,
        timeout: 300000
      }
    );
    
    // Clean up test file
    try {
      fs.unlinkSync(testFilePath);
    } catch (e) {}
    
    if (response.status === 200 || response.status === 201) {
      log(`✅ UPLOAD SUCCESSFUL`, 'green');
      results.upload.passed++;
      return { success: true, data: response.data };
    } else {
      const error = response.data?.detail || response.data?.message || `Status: ${response.status}`;
      log(`❌ UPLOAD FAILED: ${error}`, 'red');
      results.upload.failed++;
      results.upload.errors.push(error);
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    log(`❌ UPLOAD ERROR: ${errorMsg}`, 'red');
    results.upload.failed++;
    results.upload.errors.push(errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Test Validate
async function testValidate(attempt) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`VALIDATE TEST - Attempt #${attempt}`, 'cyan');
  log(`${'='.repeat(70)}`, 'cyan');
  
  if (!authToken) {
    log(`❌ SKIPPED: No auth token`, 'yellow');
    results.validate.failed++;
    results.validate.errors.push('No auth token');
    return { success: false, error: 'No auth token' };
  }
  
  try {
    await delay(1000 + Math.random() * 1000);
    
    const response = await axios.post(
      `${BASE_URLS.upload}/devyani-service/api/validate-columns`,
      {
        client: 'devyani',
        datasource: 'MPR'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (response.status === 200) {
      log(`✅ VALIDATE SUCCESSFUL`, 'green');
      results.validate.passed++;
      return { success: true, data: response.data };
    } else {
      const error = response.data?.detail || response.data?.message || `Status: ${response.status}`;
      log(`❌ VALIDATE FAILED: ${error}`, 'red');
      results.validate.failed++;
      results.validate.errors.push(error);
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    log(`❌ VALIDATE ERROR: ${errorMsg}`, 'red');
    results.validate.failed++;
    results.validate.errors.push(errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Test Formula Builder
async function testFormulaBuilder(attempt) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`FORMULA BUILDER TEST - Attempt #${attempt}`, 'cyan');
  log(`${'='.repeat(70)}`, 'cyan');
  
  if (!authToken) {
    log(`❌ SKIPPED: No auth token`, 'yellow');
    results.formulaBuilder.failed++;
    results.formulaBuilder.errors.push('No auth token');
    return { success: false, error: 'No auth token' };
  }
  
  try {
    await delay(1000 + Math.random() * 1000);
    
    // Step 1: Get tender list
    log(`1. Fetching tender list...`, 'blue');
    const tenderResponse = await axios.get(
      `${BASE_URLS.admin}/reconcii-devyani-service/api/v1/tenderList`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (tenderResponse.status !== 200) {
      const error = tenderResponse.data?.detail || 'Failed to fetch tender list';
      log(`❌ Failed to fetch tender list: ${error}`, 'red');
      results.formulaBuilder.failed++;
      results.formulaBuilder.errors.push(error);
      return { success: false, error };
    }
    
    const tenders = tenderResponse.data?.data || tenderResponse.data || [];
    if (!Array.isArray(tenders) || tenders.length === 0) {
      log(`⚠️  No tenders available`, 'yellow');
      results.formulaBuilder.failed++;
      results.formulaBuilder.errors.push('No tenders available');
      return { success: false, error: 'No tenders available' };
    }
    
    const testTender = tenders[0]?.id || tenders[0] || 'ZOMATO';
    log(`✅ Tender list fetched: ${tenders.length} tenders`, 'green');
    log(`   Using tender: ${testTender}`, 'blue');
    
    // Step 2: Get tables/datasets for tender
    log(`2. Fetching datasets for tender...`, 'blue');
    await delay(500);
    const tablesResponse = await axios.post(
      `${BASE_URLS.admin}/reconcii-devyani-service/api/v1/tenderWisetables`,
      { tenders: [testTender] },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (tablesResponse.status === 200) {
      const data = tablesResponse.data?.data || tablesResponse.data || [];
      log(`✅ Datasets fetched: ${Array.isArray(data) ? data.length : 'N/A'}`, 'green');
    } else {
      log(`⚠️  Failed to fetch datasets: ${tablesResponse.data?.detail || 'Unknown error'}`, 'yellow');
    }
    
    // Step 3: Get saved formulas
    log(`3. Fetching saved formulas...`, 'blue');
    await delay(500);
    const formulasResponse = await axios.get(
      `${BASE_URLS.admin}/reconcii-devyani-service/api/v1/recologics/getAll?tenders=${testTender}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (formulasResponse.status === 200) {
      const formulas = formulasResponse.data?.data || formulasResponse.data || [];
      log(`✅ Formulas fetched: ${Array.isArray(formulas) ? formulas.length : 0}`, 'green');
    } else {
      log(`⚠️  Failed to fetch formulas: ${formulasResponse.data?.detail || 'Unknown error'}`, 'yellow');
    }
    
    // Step 4: Save a test formula
    log(`4. Saving test formula...`, 'blue');
    await delay(500);
    const saveData = {
      tenders: testTender,
      recoData: [{
        id: 1,
        logicName: `Test_Formula_${Date.now()}`,
        fields: [],
        formulaText: "1 + 1",
        excelFormulaText: "1 + 1",
        logicNameKey: `TEST_FORMULA_${Date.now()}`,
        multipleColumn: false,
        active_group_index: 0
      }],
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '2099-12-31',
      effectiveType: 'business_date'
    };
    
    const saveResponse = await axios.post(
      `${BASE_URLS.admin}/reconcii-devyani-service/api/v1/recologics/save`,
      saveData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );
    
    if (saveResponse.status === 200 && (saveResponse.data?.success || saveResponse.data?.code === 200)) {
      log(`✅ Formula saved successfully`, 'green');
      results.formulaBuilder.passed++;
      return { success: true, data: saveResponse.data };
    } else {
      const error = saveResponse.data?.detail || saveResponse.data?.message || 'Unknown error';
      log(`❌ Formula save failed: ${error}`, 'red');
      results.formulaBuilder.failed++;
      results.formulaBuilder.errors.push(error);
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    log(`❌ FORMULA BUILDER ERROR: ${errorMsg}`, 'red');
    results.formulaBuilder.failed++;
    results.formulaBuilder.errors.push(errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Run all tests
async function runAllTests() {
  log('\n' + '='.repeat(70), 'magenta');
  log('COMPREHENSIVE FRONTEND FLOW TEST SUITE', 'magenta');
  log('='.repeat(70), 'magenta');
  log(`Testing: Login, Upload, Validate, Formula Builder (10 times each)`, 'cyan');
  log(`SSO URL: ${BASE_URLS.sso}`, 'blue');
  log(`Upload URL: ${BASE_URLS.upload}`, 'blue');
  log(`Admin URL: ${BASE_URLS.admin}`, 'blue');
  log('='.repeat(70) + '\n', 'magenta');
  
  // Phase 1: Login (10 times)
  log('\n' + '='.repeat(70), 'yellow');
  log('PHASE 1: LOGIN TESTS (10 attempts)', 'yellow');
  log('='.repeat(70), 'yellow');
  
  for (let i = 1; i <= 10; i++) {
    await testLogin(i);
    if (i < 10) await delay(2000 + Math.random() * 2000);
  }
  
  // Check if we have auth token
  if (!authToken) {
    log('\n❌ CRITICAL: No successful logins. Cannot proceed with other tests.', 'red');
    printSummary();
    return;
  }
  
  log(`\n✅ Using auth token from successful login`, 'green');
  
  // Phase 2: Upload (10 times)
  log('\n' + '='.repeat(70), 'yellow');
  log('PHASE 2: UPLOAD TESTS (10 attempts)', 'yellow');
  log('='.repeat(70), 'yellow');
  
  for (let i = 1; i <= 10; i++) {
    await testUpload(i);
    if (i < 10) await delay(2000 + Math.random() * 2000);
  }
  
  // Phase 3: Validate (10 times)
  log('\n' + '='.repeat(70), 'yellow');
  log('PHASE 3: VALIDATE TESTS (10 attempts)', 'yellow');
  log('='.repeat(70), 'yellow');
  
  for (let i = 1; i <= 10; i++) {
    await testValidate(i);
    if (i < 10) await delay(2000 + Math.random() * 2000);
  }
  
  // Phase 4: Formula Builder (10 times)
  log('\n' + '='.repeat(70), 'yellow');
  log('PHASE 4: FORMULA BUILDER TESTS (10 attempts)', 'yellow');
  log('='.repeat(70), 'yellow');
  
  for (let i = 1; i <= 10; i++) {
    await testFormulaBuilder(i);
    if (i < 10) await delay(2000 + Math.random() * 2000);
  }
  
  // Print summary
  printSummary();
}

function printSummary() {
  log('\n' + '='.repeat(70), 'magenta');
  log('TEST SUMMARY', 'magenta');
  log('='.repeat(70), 'magenta');
  
  const functions = [
    { key: 'login', name: 'Login' },
    { key: 'upload', name: 'Upload' },
    { key: 'validate', name: 'Validate' },
    { key: 'formulaBuilder', name: 'Formula Builder' }
  ];
  
  functions.forEach(func => {
    const result = results[func.key];
    const total = result.passed + result.failed;
    const successRate = total > 0 ? (result.passed / total) * 100 : 0;
    
    log(`\n${func.name}:`, 'cyan');
    log(`  Total: ${total}`, 'blue');
    log(`  ✅ Passed: ${result.passed}`, 'green');
    log(`  ❌ Failed: ${result.failed}`, 'red');
    log(`  Success Rate: ${successRate.toFixed(1)}%`, successRate >= 80 ? 'green' : 'yellow');
    
    if (result.errors.length > 0) {
      const uniqueErrors = [...new Set(result.errors)];
      log(`  Errors:`, 'yellow');
      uniqueErrors.slice(0, 5).forEach(err => log(`    - ${err}`, 'yellow'));
      if (uniqueErrors.length > 5) {
        log(`    ... and ${uniqueErrors.length - 5} more`, 'yellow');
      }
    }
  });
  
  const totalTests = functions.reduce((sum, f) => sum + results[f.key].passed + results[f.key].failed, 0);
  const totalPassed = functions.reduce((sum, f) => sum + results[f.key].passed, 0);
  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  
  log('\n' + '='.repeat(70), 'magenta');
  log(`OVERALL: ${totalPassed}/${totalTests} passed (${overallSuccessRate.toFixed(1)}%)`, 
      overallSuccessRate >= 80 ? 'green' : 'yellow');
  log('='.repeat(70) + '\n', 'magenta');
}

// Run tests
if (require.main === module) {
  log('⚠️  Note: Update TEST_CREDENTIALS in the script with valid credentials', 'yellow');
  log('⚠️  Some tests may fail if credentials are invalid or endpoints are not accessible\n', 'yellow');
  
  runAllTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests, BASE_URLS };

