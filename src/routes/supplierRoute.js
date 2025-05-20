const express = require('express');
const router = express.Router(); // Initialize router
const { 
  registerSupplier,
  getSuppliersByMedicalStore,
  getSupplierById,
  updateSupplier,
  deleteSupplier 
} = require('../controllers/supplierController'); // Adjust path as needed

// POST: Register a new supplier for a medical store
router.post('/medical-stores/:medicalStoreId/supplier', registerSupplier);

// GET: Get all suppliers for a medical store
router.get('/medical-stores/:medicalStoreId/suppliers', getSuppliersByMedicalStore);

// GET: Get a supplier by ID for a medical store
router.get('/medical-stores/:medicalStoreId/suppliers/:supplierId', getSupplierById);

// PUT: Update a supplier for a medical store
router.put('/medical-stores/:medicalStoreId/suppliers/:supplierId', updateSupplier);

// DELETE: Soft delete a supplier for a medical store
router.delete('/medical-stores/:medicalStoreId/suppliers/:supplierId', deleteSupplier);

module.exports = router;