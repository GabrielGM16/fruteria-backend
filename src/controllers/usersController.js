const bcrypt = require('bcryptjs');
const db = require('../config/database');

class UsersController {
  // Obtener todos los usuarios
  async getAllUsers(req, res) {
    try {
      const query = `
        SELECT u.id, u.username, u.nombre, u.email, u.activo, u.ultimo_login,
               u.created_at, u.updated_at,
               r.id as rol_id, r.nombre as rol, r.descripcion as rol_descripcion
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        ORDER BY u.created_at DESC
      `;

      const [users] = await db.execute(query);

      res.json({
        success: true,
        data: users
      });

    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener usuario por ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT u.id, u.username, u.nombre, u.email, u.activo, u.ultimo_login,
               u.created_at, u.updated_at,
               r.id as rol_id, r.nombre as rol, r.descripcion as rol_descripcion,
               r.permisos
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `;

      const [users] = await db.execute(query, [id]);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = users[0];
      user.permisos = JSON.parse(user.permisos);

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear nuevo usuario
  async createUser(req, res) {
    try {
      const { username, password, nombre, email, rol_id } = req.body;

      // Validar datos requeridos
      if (!username || !password || !nombre || !rol_id) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, nombre y rol son requeridos'
        });
      }

      // Validar longitud del password
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'El password debe tener al menos 6 caracteres'
        });
      }

      // Verificar que el username no exista
      const [existingUsers] = await db.execute(
        'SELECT id FROM usuarios WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El username ya existe'
        });
      }

      // Verificar que el rol exista
      const [roles] = await db.execute(
        'SELECT id FROM roles WHERE id = ? AND activo = true',
        [rol_id]
      );

      if (roles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido'
        });
      }

      // Encriptar password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insertar usuario
      const insertQuery = `
        INSERT INTO usuarios (username, password_hash, nombre, email, rol_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(insertQuery, [
        username,
        passwordHash,
        nombre,
        email || null,
        rol_id
      ]);

      // Obtener el usuario creado con su rol
      const [newUser] = await db.execute(`
        SELECT u.id, u.username, u.nombre, u.email, u.activo,
               r.nombre as rol
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: newUser[0]
      });

    } catch (error) {
      console.error('Error creando usuario:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'El username ya existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar usuario
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { nombre, email, rol_id, activo } = req.body;

      // Verificar que el usuario exista
      const [existingUsers] = await db.execute(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Construir query de actualización dinámicamente
      const updates = [];
      const values = [];

      if (nombre !== undefined) {
        updates.push('nombre = ?');
        values.push(nombre);
      }

      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email || null);
      }

      if (rol_id !== undefined) {
        // Verificar que el rol exista
        const [roles] = await db.execute(
          'SELECT id FROM roles WHERE id = ? AND activo = true',
          [rol_id]
        );

        if (roles.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Rol inválido'
          });
        }

        updates.push('rol_id = ?');
        values.push(rol_id);
      }

      if (activo !== undefined) {
        updates.push('activo = ?');
        values.push(activo);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay datos para actualizar'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const updateQuery = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(updateQuery, values);

      // Obtener el usuario actualizado
      const [updatedUser] = await db.execute(`
        SELECT u.id, u.username, u.nombre, u.email, u.activo,
               r.nombre as rol
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser[0]
      });

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar usuario (soft delete)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Verificar que el usuario exista
      const [existingUsers] = await db.execute(
        'SELECT id, username FROM usuarios WHERE id = ?',
        [id]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // No permitir eliminar el usuario admin principal
      if (existingUsers[0].username === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el usuario administrador principal'
        });
      }

      // Soft delete - marcar como inactivo
      await db.execute(
        'UPDATE usuarios SET activo = false, updated_at = NOW() WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener todos los roles disponibles
  async getRoles(req, res) {
    try {
      const [roles] = await db.execute(
        'SELECT id, nombre, descripcion FROM roles WHERE activo = true ORDER BY nombre'
      );

      res.json({
        success: true,
        data: roles
      });

    } catch (error) {
      console.error('Error obteniendo roles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Resetear password de usuario
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'El nuevo password debe tener al menos 6 caracteres'
        });
      }

      // Verificar que el usuario exista
      const [existingUsers] = await db.execute(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Encriptar nuevo password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar password
      await db.execute(
        'UPDATE usuarios SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [passwordHash, id]
      );

      res.json({
        success: true,
        message: 'Password reseteado exitosamente'
      });

    } catch (error) {
      console.error('Error reseteando password:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new UsersController();