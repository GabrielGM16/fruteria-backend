// src/models/queries.js
const pool = require('../config/database');

// Queries para Productos
const productosQueries = {
  // Obtener todos los productos
  getAll: async () => {
    const [rows] = await pool.execute(
      `SELECT 
        p.*,
        COALESCE(SUM(dv.cantidad), 0) as total_vendido,
        COALESCE(SUM(dv.subtotal), 0) as ingresos_generados
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      WHERE p.activo = TRUE
      GROUP BY p.id
      ORDER BY p.nombre`
    );
    return rows;
  },

  // Obtener producto por ID
  getById: async (id) => {
    const [rows] = await pool.execute(
      `SELECT 
        p.*,
        COALESCE(SUM(dv.cantidad), 0) as total_vendido,
        COALESCE(SUM(dv.subtotal), 0) as ingresos_generados,
        (SELECT COUNT(*) FROM entradas WHERE producto_id = p.id) as total_entradas,
        (SELECT COUNT(*) FROM mermas WHERE producto_id = p.id) as total_mermas
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      WHERE p.id = ? AND p.activo = TRUE
      GROUP BY p.id`,
      [id]
    );
    return rows[0];
  },

  // Crear nuevo producto
  create: async (producto) => {
    const { nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url, activo } = producto;
    const [result] = await pool.execute(
      `INSERT INTO productos 
      (nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual || 0, stock_minimo || 5, imagen_url, activo !== false]
    );
    return result.insertId;
  },

  // Actualizar producto
  update: async (id, producto) => {
    const { nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url, activo } = producto;
    const [result] = await pool.execute(
      `UPDATE productos 
      SET nombre = ?, categoria = ?, unidad_medida = ?, precio_compra = ?, 
          precio_venta = ?, stock_actual = ?, stock_minimo = ?, imagen_url = ?, activo = ?
      WHERE id = ?`,
      [nombre, categoria, unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, imagen_url, activo, id]
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
      'UPDATE productos SET stock_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [stock, id]
    );
    return result.affectedRows > 0;
  },

  // Obtener alertas de stock bajo
  getAlertas: async () => {
    const [rows] = await pool.execute(
      `SELECT 
        p.*,
        ROUND((p.stock_actual / NULLIF(p.stock_minimo, 0)) * 100, 2) as porcentaje_stock,
        (p.stock_actual * p.precio_venta) as valor_stock
      FROM productos p
      WHERE p.stock_actual <= p.stock_minimo AND p.activo = TRUE 
      ORDER BY porcentaje_stock ASC, p.stock_actual ASC`
    );
    return rows;
  },

  // Obtener por categoría
  getByCategoria: async (categoria) => {
    const [rows] = await pool.execute(
      'SELECT * FROM productos WHERE categoria = ? AND activo = TRUE ORDER BY nombre',
      [categoria]
    );
    return rows;
  },

  // Buscar productos
  search: async (termino) => {
    const [rows] = await pool.execute(
      `SELECT * FROM productos 
      WHERE (nombre LIKE ? OR categoria LIKE ?) AND activo = TRUE 
      ORDER BY nombre`,
      [`%${termino}%`, `%${termino}%`]
    );
    return rows;
  }
};

// Queries para Entradas
const entradasQueries = {
  // Obtener todas las entradas
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT 
        e.*, 
        p.nombre as producto_nombre, 
        p.categoria,
        p.unidad_medida,
        (e.cantidad * e.precio_compra) as valor_total
      FROM entradas e 
      JOIN productos p ON e.producto_id = p.id 
      ORDER BY e.fecha_entrada DESC, e.created_at DESC
    `);
    return rows;
  },

  // Obtener entrada por ID
  getById: async (id) => {
    const [rows] = await pool.execute(`
      SELECT 
        e.*, 
        p.nombre as producto_nombre, 
        p.categoria,
        p.unidad_medida,
        p.stock_actual,
        (e.cantidad * e.precio_compra) as valor_total
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

      const { producto_id, cantidad, precio_compra, proveedor, nota } = entrada;
      
      // Insertar entrada
      const [result] = await connection.execute(
        `INSERT INTO entradas (producto_id, cantidad, precio_compra, proveedor, nota, fecha_entrada) 
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [producto_id, cantidad, precio_compra, proveedor || null, nota || null]
      );

      // Actualizar stock del producto
      await connection.execute(
        'UPDATE productos SET stock_actual = stock_actual + ?, updated_at = NOW() WHERE id = ?',
        [cantidad, producto_id]
      );

      // Actualizar precio de compra del producto si es diferente
      await connection.execute(
        'UPDATE productos SET precio_compra = ? WHERE id = ? AND precio_compra != ?',
        [precio_compra, producto_id, precio_compra]
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
      `UPDATE entradas 
      SET producto_id = ?, cantidad = ?, precio_compra = ?, proveedor = ?, nota = ?, updated_at = NOW()
      WHERE id = ?`,
      [producto_id, cantidad, precio_compra, proveedor, nota, id]
    );
    return result.affectedRows > 0;
  },

  // Eliminar entrada
  delete: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Obtener información de la entrada
      const [entrada] = await connection.execute(
        'SELECT producto_id, cantidad FROM entradas WHERE id = ?',
        [id]
      );

      if (entrada.length > 0) {
        // Restar el stock
        await connection.execute(
          'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
          [entrada[0].cantidad, entrada[0].producto_id]
        );
      }

      // Eliminar entrada
      const [result] = await connection.execute('DELETE FROM entradas WHERE id = ?', [id]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Obtener proveedores únicos
  getProveedores: async () => {
    const [rows] = await pool.execute(
      `SELECT 
        proveedor,
        COUNT(*) as total_entradas,
        SUM(cantidad * precio_compra) as total_invertido,
        MAX(fecha_entrada) as ultima_entrada
      FROM entradas 
      WHERE proveedor IS NOT NULL AND proveedor != '' 
      GROUP BY proveedor 
      ORDER BY total_invertido DESC`
    );
    return rows;
  },

  // Obtener entradas por proveedor
  getByProveedor: async (proveedor) => {
    const [rows] = await pool.execute(`
      SELECT e.*, p.nombre as producto_nombre, p.unidad_medida
      FROM entradas e
      JOIN productos p ON e.producto_id = p.id
      WHERE e.proveedor = ?
      ORDER BY e.fecha_entrada DESC
    `, [proveedor]);
    return rows;
  },

  // Obtener entradas por producto
  getByProducto: async (producto_id) => {
    const [rows] = await pool.execute(`
      SELECT e.*, p.nombre as producto_nombre
      FROM entradas e
      JOIN productos p ON e.producto_id = p.id
      WHERE e.producto_id = ?
      ORDER BY e.fecha_entrada DESC
    `, [producto_id]);
    return rows;
  }
};

// Queries para Ventas
const ventasQueries = {
  // Obtener todas las ventas
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT 
        v.*,
        COUNT(dv.id) as total_items,
        SUM(dv.cantidad) as total_productos,
        GROUP_CONCAT(DISTINCT p.nombre ORDER BY p.nombre SEPARATOR ', ') as productos_nombres
      FROM ventas v 
      LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
      LEFT JOIN productos p ON dv.producto_id = p.id
      GROUP BY v.id 
      ORDER BY v.fecha_venta DESC, v.created_at DESC
    `);
    return rows;
  },

  // Obtener venta por ID con detalles
  getById: async (id) => {
    const [venta] = await pool.execute(
      'SELECT * FROM ventas WHERE id = ?', 
      [id]
    );
    
    if (venta.length === 0) return null;

    const [detalles] = await pool.execute(`
      SELECT 
        dv.*, 
        p.nombre as producto_nombre, 
        p.categoria,
        p.unidad_medida,
        p.precio_venta as precio_actual
      FROM detalle_ventas dv 
      JOIN productos p ON dv.producto_id = p.id 
      WHERE dv.venta_id = ?
      ORDER BY dv.id
    `, [id]);
    
    return { 
      ...venta[0], 
      detalles,
      total_items: detalles.length,
      total_productos: detalles.reduce((sum, d) => sum + parseFloat(d.cantidad), 0)
    };
  },

  // Crear nueva venta
  create: async (venta) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { 
        cliente_nombre, 
        cliente_telefono, 
        cliente_email, 
        total, 
        metodo_pago, 
        referencia_pago, 
        detalles 
      } = venta;

      // Insertar venta
      const [ventaResult] = await connection.execute(
        `INSERT INTO ventas 
        (cliente_nombre, cliente_telefono, cliente_email, total, metodo_pago, referencia_pago, fecha_venta) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          cliente_nombre || 'Cliente General', 
          cliente_telefono || null, 
          cliente_email || null, 
          total, 
          metodo_pago, 
          referencia_pago || null
        ]
      );

      const ventaId = ventaResult.insertId;

      // Insertar detalles y actualizar stock
      for (const detalle of detalles) {
        const { producto_id, cantidad, precio_unitario, subtotal } = detalle;
        
        // Verificar stock disponible
        const [producto] = await connection.execute(
          'SELECT stock_actual, nombre FROM productos WHERE id = ?',
          [producto_id]
        );

        if (producto.length === 0) {
          throw new Error(`Producto con ID ${producto_id} no encontrado`);
        }

        if (producto[0].stock_actual < cantidad) {
          throw new Error(`Stock insuficiente para ${producto[0].nombre}. Disponible: ${producto[0].stock_actual}`);
        }

        // Insertar detalle
        await connection.execute(
          `INSERT INTO detalle_ventas 
          (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
          VALUES (?, ?, ?, ?, ?)`,
          [ventaId, producto_id, cantidad, precio_unitario, subtotal]
        );

        // Actualizar stock
        await connection.execute(
          'UPDATE productos SET stock_actual = stock_actual - ?, updated_at = NOW() WHERE id = ?',
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
      SELECT 
        v.*,
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

    if (filtros.cliente) {
      query += ' AND (v.cliente_nombre LIKE ? OR v.cliente_telefono LIKE ?)';
      params.push(`%${filtros.cliente}%`, `%${filtros.cliente}%`);
    }

    query += ' GROUP BY v.id ORDER BY v.fecha_venta DESC, v.created_at DESC';

    if (filtros.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filtros.limit));
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Anular venta (devolver stock)
  anular: async (id, motivo) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Obtener detalles de la venta
      const [detalles] = await connection.execute(
        'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?',
        [id]
      );

      // Devolver stock de cada producto
      for (const detalle of detalles) {
        await connection.execute(
          'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
          [detalle.cantidad, detalle.producto_id]
        );
      }

      // Marcar venta como anulada
      await connection.execute(
        `UPDATE ventas 
        SET estado = 'anulada', nota_anulacion = ?, fecha_anulacion = NOW() 
        WHERE id = ?`,
        [motivo, id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

// Queries para Mermas
const mermasQueries = {
  // Obtener todas las mermas
  getAll: async () => {
    const [rows] = await pool.execute(`
      SELECT 
        m.*, 
        p.nombre as producto_nombre, 
        p.categoria,
        p.unidad_medida, 
        p.precio_venta,
        (m.cantidad * p.precio_venta) as valor_perdido
      FROM mermas m 
      JOIN productos p ON m.producto_id = p.id 
      ORDER BY m.fecha_merma DESC, m.created_at DESC
    `);
    return rows;
  },

  // Obtener merma por ID
  getById: async (id) => {
    const [rows] = await pool.execute(`
      SELECT 
        m.*, 
        p.nombre as producto_nombre, 
        p.categoria,
        p.unidad_medida, 
        p.precio_venta,
        p.stock_actual,
        (m.cantidad * p.precio_venta) as valor_perdido
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

      const { producto_id, cantidad, motivo, descripcion } = merma;

      // Verificar stock disponible
      const [producto] = await connection.execute(
        'SELECT stock_actual, nombre FROM productos WHERE id = ?',
        [producto_id]
      );

      if (producto.length === 0) {
        throw new Error('Producto no encontrado');
      }

      if (producto[0].stock_actual < cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${producto[0].stock_actual}`);
      }

      // Insertar merma
      const [result] = await connection.execute(
        `INSERT INTO mermas (producto_id, cantidad, motivo, descripcion, fecha_merma) 
        VALUES (?, ?, ?, ?, NOW())`,
        [producto_id, cantidad, motivo, descripcion || null]
      );

      // Actualizar stock del producto
      await connection.execute(
        'UPDATE productos SET stock_actual = stock_actual - ?, updated_at = NOW() WHERE id = ?',
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
      `UPDATE mermas 
      SET producto_id = ?, cantidad = ?, motivo = ?, descripcion = ?, updated_at = NOW()
      WHERE id = ?`,
      [producto_id, cantidad, motivo, descripcion, id]
    );
    return result.affectedRows > 0;
  },

  // Eliminar merma
  delete: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Obtener información de la merma
      const [merma] = await connection.execute(
        'SELECT producto_id, cantidad FROM mermas WHERE id = ?',
        [id]
      );

      if (merma.length > 0) {
        // Devolver el stock
        await connection.execute(
          'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
          [merma[0].cantidad, merma[0].producto_id]
        );
      }

      // Eliminar merma
      const [result] = await connection.execute('DELETE FROM mermas WHERE id = ?', [id]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Obtener reportes de mermas
  getReportes: async (filtros = {}) => {
    let query = `
      SELECT 
        m.motivo,
        COUNT(*) as total_casos,
        SUM(m.cantidad) as total_cantidad,
        SUM(m.cantidad * p.precio_venta) as valor_perdido,
        AVG(m.cantidad * p.precio_venta) as promedio_perdida
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

    if (filtros.motivo) {
      query += ' AND m.motivo = ?';
      params.push(filtros.motivo);
    }

    query += ' GROUP BY m.motivo ORDER BY valor_perdido DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Obtener mermas por producto
  getByProducto: async (producto_id) => {
    const [rows] = await pool.execute(`
      SELECT m.*, p.nombre as producto_nombre
      FROM mermas m
      JOIN productos p ON m.producto_id = p.id
      WHERE m.producto_id = ?
      ORDER BY m.fecha_merma DESC
    `, [producto_id]);
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
        AVG(v.total) as promedio_venta,
        MIN(v.total) as venta_minima,
        MAX(v.total) as venta_maxima
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

  // Estadísticas de productos más vendidos
  getProductos: async () => {
    const [rows] = await pool.execute(`
      SELECT 
        p.id,
        p.nombre,
        p.categoria,
        p.stock_actual,
        p.stock_minimo,
        p.precio_venta,
        p.precio_compra,
        COALESCE(SUM(dv.cantidad), 0) as total_vendido,
        COALESCE(SUM(dv.subtotal), 0) as ingresos_generados,
        COALESCE(SUM(dv.cantidad * (p.precio_venta - p.precio_compra)), 0) as ganancia_generada,
        CASE 
          WHEN p.stock_actual <= p.stock_minimo THEN 'Bajo'
          WHEN p.stock_actual <= p.stock_minimo * 2 THEN 'Medio'
          ELSE 'Alto'
        END as nivel_stock
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      WHERE p.activo = TRUE
      GROUP BY p.id, p.nombre, p.categoria, p.stock_actual, p.stock_minimo, p.precio_venta, p.precio_compra
      ORDER BY total_vendido DESC
    `);
    return rows;
  },

  // Dashboard - métricas principales
  getDashboard: async () => {
    // Ventas del día
    const [ventasHoy] = await pool.execute(`
      SELECT 
        COUNT(*) as total_ventas, 
        COALESCE(SUM(total), 0) as total_ingresos,
        COALESCE(AVG(total), 0) as ticket_promedio
      FROM ventas 
      WHERE DATE(fecha_venta) = CURDATE()
    `);

    // Ventas de la semana
    const [ventasSemana] = await pool.execute(`
      SELECT 
        COUNT(*) as total_ventas, 
        COALESCE(SUM(total), 0) as total_ingresos
      FROM ventas 
      WHERE YEARWEEK(fecha_venta, 1) = YEARWEEK(CURDATE(), 1)
    `);

    // Ventas del mes
    const [ventasMes] = await pool.execute(`
      SELECT 
        COUNT(*) as total_ventas, 
        COALESCE(SUM(total), 0) as total_ingresos
      FROM ventas 
      WHERE MONTH(fecha_venta) = MONTH(CURDATE()) 
      AND YEAR(fecha_venta) = YEAR(CURDATE())
    `);

    // Productos con stock bajo
    const [stockBajo] = await pool.execute(`
      SELECT COUNT(*) as productos_stock_bajo
      FROM productos 
      WHERE stock_actual <= stock_minimo AND activo = TRUE
    `);

    // Total productos activos
    const [totalProductos] = await pool.execute(`
      SELECT 
        COUNT(*) as total_productos,
        SUM(stock_actual * precio_venta) as valor_inventario
      FROM productos 
      WHERE activo = TRUE
    `);

    // Mermas del mes
    const [mermasMes] = await pool.execute(`
      SELECT 
        COUNT(*) as total_mermas, 
        COALESCE(SUM(m.cantidad), 0) as cantidad_perdida,
        COALESCE(SUM(m.cantidad * p.precio_venta), 0) as valor_perdido
      FROM mermas m
      JOIN productos p ON m.producto_id = p.id
      WHERE MONTH(m.fecha_merma) = MONTH(CURDATE()) 
      AND YEAR(m.fecha_merma) = YEAR(CURDATE())
    `);

    // Métodos de pago del día
    const [metodosPago] = await pool.execute(`
      SELECT 
        metodo_pago,
        COUNT(*) as cantidad,
        SUM(total) as monto_total
      FROM ventas
      WHERE DATE(fecha_venta) = CURDATE()
      GROUP BY metodo_pago
    `);

    return {
      ventasHoy: ventasHoy[0],
      ventasSemana: ventasSemana[0],
      ventasMes: ventasMes[0],
      stockBajo: stockBajo[0],
      totalProductos: totalProductos[0],
      mermasMes: mermasMes[0],
      metodosPago: metodosPago
    };
  },

  // Top productos vendidos
  getTopProductos: async (limit = 10, filtros = {}) => {
    let query = `
      SELECT 
        p.id,
        p.nombre,
        p.categoria,
        COALESCE(SUM(dv.cantidad), 0) as total_cantidad,
        COALESCE(SUM(dv.subtotal), 0) as total_ingresos,
        COALESCE(SUM(dv.cantidad * (p.precio_venta - p.precio_compra)), 0) as total_ganancia,
        COUNT(DISTINCT dv.venta_id) as numero_ventas
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      LEFT JOIN ventas v ON dv.venta_id = v.id
      WHERE p.activo = TRUE
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

    query += `
      GROUP BY p.id, p.nombre, p.categoria, p.precio_venta, p.precio_compra
      ORDER BY total_ingresos DESC
      LIMIT ?
    `;
    params.push(limit);

    const [rows] = await pool.execute(query, params);
    return rows;
  },

  // Ventas por método de pago
  getVentasPorMetodoPago: async (filtros = {}) => {
    let query = `
      SELECT 
        metodo_pago,
        COUNT(*) as total_transacciones,
        SUM(total) as monto_total,
        AVG(total) as ticket_promedio
      FROM ventas
      WHERE 1=1
    `;
    const params = [];

    if (filtros.fecha_inicio) {
      query += ' AND DATE(fecha_venta) >= ?';
      params.push(filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
      query += ' AND DATE(fecha_venta) <= ?';
      params.push(filtros.fecha_fin);
    }

    query += ' GROUP BY metodo_pago ORDER BY monto_total DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
};

module.exports = {
  productosQueries,
  entradasQueries,
  ventasQueries,
  mermasQueries,
  estadisticasQueries
};