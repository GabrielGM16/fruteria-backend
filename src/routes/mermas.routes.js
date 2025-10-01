const express = require('express');
const router = express.Router();
const mermasController = require('../controllers/mermasController');

// Rutas CRUD básicas
router.get('/', mermasController.getMermas);
router.get('/:id', mermasController.getMermaById);
router.post('/', mermasController.createMerma);
router.put('/:id', mermasController.updateMerma);
router.delete('/:id', mermasController.deleteMerma);

// Rutas específicas
router.get('/reportes', mermasController.getReportes);

module.exports = router;