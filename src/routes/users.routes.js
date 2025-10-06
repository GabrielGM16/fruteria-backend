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
// Admin y Dueño pueden listar usuarios y ver estadísticas
router.get('/admin/usuarios', requireAdminOrOwner, usersController.getAllUsersAdmin);
router.get('/admin/usuarios/stats', requireAdminOrOwner, usersController.getUserStats);

// Admin y Dueño pueden crear usuarios (dueño solo vendedores, validado en backend)
router.post('/admin/usuarios', requireAdminOrOwner, usersController.createUserAdmin);

// Admin y Dueño pueden actualizar usuarios (dueño solo vendedores, validado en backend)
router.put('/admin/usuarios/:id', requireAdminOrOwner, usersController.updateUserAdmin);

// Solo Admin puede eliminar usuarios
router.delete('/admin/usuarios/:id', requireAdmin, usersController.deleteUserAdmin);

// Admin y Dueño pueden cambiar estado de usuarios (dueño solo vendedores, validado en backend)
router.patch('/admin/usuarios/:id/toggle-status', requireAdminOrOwner, usersController.toggleUserStatus);

// Obtener roles disponibles (admin y dueño)
router.get('/admin/roles', requireAdminOrOwner, usersController.getRoles);

// Rutas existentes para compatibilidad
router.get('/roles', usersController.getRoles);
router.get('/', requirePermission('usuarios_lectura'), usersController.getAllUsers);
router.get('/:id', requirePermission('usuarios_lectura'), usersController.getUserById);
router.post('/', requireAdmin, usersController.createUser);
router.put('/:id', requireAdmin, usersController.updateUser);
router.delete('/:id', requireAdmin, usersController.deleteUser);
router.post('/:id/reset-password', requireAdmin, usersController.resetPassword);

module.exports = router;