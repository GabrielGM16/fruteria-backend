const pool = require('../config/database');

// Queries para Productos
const productosQueries = {
  // Obtener todos los productos
  getAll: async () => {
    const [rows] = await pool.execute(
      'SELECT * FROM productos WHERE activo = TRUE ORDER BY nombre'
    );
    return rows;
  },

  // Obtener producto por ID
  getById: async (id) => {
    const [rows] = await pool.execute(
      'SELECT * FROM productos WHERE id = ? AND activo = TRUE',
      [id]
    );
    return rows[0];
  },

  // Crear nuevo producto
  create: async (producto) => {
    const { nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url } = producto;
    const [result] = await pool.execute(
      'INSERT INTO productos (nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual || 0, stock_minimo || 5, imagen_url]
    );
    return result.insertId;
  },

  // Actualizar producto
  update: async (id, producto) => {
    const { nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url } = producto;
    const [result] = await pool.execute(
      'UPDATE productos SET nombre = ?, categoria = ?, unidad_medida = ?, precio_compra = ?, precio_venta = ?, stock_actual = ?, stock_minimo = ?, imagen_url = ? WHERE id = ?',
      [nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url, id]
    );
    return result.affectedRows > 0;
  },

  // Eliminar producto (soft delete)
  delete: async (id) => {
    const [result] = await pool.execute(
      'UPDATE productos SET activo = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Actualizar stock
  updateStock: async (id, stock) => {
    const [result] = await pool.execute(
      'UPDATE productos SET stock_actual = ? WHERE id = ?',
      [stock, id]
    );
    return result.affectedRows > 0;
  },

  // Obtener alertas de stock bajo
  getAlertas: async () => {
    const [rows] = await pool.execute(
      'SELECT * FROM productos WHERE stock_actual <= stock_minimo AND activo = TRUE ORDER BY stock_actual ASC'
    );
    return rows;
  }
};

// Queries para Entradas
const entradasQueries = {
  // Obtener todas las entradas
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT e.*, p.nombre as producto_nombre, p.unidad_medida 
      FROM entradas e 
      JOIN productos p ON e.producto_id = p.id 
      ORDER BY e.fecha_entrada DESC
    `);
    return rows;
  },

  // Obtener entrada por ID
  getById: async (id) => {
    const [rows] = await pool.execute(`
      SELECT e.*, p.nombre as producto_nombre, p.unidad_medida 
      FROM entradas e 
      JOIN productos p ON e.producto_id = p.id 
      WHERE e.id = ?
    `, [id]);
    return rows[0];
  },

  // Crear nueva entrada
  create: async (entrada) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insertar entrada
      const { producto_id, cantidad, precio_compra, proveedor, nota } = entrada;
      const [result] = await connection.execute(
        'INSERT INTO entradas (producto_id, cantidad, precio_compra, proveedor, nota) VALUES (?, ?, ?, ?, ?)',
        [producto_id, cantidad, precio_compra, proveedor, nota]
      );

      // Actualizar stock del producto
      await connection.execute(
        'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
        [cantidad, producto_id]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Actualizar entrada
  update: async (id, entrada) => {
    const { producto_id, cantidad, precio_compra, proveedor, nota } = entrada;
    const [result] = await pool.execute(
      'UPDATE entradas SET producto_id = ?, cantidad = ?, precio_compra = ?, proveedor = ?, nota = ? WHERE id = ?',
      [producto_id, cantidad, precio_compra, proveedor, nota, id]
    );
    return result.affectedRows > 0;
  },

  // Eliminar entrada
  delete: async (id) => {
    const [result] = await pool.execute('DELETE FROM entradas WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Obtener proveedores únicos
  getProveedores: async () => {
    const [rows] = await pool.execute(
      'SELECT DISTINCT proveedor FROM entradas WHERE proveedor IS NOT NULL AND proveedor != "" ORDER BY proveedor'
    );
    return rows.map(row => row.proveedor);
  }
};

// Queries para Ventas
const ventasQueries = {
  // Obtener todas las ventas
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT v.*, 
        COUNT(dv.id) as total_items,
        GROUP_CONCAT(CONCAT(p.nombre, ' (', dv.cantidad, ')') SEPARATOR ', ') as productos
      FROM ventas v 
      LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
      LEFT JOIN productos p ON dv.producto_id = p.id
      GROUP BY v.id 
      ORDER BY v.fecha_venta DESC
    `);
    return rows;
  },

  // Obtener venta por ID con detalles
  getById: async (id) => {
    const [venta] = await pool.execute('SELECT * FROM ventas WHERE id = ?', [id]);
    const [detalles] = await pool.execute(`
      SELECT dv.*, p.nombre as producto_nombre, p.unidad_medida 
      FROM detalle_ventas dv 
      JOIN productos p ON dv.producto_id = p.id 
      WHERE dv.venta_id = ?
    `, [id]);
    
    return { ...venta[0], detalles };
  },

  // Crear nueva venta
  create: async (venta) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insertar venta
      const { total, metodo_pago, referencia_pago, detalles } = venta;
      const [ventaResult] = await connection.execute(
        'INSERT INTO ventas (total, metodo_pago, referencia_pago) VALUES (?, ?, ?)',
        [total, metodo_pago, referencia_pago]
      );

      const ventaId = ventaResult.insertId;

      // Insertar detalles y actualizar stock
      for (const detalle of detalles) {
        const { producto_id, cantidad, precio_unitario, subtotal } = detalle;
        
        // Insertar detalle
        await connection.execute(
          'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [ventaId, producto_id, cantidad, precio_unitario, subtotal]
        );

        // Actualizar stock
        await connection.execute(
          'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
          [cantidad, producto_id]
        );
      }

      await connection.commit();
      return ventaId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Obtener historial de ventas con filtros
  getHistorial: async (filtros = {}) => {
    let query = `
      SELECT v.*, 
        COUNT(dv.id) as total_items,
        SUM(dv.cantidad) as total_productos
      FROM ventas v 
      LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.fecha_inicio) {
      query += ' AND DATE(v.fecha_venta) >= ?';
      params.push(filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      query += ' AND DATE(v.fecha_venta) <= ?';
      params.push(filtros.fecha_fin);
    }

    if (filtros.metodo_pago) {
      query += ' AND v.metodo_pago = ?';
      params.push(filtros.metodo_pago);
    }

    query += ' GROUP BY v.id ORDER BY v.fecha_venta DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
};

// Queries para Mermas
const mermasQueries = {
  // Obtener todas las mermas
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT m.*, p.nombre as producto_nombre, p.unidad_medida, p.precio_venta
      FROM mermas m 
      JOIN productos p ON m.producto_id = p.id 
      ORDER BY m.fecha_merma DESC
    `);
    return rows;
  },

  // Obtener merma por ID
  getById: async (id) => {
    const [rows] = await pool.execute(`
      SELECT m.*, p.nombre as producto_nombre, p.unidad_medida, p.precio_venta
      FROM mermas m 
      JOIN productos p ON m.producto_id = p.id 
      WHERE m.id = ?
    `, [id]);
    return rows[0];
  },

  // Crear nueva merma
  create: async (merma) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insertar merma
      const { producto_id, cantidad, motivo, descripcion } = merma;
      const [result] = await connection.execute(
        'INSERT INTO mermas (producto_id, cantidad, motivo, descripcion) VALUES (?, ?, ?, ?)',
        [producto_id, cantidad, motivo, descripcion]
      );

      // Actualizar stock del producto
      await connection.execute(
        'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
        [cantidad, producto_id]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Actualizar merma
  update: async (id, merma) => {
    const { producto_id, cantidad, motivo, descripcion } = merma;
    const [result] = await pool.execute(
      'UPDATE mermas SET producto_id = ?, cantidad = ?, motivo = ?, descripcion = ? WHERE id = ?',
      [producto_id, cantidad, motivo, descripcion, id]
    );
    return result.affectedRows > 0;
  },

  // Eliminar merma
  delete: async (id) => {
    const [result] = await pool.execute('DELETE FROM mermas WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Obtener reportes de mermas
  getReportes: async (filtros = {}) => {
    let query = `
      SELECT 
        m.motivo,
        COUNT(*) as total_casos,
        SUM(m.cantidad) as total_cantidad,
        SUM(m.cantidad * p.precio_venta) as valor_perdido
      FROM mermas m 
      JOIN productos p ON m.producto_id = p.id 
      WHERE 1=1
    `;
    const params = [];

    if (filtros.fecha_inicio) {
      query += ' AND DATE(m.fecha_merma) >= ?';
      params.push(filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      query += ' AND DATE(m.fecha_merma) <= ?';
      params.push(filtros.fecha_fin);
    }

    query += ' GROUP BY m.motivo ORDER BY valor_perdido DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
};

// Queries para Estadísticas
const estadisticasQueries = {
  // Estadísticas de ventas
  getVentas: async (filtros = {}) => {
    let query = `
      SELECT 
        DATE(v.fecha_venta) as fecha,
        COUNT(*) as total_ventas,
        SUM(v.total) as total_ingresos,
        AVG(v.total) as promedio_venta
      FROM ventas v 
      WHERE 1=1
    `;
    const params = [];

    if (filtros.fecha_inicio) {
      query += ' AND DATE(v.fecha_venta) >= ?';
      params.push(filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      query += ' AND DATE(v.fecha_venta) <= ?';
      params.push(filtros.fecha_fin);
    }

    query += ' GROUP BY DATE(v.fecha_venta) ORDER BY fecha DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Estadísticas de productos
  getProductos: async () => {
    const [rows] = await pool.execute(`
      SELECT 
        p.id,
        p.nombre,
        p.categoria,
        p.stock_actual,
        p.stock_minimo,
        COALESCE(SUM(dv.cantidad), 0) as total_vendido,
        COALESCE(SUM(dv.subtotal), 0) as ingresos_generados,
        CASE 
          WHEN p.stock_actual <= p.stock_minimo THEN 'Bajo'
          WHEN p.stock_actual <= p.stock_minimo * 2 THEN 'Medio'
          ELSE 'Alto'
        END as nivel_stock
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      WHERE p.activo = TRUE
      GROUP BY p.id, p.nombre, p.categoria, p.stock_actual, p.stock_minimo
      ORDER BY total_vendido DESC
    `);
    return rows;
  },

  // Dashboard - métricas principales
  getDashboard: async () => {
    // Ventas del día
    const [ventasHoy] = await pool.execute(`
      SELECT COUNT(*) as total_ventas, COALESCE(SUM(total), 0) as total_ingresos
      FROM ventas 
      WHERE DATE(fecha_venta) = CURDATE()
    `);

    // Productos con stock bajo
    const [stockBajo] = await pool.execute(`
      SELECT COUNT(*) as productos_stock_bajo
      FROM productos 
      WHERE stock_actual <= stock_minimo AND activo = TRUE
    `);

    // Total productos activos
    const [totalProductos] = await pool.execute(`
      SELECT COUNT(*) as total_productos
      FROM productos 
      WHERE activo = TRUE
    `);

    // Mermas del mes
    const [mermasMes] = await pool.execute(`
      SELECT COUNT(*) as total_mermas, COALESCE(SUM(cantidad), 0) as cantidad_perdida
      FROM mermas 
      WHERE MONTH(fecha_merma) = MONTH(CURDATE()) AND YEAR(fecha_merma) = YEAR(CURDATE())
    `);

    return {
      ventasHoy: ventasHoy[0],
      stockBajo: stockBajo[0],
      totalProductos: totalProductos[0],
      mermasMes: mermasMes[0]
    };
  }
};

module.exports = {
  productosQueries,
  entradasQueries,
  ventasQueries,
  mermasQueries,
  estadisticasQueries
};