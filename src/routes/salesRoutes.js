const express = require('express');
const router = express.Router();
const { createSale, getAllSoldItems } = require('../controllers/salesController');

router.post('/sale', createSale);
router.get('/sale', getAllSoldItems);




module.exports = router;



