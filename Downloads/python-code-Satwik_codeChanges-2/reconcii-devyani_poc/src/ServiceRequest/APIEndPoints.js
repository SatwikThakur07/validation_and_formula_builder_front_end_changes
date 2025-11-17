// const setEnv = () => {
//   if (import.meta.env.VITE_REACT_APP_ENV == "prod") {
//     return import.meta.env.VITE_REACT_APP_API_URL;
//   } else if (import.meta.env.VITE_REACT_APP_ENV == "stag") {
//     return import.meta.env.VITE_REACT_APP_API_URL;
//   } else {
//     return import.meta.env.VITE_REACT_APP_API_URL;
//   }
// };

// let env = setEnv();

// POC URls
// const baseURL = "https://pocmodulereconciirecoapi.corepeelers.com";
// const ssoBaseURL = "https://pocmodulereconciissoapi.corepeelers.com";
// const reconciiBaseURL = "https://pocmodulereconciiuploadapi.corepeelers.com";
// const reconciiAdminBaseURL =
//   "https://pocmodulereconciiadminapi.corepeelers.com";

// const sso = "/devyani-sso-service/api/v1";
// const reconcii = "/poc_reconciliation-service/api";
// const activityURL = "/api/audit_log";
// const reconciliationNodeURL = "/api/node/reconciliation";
// const RECONCILIATION_SERVICE = "/subway-service";

// Demo URLS

// const baseURL = "https://reconciirecodemoapi.corepeelers.com";
// const ssoBaseURL = "https://reconciissodemoapi.corepeelers.com";
// const reconciiBaseURL = "https://reconciidatauploaddemoapi.corepeelers.com";
// const reconciiAdminBaseURL = "https://reconciiadminapidemo.corepeelers.com";

// const sso = "/demo-sso-service/api/v1";
// const reconcii = "/reconcii-service/api";
// const activityURL = "/api/audit_log";
// const reconciliationNodeURL = "/api/node/reconciliation";
// const RECONCILIATION_SERVICE = "/reconcii-demo-service";

// Devyani URLS
// Auto-detect localhost vs staging
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const baseURL = isLocalhost 
  ? "http://localhost:8034"
  : (import.meta.env.VITE_RECO_API_BASE_URL || "https://devyanirecoapi.corepeelers.com");
  
const ssoBaseURL = isLocalhost
  ? "http://localhost:8034"
  : (import.meta.env.VITE_SSO_API_BASE_URL || "https://devyanissoapi.corepeelers.com");
  
const reconciiBaseURL = isLocalhost
  ? "http://localhost:8034"
  : (import.meta.env.VITE_UPLOAD_API_BASE_URL || "https://devyaniuploadapi.corepeelers.com");
  
const reconciiAdminBaseURL = isLocalhost
  ? "http://localhost:8034"
  : (import.meta.env.VITE_ADMIN_API_BASE_URL || "https://devyaniadminapi.corepeelers.com");

// Path prefixes - different for localhost vs staging
// For localhost: auth router is at /api/auth, so login is /api/auth/login
// For staging: SSO service is at /devyani-sso-service/api/v1, so login is /devyani-sso-service/api/v1/auth/access/token
const sso = isLocalhost ? "/api/auth" : "/devyani-sso-service/api/v1";
const reconcii = isLocalhost ? "/api" : "/devyani-service/api";
const activityURL = "/api/audit_log";
const reconciliationNodeURL = "/api/node/reconciliation";
const RECONCILIATION_SERVICE = isLocalhost ? "/api/reconciliation" : "/reconcii-devyani-service";

// Bercos URLS

// const baseURL = "https://bercosrecoapi.corepeelers.com";
// const ssoBaseURL = "https://bercosrecoapi1.corepeelers.com";
// const reconciiBaseURL = "https://bercosrecoapi2.corepeelers.com";
// const reconciiAdminBaseURL = "https://bercosadminapi.corepeelers.com";

// const sso = "/bercos-sso-service/api/v1";
// const reconcii = "/reconcii-service/api";
// const activityURL = "/api/audit_log";
// const reconciliationNodeURL = "/api/reco";
// const RECONCILIATION_SERVICE = "/reconcii-bercos-service";

// Subway URLS
// const baseURL = "https://subwayapi.corepeelers.com";
// const ssoBaseURL = "https://api.corepeelers.com";
// const reconciiBaseURL = "https://reconciiapi.corepeelers.com";
// const reconciiAdminBaseURL = "https://reconciapi.corepeelers.com/";

