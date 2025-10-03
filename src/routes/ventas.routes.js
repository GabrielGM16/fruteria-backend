// src/routes/ventas.routes.js
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');
const { validateDateParams, validateId } = require('../middleware/validator');

// Rutas específicas primero (antes de las rutas con parámetros)
router.get('/historial', validateDateParams, ventasController.getHistorial);
router.get('/resumen/dia', ventasController.getResumenDia);

// Rutas CRUD básicas
router.get('/', ventasController.getVentas);
router.get('/:id', validateId, ventasController.getVentaById);
router.post('/', ventasController.createVenta);
router.post('/:id/anular', validateId, ventasController.anularVenta);

module.exports = router;