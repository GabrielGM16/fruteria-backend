// src/models/proveedoresQueries.js
const pool = require('../config/database');

const proveedoresQueries = {
  // Obtener todos los proveedores con filtros opcionales
  getProveedores: async (filters = {}) => {
    let query = `
      SELECT 
        id,
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo,
        created_at,
        updated_at
      FROM proveedores 
      WHERE 1=1
    `;
    const params = [];

    // Filtro por estado activo/inactivo
    if (filters.activo !== undefined) {
      query += ' AND activo = ?';
      params.push(filters.activo === 'true' || filters.activo === true);
    }

    // Filtro de búsqueda por nombre, contacto, email o productos
    if (filters.search && filters.search.trim() !== '') {
      query += ` AND (
        nombre LIKE ? OR 
        contacto LIKE ? OR 
        email LIKE ? OR 
        productos_suministrados LIKE ? OR
        rfc LIKE ?
      )`;
      const searchTerm = `%${filters.search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY nombre ASC';

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Obtener un proveedor por ID
  getProveedorById: async (id) => {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo,
        created_at,
        updated_at
      FROM proveedores 
      WHERE id = ?`,
      [id]
    );
    return rows[0];
  },

  // Crear un nuevo proveedor
  createProveedor: async (proveedorData) => {
    const {
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      rfc,
      productos_suministrados,
      notas,
      activo
    } = proveedorData;

    const [result] = await pool.execute(
      `INSERT INTO proveedores (
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo
      ]
    );

    // Obtener el proveedor recién creado
    return await proveedoresQueries.getProveedorById(result.insertId);
  },

  // Actualizar un proveedor
  updateProveedor: async (id, proveedorData) => {
    const {
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      rfc,
      productos_suministrados,
      notas,
      activo
    } = proveedorData;

    await pool.execute(
      `UPDATE proveedores SET 
        nombre = ?,
        contacto = ?,
        telefono = ?,
        email = ?,
        direccion = ?,
        rfc = ?,
        productos_suministrados = ?,
        notas = ?,
        activo = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo,
        id
      ]
    );

    // Obtener el proveedor actualizado
    return await proveedoresQueries.getProveedorById(id);
  },

  // Eliminar un proveedor (hard delete - usar con precaución)
  deleteProveedor: async (id) => {
    const [result] = await pool.execute(
      'DELETE FROM proveedores WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Obtener proveedores activos para selects/dropdowns
  getProveedoresActivos: async () => {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        nombre,
        contacto,
        telefono,
        email
      FROM proveedores 
      WHERE activo = TRUE 
      ORDER BY nombre ASC`
    );
    return rows;
  },

  // Buscar proveedor por nombre exacto
  getProveedorByNombre: async (nombre) => {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo,
        created_at,
        updated_at
      FROM proveedores 
      WHERE nombre = ?`,
      [nombre]
    );
    return rows[0];
  },

  // Buscar proveedor por RFC
  getProveedorByRFC: async (rfc) => {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        nombre,
        contacto,
        telefono,
        email,
        direccion,
        rfc,
        productos_suministrados,
        notas,
        activo,
        created_at,
        updated_at
      FROM proveedores 
      WHERE rfc = ?`,
      [rfc]
    );
    return rows[0];
  },

  // Obtener estadísticas de proveedores
  getProveedoresStats: async () => {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_proveedores,
        SUM(CASE WHEN activo = TRUE THEN 1 ELSE 0 END) as proveedores_activos,
        SUM(CASE WHEN activo = FALSE THEN 1 ELSE 0 END) as proveedores_inactivos,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as nuevos_ultimo_mes
      FROM proveedores
    `);
    return stats[0];
  }
};

module.exports = proveedoresQueries;