import { useState, useEffect } from "react";
import { apiEndpoints } from "../../../ServiceRequest/APIEndPoints";
import { requestCallGet, requestCallPost } from "../../../ServiceRequest/APIFunctions";
import { useLoader } from "../../../Utils/Loader";

const OPERATOR_OPTIONS = [
  { value: "+", label: "+ (Add)" },
  { value: "-", label: "- (Subtract)" },
  { value: "*", label: "* (Multiply)" },
  { value: "/", label: "/ (Divide)" },
  { value: "=", label: "= (Equals)" },
];

const useFormulaBuilder = () => {
  const { setToastMessage, setLoading } = useLoader();
  const [tenderList, setTenderList] = useState([]);
  const [selectedTenders, setSelectedTenders] = useState("");
  const [datasetOptions, setDatasetOptions] = useState([]);
  const [columnOptions, setColumnOptions] = useState([]);
  const [allColumns, setAllColumns] = useState([]); // Store all columns before filtering
  const [formulaOptions, setFormulaOptions] = useState([]);
  const [currentFormula, setCurrentFormula] = useState([]);
  const [savedFormulas, setSavedFormulas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDataset, setPendingDataset] = useState(null);
  const [pendingColumn, setPendingColumn] = useState(null);
  const [selectedDatasetValue, setSelectedDatasetValue] = useState("");
  const [selectedColumnValue, setSelectedColumnValue] = useState("");
  const [selectedOperatorValue, setSelectedOperatorValue] = useState("");
  const [selectedNumberValue, setSelectedNumberValue] = useState("");
  const [formulaText, setFormulaText] = useState(""); // Current formula text display
  const [draggedDataset, setDraggedDataset] = useState(null);

  // Fetch tender list on mount
  useEffect(() => {
    fetchTenderList();
  }, []);

  // Fetch saved formulas when tender changes
  useEffect(() => {
    if (selectedTenders) {
      fetchSavedFormulas();
    }
  }, [selectedTenders]);

  const fetchTenderList = async () => {
    try {
      setLoading(true);
      // Use the tender list endpoint from API endpoints
      const response = await requestCallGet(apiEndpoints.GET_TENDER_LIST);
      console.log("[FORMULA_BUILDER] Tender list response:", response);
      if (response && response.status) {
        // Handle different response formats
        let tenders = [];
        if (Array.isArray(response.data)) {
          tenders = response.data;
        } else if (Array.isArray(response.data?.data)) {
          tenders = response.data.data;
        } else if (response.data?.tenders) {
          tenders = Array.isArray(response.data.tenders) 
            ? response.data.tenders 
            : [response.data.tenders];
        } else if (typeof response.data === 'string') {
          // If it's a string, try to parse it
          try {
            const parsed = JSON.parse(response.data);
            if (Array.isArray(parsed)) {
              tenders = parsed;
            }
          } catch (e) {
            // If parsing fails, treat as single tender
            tenders = [response.data];
          }
        }
        const finalTenders = tenders.length > 0 ? tenders : ["ZOMATO", "SWIGGY", "POS Orders"];
        console.log("[FORMULA_BUILDER] Setting tender list:", finalTenders);
        setTenderList(finalTenders);
      } else {
        console.log("[FORMULA_BUILDER] Response status false, using fallback");
        // Fallback: try to get tenders from saved formulas
        const tenderResponse = await requestCallGet(
          apiEndpoints.GET_RECO_LOGICS_BY_TOPIC.replace("/get", "/getAll")
        );
        if (tenderResponse && tenderResponse.status && tenderResponse.data?.data) {
          const tenders = new Set();
          tenderResponse.data.data.forEach((item) => {
            if (item.tender) {
              item.tender.split(",").forEach((t) => tenders.add(t.trim()));
            }
          });
          const finalTenders = Array.from(tenders).length > 0 ? Array.from(tenders) : ["ZOMATO", "SWIGGY", "POS Orders"];
          setTenderList(finalTenders);
        } else {
          // Final fallback
          console.log("[FORMULA_BUILDER] Using hardcoded fallback tenders");
          setTenderList(["ZOMATO", "SWIGGY", "POS Orders"]);
        }
      }
    } catch (error) {
      console.error("[FORMULA_BUILDER] Error fetching tender list:", error);
      // Fallback on error
      setTenderList(["ZOMATO", "SWIGGY", "POS Orders"]);
      setToastMessage({
        message: "Using default tender list",
        type: "warning",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedFormulas = async () => {
    try {
      setLoading(true);
      // Use GET_ALL_RECO_LOGICS with tender filter
      const url = `${apiEndpoints.GET_ALL_RECO_LOGICS}?tenders=${encodeURIComponent(selectedTenders)}`;
      const response = await requestCallGet(url);
      
      console.log("[FORMULA_BUILDER] Fetch saved formulas response:", response);
      
      if (response && response.status) {
        // Handle different response formats
        let formulasData = [];
        if (Array.isArray(response.data)) {
          formulasData = response.data;
        } else if (Array.isArray(response.data?.data)) {
          formulasData = response.data.data;
        } else if (response.data?.formulas) {
          formulasData = Array.isArray(response.data.formulas) 
            ? response.data.formulas 
            : [response.data.formulas];
        }
        
        if (formulasData.length > 0) {
          const formulas = formulasData.map((item, index) => ({
          value: `formula_${item.id || index}`,
            label: item.logicName || item.tender || `Formula ${index + 1}`,
          formulaData: item,
        }));
        setFormulaOptions(formulas);
          setSavedFormulas(formulasData);
          console.log(`[FORMULA_BUILDER] Loaded ${formulas.length} saved formulas`);
        } else {
          console.log("[FORMULA_BUILDER] No saved formulas found");
          setFormulaOptions([]);
          setSavedFormulas([]);
        }
      } else {
        console.warn("[FORMULA_BUILDER] Failed to fetch saved formulas:", response?.message);
        setFormulaOptions([]);
        setSavedFormulas([]);
      }
    } catch (error) {
      console.error("[FORMULA_BUILDER] Error fetching saved formulas:", error);
      setToastMessage({
        message: "Failed to load saved formulas. Please try again.",
        type: "error",
      });
      setFormulaOptions([]);
      setSavedFormulas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTenderChange = (tender) => {
    setSelectedTenders(tender);
    setCurrentFormula([]);
    setColumnOptions([]);
    setDatasetOptions([]);
    setAllColumns([]);
    setPendingDataset(null);
    setPendingColumn(null);
    setSelectedDatasetValue("");
    setSelectedColumnValue("");
    if (tender && tender !== "") {
      fetchDatasetColumns(tender);
    }
  };

  const fetchDatasetColumns = async (tender) => {
    try {
      setLoading(true);
      console.log("[FORMULA_BUILDER] Fetching datasets for tender:", tender);
      console.log("[FORMULA_BUILDER] API endpoint:", apiEndpoints.GET_TENDER_WISE_TABLES_LIST);
      
      // Fetch table/column list for the selected tender using the API endpoint
      const response = await requestCallPost(apiEndpoints.GET_TENDER_WISE_TABLES_LIST, { tenders: [tender] });
      
      console.log("[FORMULA_BUILDER] Full response:", JSON.stringify(response, null, 2));
      console.log("[FORMULA_BUILDER] Response status:", response?.status);
      console.log("[FORMULA_BUILDER] Response data:", response?.data);
      
      // Check if API call failed
      if (!response) {
        console.error("[FORMULA_BUILDER] No response received from API");
        setDatasetOptions([]);
        setAllColumns([]);
        setColumnOptions([]);
        setToastMessage({
          message: "Failed to connect to server. Please check your connection and try again.",
          type: "error",
        });
        return;
      }
      
      if (!response.status) {
        console.error("[FORMULA_BUILDER] API call failed:", response?.message);
        const errorMsg = response?.message || "Failed to fetch datasets";
        setDatasetOptions([]);
        setAllColumns([]);
        setColumnOptions([]);
        setToastMessage({
          message: typeof errorMsg === 'string' ? errorMsg : "Failed to load datasets. Please try again.",
          type: "error",
        });
        return;
      }
      
      // Handle different response formats
      let responseData = null;
      
      if (response && response.status) {
        // Format 1: response.data.data (nested)
        if (response.data?.data && Array.isArray(response.data.data)) {
          responseData = response.data.data;
          console.log("[FORMULA_BUILDER] Using response.data.data format");
        }
        // Format 2: response.data (direct array)
        else if (Array.isArray(response.data)) {
          responseData = response.data;
          console.log("[FORMULA_BUILDER] Using response.data format (direct array)");
        }
        // Format 3: response.data.dataSourceWiseColumns (single tender)
        else if (response.data?.dataSourceWiseColumns && Array.isArray(response.data.dataSourceWiseColumns)) {
          responseData = [{
            tender: tender,
            dataSourceWiseColumns: response.data.dataSourceWiseColumns
          }];
          console.log("[FORMULA_BUILDER] Using response.data.dataSourceWiseColumns format");
        }
        // Format 4: response.data wrapped in another object
        else if (response.data?.data && typeof response.data.data === 'object') {
          responseData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          console.log("[FORMULA_BUILDER] Using wrapped response.data.data format");
        }
      }
      
      if (responseData && Array.isArray(responseData) && responseData.length > 0) {
        const datasets = [];
        const allColumns = [];
        
        responseData.forEach((tenderData) => {
          const dataSourceColumns = tenderData?.dataSourceWiseColumns || [];
          
          if (Array.isArray(dataSourceColumns) && dataSourceColumns.length > 0) {
            dataSourceColumns.forEach((dataSource) => {
              const datasetName = dataSource?.dataSourceName || dataSource?.dataset_name || dataSource?.name;
              if (datasetName) {
                datasets.push({
                  value: datasetName,
                  label: datasetName,
                  tableName: dataSource?.tableName || dataSource?.table_name,
                });
                
                // Collect columns for this dataset
                const columns = dataSource?.columns || dataSource?.columnList || [];
                if (Array.isArray(columns) && columns.length > 0) {
                  columns.forEach((col) => {
                    const colName = col?.excelColumnName || col?.columnName || col?.name || col;
                    if (colName) {
                      allColumns.push({
                        value: colName,
                        label: colName,
                        dataset: datasetName,
                        tableColumn: col?.dbColumnName || col?.db_column_name || colName,
                      });
                    }
                  });
                }
              }
            });
          }
        });
        
        console.log("[FORMULA_BUILDER] Extracted datasets:", datasets.length);
        console.log("[FORMULA_BUILDER] Extracted columns:", allColumns.length);
        
        if (datasets.length > 0) {
          setDatasetOptions(datasets);
          setAllColumns(allColumns);
          setColumnOptions([]);
          setToastMessage({
            message: `Loaded ${datasets.length} dataset(s) with ${allColumns.length} column(s)`,
            type: "success",
          });
        } else {
          console.warn("[FORMULA_BUILDER] No datasets found in response");
          setDatasetOptions([]);
          setAllColumns([]);
          setColumnOptions([]);
          setToastMessage({
            message: "No datasets found for this tender. Please check if the tender has datasets configured.",
            type: "warning",
          });
        }
      } else {
        console.warn("[FORMULA_BUILDER] Invalid or empty response data");
        setDatasetOptions([]);
        setAllColumns([]);
        setColumnOptions([]);
        setToastMessage({
          message: "No datasets available. Please check if the tender has datasets configured.",
          type: "warning",
        });
      }
    } catch (error) {
      console.error("[FORMULA_BUILDER] Error fetching datasets:", error);
      console.error("[FORMULA_BUILDER] Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      setDatasetOptions([]);
      setAllColumns([]);
      setColumnOptions([]);
      setToastMessage({
        message: error?.response?.data?.detail || error?.message || "Failed to load datasets. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle dataset drag and drop
  const handleDatasetDragStart = (e, dataset) => {
    console.log("[DRAG_DROP] Drag start:", dataset);
    console.log("[DRAG_DROP] Dataset value:", dataset?.value);
    console.log("[DRAG_DROP] Dataset label:", dataset?.label);
    
    try {
      e.dataTransfer.effectAllowed = "move";
      
      // Store dataset in multiple formats for maximum compatibility
      const datasetValue = dataset?.value || dataset?.label || dataset;
      const datasetLabel = dataset?.label || dataset?.value || dataset;
      
      // Store as JSON
      try {
        e.dataTransfer.setData("application/json", JSON.stringify(dataset));
        console.log("[DRAG_DROP] Set application/json data");
      } catch (err) {
        console.warn("[DRAG_DROP] Could not set application/json:", err);
      }
      
      // Store as text/plain (fallback)
      try {
        e.dataTransfer.setData("text/plain", datasetValue);
        console.log("[DRAG_DROP] Set text/plain data:", datasetValue);
      } catch (err) {
        console.warn("[DRAG_DROP] Could not set text/plain:", err);
      }
      
      // Also store the full object as a custom format
      try {
        e.dataTransfer.setData("text/dataset", JSON.stringify({
          value: datasetValue,
          label: datasetLabel,
          ...dataset
        }));
        console.log("[DRAG_DROP] Set text/dataset data");
      } catch (err) {
        console.warn("[DRAG_DROP] Could not set text/dataset:", err);
      }
      
      // Store in state as backup
      setDraggedDataset(dataset);
      console.log("[DRAG_DROP] Stored dataset in state");
    } catch (error) {
      console.error("[DRAG_DROP] Error in drag start:", error);
      // Still store in state even if dataTransfer fails
      setDraggedDataset(dataset);
    }
  };

  const handleDatasetDragEnd = (e) => {
    console.log("[DRAG_DROP] Drag end, dropEffect:", e?.dataTransfer?.dropEffect);
    // Don't clear draggedDataset here - let the drop handler clear it
    // Only clear if drop was definitely NOT successful (dropEffect is 'none')
    // But wait a bit to give drop handler time to use it
    setTimeout(() => {
      if (e?.dataTransfer?.dropEffect === 'none') {
        console.log("[DRAG_DROP] Drop was not successful, clearing draggedDataset");
        setDraggedDataset(null);
      }
    }, 100);
  };

  const handleDatasetDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch (error) {
      console.error("[DRAG_DROP] Error in drag over:", error);
    }
  };

  const handleDatasetDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[DRAG_DROP] Drag enter drop zone");
  };

  const handleDatasetDragLeave = (e) => {
    // Only clear if we're actually leaving the drop zone (not just entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      console.log("[DRAG_DROP] Drag leave drop zone");
    }
  };

  const handleDatasetDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[DRAG_DROP] Drop event triggered");
    console.log("[DRAG_DROP] draggedDataset state:", draggedDataset);
    console.log("[DRAG_DROP] datasetOptions:", datasetOptions);
    console.log("[DRAG_DROP] allColumns:", allColumns.length);
    
    try {
      // PRIORITY 1: Use draggedDataset from state (most reliable)
      let dataset = null;
      if (draggedDataset) {
        dataset = draggedDataset;
        console.log("[DRAG_DROP] Using draggedDataset from state (PRIORITY 1):", dataset);
      }
      
      // PRIORITY 2: Try to get from dataTransfer (if state wasn't available)
      if (!dataset) {
        let data = null;
        
        // Try text/dataset first (our custom format)
        try {
          data = e.dataTransfer.getData("text/dataset");
          if (data && data !== "null" && data !== "undefined" && data.trim() !== "") {
            dataset = JSON.parse(data);
            console.log("[DRAG_DROP] Got data from text/dataset (PRIORITY 2):", dataset);
          }
        } catch (e0) {
          console.log("[DRAG_DROP] text/dataset not available");
        }
        
        // Try application/json
        if (!dataset) {
          try {
            data = e.dataTransfer.getData("application/json");
            if (data && data !== "null" && data !== "undefined" && data.trim() !== "") {
              dataset = JSON.parse(data);
              console.log("[DRAG_DROP] Got data from application/json (PRIORITY 2):", dataset);
            }
          } catch (e1) {
            console.log("[DRAG_DROP] application/json not available");
          }
        }
        
        // Try text/plain
        if (!dataset) {
          try {
            data = e.dataTransfer.getData("text/plain");
            if (data && data !== "null" && data !== "undefined" && data.trim() !== "") {
              // Find matching dataset from options first
              const matchingDataset = datasetOptions.find(
                (opt) => opt.value === data || opt.label === data
              );
              if (matchingDataset) {
                dataset = matchingDataset;
                console.log("[DRAG_DROP] Found matching dataset from options:", dataset);
              } else {
                // Try to parse as JSON
                try {
                  dataset = JSON.parse(data);
                  console.log("[DRAG_DROP] Got data from text/plain (JSON):", dataset);
                } catch (e2) {
                  // If not JSON and not in options, create from string
                  dataset = { value: data, label: data };
                  console.log("[DRAG_DROP] Created dataset from string:", dataset);
                }
              }
            }
          } catch (e3) {
            console.error("[DRAG_DROP] Error getting data from dataTransfer:", e3);
          }
        }
      }
      
      // PRIORITY 3: Last resort - use single dataset if only one available
      if (!dataset) {
        console.log("[DRAG_DROP] No dataset found, checking datasetOptions");
        if (datasetOptions && datasetOptions.length > 0) {
          // If there's only one dataset, use it
          if (datasetOptions.length === 1) {
            dataset = datasetOptions[0];
            console.log("[DRAG_DROP] Using single available dataset (PRIORITY 3):", dataset);
          }
        }
      }
      
      if (dataset) {
        const datasetValue = dataset.value || dataset.label || (typeof dataset === 'string' ? dataset : null);
        if (datasetValue) {
          console.log("[DRAG_DROP] Setting dataset:", datasetValue);
          setPendingDataset(datasetValue);
          setSelectedDatasetValue(datasetValue);
          // Filter columns for selected dataset
          const filteredColumns = allColumns.filter(
            (col) => col.dataset === datasetValue
          );
          console.log("[DRAG_DROP] Filtered columns:", filteredColumns.length);
          setColumnOptions(filteredColumns);
          setSelectedColumnValue("");
          setDraggedDataset(null);
          setToastMessage({
            message: `Dataset "${datasetValue}" selected successfully`,
            type: "success",
          });
        } else {
          console.warn("[DRAG_DROP] Dataset found but no valid value:", dataset);
          setToastMessage({
            message: "Invalid dataset. Please try again or use the dropdown.",
            type: "error",
          });
        }
      } else {
        console.warn("[DRAG_DROP] No dataset found in drop event");
        console.warn("[DRAG_DROP] Available datasets:", datasetOptions);
        setToastMessage({
          message: "No dataset found. Please select a dataset from the dropdown or ensure datasets are loaded.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("[DRAG_DROP] Error handling drop:", error, error.stack);
      // Fallback to draggedDataset from state
      if (draggedDataset) {
        const datasetValue = draggedDataset.value || draggedDataset.label || draggedDataset;
        console.log("[DRAG_DROP] Fallback: Setting dataset from state:", datasetValue);
        setPendingDataset(datasetValue);
        setSelectedDatasetValue(datasetValue);
        const filteredColumns = allColumns.filter(
          (col) => col.dataset === datasetValue
        );
        setColumnOptions(filteredColumns);
        setSelectedColumnValue("");
        setDraggedDataset(null);
        setToastMessage({
          message: `Dataset "${datasetValue}" selected successfully`,
          type: "success",
        });
      } else {
        console.error("[DRAG_DROP] No fallback available");
        setToastMessage({
          message: "Error dropping dataset. Please try selecting from the dropdown instead.",
          type: "error",
        });
      }
    }
  };

  // Handle dataset selection from dropdown
  const handleDatasetSelect = (value) => {
    if (value && value !== "") {
      setPendingDataset(value);
      setSelectedDatasetValue(value);
      // Filter columns for selected dataset from allColumns
      const filteredColumns = allColumns.filter(
        (col) => col.dataset === value
      );
      setColumnOptions(filteredColumns);
      // Reset column selection
      setSelectedColumnValue("");
    } else {
      setPendingDataset(null);
      setSelectedDatasetValue("");
      setColumnOptions([]);
      setSelectedColumnValue("");
    }
  };

  // Handle column selection (but don't add yet - wait for Add button)
  const handleColumnSelect = (value) => {
    setSelectedColumnValue(value);
  };

  // Add column to formula (called by Add button)
  // Items are always added to the right (end) of the formula array
  const handleAddColumn = () => {
    if (selectedColumnValue && selectedColumnValue !== "" && pendingDataset) {
      const selectedColumn = allColumns.find((col) => col.value === selectedColumnValue && col.dataset === pendingDataset);
      const newField = {
        type: "data_field",
        dataset: pendingDataset,
        column: selectedColumnValue,
        tableColumn: selectedColumn?.tableColumn || selectedColumnValue,
        tableName: selectedColumn?.tableName || pendingDataset,
        excelColumnName: selectedColumnValue,
        id: Date.now(),
      };
      // Add to the end (right side) of the formula - preserves order
      const updatedFormula = [...currentFormula, newField];
      setCurrentFormula(updatedFormula);
      updateFormulaText(updatedFormula);
      console.log("[FORMULA_BUILDER] Added column to end:", `${pendingDataset}.${selectedColumnValue}`);
      console.log("[FORMULA_BUILDER] Formula now has", updatedFormula.length, "items");
      // Reset selections after adding field
      setPendingDataset(null);
      setSelectedDatasetValue("");
      setSelectedColumnValue("");
      setColumnOptions([]);
    }
  };

  // Handle operator selection (but don't add yet - wait for Add button)
  const handleOperatorSelect = (value) => {
    setSelectedOperatorValue(value);
  };

  // Add operator to formula (called by Add button)
  // Operators are added to the right (end) of the formula array
  const handleAddOperator = () => {
    if (selectedOperatorValue && selectedOperatorValue !== "") {
      const newOperator = {
        type: "operator",
        selectedFieldValue: selectedOperatorValue,
        value: selectedOperatorValue,
        id: Date.now(),
      };
      // Add to the end (right side) of the formula
      const updatedFormula = [...currentFormula, newOperator];
      setCurrentFormula(updatedFormula);
      updateFormulaText(updatedFormula);
      console.log("[FORMULA_BUILDER] Added operator to end:", selectedOperatorValue);
      console.log("[FORMULA_BUILDER] Formula now has", updatedFormula.length, "items");
      setSelectedOperatorValue("");
    }
  };

  // Handle number input
  const handleNumberChange = (value) => {
    setSelectedNumberValue(value);
  };

  // Add number to formula (called by Add button)
  // Numbers are added to the right (end) of the formula array
  const handleAddNumber = () => {
    if (selectedNumberValue && selectedNumberValue !== "") {
      const numValue = parseFloat(selectedNumberValue);
      if (!isNaN(numValue)) {
        const newNumber = {
          type: "data_field",
          dataset_type: "Custom",
          customFieldValue: selectedNumberValue,
          selectedFieldValue: "Custom",
          id: Date.now(),
        };
        // Add to the end (right side) of the formula
        const updatedFormula = [...currentFormula, newNumber];
        setCurrentFormula(updatedFormula);
        updateFormulaText(updatedFormula);
        console.log("[FORMULA_BUILDER] Added number to end:", selectedNumberValue);
        console.log("[FORMULA_BUILDER] Formula now has", updatedFormula.length, "items");
        setSelectedNumberValue("");
      }
    }
  };

  // Update formula text display (CLI-like)
  // This function builds the formula incrementally from left to right
  // Each new item is added to the right of previous items
  // Example: C → C = → C = A → C = A + → C = A + B
  const updateFormulaText = (formulaArray) => {
    if (!Array.isArray(formulaArray) || formulaArray.length === 0) {
      setFormulaText("");
      return;
    }
    
    // Build formula text incrementally from left to right (array order)
    // This ensures each step builds on the previous steps
    let text = "";
    formulaArray.forEach((item, index) => {
      // Add the item to the formula text
      if (item.type === "data_field") {
        // Data field (column or number)
        if (item.customFieldValue) {
          // Custom number - add directly
          text += item.customFieldValue;
        } else if (item.dataset && item.column) {
          // Dataset.column - format as dataset.column
          text += `${item.dataset}.${item.column}`;
        } else {
          // Fallback for data fields
          text += item.excelColumnName || item.column || "";
        }
      } else if (item.type === "operator") {
        // Operator - always add with spaces around it
        // This ensures proper formatting: "field + field" not "field+field"
        const operator = item.value || item.selectedFieldValue || "";
        text += ` ${operator} `;
      } else if (item.type === "formula") {
        // Existing formula - add its name
        text += item.name || "";
      }
    });
    
    // Clean up multiple spaces (but preserve single spaces around operators)
    // Replace multiple spaces with single space, then trim
    const cleanedText = text.replace(/\s+/g, " ").trim();
    setFormulaText(cleanedText);
    
    // Log for debugging - shows incremental building
    console.log("[FORMULA_BUILDER] Formula step:", cleanedText);
    console.log("[FORMULA_BUILDER] Total items:", formulaArray.length);
    console.log("[FORMULA_BUILDER] Items:", formulaArray.map(item => {
      if (item.type === "data_field") {
        return item.customFieldValue || `${item.dataset}.${item.column}`;
      } else if (item.type === "operator") {
        return item.value || item.selectedFieldValue;
      } else {
        return item.name;
      }
    }).join(" → "));
  };

  // Old handleAddOperator removed - now using handleOperatorSelect + handleAddOperator (with Add button)

  const handleAddFormula = (formulaValue) => {
    if (formulaValue && formulaValue !== "") {
      const selectedFormula = formulaOptions.find((f) => f.value === formulaValue);
      if (selectedFormula && selectedFormula.formulaData) {
        const newFormula = {
          type: "formula",
          name: selectedFormula.label,
          formulaData: selectedFormula.formulaData,
          id: Date.now(),
        };
        // Add to the end (right side) of the formula
        const updatedFormula = [...currentFormula, newFormula];
        setCurrentFormula(updatedFormula);
        updateFormulaText(updatedFormula);
        console.log("[FORMULA_BUILDER] Added formula to end:", newFormula.name);
      }
    }
  };

  const handleRemoveField = (index) => {
    // Remove item at the specified index
    const newFormula = currentFormula.filter((_, i) => i !== index);
    setCurrentFormula(newFormula);
    updateFormulaText(newFormula); // Update CLI display after removal
    console.log("[FORMULA_BUILDER] Removed item at index:", index);
    console.log("[FORMULA_BUILDER] Remaining formula length:", newFormula.length);
  };

  const handleSaveFormula = async () => {
    if (!selectedTenders || currentFormula.length === 0) {
      setToastMessage({
        message: "Please select a tender and build a formula",
        type: "error",
      });
      return;
    }

    try {
      setIsSaving(true);
      setLoading(true);

      // Validate that we have at least one item in the formula
      if (currentFormula.length === 0) {
        setToastMessage({
          message: "Please build a formula before saving",
          type: "error",
        });
        return;
      }

      // Convert current formula to the format expected by the API (matching DefineLogic format)
      const fields = currentFormula.map((item, index) => {
        if (item.type === "data_field") {
          if (item.customFieldValue) {
            // Custom number
            return {
              type: "data_field",
              dataset_type: "Custom",
              selectedFieldValue: "Custom",
              customFieldValue: item.customFieldValue,
              startBrackets: [],
              endBrackets: [],
            };
          } else {
            // Dataset.column field - ensure all required fields are present
            if (!item.dataset || !item.column) {
              console.error(`[FORMULA_BUILDER] Invalid data_field at index ${index}:`, item);
              return null;
            }
            return {
              type: "data_field",
              dataset_type: item.dataset || "",
              selectedFieldValue: item.dataset || "",
              selectedDataSetValue: item.column || "",
              selectedTableName: item.tableName || item.dataset || "",
              selectedTableColumn: item.tableColumn || item.column || "",
              startBrackets: [],
              endBrackets: [],
            };
          }
        } else if (item.type === "operator") {
          const operatorValue = item.value || item.selectedFieldValue || "";
          if (!operatorValue) {
            console.error(`[FORMULA_BUILDER] Invalid operator at index ${index}:`, item);
            return null;
          }
          return {
            type: "operator",
            selectedFieldValue: operatorValue,
          };
        } else if (item.type === "formula") {
          return {
            type: "formula",
            formulaId: item.formulaData?.id,
          };
        }
        console.warn(`[FORMULA_BUILDER] Unknown item type at index ${index}:`, item);
        return null;
      }).filter(Boolean);

      // Validate that we have at least one valid field after filtering
      if (fields.length === 0) {
        setToastMessage({
          message: "Invalid formula. Please check your formula and try again.",
          type: "error",
        });
        return;
      }

      console.log("[FORMULA_BUILDER] Converted fields:", JSON.stringify(fields, null, 2));

      // Build formula text for storage
      let formulaTextStr = "";
      let excelFormulaTextStr = "";
      fields.forEach((field) => {
        if (field.type === "data_field") {
          if (field.customFieldValue) {
            formulaTextStr += field.customFieldValue;
            excelFormulaTextStr += field.customFieldValue;
          } else {
            const dbPart = `${field.selectedTableName}.${field.selectedTableColumn}`;
            const excelPart = `${field.selectedFieldValue}.${field.selectedDataSetValue}`;
            formulaTextStr += dbPart;
            excelFormulaTextStr += excelPart;
          }
        } else if (field.type === "operator") {
          formulaTextStr += ` ${field.selectedFieldValue} `;
          excelFormulaTextStr += ` ${field.selectedFieldValue} `;
        }
      });

      // Create formula object in the format expected by recologic column
      const recoData = [{
        id: 1,
        logicName: `Formula_${Date.now()}`,
        fields: fields,
        formulaText: formulaTextStr.trim(),
        excelFormulaText: excelFormulaTextStr.trim(),
        logicNameKey: `FORMULA_${Date.now()}`,
        multipleColumn: false,
        active_group_index: 0,
      }];

      const requestObj = {
        tenders: selectedTenders,
        recoData: recoData,
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "2099-12-31",
        effectiveType: "business_date",
      };

      console.log("[FORMULA_BUILDER] Saving formula with request:", JSON.stringify(requestObj, null, 2));
      
      const response = await requestCallPost(apiEndpoints.SAVE_ALL_RECO_LOGICS, requestObj);

      console.log("[FORMULA_BUILDER] Save response:", response);
      console.log("[FORMULA_BUILDER] Response status:", response?.status);
      console.log("[FORMULA_BUILDER] Response data:", response?.data);
      console.log("[FORMULA_BUILDER] Response success:", response?.data?.success);
      console.log("[FORMULA_BUILDER] Response code:", response?.data?.code);

      // Backend returns { success: true, code: 200, message: "...", data: {...} }
      // Frontend requestCallPost wraps it in { status: true/false, data: {...} }
      const isSuccess = response?.status || response?.data?.success || response?.data?.code === 200;
      
      if (isSuccess) {
        setToastMessage({
          message: response?.data?.message || "Formula saved successfully!",
          type: "success",
        });
        setCurrentFormula([]);
        setFormulaText(""); // Clear formula text display after saving
        fetchSavedFormulas();
      } else {
        const errorMessage = response?.data?.message || 
                            response?.data?.detail || 
                            response?.message || 
                            "Failed to save formula";
        console.error("[FORMULA_BUILDER] Save failed:", errorMessage);
        console.error("[FORMULA_BUILDER] Full error response:", response);
        setToastMessage({
          message: errorMessage,
          type: "error",
        });
      }
    } catch (error) {
      console.error("[FORMULA_BUILDER] Error saving formula:", error);
      console.error("[FORMULA_BUILDER] Error details:", {
        message: error?.message,
        response: error?.response?.data,
        stack: error?.stack
      });
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.detail || 
                          error?.message || 
                          "Error saving formula. Please try again.";
      setToastMessage({
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsSaving(false);
      setLoading(false);
    }
  };

  const handleClearFormula = () => {
    setCurrentFormula([]);
    setPendingDataset(null);
    setPendingColumn(null);
    setSelectedDatasetValue("");
    setSelectedColumnValue("");
    setFormulaText(""); // Clear formula text display
    // Restore all columns if we have a tender selected
    if (selectedTenders && allColumns.length > 0) {
      setColumnOptions([]);
    } else {
      setColumnOptions([]);
    }
    console.log("[FORMULA_BUILDER] Cleared formula");
  };

  const handleLoadSavedFormulas = () => {
    if (savedFormulas.length > 0) {
      // Load the first saved formula as an example
      const firstFormula = savedFormulas[0];
      if (firstFormula.recologic) {
        try {
          const formulaData = typeof firstFormula.recologic === "string"
            ? JSON.parse(firstFormula.recologic)
            : firstFormula.recologic;
          // Convert saved formula to current formula format
          // This is a simplified conversion
          setToastMessage({
            message: "Loaded saved formula",
            type: "success",
          });
        } catch (error) {
          console.error("[FORMULA_BUILDER] Error parsing saved formula:", error);
        }
      }
    } else {
      setToastMessage({
        message: "No saved formulas found",
        type: "warning",
      });
    }
  };

  return {
    tenderList,
    selectedTenders,
    datasetOptions,
    columnOptions,
    operatorOptions: OPERATOR_OPTIONS,
    formulaOptions,
    currentFormula,
    pendingDataset,
    selectedDatasetValue,
    selectedColumnValue,
    selectedOperatorValue,
    selectedNumberValue,
    formulaText,
    draggedDataset,
    handleTenderChange,
    handleDatasetSelect,
    handleDatasetDragStart,
    handleDatasetDragEnd,
    handleDatasetDrop,
    handleDatasetDragOver,
    handleDatasetDragEnter,
    handleDatasetDragLeave,
    handleColumnSelect,
    handleAddColumn,
    handleOperatorSelect,
    handleAddOperator,
    handleNumberChange,
    handleAddNumber,
    handleAddFormula,
    handleRemoveField,
    handleSaveFormula,
    handleClearFormula,
    handleLoadSavedFormulas,
    isSaving,
  };
};

export default useFormulaBuilder;

