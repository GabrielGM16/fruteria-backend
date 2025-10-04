const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { 
  authenticateToken, 
  requireAdmin, 
  requireAdminOrOwner,
  requirePermission 
} = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener roles disponibles (todos los usuarios autenticados pueden ver roles)
router.get('/roles', usersController.getRoles);

// Rutas que requieren permisos de lectura de usuarios
router.get('/', requirePermission('usuarios_lectura'), usersController.getAllUsers);
router.get('/:id', requirePermission('usuarios_lectura'), usersController.getUserById);

// Rutas que requieren permisos de escritura de usuarios (solo admin)
router.post('/', requireAdmin, usersController.createUser);
router.put('/:id', requireAdmin, usersController.updateUser);
router.delete('/:id', requireAdmin, usersController.deleteUser);
router.post('/:id/reset-password', requireAdmin, usersController.resetPassword);

module.exports = router;