import React, { useEffect, useState } from "react";
import BlankCard from "../../../components/BlankCard";
import PrimaryButton from "../../../components/PrimaryButton";
import CustomSelect from "../../../components/CustomSelect";
import { useLoader } from "../../../Utils/Loader";
import useFormulaBuilder from "./useFormulaBuilder";
import "./formulaBuilder.style.css";

const FormulaBuilder = () => {
  let hookData = {};
  try {
    hookData = useFormulaBuilder();
  } catch (error) {
    console.error("[FORMULA_BUILDER] Error in useFormulaBuilder:", error);
    return (
      <div className="formula-builder-container">
        <BlankCard header={<h4 className="box-title font-bold text-base">FORMULA BUILDER</h4>}>
          <div className="pt-3 w-full">
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800">Error loading Formula Builder. Please refresh the page.</p>
              <p className="text-red-600 text-sm mt-2">{error?.message || "Unknown error"}</p>
            </div>
          </div>
        </BlankCard>
      </div>
    );
  }

  const {
    tenderList = [],
    selectedTenders = "",
    datasetOptions = [],
    columnOptions = [],
    operatorOptions = [],
    formulaOptions = [],
    currentFormula = [],
    pendingDataset = null,
    selectedDatasetValue = "",
    selectedColumnValue = "",
    selectedOperatorValue = "",
    selectedNumberValue = "",
    formulaText = "",
    draggedDataset = null,
    handleTenderChange = () => {},
    handleDatasetSelect = () => {},
    handleDatasetDragStart = () => {},
    handleDatasetDragEnd = () => {},
    handleDatasetDrop = () => {},
    handleDatasetDragOver = () => {},
    handleDatasetDragEnter = () => {},
    handleDatasetDragLeave = () => {},
    handleColumnSelect = () => {},
    handleAddColumn = () => {},
    handleOperatorSelect = () => {},
    handleAddOperator = () => {},
    handleNumberChange = () => {},
    handleAddNumber = () => {},
    handleAddFormula = () => {},
    handleRemoveField = () => {},
    handleSaveFormula = () => {},
    handleClearFormula = () => {},
    handleLoadSavedFormulas = () => {},
    isSaving = false,
  } = hookData;

  return (
    <div className="formula-builder-container" style={{ minHeight: "400px", width: "100%" }}>
      <BlankCard header={<h4 className="box-title font-bold text-base">FORMULA BUILDER</h4>}>
        <div className="pt-3 w-full">
          {/* Tender Selection */}
          <div className="md:w-1/3 mb-4">
            <CustomSelect
              label="Select Tenders *"
              required
              data={[
                { value: "", label: "-Select Tender-" },
                ...(Array.isArray(tenderList) ? tenderList : []).map((tender) => {
                  const tenderValue = typeof tender === 'string' ? tender : (tender?.value || tender?.label || String(tender));
                  const tenderLabel = typeof tender === 'string' ? tender : (tender?.label || tender?.value || String(tender));
                  return {
                    value: tenderValue,
                    label: tenderLabel,
                  };
                }),
              ]}
              option_value={"value"}
              option_label={"label"}
              onChange={(e) => {
                if (handleTenderChange) {
                  handleTenderChange(e.target.value);
                }
              }}
              value={selectedTenders || ""}
            />
            {Array.isArray(tenderList) && tenderList.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Loading tenders...</p>
            )}
            {!Array.isArray(tenderList) && (
              <p className="text-xs text-yellow-600 mt-1">Initializing...</p>
            )}
          </div>

          {/* Formula Display - CLI-like */}
          <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h5 className="font-semibold text-white">Current Formula (CLI View):</h5>
              <button
                onClick={() => {
                  if (handleClearFormula) {
                    handleClearFormula();
                  }
                }}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Clear All
              </button>
            </div>
            <div className="formula-cli-display">
              <code className="text-green-400 font-mono text-sm" style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                {formulaText || "(empty)"}
              </code>
              {formulaText && (
                <p className="text-xs text-gray-400 mt-2">
                  Formula is being built incrementally. Each step adds to the previous steps.
                </p>
              )}
            </div>
            {Array.isArray(currentFormula) && currentFormula.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="formula-display">
                  {currentFormula.map((item, index) => (
                    <span key={item?.id || index} className="formula-item">
                      {item?.type === "data_field" && (
                        <span className="field-badge">
                          {item.customFieldValue ? item.customFieldValue : `${item.dataset}.${item.column}`}
                          <button
                            onClick={() => {
                              if (handleRemoveField) {
                                handleRemoveField(index);
                              }
                            }}
                            className="ml-2 text-red-600 hover:text-red-800"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {item?.type === "operator" && (
                        <span className="operator-badge">
                          {item.value || item.selectedFieldValue}
                          <button
                            onClick={() => {
                              if (handleRemoveField) {
                                handleRemoveField(index);
                              }
                            }}
                            className="ml-2 text-red-600 hover:text-red-800"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {item?.type === "formula" && (
                        <span className="formula-badge">
                          {item.name}
                          <button
                            onClick={() => {
                              if (handleRemoveField) {
                                handleRemoveField(index);
                              }
                            }}
                            className="ml-2 text-red-600 hover:text-red-800"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {index < currentFormula.length - 1 && (
                        <span className="mx-1 text-gray-400">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Formula Builder Controls */}
          <div className="formula-controls" style={{ marginTop: "20px" }}>
            <h5 className="font-semibold mb-4 text-lg">Build Your Formula</h5>
            {!selectedTenders && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">Please select a tender first to start building your formula.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Dataset - Drag and Drop */}
              <div className="control-group p-4 border rounded-lg bg-white">
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  Dataset (Drag & Drop or Select)
                </label>
                {/* Drag and Drop Area */}
                <div
                  onDrop={(e) => {
                    console.log("[DRAG_DROP] Drop handler called");
                    if (handleDatasetDrop) {
                      handleDatasetDrop(e);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (handleDatasetDragOver) {
                      handleDatasetDragOver(e);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (handleDatasetDragEnter) {
                      handleDatasetDragEnter(e);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (handleDatasetDragLeave) {
                      handleDatasetDragLeave(e);
                    }
                  }}
                  className="mb-3 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[80px] flex items-center justify-center transition-all duration-200"
                  style={{ 
                    backgroundColor: draggedDataset ? "#e3f2fd" : "#f9fafb",
                    borderColor: draggedDataset ? "#1976d2" : "#d1d5db",
                    borderWidth: draggedDataset ? "3px" : "2px"
                  }}
                >
                  {pendingDataset ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-700">Selected: <strong>{pendingDataset}</strong></p>
                      <button
                        onClick={() => {
                          if (handleDatasetSelect) {
                            handleDatasetSelect("");
                          }
                        }}
                        className="text-xs text-red-600 mt-1"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Drag dataset here or select from dropdown</p>
                  )}
                </div>
                {/* Dataset Dropdown */}
                <CustomSelect
                  label="Or Select Dataset"
                  data={[
                    { value: "", label: selectedTenders ? "-Select Dataset-" : "-Select Tender First-" },
                    ...(Array.isArray(datasetOptions) ? datasetOptions : []),
                  ]}
                  option_value={"value"}
                  option_label={"label"}
                  onChange={(e) => {
                    if (handleDatasetSelect) {
                      handleDatasetSelect(e.target.value);
                    }
                  }}
                  value={selectedDatasetValue || ""}
                  disabled={!selectedTenders}
                />
                {/* Dataset List for Dragging */}
                {Array.isArray(datasetOptions) && datasetOptions.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">
                      Available Datasets ({datasetOptions.length}) - Drag to drop area:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {datasetOptions.map((dataset, idx) => {
                        const datasetValue = dataset.value || dataset.label || dataset;
                        const datasetLabel = dataset.label || dataset.value || dataset;
                        return (
                          <div
                            key={idx}
                            draggable={true}
                            onDragStart={(e) => {
                              console.log("[DRAG_DROP] Starting drag for:", dataset);
                              console.log("[DRAG_DROP] Dataset value:", datasetValue);
                              console.log("[DRAG_DROP] Dataset label:", datasetLabel);
                              if (handleDatasetDragStart) {
                                handleDatasetDragStart(e, dataset);
                              }
                            }}
                            onDragEnd={(e) => {
                              console.log("[DRAG_DROP] Ending drag, dropEffect:", e.dataTransfer?.dropEffect);
                              if (handleDatasetDragEnd) {
                                handleDatasetDragEnd(e);
                              }
                            }}
                            onMouseDown={(e) => {
                              // Don't prevent default - it interferes with drag
                              // Just allow normal drag behavior
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-move hover:bg-blue-200 active:bg-blue-300 text-sm select-none transition-colors"
                            style={{ 
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              MozUserSelect: "none",
                              msUserSelect: "none",
                              cursor: "grab"
                            }}
                            title={`Drag "${datasetLabel}" to the drop area`}
                          >
                            {datasetLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : selectedTenders ? (
                  <div className="mt-3">
                    <p className="text-xs text-yellow-600 mb-2">
                      No datasets available. Please wait for datasets to load or check if the tender has datasets configured.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Add Column */}
              <div className="control-group p-4 border rounded-lg bg-white">
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  Add Column
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <CustomSelect
                      label="Column"
                      data={[
                        { value: "", label: pendingDataset ? "-Select Column-" : "-Select Dataset First-" },
                        ...(Array.isArray(columnOptions) ? columnOptions : []),
                      ]}
                      option_value={"value"}
                      option_label={"label"}
                      onChange={(e) => {
                        if (handleColumnSelect) {
                          handleColumnSelect(e.target.value);
                        }
                      }}
                      value={selectedColumnValue || ""}
                      disabled={!pendingDataset || !selectedTenders || (Array.isArray(columnOptions) && columnOptions.length === 0)}
                    />
                  </div>
                  <div className="flex items-end">
                    <PrimaryButton
                      label="Add"
                      onClick={() => {
                        if (handleAddColumn) {
                          handleAddColumn();
                        }
                      }}
                      disabled={!selectedColumnValue || !pendingDataset}
                      style={{ minWidth: "80px" }}
                    />
                  </div>
                </div>
                {pendingDataset && Array.isArray(columnOptions) && columnOptions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Loading columns...</p>
                )}
              </div>

              {/* Add Operator */}
              <div className="control-group p-4 border rounded-lg bg-white">
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  Add Operator
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <CustomSelect
                      label="Operator"
                      data={[
                        { value: "", label: "-Select Operator-" },
                        ...(Array.isArray(operatorOptions) ? operatorOptions : []),
                      ]}
                      option_value={"value"}
                      option_label={"label"}
                      onChange={(e) => {
                        if (handleOperatorSelect) {
                          handleOperatorSelect(e.target.value);
                        }
                      }}
                      value={selectedOperatorValue || ""}
                    />
                  </div>
                  <div className="flex items-end">
                    <PrimaryButton
                      label="Add"
                      onClick={() => {
                        if (handleAddOperator) {
                          handleAddOperator();
                        }
                      }}
                      disabled={!selectedOperatorValue}
                      style={{ minWidth: "80px" }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Available: + (Add), - (Subtract), * (Multiply), / (Divide), = (Equals)
                </p>
              </div>

              {/* Add Number */}
              <div className="control-group p-4 border rounded-lg bg-white">
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  Add Number
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter a number"
                      value={selectedNumberValue || ""}
                      onChange={(e) => {
                        if (handleNumberChange) {
                          handleNumberChange(e.target.value);
                        }
                      }}
                      className="border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="flex items-end">
                    <PrimaryButton
                      label="Add"
                      onClick={() => {
                        if (handleAddNumber) {
                          handleAddNumber();
                        }
                      }}
                      disabled={!selectedNumberValue || isNaN(parseFloat(selectedNumberValue))}
                      style={{ minWidth: "80px" }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter any numeric value to add to the formula
                </p>
              </div>

              {/* Add Formula */}
              <div className="control-group p-4 border rounded-lg bg-white">
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  Add Existing Formula
                </label>
                <CustomSelect
                  label="Formula"
                  data={[
                    { value: "", label: "-Select Formula-" },
                    ...(Array.isArray(formulaOptions) ? formulaOptions : []),
                  ]}
                  option_value={"value"}
                  option_label={"label"}
                  onChange={(e) => {
                    const formula = e.target.value;
                    if (handleAddFormula && formula) {
                      handleAddFormula(formula);
                    }
                  }}
                  value=""
                  disabled={!selectedTenders || (Array.isArray(formulaOptions) && formulaOptions.length === 0)}
                />
                {!selectedTenders && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please select a tender first
                  </p>
                )}
                {Array.isArray(formulaOptions) && formulaOptions.length === 0 && selectedTenders && (
                  <p className="text-xs text-gray-500 mt-2">
                    No saved formulas found for this tender
                  </p>
                )}
                {Array.isArray(formulaOptions) && formulaOptions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {formulaOptions.length} saved formula(s) available
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <PrimaryButton
                label="Save Formula"
                onClick={() => {
                  if (handleSaveFormula) {
                    handleSaveFormula();
                  }
                }}
                disabled={!selectedTenders || (Array.isArray(currentFormula) && currentFormula.length === 0) || isSaving}
              />
              <PrimaryButton
                label="Clear Formula"
                onClick={() => {
                  if (handleClearFormula) {
                    handleClearFormula();
                  }
                }}
                disabled={Array.isArray(currentFormula) && currentFormula.length === 0}
                style={{ backgroundColor: "#dc3545" }}
              />
              <PrimaryButton
                label="Load Saved Formulas"
                onClick={() => {
                  if (handleLoadSavedFormulas) {
                    handleLoadSavedFormulas();
                  }
                }}
                disabled={!selectedTenders}
                style={{ backgroundColor: "#17a2b8" }}
              />
            </div>
          </div>
        </div>
      </BlankCard>
    </div>
  );
};

export default FormulaBuilder;


