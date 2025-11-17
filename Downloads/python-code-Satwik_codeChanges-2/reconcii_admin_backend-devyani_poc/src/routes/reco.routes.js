const express = require("express");
const router = express.Router();
const recoController = require("../controllers/reco.controller");
const path = require("path");

const posVsTrmController = require("../controllers/posvstrm.controller");
const devyaniController = require("../controllers/devyani.controller");

router.get(
  "/populate-threepo-dashboard",
  recoController.checkReconciliationStatus
);

// Generate reconciliation Excel file
router.post("/generate-excel", recoController.generateReconciliationExcel);

// Generate reconciliation Excel file
router.post(
  "/generate-receivable-receipt-excel",
  recoController.generateReceivableVsReceiptExcel
);

// Check Excel generation status
router.post("/generation-status", recoController.checkGenerationStatus);

router.post("/threePODashboardData", recoController.getThreePODashboardData);

router.post("/instore-data", recoController.getInstoreDashboardData);

router.post("/generate-common-trm", posVsTrmController.calculatePosVsTrm);

// Route to download generated Excel files
router.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, "../../reports", filename);

  res.download(filepath, filename, (err) => {
    if (err) {
      console.error("Error downloading file:", {
        error: err.message,
        code: err.code,
        path: filepath,
      });
      res.status(404).json({
        success: false,
        message: "File not found or error downloading",
        error: err.message,
      });
    }
  });
});

// Get all cities
router.get("/cities", devyaniController.getAllCities);

// Get stores by city_id
router.post("/stores", devyaniController.getStoresByCities);

// Get missing store mappings for 3PO
router.get("/public/threepo/missingStoreMappings", recoController.getMissingStoreMappings);

// ============================================================================
// FORMULA BUILDER ENDPOINTS
// ============================================================================

// Get tender list
router.get("/tenderList", recoController.getTenderList);

// Get tender-wise tables and columns
router.post("/tenderWisetables", recoController.getTenderWiseTables);

// Save recologics formulas
router.post("/recologics/save", recoController.saveRecologics);

// Get all recologics formulas
router.get("/recologics/getAll", recoController.getAllRecologics);

// Get recologics formulas by topic
router.get("/recologics/get", recoController.getRecologicsByTopic);

// Get datasource for mapping
router.get("/datasource", recoController.getDatasourceForMapping);

module.exports = router;
