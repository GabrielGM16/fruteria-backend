// src/controllers/proveedoresController.js
const proveedoresQueries = require('../models/proveedoresQueries');

// Obtener todos los proveedores
const getProveedores = async (req, res) => {
  try {
    const { activo, search } = req.query;
    const proveedores = await proveedoresQueries.getProveedores({ activo, search });
    
    res.json({
      success: true,
      data: proveedores,
      message: 'Proveedores obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error getting proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedores',
      error: error.message
    });
  }
};

// Obtener un proveedor por ID
const getProveedorById = async (req, res) => {
  try {
    const { id } = req.params;
    const proveedor = await proveedoresQueries.getProveedorById(id);
    
    if (!proveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: proveedor,
      message: 'Proveedor obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error getting proveedor by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedor',
      error: error.message
    });
  }
};

// Crear un nuevo proveedor
const createProveedor = async (req, res) => {
  try {
    console.log('🏪 PROVEEDORES - Creating new proveedor');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', req.user?.username);
    console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('🌐 Request method:', req.method);
    console.log('🎯 Request URL:', req.originalUrl);
    
    // Verificar que el body no esté vacío
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('❌ VALIDATION ERROR: Request body is empty');
      return res.status(400).json({
        success: false,
        message: 'El cuerpo de la petición está vacío'
      });
    }
    
    const {
      nombre,
      contacto,
      telefono,
      email,
      direccion,
      rfc,
      productos_suministrados,
      notas,
      activo = true
    } = req.body;

    console.log('🔍 Extracted fields:', {
      nombre: nombre || 'undefined',
      contacto: contacto || 'undefined',
      telefono: telefono || 'undefined',
      email: email || 'undefined',
      direccion: direccion || 'undefined',
      rfc: rfc || 'undefined',
      productos_suministrados: productos_suministrados || 'undefined',
      notas: notas || 'undefined',
      activo: activo
    });

    // Validaciones básicas
    if (!nombre || nombre.trim() === '') {
      console.error('❌ VALIDATION ERROR: Nombre is required');
      return res.status(400).json({
        success: false,
        message: 'El nombre del proveedor es requerido'
      });
    }

    // Validar formato de email si se proporciona
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.error('❌ VALIDATION ERROR: Invalid email format:', email);
        return res.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        });
      }
    }

    // Validar RFC si se proporciona
    if (rfc && rfc.trim() !== '') {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(rfc.toUpperCase())) {
        console.error('❌ VALIDATION ERROR: Invalid RFC format:', rfc);
        return res.status(400).json({
          success: false,
          message: 'El formato del RFC no es válido'
        });
      }
    }

    const proveedorData = {
      nombre: nombre.trim(),
      contacto: contacto ? contacto.trim() : null,
      telefono: telefono ? telefono.trim() : null,
      email: email ? email.trim() : null,
      direccion: direccion ? direccion.trim() : null,
      rfc: rfc ? rfc.trim().toUpperCase() : null,
      productos_suministrados: productos_suministrados ? productos_suministrados.trim() : null,
      notas: notas ? notas.trim() : null,
      activo
    };

    console.log('✅ Validation passed, creating proveedor with data:', JSON.stringify(proveedorData, null, 2));

    const newProveedor = await proveedoresQueries.createProveedor(proveedorData);
    
    console.log('✅ Proveedor created successfully:', JSON.stringify(newProveedor, null, 2));
    
    res.status(201).json({
      success: true,
      data: newProveedor,
      message: 'Proveedor creado exitosamente'
    });
  } catch (error) {
    console.error('❌ ERROR creating proveedor:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Manejar errores de duplicados
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('❌ DUPLICATE ENTRY ERROR');
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con ese nombre o RFC'
      });
    }
    
    // Manejar errores de base de datos
    if (error.code && error.code.startsWith('ER_')) {
      console.error('❌ DATABASE ERROR:', error.code);
      return res.status(500).json({
        success: false,
        message: 'Error de base de datos al crear proveedor',
        error: error.message,
        code: error.code
      });
    }
    
    console.error('❌ UNKNOWN ERROR');
    res.status(500).json({
      success: false,
      message: 'Error al crear proveedor',
      error: error.message
    });
  }
};

// Actualizar un proveedor
const updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
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
    } = req.body;

    // Verificar que el proveedor existe
    const existingProveedor = await proveedoresQueries.getProveedorById(id);
    if (!existingProveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Validaciones básicas
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre del proveedor es requerido'
      });
    }

    // Validar formato de email si se proporciona
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del email no es válido'
        });
      }
    }

    // Validar RFC si se proporciona
    if (rfc && rfc.trim() !== '') {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(rfc.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'El formato del RFC no es válido'
        });
      }
    }

    const proveedorData = {
      nombre: nombre.trim(),
      contacto: contacto ? contacto.trim() : null,
      telefono: telefono ? telefono.trim() : null,
      email: email ? email.trim() : null,
      direccion: direccion ? direccion.trim() : null,
      rfc: rfc ? rfc.trim().toUpperCase() : null,
      productos_suministrados: productos_suministrados ? productos_suministrados.trim() : null,
      notas: notas ? notas.trim() : null,
      activo: activo !== undefined ? activo : existingProveedor.activo
    };

    const updatedProveedor = await proveedoresQueries.updateProveedor(id, proveedorData);
    
    res.json({
      success: true,
      data: updatedProveedor,
      message: 'Proveedor actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating proveedor:', error);
    
    // Manejar errores de duplicados
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con ese nombre o RFC'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar proveedor',
      error: error.message
    });
  }
};

// Eliminar un proveedor (soft delete)
const deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el proveedor existe
    const existingProveedor = await proveedoresQueries.getProveedorById(id);
    if (!existingProveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Realizar soft delete (marcar como inactivo)
    await proveedoresQueries.updateProveedor(id, { activo: false });
    
    res.json({
      success: true,
      message: 'Proveedor eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar proveedor',
      error: error.message
    });
  }
};

// Reactivar un proveedor
const reactivateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el proveedor existe
    const existingProveedor = await proveedoresQueries.getProveedorById(id);
    if (!existingProveedor) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Reactivar proveedor
    const updatedProveedor = await proveedoresQueries.updateProveedor(id, { activo: true });
    
    res.json({
      success: true,
      data: updatedProveedor,
      message: 'Proveedor reactivado exitosamente'
    });
  } catch (error) {
    console.error('Error reactivating proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reactivar proveedor',
      error: error.message
    });
  }
};

// Obtener proveedores activos para selects/dropdowns
const getProveedoresActivos = async (req, res) => {
  try {
    const proveedores = await proveedoresQueries.getProveedoresActivos();
    
    res.json({
      success: true,
      data: proveedores,
      message: 'Proveedores activos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error getting proveedores activos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener proveedores activos',
      error: error.message
    });
  }
};

// Obtener estadísticas de proveedores
const getProveedoresStats = async (req, res) => {
  try {
    const stats = await proveedoresQueries.getProveedoresStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Estadísticas de proveedores obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error getting proveedores stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de proveedores',
      error: error.message
    });
  }
};

module.exports = {
  getProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  reactivateProveedor,
  getProveedoresActivos,
  getProveedoresStats
};