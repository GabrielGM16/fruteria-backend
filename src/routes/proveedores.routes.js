// src/routes/proveedores.routes.js
const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedoresController');
const { authenticateToken } = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// Rutas para proveedores
router.get('/', (req, res, next) => {
  console.log('🔍 GET /proveedores route hit');
  proveedoresController.getProveedores(req, res, next);
});
router.get('/activos', (req, res, next) => {
  console.log('🔍 GET /proveedores/activos route hit');
  proveedoresController.getProveedoresActivos(req, res, next);
});
router.get('/stats', (req, res, next) => {
  console.log('🔍 GET /proveedores/stats route hit');
  proveedoresController.getProveedoresStats(req, res, next);
});
router.get('/:id', (req, res, next) => {
  console.log('🔍 GET /proveedores/:id route hit');
  proveedoresController.getProveedorById(req, res, next);
});
router.post('/', (req, res, next) => {
  console.log('🔍 POST /proveedores route hit');
  proveedoresController.createProveedor(req, res, next);
});
router.put('/:id', (req, res, next) => {
  console.log('🔍 PUT /proveedores/:id route hit');
  proveedoresController.updateProveedor(req, res, next);
});
router.delete('/:id', (req, res, next) => {
  console.log('🔍 DELETE /proveedores/:id route hit');
  proveedoresController.deleteProveedor(req, res, next);
});

module.exports = router;