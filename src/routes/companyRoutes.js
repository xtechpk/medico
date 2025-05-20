const express = require('express');
const router = express.Router();

const { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany } = require('../controllers/companyController'); // Import the controller
const { authenticate } = require('../middlewares/authmiddleware'); // Middleware for authentication

// POST: Register a new company for a medical store
router.post('/medical-stores/:medicalStoreId/company', authenticate, createCompany);

// GET: Get all companies for a medical store
router.get('/medical-stores/:medicalStoreId/companies', authenticate, getAllCompanies);

// GET: Get a company by ID for a medical store
router.get('/medical-stores/:medicalStoreId/companies/:id', authenticate, getCompanyById);

// PUT: Update a company for a medical store
router.put('/medical-stores/:medicalStoreId/companies/:id', authenticate, updateCompany);

// DELETE: Soft delete a company for a medical store
router.delete('/medical-stores/:medicalStoreId/companies/:id', authenticate, deleteCompany);

module.exports = router;