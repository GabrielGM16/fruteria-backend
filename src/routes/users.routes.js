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

// Rutas específicas para administradores de usuarios
router.get('/admin/usuarios', requireAdmin, usersController.getAllUsersAdmin);
router.get('/admin/usuarios/stats', requireAdmin, usersController.getUserStats);
router.post('/admin/usuarios', requireAdmin, usersController.createUserAdmin);
router.put('/admin/usuarios/:id', requireAdmin, usersController.updateUserAdmin);
router.delete('/admin/usuarios/:id', requireAdmin, usersController.deleteUserAdmin);
router.patch('/admin/usuarios/:id/toggle-status', requireAdmin, usersController.toggleUserStatus);

// Obtener roles disponibles (solo admin puede ver todos los roles)
router.get('/admin/roles', requireAdmin, usersController.getRoles);

// Rutas existentes para compatibilidad
router.get('/roles', usersController.getRoles);
router.get('/', requirePermission('usuarios_lectura'), usersController.getAllUsers);
router.get('/:id', requirePermission('usuarios_lectura'), usersController.getUserById);
router.post('/', requireAdmin, usersController.createUser);
router.put('/:id', requireAdmin, usersController.updateUser);
router.delete('/:id', requireAdmin, usersController.deleteUser);
router.post('/:id/reset-password', requireAdmin, usersController.resetPassword);

module.exports = router;