const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas de autenticación
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Rutas protegidas de autenticación
router.get('/validate', authController.validateToken);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;