// const sso = "/sso-service/api/v1";
// const reconcii = "/reconcii-service/api";
// const activityURL = "/api/audit_log";
// const reconciliationNodeURL = "/api/node/reconciliation";
// const RECONCILIATION_SERVICE = "/subway-service";

const nodePasswordUrls = "/api/auth/end_user";

const AUTH = "/auth";
const USER = "/user";
const ROLE = "/role";
const GROUP = "/group";
const PUBLIC = "/public";
const DASHBOARD = "/dashboard";
const _3PO = "/threepo";
const VOUCHER = "/voucher";
const CUSTOM = "/custom";

const apiEndpoints = {
  // !AUTH --- DO NOT TOUCH
  // Login endpoint: 
  // - Localhost: /api/auth/login (auth router mounted at /api/auth)
  // - Staging: /devyani-sso-service/api/v1/auth/access/token
  ACCESS_TOKEN: isLocalhost ? "/api/auth/login" : `${sso}${AUTH}/access/token`,
  ACCESS_CORS: `${sso}${AUTH}/access/cors`,

  REFRESH_TOKEN: `${sso}${AUTH}/refresh/token`,
  USER_LOGOUT: `${sso}${AUTH}/logout`,
  // RESET_PASSWORD: `${sso}${USER}/reset/password`,
  CHANGE_PASSWORD: `${sso}${USER}/change/password`,
  // Backend does not expose a profile endpoint yet; profile is derived from login
  PROFILE: `${sso}${USER}/profile`,
  FORGOT_PASSWORD: `${sso}${USER}/forgot/password`,

  //!USER --- DO NOT TOUCH
  USERS_LIST: `${sso}${USER}/list`,
  SPECIFIC_USER_LIST: `${sso}${USER}/username/list`,
  UPDATE_SPECIFIC_USER_LIST: `${sso}${USER}/update`,
  CREATE_USER: `${sso}${USER}/create`,
  SPECIFIC_USER_DETAILS: "user", // 'user/12,
  USER_AUTHORITY: `${sso}${USER}/authority`,

  //!ROLE --- DO NOT TOUCH
  ROLES_LIST: `${sso}${ROLE}/list`,
  DELETE_ROLE_LIST: `${sso}${ROLE}/delete`,
  UPDATE_SPECIFIC_ROLE_LIST: `${sso}${ROLE}/update`,
  CREATE_ROLE: `${sso}${ROLE}/create`,
  SPECIFIC_ROLE_DETAILS: "role", // 'user/12

  //!GROUP --- DO NOT TOUCH
  GROUPS_LIST: `${sso}${GROUP}/list`,
  DELETE_GROUPS_LIST: `${sso}${GROUP}/delete`,
  UPDATE_SPECIFIC_GROUP_LIST: `${sso}${GROUP}/update`,
  CREATE_GROUP: `${sso}${GROUP}/create`,
  DELETE_SPECIFIC_GROUP_DETAILS: `${sso}${GROUP}/delete`,
  SPECIFIC_GROUP_DETAILS: "group", // 'user/12

  //!RECONCILIATION-SERVICE --- DO NOT TOUCH
  REPORTING_TENDERS: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/reportingTenders`,
  REPORT_FIELD: `${RECONCILIATION_SERVICE}${PUBLIC}${CUSTOM}/reportFields`,
  DOWNLOAD_REPORT: `${RECONCILIATION_SERVICE}${PUBLIC}${CUSTOM}/download/report`,

  MPR_VS_BANK_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/mpr/vs/bank`,
  MPR_VS_BANK_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/mpr/vs/bank/download`,
  ORDER_VS_TRM_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/order/vs/trm`,
  ORDER_VS_TRM_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/order/vs/trm/download`,
  TRM_VS_MPR_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/trm/vs/mpr`,
  TRM_VS_MPR_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/trm/vs/mpr/download`,
  DATA_SOURCE_FIELD: `${RECONCILIATION_SERVICE}/api/v1/datasource`,
  UPLOAD_SOURCE_FIELD: `${RECONCILIATION_SERVICE}${PUBLIC}/api/v1/upload/data`,

  RECONCILIATION_LAST_SYNCED: `${RECONCILIATION_SERVICE}/api/ve1/datalog/lastSynced`,
  MISSING_TID_STORE_MAPPING: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/missingTIDMapping`,
  DOWNLOAD_TID_MISSING_STORE_MAPPING: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/missingTIDMappingReportDownload`,

  // 3PO-SERVICE
  // _3PO_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/threePODashboardData`,
  // DASHBOARD_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/instore-data`,
  // Python
  // _3PO_DATA: `${reconcii}/threePODashboardData`,

  // Node
  _3PO_DATA: `${reconciliationNodeURL}/threePODashboardData`,
  DASHBOARD_DATA: `${reconciliationNodeURL}/instore-data`,

  POS_VS_3PO_SUMMARY_DOWNLOAD: `${reconciliationNodeURL}/generate-excel`,
  RECEIVABLE_VS_RECEIPT_SUMMARY_DOWNLOAD: `${reconciliationNodeURL}/generate-receivable-receipt-excel`,
  SUMMARY_SHEET_DOWNLOAD: `${reconciliationNodeURL}/summary-sheet`,
  GET_CITY_LIST_DATA: `${reconciliationNodeURL}/cities`,
  GET_STORE_LIST_DATA: `${reconciliationNodeURL}/stores`,
  GET_ASYNC_GENERATE_REPORT_DATA: `${reconciliationNodeURL}/generation-status`,
  DOWNLOAD_POS_VS_TRM_DATA: `${reconciliationNodeURL}/posvstrm/pos-vs-trm-summary`,
  DOWNLOAD_TRM_VS_MPR_DATA: `${reconciliationNodeURL}/trmvsmpr/generate-sheet/trm-vs-mpr-upi`,
  DOWNLOAD_MPR_VS_BANK_DATA: `${reconciliationNodeURL}/mprvsbs/mpr-vs-bank-statement-upi`,

  //!DOWNLOAD API'S FOR TABLE
  UNRECONCILED: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/unreconciled/download`,
  SALE: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/sale/download`,
  RECONCILED: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/reconciled/download`,
  DOWNLOAD_ALL_REPORT: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/download`,
  DOWNLOAD_ASYNC_DASHBOARD_REPORT: `${RECONCILIATION_SERVICE}${PUBLIC}${DASHBOARD}/asyncDownload`,
  _3PO_DATA_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/dashboardData/asyncDownload`,
  RECEIVABLE_VS_RECEIPT_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/receivables/vs/receipts`,
  RECEIVABLE_VS_RECEIPT_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/receivables/vs/receipts/download`,
  _3PO_VS_DOTPE_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/3po/vs/dotpe`,
  POS_VS_3PO_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/pos/vs/3po`,
  POS_VS_DOTPE_DATA: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/pos/vs/dotpe`,
  _3PO_VS_DOTPE_DATA_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/3po/vs/dotpe/download`,
  POS_VS_3PO_DATA_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/pos/vs/3po/download`,
  POS_VS_DOTPE_DATA_DOWNLOAD: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/pos/vs/dotpe/download`,
  MISSING_STORE_MAPPING: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/missingStoreMappings`,
  DOWNLOAD_MISSING_STORE_MAPPING: `${RECONCILIATION_SERVICE}${PUBLIC}${_3PO}/missingStoreMappings/download`,

  //!VOUCHER API'S
  GET_VOUCHER_TYPE: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/getVoucherType`,
  GET_ALL_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/getAll`,
  EDIT_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/edit`,
  GET_ALL_CREATED_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/getAllCreated`,
  SEND_VOUCHER_FOR_APPROVAL: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/sendForApproval`,
  DOWNLOAD_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/download`,
  CREATE_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/create`,
  UPDATE_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/update`,
  APPROVE_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/approve`,
  DASHBOARD_VOUCHER: `${RECONCILIATION_SERVICE}${PUBLIC}${VOUCHER}/dashboard`,

  //!STORE API'S
  GET_STORE_DATA: `${RECONCILIATION_SERVICE}/api/ve1/store/list`,
  // GET_STORE_LIST_DATA: `${RECONCILIATION_SERVICE}/api/ve1/store/storeList`,
  // GET_CITY_LIST_DATA: `${RECONCILIATION_SERVICE}/api/ve1/store/cityList`,

  GET_STORE_UPLOAD: `${RECONCILIATION_SERVICE}/api/ve1/store/uploadStoreList?storeUpload=`,
  GET_UPLOAD_CONFIG_MAPPING: `${RECONCILIATION_SERVICE}/api/ve1/store/listUploadConfig`,
  UPLOAD_CONFIG_DATA: `${RECONCILIATION_SERVICE}/api/ve1/store/uploadConfig`,
  DOWNLOAD_TEMPLATE_DATA: `${RECONCILIATION_SERVICE}/api/ve1/store/downloadConfig`,
  DOWNLOAD_STORE_TEMPLATE_DATA: `${RECONCILIATION_SERVICE}/api/ve1/store/downloadStoreSync`,
  DOWNLOAD_ASYNC_GENERATE_REPORT_DATA: `${RECONCILIATION_SERVICE}/public/generated-reports/download`,
  // GET_ASYNC_GENERATE_REPORT_DATA: `${RECONCILIATION_SERVICE}/public/generated-reports/getAll`,

  // New URLs - Formula Builder endpoints
  // For staging: Use Node.js backend pattern /api/node/reconciliation/*
  // For localhost: Use Python backend pattern /api/reconciliation/api/v1/*
  GET_TENDER_LIST: isLocalhost ? "/api/reconciliation/api/v1/tenderList" : `${reconciliationNodeURL}/tenderList`,
  GET_TENDER_WISE_TABLES_LIST: isLocalhost ? "/api/reconciliation/api/v1/tenderWisetables" : `${reconciliationNodeURL}/tenderWisetables`,
  SAVE_ALL_RECO_LOGICS: isLocalhost ? "/api/v1/recologics/save" : `${reconciliationNodeURL}/recologics/save`,
  UPDATE_ALL_RECO_LOGICS: isLocalhost ? "/api/reconciliation/api/v1/recologics/update" : `${reconciliationNodeURL}/recologics/update`,
  GET_ALL_RECO_LOGICS: isLocalhost ? "/api/reconciliation/api/v1/recologics/getAll" : `${reconciliationNodeURL}/recologics/getAll`,
  GET_RECO_LOGICS_BY_TOPIC: isLocalhost ? "/api/reconciliation/api/v1/recologics/get" : `${reconciliationNodeURL}/recologics/get`,
  GET_ALL_DATA_SOURCE_FOR_MAPPING: isLocalhost ? "/api/reconciliation/api/v1/datasource" : `${reconciliationNodeURL}/datasource`,
  EXCEL_DB_COLUMN_MAPPING_BY_DATASOURCE: `${RECONCILIATION_SERVICE}/api/ve1/customisedfields/getExcelDbColumMappingByDataSource/`,
  UPDATE_EXCEL_DB_COLUMN_MAPPING_BY_DATASOURCE: `${RECONCILIATION_SERVICE}/api/ve1/customisedfields/updateExcelDbColumMapping`,
  FIND_OLDEST_EFFECTIVE_DATE: `${RECONCILIATION_SERVICE}/api/v1/recologics/findOldestEffectiveDate`,

  SAVE_AUDIT_LOG: `${RECONCILIATION_SERVICE}/api/v2/auditlog/save`,

  // Upload URLs
  // For localhost: use /api/uploader/* directly (backend routes)
  // For staging: use /devyani-service/api/uploader/* (nginx routes to /api/uploader/*)
  NEW_DATA_SOURCE_FIELDS: isLocalhost ? "/api/uploader/datasource" : `${reconcii}/datasource`,
  UPLOAD_FILE: isLocalhost ? "/api/uploader/upload" : `${reconcii}/upload`,
  ANALYZE_COLUMNS: isLocalhost ? "/api/uploader/analyze-columns" : `${reconcii}/uploader/analyze-columns`,
  VALIDATE_COLUMNS: isLocalhost ? "/api/uploader/validate-columns" : `${reconcii}/uploader/validate-columns`,
  SAVE_COLUMN_MAPPINGS: isLocalhost ? "/api/uploader/save-column-mappings" : `${reconcii}/uploader/save-column-mappings`,
  UPLOAD_STATUS: isLocalhost ? "/api/uploader/status" : `${reconcii}/uploader/status`,

  ACTIVITY_CREATE: `${activityURL}/create`,
  ACTIVITY_SEARCH: `${activityURL}/list`,
  ACTIVITY_USER_LIST: `${activityURL}/user/list`,

  FORGOT_PASSWORD: `${nodePasswordUrls}/forgot_password`,
  VERIFY_OTP: `${nodePasswordUrls}/verify_otp`,
  RESET_PASSWORD: `${nodePasswordUrls}/reset_password`,
};

export {
  baseURL,
  ssoBaseURL,
  apiEndpoints,
  sso,
  reconcii,
  reconciiBaseURL,
  reconciiAdminBaseURL,
  activityURL,
  reconciliationNodeURL,
  nodePasswordUrls,
};
