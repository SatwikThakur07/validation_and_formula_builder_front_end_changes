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
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[AxiosInstance] Request URL:', url);
    console.log('[AxiosInstance] isLocalhost:', isLocalhost);
  }
  
  // SSO endpoints (including login) - use SSO base URL (highest priority)
  // For localhost: /api/auth/login goes to baseURL (localhost:8034)
  // For staging: /devyani-sso-service/* goes to ssoBaseURL
  if (url.includes("/api/auth/login") || url.includes(sso)) {
    config.baseURL = ssoBaseURL;
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Routing to SSO:', ssoBaseURL);
    }
    return config;
  }
  
  // Formula Builder endpoints (recologics) - use baseURL for localhost, upload base URL for staging
  // For localhost: /api/reconciliation/api/v1/* (Python backend on localhost:8034)
  // For staging: /devyani-service/api/reconciliation/api/v1/* (Python backend on upload API)
  // Check for reconciliation API v1 endpoints first
  if (url.includes("/reconciliation/api/v1/") || 
      url.includes("/api/v1/recologics") || 
      url.includes("/api/v1/tenderList") ||
      url.includes("/api/v1/tenderWisetables") ||
      url.includes("/api/v1/datasource") ||
      url.includes("/api/v1/recologics/findOldestEffectiveDate")) {
    // Localhost endpoints use Python backend on baseURL
    if (isLocalhost) {
      config.baseURL = baseURL; // localhost:8034 for localhost
    } else {
      // Staging endpoints use Python backend on upload API
      config.baseURL = reconciiBaseURL; // https://devyaniuploadapi.corepeelers.com
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Formula Builder routing to:', config.baseURL);
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Node reconciliation routing to:', config.baseURL);
    }
    return config;
  }
  
  // Uploader endpoints - check for staging pattern first, then localhost pattern
  // Staging: /devyani-service/api/uploader/* → upload base URL
  // Localhost: /api/uploader/* → baseURL (localhost:8034)
  // Check for uploader endpoints (must come before generic reconcii check)
  // Use more specific patterns to avoid false matches
  if (url.startsWith("/devyani-service/api/uploader/") ||
      url.startsWith("/api/uploader/") ||
      url.includes("/uploader/upload") ||
      url.includes("/uploader/validate-columns") ||
      url.includes("/uploader/analyze-columns") ||
      url.includes("/uploader/save-column-mappings") ||
      url.includes("/uploader/status") ||
      url.includes("/uploader/datasource")) {
    if (isLocalhost) {
      config.baseURL = baseURL; // localhost:8034
    } else {
      config.baseURL = reconciiBaseURL; // https://devyaniuploadapi.corepeelers.com
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Uploader routing to:', config.baseURL);
    }
    return config;
  }
  
  // Reconciliation service endpoints (datasource, etc.) - use reconcii prefix
  // These use reconcii prefix (/devyani-service/api) and go to upload base URL
  // But exclude reconciliation endpoints which are handled above
  if (url.includes(reconcii) && !url.includes("/reconciliation/api/v1/") && !url.includes("/uploader/")) {
    if (isLocalhost) {
      config.baseURL = baseURL;
    } else {
      config.baseURL = reconciiBaseURL;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Generic reconcii routing to:', config.baseURL);
    }
    return config;
  }
  
  // Activity/audit log endpoints
  if (url.includes(activityURL)) {
    config.baseURL = reconciiAdminBaseURL;
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Activity routing to:', config.baseURL);
    }
    return config;
  }
  
  // Node password URLs
  if (url.includes(nodePasswordUrls)) {
    config.baseURL = reconciiAdminBaseURL;
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Node password routing to:', config.baseURL);
    }
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[AxiosInstance] Reconciliation node routing to:', config.baseURL);
    }
    return config;
  }
  
  // Handle RECONCILIATION_SERVICE endpoints for localhost (Python backend)
  // For staging, these should have been converted to reconciliationNodeURL above
  if (url.includes("/api/reconciliation/") && !url.includes("/api/reconciliation/api/v1/")) {
    // Localhost Python backend endpoints
    if (isLocalhost) {
      config.baseURL = baseURL;
      if (process.env.NODE_ENV === 'development') {
        console.log('[AxiosInstance] Localhost reconciliation routing to:', config.baseURL);
      }
      return config;
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[AxiosInstance] Using default baseURL:', config.baseURL);
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
