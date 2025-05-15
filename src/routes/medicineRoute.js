const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

// Register a new medicine
router.post('/register', medicineController.registerMedicine);

// Get all medicines by medical store ID
router.get('/medical-stores/:medicalStoreId/medicines', medicineController.getMedicinesByMedicalStoreId);

// Add stock to an existing medicine
router.post('/stock', medicineController.addStock);

// Get all batches for a specific medicine
router.get('/medicines/:medicineId/batches', medicineController.getBatches);

// update medicien by using the medicineid or medicalstoreid
router.patch("/medical-stores/:medicalStoreId/medicines/:medicineId", medicineController.updateMedicine);

// Get all batches for a specific medicine and medical store
router.get('/medical-stores/:medicalStoreId/medicines/:medicineId/batches', medicineController.getBatchesByMedicalStoreAndMedicine);

// Sell medicine
router.post('/medical-stores/:medicalStoreId/medicines/:medicineId/sell', medicineController.sellMedicine);

// Return medicine
router.post('/medical-stores/:medicalStoreId/medicines/:medicineId/return', medicineController.returnMedicine);

// Get near-expiry medicines
router.get('/medical-stores/:medicalStoreId/medicines/near-expiry', medicineController.getNearExpiryMedicines);

// Get low-stock medicines
router.get('/medical-stores/:medicalStoreId/medicines/low-stock', medicineController.getLowStockMedicines);


module.exports = router;





// curl http://localhost:3000/api/medical-stores/2/medicines/near-expiry

// curl http://localhost:3000/api/medical-stores/2/medicines/low-stock