const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// Rutas CRUD básicas
router.get('/', productosController.getProductos);
router.get('/:id', productosController.getProductoById);
router.post('/', productosController.createProducto);
router.put('/:id', productosController.updateProducto);
router.delete('/:id', productosController.deleteProducto);

// Rutas específicas para inventario
router.put('/:id/stock', productosController.updateStock);
router.get('/inventario/alertas', productosController.getAlertas);

module.exports = router;