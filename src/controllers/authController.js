const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthController {
  // Login de usuario
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validar datos requeridos
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username y password son requeridos'
        });
      }

      // Buscar usuario con su rol
      const query = `
        SELECT u.id, u.username, u.password_hash, u.nombre, u.email, u.activo,
               r.nombre as rol, r.permisos
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.username = ? AND u.activo = true
      `;

      const [users] = await db.execute(query, [username]);

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const user = users[0];

      // Verificar password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Actualizar último login
      await db.execute(
        'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
        [user.id]
      );

      // Generar JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          rol: user.rol,
          permisos: JSON.parse(user.permisos)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Respuesta exitosa
      res.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          username: user.username,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          permisos: JSON.parse(user.permisos)
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Validar token JWT
  async validateToken(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          valid: false,
          message: 'Token no proporcionado'
        });
      }

      // Verificar token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Buscar usuario actualizado en la base de datos
      const query = `
        SELECT u.id, u.username, u.nombre, u.email, u.activo,
               r.nombre as rol, r.permisos
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ? AND u.activo = true
      `;

      const [users] = await db.execute(query, [decoded.id]);

      if (users.length === 0) {
        return res.status(401).json({
          valid: false,
          message: 'Usuario no encontrado o inactivo'
        });
      }

      const user = users[0];

      res.json({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          permisos: JSON.parse(user.permisos)
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          valid: false,
          message: 'Token inválido'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          valid: false,
          message: 'Token expirado'
        });
      }

      console.error('Error validando token:', error);
      res.status(500).json({
        valid: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Cambiar password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validar datos
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password actual y nuevo son requeridos'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'El nuevo password debe tener al menos 6 caracteres'
        });
      }

      // Buscar usuario
      const [users] = await db.execute(
        'SELECT password_hash FROM usuarios WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar password actual
      const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Password actual incorrecto'
        });
      }

      // Encriptar nuevo password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar password
      await db.execute(
        'UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
      );

      res.json({
        success: true,
        message: 'Password actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error cambiando password:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Logout (opcional - para invalidar token del lado del cliente)
  async logout(req, res) {
    try {
      // En una implementación más avanzada, podrías mantener una lista negra de tokens
      // Por ahora, simplemente confirmamos el logout
      res.json({
        success: true,
        message: 'Logout exitoso'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new AuthController();