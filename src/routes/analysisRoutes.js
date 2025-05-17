const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');


// Get daily sales analysis
router.get('/medical-stores/:medicalStoreId/sales-analysis/daily', analysisController.getDailySalesAnalysis);

// Get weekly sales analysis
router.get('/medical-stores/:medicalStoreId/sales-analysis/weekly', analysisController.getWeeklySalesAnalysis);

// Get monthly sales analysis
router.get('/medical-stores/:medicalStoreId/sales-analysis/monthly', analysisController.getMonthlySalesAnalysis);

// Get yearly sales analysis
router.get('/medical-stores/:medicalStoreId/sales-analysis/yearly', analysisController.getYearlySalesAnalysis);

// Get custom sales analysis
router.get('/medical-stores/:medicalStoreId/sales-analysis/custom', analysisController.getCustomSalesAnalysis);

module.exports = router;





// curl http://localhost:3000/api/medical-stores/2/medicines/near-expiry

// curl http://localhost:3000/api/medical-stores/2/medicines/low-stock