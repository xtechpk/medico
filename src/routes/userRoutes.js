const express = require('express');
const { authenticate, authorize } = require('../middlewares/authmiddleware');
const {
  createSuperAdmin,
  getAllSuperAdmins,
  updateSuperAdminById,

  createAdmin,
  getAllAdmins,
  updateAdminById,

  createEmployee,
  getAllEmployees,
  updateEmployeeById,

  login
} = require('../controllers/userController');

const router = express.Router();

// Login Route
router.post('/login', login);

// SuperAdmin APIs
router.post('/superadmin', createSuperAdmin);
router.get('/superadmins', authenticate,  getAllSuperAdmins);

router.patch('/superadmins/:id', authenticate, updateSuperAdminById);

// Admin APIs
router.post('/admin', authenticate, authorize(['SUPERADMIN']), createAdmin);
router.get('/admins', authenticate,  getAllAdmins);
router.patch('/admins/:id',authenticate, updateAdminById);

// Employee APIs
router.post('/employee', authenticate, authorize(['ADMIN']), createEmployee);
router.get('/employees', authenticate, getAllEmployees);
router.patch('/employees/:id',authenticate, updateEmployeeById);

module.exports = router;