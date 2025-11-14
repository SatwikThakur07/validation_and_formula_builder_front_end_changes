import React, { useEffect, useRef, useState } from "react";
import BlankCard from "../../../components/BlankCard";
import PrimaryButton from "../../../components/PrimaryButton";
import ColumnValidationModal from "../../../components/ColumnValidationModal";

import { FileUploader } from "react-drag-drop-files";

// const fileTypes = ["JPG", "PNG", "GIF"];
import "./upload.style.css";
import CustomSelect from "../../../components/CustomSelect";
import useUploads from "./useUploads";

const BLANK_PAYMENT_TYPE = [{ type: "-Select Payment Type-", dataSource: "" }];

export default function Uploads() {
  const {
    dataSource,
    values,
    handleChange,
    paymentTypeList,
    handleFileChange,
    onSubmit,
    files,
    clientOptions,
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
  } = useUploads();

  return (
    <div className="">
      <BlankCard header={<h4 className="box-title font-bold text-base">UPLOAD</h4>}>
        <div className="pt-3 w-full">
          <div className="md:w-1/3 mb-3">
            <CustomSelect
              label="Client"
              required
              data={[{ value: "-Select Client-", label: "-Select Client-" }, ...clientOptions]}
              option_value={"value"}
              option_label={"label"}
              onChange={(e) => handleChange("client", e.target.value)}
              value={values?.client || ""}
            />
          </div>
          <div className="md:w-1/3 mb-3">
            <CustomSelect
              label="Type"
              data={[{ category: "-Select Type-" }, ...(Array.isArray(dataSource) ? dataSource : [])]}
              option_value={"category"}
              option_label={"category"}
              onChange={(e) => {
                console.log("[UPLOADS] Type changed to:", e.target.value);
                handleChange("type", e.target.value);
              }}
              value={values?.type || ""}
              required
              disabled={!values?.client}
            />
          </div>
          <div className="md:w-1/3 mb-3">
            <CustomSelect
              label="Tender"
              required
              data={[
                { tender: "-Select Tender-", types: [] },
                ...(Array.isArray(dataSource) && values?.type
                  ? (dataSource.find((item) => item.category === values.type)?.tenders || [])
                  : []),
              ]}
              option_value={"tender"}
              option_label={"tender"}
              onChange={(e) => {
                console.log("[UPLOADS] Tender changed to:", e.target.value);
                handleChange("tender", e.target.value);
              }}
              value={values?.tender || ""}
              disabled={!values?.type || !values?.client}
            />
          </div>
          <div className="md:w-1/3 mb-3">
            <CustomSelect
              label="Payment"
              required
              data={Array.isArray(paymentTypeList) ? paymentTypeList : BLANK_PAYMENT_TYPE}
              option_value={"dataSource"}
              option_label={"type"}
              onChange={(e) => {
                console.log("[UPLOADS] Payment changed to:", e.target.value);
                handleChange("payment", e.target.value);
              }}
              value={values?.payment || ""}
              disabled={!values?.tender || !values?.type || !values?.client}
            />
          </div>
          <div className="custom-file-picker">
            <FileUploader
              handleChange={handleFileChange}
              name="file"
              types={["XLSX", "XLS", "CSV", "TSV", "xlsx", "xls", "csv", "tsv"]}
              multiple={true}
              maxSize={400}
              minSize={0}
              onTypeError={(err) => {
                console.error("[FileUploader] Type error:", err);
                setToastMessage({
                  message: "Invalid file type. Please upload .xlsx, .xls, .csv, or .tsv files.",
                  type: "error",
                });
              }}
              onSizeError={(err) => {
                console.error("[FileUploader] Size error:", err);
                setToastMessage({
                  message: "File too large. Maximum size is 400MB.",
                  type: "error",
                });
              }}
              onDrop={(fileList) => {
                console.log("[FileUploader] onDrop called with:", fileList);
              }}
            >
              <div className="drag-drop-component">
                <i
                  className="fas fa-file-alt"
                  style={{ fontSize: "30px", marginBottom: "15px" }}
                ></i>
                <p>Drag & Drop your files here</p>
                <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
                  Supported: .xlsx, .xls, .csv, .tsv (Max 400MB)
                </p>
              </div>
            </FileUploader>
            {files && files.length > 0 && (
              <div className="mt-3">
                <div className="flex gap-2 flex-wrap">
                  {files.map((file, index) => {
                    const fileName = file?.name || file?.filename || `File ${index + 1}`;
                    const fileSize = file?.size ? `${(file.size / 1024).toFixed(2)} KB` : '';
                    return (
                      <div key={index} className="added-file-list" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <i className="fas fa-file-excel" style={{ color: "#28a745" }}></i>
                        <div>
                          <p style={{ margin: 0, fontWeight: "500" }}>{fileName}</p>
                          {fileSize && (
                            <span style={{ fontSize: "11px", color: "#666" }}>
                              {fileSize}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setFiles([]);
                    setIsUploadSuccessful(false);
                    setUploadedFileIds([]);
                  }}
                  style={{
                    marginTop: "10px",
                    padding: "5px 10px",
                    fontSize: "12px",
                    color: "#dc3545",
                    background: "transparent",
                    border: "1px solid #dc3545",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Clear Files
                </button>
              </div>
            )}
          </div>
          <div className="md:w-1/3 mt-3 flex gap-3">
            <PrimaryButton label="Upload" onClick={onSubmit} />
            <PrimaryButton
              label="Validate"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onValidate(null); // Explicitly pass null, not the event
              }}
              disabled={(!isUploadSuccessful && (!files || files.length === 0)) || !values?.payment || !values?.client}
            />
          </div>
        </div>
      </BlankCard>

      {/* Column Validation Modal */}
      <ColumnValidationModal
        isOpen={isValidationModalOpen}
        onClose={closeValidationModal}
        validationData={validationData}
        onSave={(mappings) => onValidate(mappings)}
        isLoading={isValidationLoading}
      />
    </div>
  );
}
