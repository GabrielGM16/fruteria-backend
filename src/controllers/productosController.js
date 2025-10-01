const pool = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE activo = TRUE ORDER BY nombre'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre, categoria, unidad_medida, precio_compra, 
            precio_venta, stock_minimo } = req.body;
    const [result] = await pool.query(
      `INSERT INTO productos (nombre, categoria, unidad_medida, 
       precio_compra, precio_venta, stock_minimo) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, categoria, unidad_medida, precio_compra, 
       precio_venta, stock_minimo]
    );
    res.status(201).json({ id: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { nombre, categoria, unidad_medida, precio_compra, 
            precio_venta, stock_minimo } = req.body;
    await pool.query(
      `UPDATE productos SET nombre = ?, categoria = ?, 
       unidad_medida = ?, precio_compra = ?, precio_venta = ?, 
       stock_minimo = ? WHERE id = ?`,
      [nombre, categoria, unidad_medida, precio_compra, 
       precio_venta, stock_minimo, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await pool.query(
      'UPDATE productos SET activo = FALSE WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};