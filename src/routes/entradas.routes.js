// src/routes/entradas.routes.js
const express = require('express');
const router = express.Router();
const entradasController = require('../controllers/entradasController');
const { validateId, validateDateParams } = require('../middleware/validator');

// Rutas específicas primero
router.get('/proveedores', entradasController.getProveedores);

// Rutas CRUD básicas
router.get('/', entradasController.getEntradas);
router.get('/:id', validateId, entradasController.getEntradaById);
router.post('/', entradasController.createEntrada);
router.put('/:id', validateId, entradasController.updateEntrada);
router.delete('/:id', validateId, entradasController.deleteEntrada);

module.exports = router;