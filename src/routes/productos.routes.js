// src/routes/productos.routes.js
const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { validateId, validateStock } = require('../middleware/validator');

// Rutas específicas primero
router.get('/alertas', productosController.getAlertas);

// Rutas CRUD básicas
router.get('/', productosController.getProductos);
router.get('/:id', validateId, productosController.getProductoById);
router.post('/', productosController.createProducto);
router.put('/:id', validateId, productosController.updateProducto);
router.delete('/:id', validateId, productosController.deleteProducto);

// Rutas específicas para inventario
router.put('/:id/stock', validateId, validateStock, productosController.updateStock);

module.exports = router;