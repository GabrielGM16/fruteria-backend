const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_2024';

// Middleware para verificar autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuario en la base de datos para verificar que sigue activo
    const query = `
      SELECT u.id, u.username, u.nombre, u.activo,
             r.nombre as rol, r.permisos
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ? AND u.activo = true
    `;

    const [users] = await db.execute(query, [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    const user = users[0];
    
    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
      permisos: JSON.parse(user.permisos)
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar permisos específicos
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userPermissions = req.user.permisos;

    // Verificar si el usuario tiene el permiso específico
    if (!userPermissions[permission]) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  // Convertir a array si es un string
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes el rol necesario para realizar esta acción'
      });
    }

    next();
  };
};

// Middleware para verificar si es admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador'
    });
  }

  next();
};

// Middleware para verificar si es admin o dueño
const requireAdminOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (!['admin', 'dueño'].includes(req.user.rol)) {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador o propietario'
    });
  }

  next();
};

// Middleware para verificar permisos de lectura/escritura
const requireReadPermission = (module) => {
  return requirePermission(`${module}_lectura`);
};

const requireWritePermission = (module) => {
  return requirePermission(`${module}_escritura`);
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const query = `
      SELECT u.id, u.username, u.nombre, u.activo,
             r.nombre as rol, r.permisos
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ? AND u.activo = true
    `;

    const [users] = await db.execute(query, [decoded.id]);

    if (users.length > 0) {
      const user = users[0];
      req.user = {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        rol: user.rol,
        permisos: JSON.parse(user.permisos)
      };
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  requireAdmin,
  requireAdminOrOwner,
  requireReadPermission,
  requireWritePermission,
  optionalAuth
};