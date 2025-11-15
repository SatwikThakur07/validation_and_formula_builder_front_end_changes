import { useEffect, useState } from "react";
import { apiEndpoints } from "../../../ServiceRequest/APIEndPoints";
import {
  requestCallGet,
  requestCallPost,
} from "../../../ServiceRequest/APIFunctions";
import { useLoader } from "../../../Utils/Loader";
import LOG_ACTIONS from "../../../Constants/LogAction";
import useMakeLogs from "../../../Hooks/useMakeLogs";

const BLANK_FILTERS = {
  client: "",
  type: "",
  tender: "",
  payment: "",
};

const CLIENT_OPTIONS = [
  { value: "devyani", label: "Devyani", disabled: false },
  { value: "bercos", label: "Bercos", disabled: false },
  { value: "subway", label: "Subway", disabled: true }, // Temporarily disabled
];

const BLANK_PAYMENT_TYPE = [{ type: "-Select Payment Type-", dataSource: "" }];

const useUploads = () => {
  const { setToastMessage, setLoading } = useLoader();
  const { makeLog } = useMakeLogs();
  const [dataSource, setDataSource] = useState([]);
  const [values, setValues] = useState(BLANK_FILTERS);
  const [paymentTypeList, setPaymentTypeList] = useState(BLANK_PAYMENT_TYPE);
  const [files, setFiles] = useState([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [uploadedFileIds, setUploadedFileIds] = useState([]); // Store upload IDs after successful upload
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false); // Track if upload was successful
  const [currentMappings, setCurrentMappings] = useState(null); // Store current upload mappings
  const [isMappingsModalOpen, setIsMappingsModalOpen] = useState(false); // Control mappings modal
  const [isLoadingMappings, setIsLoadingMappings] = useState(false); // Loading state for mappings

  // Safe stringify helper function to avoid circular reference errors
  // This handles React elements, DOM nodes, and circular references
  const safeStringify = (obj) => {
    if (obj === null || obj === undefined) return String(obj);
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      // Handle circular references and React/DOM objects
      const seen = new WeakSet();
      const replacer = (key, val) => {
        // Skip React-specific properties that cause circular references
        if (key && (key.startsWith('_react') || key.startsWith('__react') || key === 'stateNode' || key === 'nativeEvent')) {
          return undefined;
        }
        // Skip DOM elements and events
        if (val && (val instanceof HTMLElement || val instanceof Event || val instanceof Node)) {
          return `[${val.constructor.name}]`;
        }
        // Handle circular references
        if (val != null && typeof val === "object") {
          if (seen.has(val)) {
            return "[Circular]";
          }
          seen.add(val);
        }
        return val;
      };
      try {
        return JSON.stringify(obj, replacer, 2);
      } catch (e2) {
        return `[Error stringifying: ${e2.message}]`;
      }
    }
  };

  const handleFileChange = (fileOrFiles) => {
    try {
      console.log("[useUploads] handleFileChange called");
      console.log("[useUploads] Input:", fileOrFiles);
      console.log("[useUploads] Type:", typeof fileOrFiles);
      console.log("[useUploads] IsArray:", Array.isArray(fileOrFiles));
      console.log("[useUploads] IsFile:", fileOrFiles instanceof File);
      if (fileOrFiles) {
        console.log("[useUploads] Constructor:", fileOrFiles.constructor?.name);
        console.log("[useUploads] Has name:", !!fileOrFiles.name);
        console.log("[useUploads] Has size:", !!fileOrFiles.size);
      }
      
      let filesToSet = [];
      
      // react-drag-drop-files behavior:
      // - With multiple={true}: Returns array of File objects
      // - With multiple={false}: Returns single File object
      // - Sometimes returns FileList, sometimes returns array
      
      if (!fileOrFiles) {
        console.warn("[useUploads] No file or files provided");
        return;
      }
      
      // Handle array (multiple files)
      if (Array.isArray(fileOrFiles)) {
        console.log("[useUploads] Processing as array, length:", fileOrFiles.length);
        filesToSet = fileOrFiles.filter(f => {
          const isValid = f && (f instanceof File || (f.name && typeof f.size === 'number'));
          if (!isValid) {
            console.warn("[useUploads] Invalid file in array:", f);
          }
          return isValid;
        });
      }
      // Handle FileList
      else if (fileOrFiles instanceof FileList) {
        console.log("[useUploads] Processing as FileList, length:", fileOrFiles.length);
        filesToSet = Array.from(fileOrFiles);
      }
      // Handle single File object
      else if (fileOrFiles instanceof File) {
        console.log("[useUploads] Processing as single File");
        filesToSet = [fileOrFiles];
      }
      // Handle object with File-like properties
      else if (fileOrFiles && typeof fileOrFiles === 'object') {
        console.log("[useUploads] Processing as object with File-like properties");
        // Check if it has File-like properties
        if (fileOrFiles.name && typeof fileOrFiles.size === 'number') {
          filesToSet = [fileOrFiles];
        } else {
          // Try to extract files from object
          const keys = Object.keys(fileOrFiles);
          console.log("[useUploads] Object keys:", keys);
          // Check if it's an object with numeric keys (like array-like object)
          if (keys.length > 0 && keys.every(k => !isNaN(k))) {
            filesToSet = Object.values(fileOrFiles).filter(f => 
              f && (f instanceof File || (f.name && typeof f.size === 'number'))
            );
          }
        }
      }
      
      // Final validation - ensure all are File objects or File-like
      const validFiles = filesToSet.filter(file => {
        if (!file) return false;
        
        // Must be File instance OR have File-like properties
        const isFile = file instanceof File;
        const isFileLike = file.name && typeof file.size === 'number' && typeof file.type === 'string';
        
        return isFile || isFileLike;
      });
      
      if (validFiles.length > 0) {
        // Reset state first to handle re-uploads of same file (Chrome issue)
        setFiles([]);
        
        // Use setTimeout to ensure state update happens
        setTimeout(() => {
          setFiles(validFiles);
          console.log("[useUploads] ✅ Files set successfully:", validFiles.length, "file(s)");
          validFiles.forEach((file, idx) => {
            console.log(`  [${idx + 1}] ${file.name} (${(file.size / 1024).toFixed(2)} KB, type: ${file.type || 'unknown'})`);
          });
        }, 0);
      } else {
        console.error("[useUploads] ❌ No valid files found after processing");
        console.error("[useUploads] Original input:", fileOrFiles);
        console.error("[useUploads] Processed filesToSet:", filesToSet);
        setToastMessage({
          message: "No valid files detected. Please ensure files are Excel/CSV format (.xlsx, .xls, .csv, .tsv).",
          type: "error",
        });
      }
    } catch (error) {
      console.error("[useUploads] ❌ Error handling file change:", error);
      console.error("[useUploads] Error stack:", error.stack);
      setToastMessage({
        message: `Error processing files: ${error.message}. Please try again.`,
        type: "error",
      });
    }
  };

  const handleChange = (name, value) => {
    if (name === "client") {
      // Reset all filters when client changes
      setValues({ ...BLANK_FILTERS, [name]: value });
      setPaymentTypeList(BLANK_PAYMENT_TYPE);
      return;
    }

    if (name === "type") {
      const newValues = { ...values, [name]: value, tender: "", payment: "" };
      setValues(newValues);
      // Reset payment list when type changes
      setPaymentTypeList(BLANK_PAYMENT_TYPE);
      return;
    }

    if (name === "tender") {
      const newValues = { ...values, [name]: value, payment: "" };
      setValues(newValues);
      // Update payment list based on selected type and tender
      managePaymentTypeList(newValues.type, value);
      return;
    }
    setValues({ ...values, [name]: value });
  };

  const managePaymentTypeList = (selectedType, selectedTender) => {
    if (!selectedType || !selectedTender) {
      setPaymentTypeList(BLANK_PAYMENT_TYPE);
      return;
    }

    // Find the category that matches the selected type
    const categoryData = dataSource?.find((item) => item.category === selectedType);
    
    if (!categoryData || !categoryData.tenders) {
      console.warn("[UPLOADS] Category data not found for type:", selectedType);
      setPaymentTypeList(BLANK_PAYMENT_TYPE);
      return;
    }

    // Find the tender that matches the selected tender
    const tenderData = categoryData.tenders?.find((tender) => tender.tender === selectedTender);
    
    if (!tenderData || !tenderData.types) {
      console.warn("[UPLOADS] Tender data not found for tender:", selectedTender);
      setPaymentTypeList(BLANK_PAYMENT_TYPE);
      return;
    }

    // Set the payment type list from the tender's types
    const activePaymentTypeList = tenderData.types || [];
    console.log("[UPLOADS] Setting payment type list:", activePaymentTypeList);
    setPaymentTypeList([...BLANK_PAYMENT_TYPE, ...activePaymentTypeList]);
  };

  useEffect(() => {
    fetchDataSource();
  }, []);

  const fetchDataSource = async () => {
    try {
      console.log("[UPLOADS] Fetching datasource from:", apiEndpoints.NEW_DATA_SOURCE_FIELDS);
      const response = await requestCallGet(
        apiEndpoints.NEW_DATA_SOURCE_FIELDS
      );
      console.log("[UPLOADS] Datasource response:", response);
      
      if (response && response.status) {
        const data = response.data?.data || response.data || [];
        console.log("[UPLOADS] Setting datasource data:", data);
        console.log("[UPLOADS] Data is array:", Array.isArray(data));
        console.log("[UPLOADS] Data length:", Array.isArray(data) ? data.length : "N/A");
        
        if (Array.isArray(data) && data.length > 0) {
          console.log("[UPLOADS] First category:", data[0]);
          setDataSource(data);
        } else {
          console.warn("[UPLOADS] Datasource data is empty or not an array");
          setDataSource([]);
          setToastMessage({
            message: "No datasource configuration found",
            type: "warning",
          });
        }
      } else {
        console.error("[UPLOADS] Datasource response error:", response);
        setToastMessage({
          message: "Failed to load datasource configuration",
          type: "error",
        });
      }
    } catch (error) {
      console.error("[UPLOADS] Datasource fetch error:", error);
      setToastMessage({
        message: "Failed to load datasource configuration",
        type: "error",
      });
    }
  };

  // Constants for optimization
  const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.tsv'];
  const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB
  const UPLOAD_TIMEOUT = 300000; // 5 minutes
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  // Optimized file validation helper
  const validateFile = (file) => {
    if (!file) return { valid: false, error: "File is null or undefined" };
    
    // Check if it's a File object or File-like
    const isFile = file instanceof File;
    const isFileLike = file.name && typeof file.size === 'number';
    
    if (!isFile && !isFileLike) {
      return { valid: false, error: "Invalid file object" };
    }
    
    // Validate file name
    const fileName = file.name || file.filename || '';
    if (!fileName || fileName.trim() === '') {
      return { valid: false, error: "File name is empty" };
    }
    
    // Validate file extension
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `Invalid file type: ${ext}` };
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: 400MB)` };
    }
    
    if (file.size === 0) {
      return { valid: false, error: "File is empty" };
    }
    
    return { valid: true, error: null };
  };

  // Optimized response parser
  const extractUploadIds = (response) => {
    if (!response || !response.data) return [];
    
    const uploadedIds = [];
    const data = response.data;
    
    // Try all possible response structures in order of likelihood
    const structures = [
      () => data.data?.uploadedFiles,
      () => data.uploadedFiles,
      () => Array.isArray(data) ? data : null,
      () => data.files,
      () => data.uploaded_files,
    ];
    
    for (const getFiles of structures) {
      const files = getFiles();
      if (Array.isArray(files) && files.length > 0) {
        files.forEach((file) => {
          if (file && (file.id || file.upload_id) && 
              (file.status === "uploaded" || file.status === "success" || !file.status)) {
            uploadedIds.push(file.id || file.upload_id);
          }
        });
        if (uploadedIds.length > 0) break;
      }
    }
    
    return uploadedIds;
  };

  // Enhanced retry mechanism for API calls with exponential backoff
  const retryApiCall = async (apiCall, retries = MAX_RETRIES) => {
    let lastError = null;
    let delay = RETRY_DELAY;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await apiCall();
        
        // If result has status, check it
        if (result && typeof result.status !== 'undefined') {
          if (result.status) {
            return result;
          }
          // If status is false, check if it's a retryable error
          if (result.status === false && attempt < retries) {
            const error = result.message;
            if (error && (
              String(error).toLowerCase().includes('timeout') ||
              String(error).toLowerCase().includes('network') ||
              String(error).toLowerCase().includes('connection')
            )) {
              console.log(`[useUploads] Retryable error on attempt ${attempt}/${retries}, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay = Math.min(delay * 2, RETRY_DELAY * 4); // Exponential backoff, max 4x
              continue;
            }
          }
        } else {
          // No status field, assume success
          return result;
        }
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = error?.code === 'ECONNABORTED' || 
                          error?.code === 'ETIMEDOUT' ||
                          error?.code === 'ECONNREFUSED' ||
                          error?.response?.status === 503 ||
                          error?.response?.status === 504 ||
                          String(error?.message || '').toLowerCase().includes('timeout') ||
                          String(error?.message || '').toLowerCase().includes('network');
        
        if (attempt < retries && isRetryable) {
          console.log(`[useUploads] Retryable error on attempt ${attempt}/${retries}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, RETRY_DELAY * 4); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    
    if (lastError) {
      throw lastError;
    }
    
    return null;
  };

  const onSubmit = async () => {
    // Early validation - fail fast
    if (!values?.client || values.client.trim() === "") {
      setToastMessage({ message: "Please select client.", type: "error" });
      return;
    }

    if (!values?.payment || values.payment.trim() === "") {
      setToastMessage({ message: "Please select payment type.", type: "error" });
      return;
    }

    if (!files || files.length === 0) {
      setToastMessage({ message: "Please select file.", type: "error" });
      return;
    }
    
    // Optimized file processing - validate and filter in one pass
    let filesArray = [];
    const validationErrors = [];
    
    if (Array.isArray(files)) {
      filesArray = files
        .map(file => {
          const validation = validateFile(file);
          if (!validation.valid) {
            validationErrors.push(`${file?.name || 'Unknown'}: ${validation.error}`);
            return null;
          }
          return file;
        })
        .filter(Boolean);
    } else if (files) {
      const validation = validateFile(files);
      if (validation.valid) {
        filesArray = [files];
      } else {
        validationErrors.push(`${files?.name || 'Unknown'}: ${validation.error}`);
      }
    }
    
    if (filesArray.length === 0) {
      const errorMsg = validationErrors.length > 0 
        ? `Invalid files: ${validationErrors.join('; ')}`
        : "Please select at least one valid file.";
      setToastMessage({ message: errorMsg, type: "error" });
      return;
    }
    
    // Show validation warnings if any
    if (validationErrors.length > 0 && filesArray.length > 0) {
      console.warn("[useUploads] Some files were invalid:", validationErrors);
    }
    
    setLoading(true);
    
    try {
      // Create FormData efficiently
      const formData = new FormData();
      let totalSize = 0;
      
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        formData.append("files", file);
        totalSize += file.size;
        console.log(`[useUploads] ✅ Added file ${i + 1}/${filesArray.length}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      }
      
      console.log(`[useUploads] 📤 Starting upload: ${filesArray.length} file(s), ${(totalSize / 1024 / 1024).toFixed(2)} MB total`);
      console.log(`[useUploads] Datasource: ${values.payment}, Client: ${values.client}`);

      // For FormData, don't set Accept header - let browser handle it
      const customConfig = {
        timeout: UPLOAD_TIMEOUT,
      };

      // Use retry mechanism for robustness
      const response = await retryApiCall(async () => {
        return await requestCallPost(
          `${apiEndpoints.UPLOAD_FILE}?datasource=${encodeURIComponent(values.payment)}&client=${encodeURIComponent(values.client)}`,
          formData,
          {}, // No additional headers for FormData
          customConfig // Pass as topLevelConfig
        );
      });
      
      console.log("[useUploads] Full upload response:", safeStringify(response));
      console.log("[useUploads] Response status:", response?.status);
      console.log("[useUploads] Response data:", response?.data);
      
      if (response && response.status) {
        makeLog(
          LOG_ACTIONS.UPLOAD,
          `Uploaded - ${values.payment}`,
          `${apiEndpoints.UPLOAD_FILE}?datasource=${values.payment}`,
          values
        );
        
        // Extract upload IDs using optimized parser
        const uploadedIds = extractUploadIds(response);
        
        console.log(`[useUploads] ✅ Upload successful. Upload IDs:`, uploadedIds);
        console.log(`[useUploads] Response structure:`, {
          hasData: !!response.data,
          hasDataData: !!response.data?.data,
          hasUploadedFiles: !!response.data?.data?.uploadedFiles,
          directUploadedFiles: !!response.data?.uploadedFiles,
          isArray: Array.isArray(response.data)
        });
        
        // Atomic state update
        setUploadedFileIds(uploadedIds);
        setIsUploadSuccessful(true);
        
        setToastMessage({
          message: uploadedIds.length > 0 
            ? `File uploaded successfully (ID: ${uploadedIds[0]}). You can now validate column mappings.`
            : "File uploaded successfully. You can now validate column mappings.",
          type: "success",
        });
      } else {
        // Handle failure with detailed error message
        // requestCallPost returns { status: false, message: err, data: null } on error
        let errorMsg = "Upload failed. Please try again.";
        
        console.error("[useUploads] ❌ Upload failed - Full response:", safeStringify(response));
        
        if (response) {
          // Check if response has error details
          if (response.message) {
            console.error("[useUploads] Error message type:", typeof response.message);
            console.error("[useUploads] Error message:", response.message);
            
            // If message is an error object, extract details
            if (typeof response.message === 'object' && response.message.response) {
              const errorResponse = response.message.response;
              console.error("[useUploads] Error response:", errorResponse);
              errorMsg = errorResponse?.data?.detail 
                || errorResponse?.data?.message 
                || errorResponse?.statusText 
                || `Upload failed: ${errorResponse?.status || 'Unknown error'}`;
            } else if (typeof response.message === 'string') {
              errorMsg = response.message;
            } else if (response.message?.message) {
              errorMsg = response.message.message;
            } else if (response.message?.response?.data?.detail) {
              errorMsg = response.message.response.data.detail;
            } else if (response.message?.response?.data?.message) {
              errorMsg = response.message.response.data.message;
            }
          } else if (response.data) {
            errorMsg = response.data.message 
              || response.data.detail 
              || "Upload failed. Please try again.";
          }
        }
        
        console.error("[useUploads] ❌ Final error message:", errorMsg);
        
        setIsUploadSuccessful(false);
        setUploadedFileIds([]);
        
        setToastMessage({
          message: errorMsg,
          type: "error",
        });
      }
    } catch (error) {
      console.error("[useUploads] ❌ Upload error:", error);
      console.error("[useUploads] Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        code: error?.code
      });
      
      setIsUploadSuccessful(false);
      setUploadedFileIds([]);
      
      // Determine error message based on error type
      let errorMessage = "Upload failed. Please try again.";
      
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorMessage = "Upload timeout. The file may be too large or the connection is slow. Please try again.";
      } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error?.response?.status === 413) {
        errorMessage = "File too large. Maximum file size is 400MB.";
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setToastMessage({
        message: errorMessage,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Optimized validation data parser
  const parseValidationData = (response) => {
    if (!response || !response.status) return null;
    
    // Try multiple response structures
    const data = response.data;
    if (!data) return null;
    
    // Check for validation_data in various locations
    const validationData = data.data || data;
    
    // Check if it has the required structure
    if (validationData && (
      validationData.validation_data || 
      validationData.data?.validation_data ||
      validationData.db_columns ||
      validationData.data?.db_columns
    )) {
      return validationData;
    }
    
    return null;
  };

  const onValidate = async (mappingsToSave = null) => {
    // Handle event object if passed from button click
    // If mappingsToSave is an Event object, treat it as null (button click, not save operation)
    if (mappingsToSave && (
      mappingsToSave instanceof Event || 
      mappingsToSave.nativeEvent || 
      mappingsToSave.target ||
      (typeof mappingsToSave === 'object' && mappingsToSave.constructor?.name === 'SyntheticEvent')
    )) {
      // This is an event from button click, not mappings to save
      mappingsToSave = null;
    }
    
    // Safe logging to avoid circular reference errors
    const logData = {
      hasMappingsToSave: !!mappingsToSave,
      mappingsToSaveType: typeof mappingsToSave,
      isArray: Array.isArray(mappingsToSave),
      isEvent: mappingsToSave instanceof Event
    };
    
    // Only add mappingsToSave to log if it's safe to stringify
    if (mappingsToSave && typeof mappingsToSave === 'object' && !Array.isArray(mappingsToSave) && !(mappingsToSave instanceof Event)) {
      try {
        logData.mappingsToSaveKeys = Object.keys(mappingsToSave).slice(0, 5);
      } catch (e) {
        logData.mappingsToSave = '[Cannot extract keys]';
      }
    } else if (mappingsToSave instanceof Event) {
      logData.mappingsToSave = '[Event Object]';
    } else {
      logData.mappingsToSave = mappingsToSave;
    }
    
    console.log("[useUploads] onValidate called with:", safeStringify(logData));
    
    // Early return for save operation (called from modal's Save button)
    if (mappingsToSave && typeof mappingsToSave === 'object' && !Array.isArray(mappingsToSave)) {
      console.log("[useUploads] 💾 Save operation path");
      try {
        const mappingsCount = Object.keys(mappingsToSave).length;
        if (mappingsCount === 0) {
          setToastMessage({
            message: "No mappings to save. Please select column mappings first.",
            type: "error",
          });
          return;
        }

        console.log("[useUploads] 💾 Saving column mappings:", mappingsCount, "mappings");
        setIsValidationLoading(true);
        
        const savePayload = {
          upload_id: uploadedFileIds.length > 0 ? uploadedFileIds[0] : null,
          datasource: values?.payment || "",
          client: values?.client || null,
          mappings: mappingsToSave,
        };
        
        // Validate payload
        if (!savePayload.datasource) {
          setToastMessage({
            message: "Datasource is required to save mappings.",
            type: "error",
          });
          setIsValidationLoading(false);
          return;
        }

        console.log("[useUploads] Save payload:", {
          upload_id: savePayload.upload_id,
          datasource: savePayload.datasource,
          mappings_count: mappingsCount
        });

        // Use retry mechanism for robustness
        let response;
        try {
          console.log("[useUploads] 💾 Calling save endpoint:", apiEndpoints.SAVE_COLUMN_MAPPINGS);
          console.log("[useUploads] 💾 Save payload:", JSON.stringify(savePayload, null, 2));
          
          response = await retryApiCall(async () => {
            const result = await requestCallPost(
              apiEndpoints.SAVE_COLUMN_MAPPINGS,
              savePayload
            );
            console.log("[useUploads] 💾 requestCallPost returned:", JSON.stringify(result, null, 2));
            return result;
          });
        } catch (retryError) {
          console.error("[useUploads] ❌ Retry mechanism failed:", retryError);
          console.error("[useUploads] Error details:", {
            message: retryError?.message,
            response: retryError?.response?.data,
            status: retryError?.response?.status
          });
          throw retryError;
        }

        console.log("[useUploads] 💾 Save response received:", safeStringify(response));
        console.log("[useUploads] Response type:", typeof response);
        console.log("[useUploads] Response.status:", response?.status, "Type:", typeof response?.status);
        console.log("[useUploads] Response.data:", response?.data);
        
        // requestCallPost wraps response as: {status: true/false, message: "", data: backendResponse}
        // On success: {status: true, message: "", data: {status: 200, message: "...", data: {...}}}
        // On error: {status: false, message: err, data: null}
        
        // Simple check: requestCallPost returns status: true on success
        // requestCallPost structure: {status: true/false, message: "", data: backendResponse}
        // On success: status is true (boolean) and data contains backend response
        // On error: status is false (boolean) and message contains error
        
        // Check multiple conditions to ensure we catch success:
        // 1. response.status === true (primary check)
        // 2. response.data exists AND response.status !== false (fallback)
        // 3. response.data.status === 200 (backend success indicator)
        const isSuccess = response && (
          response.status === true ||  // Primary check - requestCallPost success indicator
          (response.data && response.status !== false && response.status !== undefined) ||  // Fallback: data exists and status is not false
          (response.data && response.data.status === 200)  // Backend returned 200
        );
        
        console.log("[useUploads] isSuccess check result:", isSuccess);
        console.log("[useUploads] Response analysis:", {
          "response exists": !!response,
          "response.status": response?.status,
          "response.status === true": response?.status === true,
          "response.status type": typeof response?.status,
          "response.data exists": !!response?.data,
          "response.data.status": response?.data?.status,
          "response.data.message": response?.data?.message
        });

        if (isSuccess) {
          // Extract success message from response
          // Backend response is nested: response.data.message or response.data.data.message
          const successMessage = response?.data?.message 
            || response?.data?.data?.message 
            || response?.message
            || "Column mappings saved successfully.";
          
          console.log("[useUploads] ✅ Save successful! Message:", successMessage);
          
          setToastMessage({
            message: successMessage,
            type: "success",
          });
          
          // Atomic state updates
          setIsValidationModalOpen(false);
          setValidationData(null);
          setUploadedFileIds([]);
          setIsUploadSuccessful(false);
          setValues(BLANK_FILTERS);
          setFiles([]);
        } else {
          console.error("[useUploads] ❌ Save failed - isSuccess was false");
          console.error("[useUploads] Full response object:", response);
          // Handle failure with detailed error message
          let errorMsg = "Failed to save column mappings.";
          
          if (response) {
            // Check if response has error details
            if (response.message) {
              // If message is an error object, extract details
              if (typeof response.message === 'object' && response.message.response) {
                const errorResponse = response.message.response;
                errorMsg = errorResponse?.data?.detail 
                  || errorResponse?.data?.message 
                  || errorResponse?.statusText 
                  || `Save failed: ${errorResponse?.status || 'Unknown error'}`;
              } else if (typeof response.message === 'string') {
                errorMsg = response.message;
              } else {
                errorMsg = response.message?.message || "Failed to save column mappings.";
              }
            } else if (response.data) {
              errorMsg = response.data.message 
                || response.data.detail 
                || "Failed to save column mappings.";
            }
          }
          
          console.error("[useUploads] ❌ Save failed:", errorMsg);
          console.error("[useUploads] Full error response:", response);
          
          setToastMessage({
            message: errorMsg,
            type: "error",
          });
        }
      } catch (error) {
        console.error("[useUploads] ❌ Save error:", error);
        const errorMessage = error?.response?.data?.detail 
          || error?.response?.data?.message 
          || error?.message 
          || "Failed to save column mappings. Please try again.";
        setToastMessage({
          message: errorMessage,
          type: "error",
        });
      } finally {
        setIsValidationLoading(false);
      }
      return;
    }

    // Validation request flow (called from Validate button)
    console.log("[useUploads] 🔍 Validation request path");
    try {
      console.log("[useUploads] 🔍 Starting validation...");
      console.log("[useUploads] Upload successful:", isUploadSuccessful);
      console.log("[useUploads] Upload IDs:", uploadedFileIds);
      console.log("[useUploads] Files available:", files?.length || 0);

      // Early validation - fail fast
      const hasUploadId = uploadedFileIds.length > 0 && uploadedFileIds[0];
      const hasFiles = files && files.length > 0;
      
      if (!hasUploadId && !hasFiles) {
        setToastMessage({
          message: "Please select files first before validating.",
          type: "error",
        });
        return;
      }

      if (!values?.client || values.client.trim() === "") {
        setToastMessage({
          message: "Please select client.",
          type: "error",
        });
        return;
      }

      if (!values?.payment || values.payment.trim() === "") {
        setToastMessage({
          message: "Please select payment type.",
          type: "error",
        });
        return;
      }

      setIsValidationLoading(true);

      const formData = new FormData();
      let usingUploadId = false;
      let fileToValidate = null;
      
      // Priority 1: Use upload_id if available (faster, more reliable)
      if (hasUploadId) {
        formData.append("upload_id", uploadedFileIds[0].toString());
        usingUploadId = true;
        console.log("[useUploads] Using upload_id for validation:", uploadedFileIds[0]);
      } 
      // Priority 2: Use file directly
      else if (hasFiles) {
        fileToValidate = files[0];
        
        // Validate file before using
        const fileValidation = validateFile(fileToValidate);
        if (!fileValidation.valid) {
          setIsValidationLoading(false);
          setToastMessage({
            message: `Invalid file: ${fileValidation.error}`,
            type: "error",
          });
          return;
        }
        
        // Append file to form data
        if (fileToValidate instanceof File) {
          formData.append("file", fileToValidate);
          console.log("[useUploads] Using file for validation:", fileToValidate.name);
        } else {
          try {
            formData.append("file", fileToValidate);
            console.log("[useUploads] Using file-like object for validation:", fileToValidate.name);
          } catch (err) {
            console.error("[useUploads] Error appending file:", err);
            setIsValidationLoading(false);
            setToastMessage({
              message: "Error processing file for validation. Please try uploading first.",
              type: "error",
            });
            return;
          }
        }
      }
      
      // Append required fields
      formData.append("datasource", values.payment);
      if (values.client) {
        formData.append("client", values.client);
      }

      console.log("[useUploads] Validation request:", {
        usingUploadId,
        hasFile: !!fileToValidate,
        datasource: values.payment,
        client: values.client
      });

      // For FormData, don't set Accept header - let browser handle it
      const customConfig = {
        timeout: 60000, // 60 seconds for validation
      };

      // Use retry mechanism for robustness
      const response = await retryApiCall(async () => {
        return await requestCallPost(
          apiEndpoints.VALIDATE_COLUMNS,
          formData,
          {}, // No additional headers for FormData
          customConfig // Pass as topLevelConfig
        );
      });

      console.log("[useUploads] Validation response:", safeStringify(response));
      console.log("[useUploads] Response status:", response?.status);
      console.log("[useUploads] Response data:", response?.data);

      if (response && response.status) {
        const validationData = parseValidationData(response);
        
        if (validationData) {
          setValidationData(validationData);
          setIsValidationModalOpen(true);
          console.log("[useUploads] ✅ Validation successful, modal opened");
        } else {
          console.warn("[useUploads] ⚠️ Validation response missing data:", response);
          setToastMessage({
            message: "Validation completed but no column data found. Please check the file format.",
            type: "warning",
          });
        }
      } else {
        // Handle failure with detailed error message
        let errorMsg = "Failed to validate columns. Please try again.";
        
        console.error("[useUploads] ❌ Validation failed - Full response:", safeStringify(response));
        console.error("[useUploads] Response status:", response?.status);
        console.error("[useUploads] Response message:", response?.message);
        console.error("[useUploads] Response data:", response?.data);
        
        if (response) {
          // requestCallPost returns { status: false, message: err, data: null }
          // where err is the entire Axios error object
          const errorObj = response.message;
          
          // Extract error from Axios error object structure
          if (errorObj && typeof errorObj === 'object') {
            // Check response.data.detail (FastAPI error format)
            if (errorObj.response?.data?.detail) {
              errorMsg = `Validation failed: ${errorObj.response.data.detail}`;
            }
            // Check response.data.message
            else if (errorObj.response?.data?.message) {
              const msg = errorObj.response.data.message;
              // Filter out save-related error messages
              if (msg.includes("save column mappings") || msg.includes("save mappings")) {
                errorMsg = "Validation failed. Please check FeynmanFlow service is running on port 8000.";
              } else {
                errorMsg = `Validation failed: ${msg}`;
              }
            }
            // Check for connection errors
            else if (errorObj.code === 'ECONNREFUSED' || errorObj.message?.includes('ECONNREFUSED')) {
              errorMsg = "Cannot connect to FeynmanFlow API. Please ensure FeynmanFlow service is running on port 8000.";
            }
            // Check response.statusText
            else if (errorObj.response?.statusText) {
              errorMsg = `Validation failed: ${errorObj.response.statusText}`;
            }
            // Check error message
            else if (errorObj.message) {
              const msg = errorObj.message;
              if (msg.includes("save column mappings") || msg.includes("save mappings")) {
                errorMsg = "Validation failed. Please check FeynmanFlow service is running.";
              } else {
                errorMsg = `Validation failed: ${msg}`;
              }
            }
            // Check status code
            else if (errorObj.response?.status) {
              errorMsg = `Validation failed: HTTP ${errorObj.response.status}`;
            }
          }
          // If message is a string
          else if (typeof response.message === 'string') {
            const msg = response.message;
            if (msg.includes("save column mappings") || msg.includes("save mappings")) {
              errorMsg = "Validation failed. Please check FeynmanFlow service is running.";
            } else {
              errorMsg = `Validation failed: ${msg}`;
            }
          }
          // Check response.data directly
          else if (response.data) {
            if (response.data.detail) {
              errorMsg = `Validation failed: ${response.data.detail}`;
            } else if (response.data.message) {
              const msg = response.data.message;
              if (msg.includes("save column mappings") || msg.includes("save mappings")) {
                errorMsg = "Validation failed. Please check FeynmanFlow service is running.";
              } else {
                errorMsg = `Validation failed: ${msg}`;
              }
            }
          }
        }
        
        console.error("[useUploads] ❌ Final validation error message:", errorMsg);
        
        setToastMessage({
          message: errorMsg,
          type: "error",
        });
      }
    } catch (error) {
      console.error("[useUploads] ❌ Validation error:", error);
      console.error("[useUploads] Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        code: error?.code
      });
      
      // Determine error message based on error type
      // IMPORTANT: This is for VALIDATION errors, not save errors
      let errorMessage = "Failed to validate columns. Please try again.";
      
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
        errorMessage = "Cannot connect to FeynmanFlow API. Please ensure FeynmanFlow service is running on port 8000.";
      } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorMessage = "Validation timeout. The file may be too large. Please try again.";
      } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        // Check if it's a FeynmanFlow connection error
        if (detail.includes("FeynmanFlow API") || detail.includes("not available") || detail.includes("Cannot connect")) {
          errorMessage = detail;
        } else {
          errorMessage = `Validation failed: ${detail}`;
        }
      } else if (error?.response?.data?.message) {
        // Make sure it's not a save error message
        const msg = error.response.data.message;
        if (msg.includes("save column mappings") || msg.includes("save mappings")) {
          errorMessage = "Validation failed. Please check FeynmanFlow service is running on port 8000.";
        } else {
          errorMessage = `Validation failed: ${msg}`;
        }
      } else if (error?.message) {
        // Make sure it's not a save error message
        if (error.message.includes("save column mappings") || error.message.includes("save mappings")) {
          errorMessage = "Validation failed. Please check FeynmanFlow service is running on port 8000.";
        } else if (error.message.includes("ECONNREFUSED") || error.message.includes("connect")) {
          errorMessage = "Cannot connect to FeynmanFlow API. Please ensure FeynmanFlow service is running on port 8000.";
        } else {
          errorMessage = `Validation failed: ${error.message}`;
        }
      }
      
      console.error("[useUploads] ❌ Showing validation error:", errorMessage);
      
      setToastMessage({
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsValidationLoading(false);
    }
  };

  const closeValidationModal = () => {
    setIsValidationModalOpen(false);
    setValidationData(null);
  };

  const clearFiles = () => {
    setFiles([]);
    setIsUploadSuccessful(false);
    setUploadedFileIds([]);
  };

  // Placeholder function for fetchCurrentMappings (not currently used but kept for future use)
  const fetchCurrentMappings = async (uploadId) => {
    // This function is not currently implemented as viewing mappings is not a priority
    // Mappings are verified in the customised_db_fields table instead
    console.log("[UPLOADS] fetchCurrentMappings called with uploadId:", uploadId);
    return null;
  };

  return {
    fetchDataSource,
    dataSource,
    handleChange,
    values,
    paymentTypeList,
    handleFileChange,
    onSubmit,
    files,
    clientOptions: CLIENT_OPTIONS,
    onValidate,
    validationData,
    isValidationLoading,
    isValidationModalOpen,
    closeValidationModal,
    isUploadSuccessful,
    setFiles,
    setIsUploadSuccessful,
    setUploadedFileIds,
    setToastMessage,
    currentMappings,
    isMappingsModalOpen,
    setIsMappingsModalOpen,
    isLoadingMappings,
    fetchCurrentMappings,
  };
};

export default useUploads;
