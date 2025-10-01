const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

// Rutas CRUD básicas
router.get('/', ventasController.getVentas);
router.get('/:id', ventasController.getVentaById);
router.post('/', ventasController.createVenta);

// Rutas específicas
router.get('/historial', ventasController.getHistorial);
router.get('/resumen/dia', ventasController.getResumenDia);

module.exports = router;