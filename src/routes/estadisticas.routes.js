const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');

// Rutas de estadísticas
router.get('/ventas', estadisticasController.getEstadisticasVentas);
router.get('/productos', estadisticasController.getEstadisticasProductos);
router.get('/dashboard', estadisticasController.getDashboard);
router.get('/resumen', estadisticasController.getResumenGeneral);

module.exports = router;