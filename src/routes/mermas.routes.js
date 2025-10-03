// src/routes/mermas.routes.js
const express = require('express');
const router = express.Router();
const mermasController = require('../controllers/mermasController');
const { validateId, validateDateParams } = require('../middleware/validator');

// Rutas específicas primero
router.get('/reportes', validateDateParams, mermasController.getReportes);

// Rutas CRUD básicas
router.get('/', mermasController.getMermas);
router.get('/:id', validateId, mermasController.getMermaById);
router.post('/', mermasController.createMerma);
router.put('/:id', validateId, mermasController.updateMerma);
router.delete('/:id', validateId, mermasController.deleteMerma);

module.exports = router;