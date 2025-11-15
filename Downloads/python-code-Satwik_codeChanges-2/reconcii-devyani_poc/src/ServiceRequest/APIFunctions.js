import AxiosInstance from "../Utils/AxiosInstance";
export async function requestCallPost(
  apiName,
  data,
  additionalHeaders = {},
  topLevelConfig = {}
) {
  // Log the request details for debugging
  if (apiName?.includes("generate-excel") || apiName?.includes("generate-receivable-receipt-excel")) {
    console.log("[requestCallPost] ===== API REQUEST START =====");
    console.log("[requestCallPost] API Name:", apiName);
    console.log("[requestCallPost] Request Data:", JSON.stringify(data, null, 2));
    console.log("[requestCallPost] Data type:", typeof data);
    console.log("[requestCallPost] Data keys:", data ? Object.keys(data) : "No data");
    console.log("[requestCallPost] Data isEmpty:", !data || (typeof data === 'object' && Object.keys(data).length === 0));
  }
  
  // Detect if data is FormData - if so, don't set Content-Type (browser will set it with boundary)
  const isFormData = data instanceof FormData;
  
  let headers = {};
  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  if (localStorage.getItem("ReconciiToken")) {
    headers = {
      ...headers,
      Authorization: "Bearer " + localStorage.getItem("ReconciiToken"),
    };
  }
  
  // Merge additional headers, but for FormData, don't override Content-Type or Accept
  if (isFormData) {
    // For FormData, remove Accept and Content-Type from additionalHeaders if present
    const { Accept, "Content-Type": contentType, ...restHeaders } = additionalHeaders;
    headers = { ...headers, ...restHeaders };
  } else {
    headers = { ...headers, ...additionalHeaders };
  }
  
  // Don't send Authorization header for login endpoint
  if (apiName?.includes("login") || apiName === "/login" || apiName === "/api/auth/login" || apiName?.includes("auth/access/token")) {
    delete headers.Authorization;
  }
  
  // For FormData, ensure Content-Type is not manually set (let browser set it with boundary)
  if (isFormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }
  
  if (apiName?.includes("generate-excel") || apiName?.includes("generate-receivable-receipt-excel")) {
    console.log("[requestCallPost] Request config:", {
      url: apiName,
      method: "POST",
      headers: headers,
      data: data
    });
  }
  
  // Enhanced logging for login
  if (apiName?.includes("login") || apiName === "/login" || apiName === "/api/auth/login") {
    console.log("[requestCallPost] Login request:", {
      url: apiName,
      baseURL: AxiosInstance.defaults.baseURL,
      headers: headers,
      data: { username: data?.username, password: "***" }
    });
  }
  
  return await AxiosInstance.post(apiName, data, {
    headers: headers,
    ...topLevelConfig,
  })
    .then((response) => {
      if (apiName?.includes("generate-excel") || apiName?.includes("generate-receivable-receipt-excel")) {
        console.log("[requestCallPost] ✅ Response received:", JSON.stringify(response.data, null, 2));
        console.log("[requestCallPost] ===== API REQUEST END (Success) =====");
      }
      
      // Validate response structure
      if (!response || !response.data) {
        console.error("[requestCallPost] Invalid response structure:", response);
        return {
          status: false,
          message: "Invalid response from server",
          data: null,
        };
      }
      
      return {
        status: true,
        message: "",
        data: response.data,
      };
    })
    .catch((err) => {
      if (apiName?.includes("generate-excel") || apiName?.includes("generate-receivable-receipt-excel")) {
        console.error("[requestCallPost] ❌ Error occurred:", err);
        console.error("[requestCallPost] Error response:", err?.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : "No response");
        console.log("[requestCallPost] ===== API REQUEST END (Error) =====");
      }
      
      // Enhanced error logging for login endpoint
      if (apiName?.includes("login") || apiName?.includes("auth")) {
        console.error("[requestCallPost] Login error:", err);
        console.error("[requestCallPost] Error response:", err?.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        } : "No response");
        console.error("[requestCallPost] Error originalError:", err?.originalError);
      }
      
      // Extract error message from response
      let errorMessage = err?.response?.data?.detail || 
                        err?.response?.data?.message || 
                        err?.message || 
                        err?.toString() || 
                        "Request failed";
      
      // Handle specific HTTP status codes
      if (err?.response?.status === 401) {
        errorMessage = err?.response?.data?.detail || "Invalid username or password";
      } else if (err?.response?.status === 403) {
        errorMessage = err?.response?.data?.detail || "Access denied. Authentication required.";
      } else if (err?.response?.status === 404) {
        errorMessage = "Login endpoint not found. Please check the server configuration.";
      } else if (err?.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }
      
      // Check if it's a network error (backend not running)
      if (err?.message?.includes("Network Error") || 
          err?.code === "ECONNREFUSED" ||
          err?.code === "ERR_CONNECTION_REFUSED" ||
          !err?.response) {
        errorMessage = "Cannot connect to server. Please ensure the backend server is running.";
      }
      
      // Check for CORS errors
      if (err?.message?.includes("CORS") || err?.code === "ERR_NETWORK") {
        errorMessage = "CORS error. Please check server CORS configuration.";
      }
      
      return {
        status: false,
        message: errorMessage,
        data: err?.response?.data || null,
        statusCode: err?.response?.status || null, // Include status code for better error handling
      };
    });
}

export async function requestCallPut(apiName, data) {
  return await AxiosInstance.put(apiName, data, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("ReconciiToken"),
    },
  })
    .then((response) => {
      return {
        status: true,
        message: "",
        data: response.data,
      };
    })
    .catch((err) => {
      return {
        status: false,
        message: err.toString(),
        data: null,
      };
    });
}

// API request call, get method
export async function requestCallGet(
  apiName,
  body,
  additionalHeaders = {},
  topLevelConfig = {}
) {
  let headers = {};
  if (localStorage.getItem("ReconciiToken")) {
    headers = {
      Authorization: "Bearer " + localStorage.getItem("ReconciiToken"),
    };
  }
  headers = { ...headers, ...additionalHeaders };
  return await AxiosInstance.get(apiName, {
    headers: headers,
    params: body,
    ...topLevelConfig,
  })
    .then((response) => {
      return {
        status: true,
        message: "",
        data: response.data,
        response: response,
      };
    })
    .catch((err) => {
      return {
        status: false,
        message: err,
        data: null,
      };
    });
}

export async function requestCallDelete(apiName, body) {
  return await AxiosInstance.delete(apiName, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("ReconciiToken"),
    },
    params: body,
  })
    .then((response) => {
      return {
        status: true,
        message: "",
        data: response.data,
      };
    })
    .catch((err) => {
      return {
        status: false,
        message: err,
        data: null,
      };
    });
}
