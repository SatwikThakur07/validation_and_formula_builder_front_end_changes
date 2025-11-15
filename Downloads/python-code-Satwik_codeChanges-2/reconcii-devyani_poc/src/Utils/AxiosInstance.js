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
const instance = axios.create({
  baseURL: baseURL,
  responseType: "json",
  timeout: 60000,
  headers: {
    langId: 1,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const handleError = ({ message, data, status }) => {
  return Promise.reject({ message, data, status });
};

// Intercept request to set dynamic baseURL (optimized for performance)
instance.interceptors.request.use((config) => {
  const url = config?.url || "";
  
  // SSO endpoints (including login) - use SSO base URL (highest priority)
  if (url.includes(sso)) {
    config.baseURL = ssoBaseURL;
    return config;
  }
  
  // Formula Builder endpoints (recologics) - use admin base URL
  // These endpoints now use RECONCILIATION_SERVICE prefix
  if (url.includes("/api/v1/recologics") || 
      url.includes("/api/v1/tenderList") ||
      url.includes("/api/v1/tenderWisetables") ||
      url.includes("/api/v1/datasource") ||
      url.includes("/reconcii-devyani-service")) {
    config.baseURL = reconciiAdminBaseURL;
    return config;
  }
  
  // Reconciliation service endpoints (upload, validate, etc.)
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
  
  // Reconciliation node URLs
  if (url.includes(reconciliationNodeURL)) {
    config.baseURL = reconciiAdminBaseURL;
    return config;
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
