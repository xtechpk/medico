const express = require('express');
const router = express.Router();
const { createCompany , getCompaniesByMedicalStoreId, updateCompany} = require('../controllers/companyController'); // Import the controller
const { authenticate } = require('../middlewares/authmiddleware'); // Middleware for authentication

// POST: Register a new company
router.post('/register', authenticate, createCompany);

// GET: Get all companies
router.get('/by-medical-store/:medicalStoreId', authenticate, getCompaniesByMedicalStoreId);

router.patch('/companybyid/:id', authenticate, updateCompany);


module.exports = router;