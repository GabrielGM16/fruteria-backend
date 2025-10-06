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

  // ===== MÉTODOS ESPECÍFICOS PARA ADMIN DE USUARIOS =====

  // Obtener todos los usuarios con paginación y filtros para admin
  async getAllUsersAdmin(req, res) {
    try {
      // Obtener parámetros y asegurar que sean strings
      const page = String(req.query.page || '1');
      const limit = String(req.query.limit || '25');
      const search = String(req.query.search || '');
      const rol_id = String(req.query.rol_id || '');
      const activo = String(req.query.activo || '');

      // Convertir a enteros y validar
      let pageNum = Number(page);
      let limitNum = Number(limit);
      
      // Validar que sean números válidos
      if (!Number.isInteger(pageNum) || pageNum < 1) {
        pageNum = 1;
      }
      
      if (!Number.isInteger(limitNum) || limitNum < 1) {
        limitNum = 25;
      }
      
      // Limitar el máximo de registros por página
      if (limitNum > 100) {
        limitNum = 100;
      }
      
      // Calcular offset - asegurar que sea un entero
      const offset = Math.floor((pageNum - 1) * limitNum);

      let whereConditions = [];
      let queryParams = [];

      // Construir condiciones WHERE dinámicamente
      if (search.trim()) {
        whereConditions.push('(u.username LIKE ? OR u.nombre LIKE ? OR u.email LIKE ?)');
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (rol_id.trim()) {
        const rolIdNum = parseInt(rol_id, 10);
        if (!isNaN(rolIdNum)) {
          whereConditions.push('u.rol_id = ?');
          queryParams.push(rolIdNum);
        }
      }

      if (activo.trim() !== '') {
        whereConditions.push('u.activo = ?');
        queryParams.push(activo === 'true' ? 1 : 0);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query para obtener usuarios con paginación
      // IMPORTANTE: No usar placeholders para LIMIT/OFFSET, insertarlos directamente
      const usersQuery = `
        SELECT u.id, u.username, u.nombre, u.email, u.activo, u.ultimo_login,
               u.created_at, u.updated_at,
               r.id as rol_id, r.nombre as rol_nombre, r.descripcion as rol_descripcion
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      // Query para contar total de usuarios
      const countQuery = `
        SELECT COUNT(*) as total
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.id
        ${whereClause}
      `;

      console.log('=== DEBUG QUERY ===');
      console.log('Page:', pageNum, 'Limit:', limitNum, 'Offset:', offset);
      console.log('Query params:', queryParams);
      console.log('SQL Query:', usersQuery);
      
      // Ejecutar queries - SOLO con los parámetros del WHERE
      const [users] = await db.execute(usersQuery, queryParams);
      const [countResult] = await db.execute(countQuery, queryParams);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: users,
        pagination: {
          total,
          pages: totalPages,
          current: pageNum,
          limit: limitNum
        }
      });

    } catch (error) {
      console.error('Error obteniendo usuarios para admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas de usuarios para dashboard admin
  async getUserStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_usuarios,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as usuarios_activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as usuarios_inactivos,
          COUNT(DISTINCT rol_id) as total_roles
        FROM usuarios
      `;

      const roleStatsQuery = `
        SELECT r.nombre as rol, COUNT(u.id) as cantidad
        FROM roles r
        LEFT JOIN usuarios u ON r.id = u.rol_id
        WHERE r.activo = 1
        GROUP BY r.id, r.nombre
        ORDER BY cantidad DESC
      `;

      const [statsResult] = await db.execute(statsQuery);
      const [roleStats] = await db.execute(roleStatsQuery);

      res.json({
        success: true,
        data: {
          general: statsResult[0],
          por_rol: roleStats
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Crear usuario específicamente para admin
  async createUserAdmin(req, res) {
    try {
      const { username, password, nombre, email, rol_id, activo = true } = req.body;

      // Validaciones más estrictas para admin
      if (!username || !password || !nombre || !rol_id) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, nombre y rol son requeridos'
        });
      }

      // Validar formato de username
      if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'El username debe tener entre 3-50 caracteres alfanuméricos'
        });
      }

      // Validar fortaleza de contraseña
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres'
        });
      }

      // Validar email si se proporciona
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de email inválido'
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

      // Verificar que el email no exista (si se proporciona)
      if (email) {
        const [existingEmails] = await db.execute(
          'SELECT id FROM usuarios WHERE email = ?',
          [email]
        );

        if (existingEmails.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'El email ya está registrado'
          });
        }
      }

      // Verificar que el rol exista y esté activo
      const [roles] = await db.execute(
        'SELECT id, nombre FROM roles WHERE id = ? AND activo = true',
        [rol_id]
      );

      if (roles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido o inactivo'
        });
      }

      // Encriptar password con salt más fuerte
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insertar usuario
      const insertQuery = `
        INSERT INTO usuarios (username, password_hash, nombre, email, rol_id, activo)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(insertQuery, [
        username,
        passwordHash,
        nombre,
        email || null,
        rol_id,
        activo
      ]);

      // Obtener el usuario creado con información completa
      const [newUser] = await db.execute(`
        SELECT u.id, u.username, u.nombre, u.email, u.activo, u.created_at,
               r.id as rol_id, r.nombre as rol_nombre, r.descripcion as rol_descripcion
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: newUser[0]
      });

    } catch (error) {
      console.error('Error creando usuario (admin):', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'El username o email ya existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar usuario específicamente para admin
  async updateUserAdmin(req, res) {
    try {
      const { id } = req.params;
      const { username, nombre, email, rol_id, activo, password } = req.body;

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

      // Prevenir modificación del usuario admin principal
      if (existingUsers[0].username === 'admin' && req.user.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede modificar el usuario administrador principal'
        });
      }

      // Construir query de actualización dinámicamente
      const updates = [];
      const values = [];

      if (username !== undefined) {
        // Validar formato de username
        if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
          return res.status(400).json({
            success: false,
            message: 'El username debe tener entre 3-50 caracteres alfanuméricos'
          });
        }

        // Verificar que el username no exista en otro usuario
        const [duplicateUsers] = await db.execute(
          'SELECT id FROM usuarios WHERE username = ? AND id != ?',
          [username, id]
        );

        if (duplicateUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'El username ya existe'
          });
        }

        updates.push('username = ?');
        values.push(username);
      }

      if (nombre !== undefined) {
        if (!nombre.trim()) {
          return res.status(400).json({
            success: false,
            message: 'El nombre no puede estar vacío'
          });
        }
        updates.push('nombre = ?');
        values.push(nombre.trim());
      }

      if (email !== undefined) {
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({
            success: false,
            message: 'Formato de email inválido'
          });
        }

        // Verificar que el email no exista en otro usuario
        if (email) {
          const [duplicateEmails] = await db.execute(
            'SELECT id FROM usuarios WHERE email = ? AND id != ?',
            [email, id]
          );

          if (duplicateEmails.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'El email ya está registrado'
            });
          }
        }

        updates.push('email = ?');
        values.push(email || null);
      }

      if (rol_id !== undefined) {
        // Verificar que el rol exista y esté activo
        const [roles] = await db.execute(
          'SELECT id FROM roles WHERE id = ? AND activo = true',
          [rol_id]
        );

        if (roles.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Rol inválido o inactivo'
          });
        }

        updates.push('rol_id = ?');
        values.push(rol_id);
      }

      if (activo !== undefined) {
        // Prevenir desactivación del usuario admin principal
        if (existingUsers[0].username === 'admin' && !activo) {
          return res.status(400).json({
            success: false,
            message: 'No se puede desactivar el usuario administrador principal'
          });
        }

        updates.push('activo = ?');
        values.push(activo);
      }

      // Manejar cambio de contraseña
      if (password !== undefined && password.trim()) {
        if (password.length < 8) {
          return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 8 caracteres'
          });
        }

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        updates.push('password_hash = ?');
        values.push(passwordHash);
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

      // Obtener el usuario actualizado con información completa
      const [updatedUser] = await db.execute(`
        SELECT u.id, u.username, u.nombre, u.email, u.activo, u.updated_at,
               r.id as rol_id, r.nombre as rol_nombre, r.descripcion as rol_descripcion
        FROM usuarios u
        INNER JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser[0]
      });

    } catch (error) {
      console.error('Error actualizando usuario (admin):', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Eliminar usuario específicamente para admin
  async deleteUserAdmin(req, res) {
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

      // Prevenir eliminación del usuario admin principal
      if (existingUsers[0].username === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el usuario administrador principal'
        });
      }

      // Prevenir auto-eliminación
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propio usuario'
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
      console.error('Error eliminando usuario (admin):', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Alternar estado activo/inactivo de usuario
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      // Verificar que el usuario exista
      const [existingUsers] = await db.execute(
        'SELECT id, username, activo FROM usuarios WHERE id = ?',
        [id]
      );

      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = existingUsers[0];

      // Prevenir desactivación del usuario admin principal
      if (user.username === 'admin' && user.activo) {
        return res.status(400).json({
          success: false,
          message: 'No se puede desactivar el usuario administrador principal'
        });
      }

      // Prevenir auto-desactivación
      if (parseInt(id) === req.user.id && user.activo) {
        return res.status(400).json({
          success: false,
          message: 'No puedes desactivar tu propio usuario'
        });
      }

      const newStatus = !user.activo;

      await db.execute(
        'UPDATE usuarios SET activo = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );

      res.json({
        success: true,
        message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
        data: { activo: newStatus }
      });

    } catch (error) {
      console.error('Error alternando estado de usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new UsersController();