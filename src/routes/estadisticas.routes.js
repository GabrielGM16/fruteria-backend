// src/routes/estadisticas.routes.js
const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');
const { validateDateParams } = require('../middleware/validator');

// Rutas de estadísticas
router.get('/ventas', validateDateParams, estadisticasController.getEstadisticasVentas);
router.get('/productos', estadisticasController.getEstadisticasProductos);
router.get('/dashboard', estadisticasController.getDashboard);
router.get('/resumen', validateDateParams, estadisticasController.getResumenGeneral);
router.get('/top-productos', validateDateParams, estadisticasController.getTopProductos);
router.get('/metodos-pago', validateDateParams, estadisticasController.getVentasPorMetodoPago);

module.exports = router;