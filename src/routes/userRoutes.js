const express = require('express');
const { authenticate, authorize } = require('../middlewares/authmiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// Login Route
router.post('/login', userController.login);

// SuperAdmin APIs
router.post('/superadmin', userController.createSuperAdmin);
router.get('/superadmins', authenticate, userController.getAllSuperAdmins);
router.patch('/superadmins/:id', authenticate, userController.updateSuperAdminById);

// Admin APIs
router.post('/admin', authenticate, authorize(['SUPERADMIN']), userController.createAdmin);
router.get('/admins', authenticate, userController.getAllAdmins);
router.patch('/admins/:id', authenticate, userController.updateAdminById);

// Employee APIs
router.post('/employee', authenticate, authorize(['ADMIN']), userController.createEmployee);
router.get('/employees', authenticate, userController.getAllEmployees);
router.patch('/employees/:id', authenticate, userController.updateEmployeeById);


module.exports = router;