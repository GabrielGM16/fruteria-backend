const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');

// Rutas de procesamiento de pagos
router.post('/tarjeta', pagosController.procesarPagoTarjeta);
router.get('/transaccion/:referencia', pagosController.verificarTransaccion);
router.post('/reembolso', pagosController.procesarReembolso);
router.get('/metodos', pagosController.getMetodosPago);

module.exports = router;