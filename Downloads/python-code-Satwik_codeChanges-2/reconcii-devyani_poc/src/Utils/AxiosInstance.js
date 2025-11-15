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

// Intercept request to set dynamic baseURL
instance.interceptors.request.use((config) => {
  // If a specific baseURL is passed, use it; otherwise, default to the instance's baseURL
  // SSO endpoints (including login) - use SSO base URL
  if (config?.url?.includes(sso)) {
    config.baseURL = ssoBaseURL;
  } 
  // Formula Builder endpoints (recologics) - use admin base URL
  // These endpoints now use RECONCILIATION_SERVICE prefix
  else if (config?.url?.includes("/api/v1/recologics") || 
           config?.url?.includes("/api/v1/tenderList") ||
           config?.url?.includes("/api/v1/tenderWisetables") ||
           config?.url?.includes("/api/v1/datasource") ||
           config?.url?.includes("/reconcii-devyani-service/api/v1/recologics") ||
           config?.url?.includes("/reconcii-devyani-service/api/v1/tenderList") ||
           config?.url?.includes("/reconcii-devyani-service/api/v1/tenderWisetables") ||
           config?.url?.includes("/reconcii-devyani-service/api/v1/datasource")) {
    config.baseURL = reconciiAdminBaseURL;
  }
  // Reconciliation service endpoints
  else if (config?.url?.includes(reconcii)) {
    config.baseURL = reconciiBaseURL;
  }
  // Activity/audit log endpoints
  else if (config?.url?.includes(activityURL)) {
    config.baseURL = reconciiAdminBaseURL;
  }
  // Node password URLs
  else if (config?.url?.includes(nodePasswordUrls)) {
    config.baseURL = reconciiAdminBaseURL;
  }
  // Reconciliation node URLs
  else if (config?.url?.includes(reconciliationNodeURL)) {
    config.baseURL = reconciiAdminBaseURL;
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
