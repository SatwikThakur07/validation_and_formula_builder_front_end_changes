import axios from "axios";
import {
  baseURL,
  ssoBaseURL,
  sso,
  reconcii,
  reconciiBaseURL,
  reconciiAdminBaseURL,
  activityURL,
  nodePasswordUrls,
  reconciliationNodeURL,
} from "../ServiceRequest/APIEndPoints";

// Auto-detect localhost for routing decisions
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const instance = axios.create({
  baseURL: baseURL,
  responseType: "json",
  timeout: 60000,
  headers: {
    langId: 1,
    Accept: "application/json",
    // Don't set Content-Type here - let it be set per request
    // FormData needs browser to set Content-Type with boundary
  },
});

export const handleError = ({ message, data, status }) => {
  return Promise.reject({ message, data, status });
};

// Intercept request to set dynamic baseURL (optimized for performance)
instance.interceptors.request.use((config) => {
  const url = config?.url || "";
  
  // SSO endpoints (including login) - use SSO base URL (highest priority)
  // For localhost: /api/auth/login goes to baseURL (localhost:8034)
  // For staging: /devyani-sso-service/* goes to ssoBaseURL
  if (url.includes("/api/auth/login") || url.includes(sso)) {
    config.baseURL = ssoBaseURL;
    return config;
  }
  
  // Formula Builder endpoints (recologics) - use baseURL for localhost, upload base URL for staging
  // For localhost: /api/reconciliation/api/v1/* (Python backend on localhost:8034)
  // For staging: /devyani-service/api/reconciliation/api/v1/* (Python backend on upload API)
  if (url.includes("/api/reconciliation/api/v1/") || 
      url.includes("/devyani-service/api/reconciliation/api/v1/") ||
      url.includes("/api/v1/recologics") || 
      url.includes("/api/v1/tenderList") ||
      url.includes("/api/v1/tenderWisetables") ||
      url.includes("/api/v1/datasource")) {
    // Localhost endpoints use Python backend on baseURL
    if (isLocalhost && (url.includes("/api/reconciliation/api/v1/") || url.includes("/api/v1/"))) {
      config.baseURL = baseURL; // localhost:8034 for localhost
    } else if (url.includes("/devyani-service/api/reconciliation/api/v1/")) {
      // Staging endpoints use Python backend on upload API
      config.baseURL = reconciiBaseURL; // https://devyaniuploadapi.corepeelers.com
    } else if (url.includes("/api/reconciliation/api/v1/")) {
      // Fallback for staging - use upload base URL
      config.baseURL = reconciiBaseURL;
    }
    return config;
  }
  
  // Formula Builder endpoints for staging (Node.js backend pattern) - DEPRECATED, kept for backward compatibility
  // These use /api/node/reconciliation/* and should route to admin base URL
  if (url.includes("/api/node/reconciliation/tenderList") ||
      url.includes("/api/node/reconciliation/tenderWisetables") ||
      url.includes("/api/node/reconciliation/recologics") ||
      url.includes("/api/node/reconciliation/datasource")) {
    config.baseURL = reconciiAdminBaseURL; // staging URL
    return config;
  }
  
  // Uploader endpoints - use upload base URL
  if (url.includes("/api/uploader/")) {
    config.baseURL = reconciiBaseURL;
    return config;
  }
  
  // Reconciliation service endpoints (upload, analyze-columns, validate-columns, etc.)
  // These use reconcii prefix (/devyani-service/api) and go to upload base URL
  if (url.includes(reconcii)) {
    config.baseURL = reconciiBaseURL;
    return config;
  }
  
  // Activity/audit log endpoints
  if (url.includes(activityURL)) {
    config.baseURL = reconciiAdminBaseURL;
    return config;
  }
  
  // Node password URLs
  if (url.includes(nodePasswordUrls)) {
    config.baseURL = reconciiAdminBaseURL;
    return config;
  }
  
  // Reconciliation node URLs (/api/node/reconciliation/*)
  // Pattern: https://devyaniadminapi.corepeelers.com/api/node/reconciliation/cities
  // For localhost: http://localhost:8034/api/node/reconciliation/cities
  // For staging: https://devyaniadminapi.corepeelers.com/api/node/reconciliation/cities
  // ALL reconciliation endpoints now use this pattern for staging
  if (url.includes(reconciliationNodeURL)) {
    // Always use admin base URL for reconciliation node endpoints
    // This ensures proper routing to the Node.js backend
    config.baseURL = reconciiAdminBaseURL;
    return config;
  }
  
  // Handle RECONCILIATION_SERVICE endpoints for localhost (Python backend)
  // For staging, these should have been converted to reconciliationNodeURL above
  if (url.includes("/api/reconciliation/") && !url.includes("/api/reconciliation/api/v1/")) {
    // Localhost Python backend endpoints
    if (isLocalhost) {
      config.baseURL = baseURL;
      return config;
    }
  }
  
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle cases where error.response might be undefined (network errors, timeouts, etc.)
    const message = error?.message || "Request failed";
    const data = error?.response?.data || null;
    const status = error?.response?.status || null;
    
    // Return the error in a format that can be caught by .catch()
    return Promise.reject({
      message,
      response: {
        data,
        status,
        statusText: error?.response?.statusText || null
      },
      originalError: error
    });
  }
);

export default instance;
