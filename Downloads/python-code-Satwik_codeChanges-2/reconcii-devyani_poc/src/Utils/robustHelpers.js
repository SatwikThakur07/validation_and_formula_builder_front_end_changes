/**
 * Robust helper functions for error handling, retries, and validation
 */

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  EXPONENTIAL_BASE: 2,
};

/**
 * Retry an async function with exponential backoff
 */
export const retryAsync = async (fn, options = {}) => {
  const {
    maxRetries = RETRY_CONFIG.MAX_RETRIES,
    initialDelay = RETRY_CONFIG.INITIAL_DELAY,
    maxDelay = RETRY_CONFIG.MAX_DELAY,
    exponentialBase = RETRY_CONFIG.EXPONENTIAL_BASE,
    onRetry = null,
  } = options;

  let lastError = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      
      if (attempt < maxRetries && isRetryable) {
        if (onRetry) {
          onRetry(attempt + 1, maxRetries + 1, error);
        }
        
        await sleep(delay);
        delay = Math.min(delay * exponentialBase, maxDelay);
      } else {
        // Non-retryable or max retries reached
        throw error;
      }
    }
  }

  throw lastError;
};

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error) => {
  if (!error) return false;
  
  const errorStr = String(error).toLowerCase();
  const errorCode = error?.code;
  const status = error?.response?.status;
  
  // Network errors
  if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED') {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }
  
  // Error messages indicating retryable conditions
  const retryableMessages = [
    'timeout',
    'network',
    'connection',
    'temporary',
    'unavailable',
    'busy',
    'locked'
  ];
  
  return retryableMessages.some(msg => errorStr.includes(msg));
};

/**
 * Sleep utility
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate file extension
 */
export const validateFileExtension = (filename, allowedExtensions) => {
  if (!filename) return false;
  
  const ext = filename.toLowerCase().split('.').pop();
  const allowed = allowedExtensions.map(e => e.toLowerCase().replace('.', ''));
  
  return allowed.includes(ext);
};

/**
 * Validate file size
 */
export const validateFileSize = (fileSize, maxSizeMB = 400) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(fileSize / 1024 / 1024).toFixed(2)} MB) exceeds maximum (${maxSizeMB} MB)`
    };
  }
  
  if (fileSize === 0) {
    return {
      valid: false,
      error: "File is empty"
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename) return '';
  
  // Remove path components
  let sanitized = filename.split('/').pop().split('\\').pop();
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 250) + ext;
  }
  
  return sanitized;
};

/**
 * Extract error message from various error formats
 */
export const extractErrorMessage = (error) => {
  if (!error) return "An unknown error occurred";
  
  // Axios error structure
  if (error.response) {
    const data = error.response.data;
    if (data) {
      if (data.detail) return data.detail;
      if (data.message) return data.message;
      if (data.error) return data.error;
    }
    return error.response.statusText || `HTTP ${error.response.status}`;
  }
  
  // Error object with message
  if (error.message) {
    return error.message;
  }
  
  // String error
  if (typeof error === 'string') {
    return error;
  }
  
  // Default
  return "An error occurred";
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || 
        (typeof value === 'string' && value.trim() === '')) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

