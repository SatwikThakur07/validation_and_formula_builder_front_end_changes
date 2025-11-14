import React, { useState, useEffect } from "react";
import PrimaryButton from "./PrimaryButton";

export default function ColumnValidationModal({
  isOpen,
  onClose,
  validationData,
  onSave,
  isLoading = false,
}) {
  const [mappings, setMappings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (validationData) {
      // Handle different response structures
      const validationDataArray = validationData.validation_data 
        || validationData.data?.validation_data 
        || [];
      
      if (validationDataArray.length > 0) {
        const initialMappings = {};
        validationDataArray.forEach((item) => {
          if (item.db_column && item.excel_column) {
            initialMappings[item.db_column] = item.excel_column;
          }
        });
        setMappings(initialMappings);
        setHasChanges(false);
        console.log("[ColumnValidationModal] Initialized with", Object.keys(initialMappings).length, "mappings");
      } else {
        console.warn("[ColumnValidationModal] No validation data found in:", validationData);
      }
    }
  }, [validationData]);

  const handleMappingChange = (dbColumn, excelColumn) => {
    setMappings((prev) => ({
      ...prev,
      [dbColumn]: excelColumn,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(mappings);
    }
  };

  if (!isOpen || !validationData) {
    return null;
  }

  // Handle different response structures
  const validation_data = validationData.validation_data 
    || validationData.data?.validation_data 
    || [];
  const excel_columns = validationData.excel_columns 
    || validationData.data?.excel_columns 
    || [];
  const db_columns = validationData.db_columns 
    || validationData.data?.db_columns 
    || [];
  
  console.log("[ColumnValidationModal] Rendering with:", {
    validation_data_count: validation_data.length,
    excel_columns_count: excel_columns.length,
    db_columns_count: db_columns.length
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            Validate Column Mappings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 text-sm text-gray-600">
            <p>
              Map database columns (left) to Excel columns (right). Select the
              Excel column that corresponds to each database column.
            </p>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-2 gap-4 mb-2 pb-2 border-b border-gray-300 font-semibold text-gray-700">
            <div>Database Column</div>
            <div>Excel Column</div>
          </div>

          {/* Mappings List */}
          <div className="space-y-3">
            {validation_data && validation_data.length > 0 ? (
              validation_data.map((item, index) => {
                const dbColumn = item.db_column;
                const currentExcelColumn = mappings[dbColumn] || item.excel_column || "";

                // Get available Excel columns from item or global list
                const availableColumns = item.excel_columns_available 
                  || excel_columns 
                  || [];

                // Prepare dropdown options
                const excelOptions = [
                  { value: "", label: "- Select Excel Column -" },
                  ...availableColumns.map((col) => ({
                    value: col,
                    label: col,
                  })),
                ];

                return (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-4 items-center py-2 border-b border-gray-100"
                  >
                    {/* DB Column (Left) */}
                    <div className="font-medium text-gray-800">
                      {dbColumn}
                    </div>

                    {/* Excel Column Dropdown (Right) */}
                    <div>
                      <select
                        value={currentExcelColumn}
                        onChange={(e) =>
                          handleMappingChange(dbColumn, e.target.value)
                        }
                        className="border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      >
                        {excelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                No columns to validate
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <PrimaryButton
            label={isLoading ? "Saving..." : "Save Mappings"}
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

