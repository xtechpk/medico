const express = require('express');
const { authenticate, authorize } = require('../middlewares/authmiddleware');
const {
  getMedicalStores,
  createMedicalStore,
} = require('../controllers/medicalStorecontroller');

const router = express.Router();

// Medical Store APIs
router.get('/allstores', authenticate, authorize(['SUPERADMIN', 'ADMIN']), getMedicalStores);
router.post('/store', authenticate, authorize(['ADMIN']), createMedicalStore);

module.exports = router;