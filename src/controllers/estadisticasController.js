// src/controllers/estadisticasController.js
const { estadisticasQueries } = require('../models/queries');

// Obtener estadísticas de ventas
const getEstadisticasVentas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {};
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;

    const estadisticas = await estadisticasQueries.getVentas(filtros);
    
    // Calcular totales y promedios
    const totales = {
      total_ventas: estadisticas.reduce((sum, stat) => sum + parseInt(stat.total_ventas), 0),
      total_ingresos: estadisticas.reduce((sum, stat) => sum + parseFloat(stat.total_ingresos), 0),
      promedio_general: estadisticas.length > 0 ? 
        estadisticas.reduce((sum, stat) => sum + parseFloat(stat.total_ingresos), 0) / 
        estadisticas.reduce((sum, stat) => sum + parseInt(stat.total_ventas), 0) : 0,
      promedio_diario: estadisticas.length > 0 ?
        estadisticas.reduce((sum, stat) => sum + parseFloat(stat.total_ingresos), 0) / estadisticas.length : 0,
      dias_con_ventas: estadisticas.length
    };

    // Identificar mejor y peor día
    if (estadisticas.length > 0) {
      const mejorDia = estadisticas.reduce((max, stat) => 
        parseFloat(stat.total_ingresos) > parseFloat(max.total_ingresos) ? stat : max
      );
      const peorDia = estadisticas.reduce((min, stat) => 
        parseFloat(stat.total_ingresos) < parseFloat(min.total_ingresos) ? stat : min
      );

      totales.mejor_dia = {
        fecha: mejorDia.fecha,
        ingresos: parseFloat(mejorDia.total_ingresos),
        ventas: parseInt(mejorDia.total_ventas)
      };

      totales.peor_dia = {
        fecha: peorDia.fecha,
        ingresos: parseFloat(peorDia.total_ingresos),
        ventas: parseInt(peorDia.total_ventas)
      };
    }

    res.json({
      success: true,
      data: estadisticas,
      totales,
      filtros
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de ventas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener estadísticas de productos
const getEstadisticasProductos = async (req, res) => {
  try {
    const estadisticas = await estadisticasQueries.getProductos();
    
    // Agrupar por categorías
    const porCategoria = estadisticas.reduce((acc, producto) => {
      const categoria = producto.categoria || 'Sin categoría';
      if (!acc[categoria]) {
        acc[categoria] = {
          categoria,
          total_productos: 0,
          total_vendido: 0,
          ingresos_generados: 0,
          ganancia_generada: 0,
          productos_stock_bajo: 0,
          valor_inventario: 0
        };
      }
      
      acc[categoria].total_productos++;
      acc[categoria].total_vendido += parseFloat(producto.total_vendido);
      acc[categoria].ingresos_generados += parseFloat(producto.ingresos_generados);
      acc[categoria].ganancia_generada += parseFloat(producto.ganancia_generada);
      acc[categoria].valor_inventario += parseFloat(producto.stock_actual) * parseFloat(producto.precio_venta);
      
      if (producto.nivel_stock === 'Bajo') {
        acc[categoria].productos_stock_bajo++;
      }
      
      return acc;
    }, {});

    // Productos más vendidos (top 10)
    const masVendidos = estadisticas
      .sort((a, b) => parseFloat(b.total_vendido) - parseFloat(a.total_vendido))
      .slice(0, 10);

    // Productos más rentables (top 10)
    const masRentables = estadisticas
      .sort((a, b) => parseFloat(b.ganancia_generada) - parseFloat(a.ganancia_generada))
      .slice(0, 10);

    // Productos con stock bajo
    const stockBajo = estadisticas.filter(p => p.nivel_stock === 'Bajo');

    // Productos sin movimiento
    const sinMovimiento = estadisticas.filter(p => parseFloat(p.total_vendido) === 0);

    // Calcular totales generales
    const totalesGenerales = {
      total_productos: estadisticas.length,
      total_vendido: estadisticas.reduce((sum, p) => sum + parseFloat(p.total_vendido), 0),
      ingresos_totales: estadisticas.reduce((sum, p) => sum + parseFloat(p.ingresos_generados), 0),
      ganancia_total: estadisticas.reduce((sum, p) => sum + parseFloat(p.ganancia_generada), 0),
      valor_inventario_total: estadisticas.reduce((sum, p) => 
        sum + (parseFloat(p.stock_actual) * parseFloat(p.precio_venta)), 0
      ),
      productos_stock_bajo: stockBajo.length,
      productos_sin_movimiento: sinMovimiento.length
    };

    res.json({
      success: true,
      data: {
        productos: estadisticas,
        por_categoria: Object.values(porCategoria),
        mas_vendidos: masVendidos,
        mas_rentables: masRentables,
        stock_bajo: stockBajo,
        sin_movimiento: sinMovimiento,
        totales: totalesGenerales
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener métricas del dashboard
const getDashboard = async (req, res) => {
  try {
    const dashboard = await estadisticasQueries.getDashboard();
    
    // Calcular métricas adicionales
    const metricas = {
      ...dashboard,
      
      // Calcular porcentaje de productos con stock bajo
      porcentaje_stock_bajo: dashboard.totalProductos.total_productos > 0 ? 
        ((dashboard.stockBajo.productos_stock_bajo / dashboard.totalProductos.total_productos) * 100).toFixed(2) : 0,
      
      // Estado general del inventario
      estado_inventario: dashboard.stockBajo.productos_stock_bajo === 0 ? 'Excelente' :
                        dashboard.stockBajo.productos_stock_bajo <= 5 ? 'Bueno' :
                        dashboard.stockBajo.productos_stock_bajo <= 10 ? 'Regular' : 'Crítico',
      
      // Calcular crecimiento vs día anterior
      crecimiento_diario: {
        porcentaje: 0, // Esto requeriría comparar con ayer
        tendencia: 'estable'
      },

      // Calcular eficiencia (ventas vs mermas)
      eficiencia: {
        porcentaje_mermas: dashboard.totalProductos.total_productos > 0 ?
          ((dashboard.mermasMes.total_mermas / dashboard.totalProductos.total_productos) * 100).toFixed(2) : 0,
        impacto_economico: dashboard.mermasMes.valor_perdido || 0
      },

      // Desglose de métodos de pago
      metodos_pago_detalle: dashboard.metodosPago.reduce((acc, metodo) => {
        acc[metodo.metodo_pago] = {
          cantidad: parseInt(metodo.cantidad),
          monto: parseFloat(metodo.monto_total),
          porcentaje: dashboard.ventasHoy.total_ingresos > 0 ?
            ((parseFloat(metodo.monto_total) / dashboard.ventasHoy.total_ingresos) * 100).toFixed(2) : 0
        };
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: metricas,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener métricas del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener resumen general
const getResumenGeneral = async (req, res) => {
  try {
    const { periodo = '30' } = req.query; // Días por defecto
    
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(periodo));
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
    
    const fechaFin = new Date().toISOString().split('T')[0];

    // Obtener datos del período
    const [
      ventasPeriodo, 
      dashboard, 
      estadisticasProductos,
      topProductos,
      metodosPago
    ] = await Promise.all([
      estadisticasQueries.getVentas({ fecha_inicio: fechaInicioStr, fecha_fin: fechaFin }),
      estadisticasQueries.getDashboard(),
      estadisticasQueries.getProductos(),
      estadisticasQueries.getTopProductos(5, { fecha_inicio: fechaInicioStr, fecha_fin: fechaFin }),
      estadisticasQueries.getVentasPorMetodoPago({ fecha_inicio: fechaInicioStr, fecha_fin: fechaFin })
    ]);

    // Calcular tendencias
    const totalVentasPeriodo = ventasPeriodo.reduce((sum, v) => sum + parseInt(v.total_ventas), 0);
    const totalIngresosPeriodo = ventasPeriodo.reduce((sum, v) => sum + parseFloat(v.total_ingresos), 0);
    
    const promedioVentasDiarias = totalVentasPeriodo / parseInt(periodo);
    const promedioIngresosDiarios = totalIngresosPeriodo / parseInt(periodo);

    // Calcular ganancia total estimada (30% promedio)
    const gananciaEstimada = estadisticasProductos.reduce((sum, p) => 
      sum + parseFloat(p.ganancia_generada || 0), 0
    );

    const resumen = {
      periodo: `${periodo} días`,
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFin,
      
      ventas: {
        hoy: {
          total: dashboard.ventasHoy.total_ventas,
          ingresos: dashboard.ventasHoy.total_ingresos,
          ticket_promedio: dashboard.ventasHoy.ticket_promedio
        },
        semana: {
          total: dashboard.ventasSemana.total_ventas,
          ingresos: dashboard.ventasSemana.total_ingresos
        },
        mes: {
          total: dashboard.ventasMes.total_ventas,
          ingresos: dashboard.ventasMes.total_ingresos
        },
        periodo: {
          total_ventas: totalVentasPeriodo,
          total_ingresos: totalIngresosPeriodo,
          ganancia_estimada: gananciaEstimada,
          promedio_diario_ventas: promedioVentasDiarias.toFixed(2),
          promedio_diario_ingresos: promedioIngresosDiarios.toFixed(2),
          dias_con_datos: ventasPeriodo.length
        }
      },
      
      inventario: {
        total_productos: dashboard.totalProductos.total_productos,
        productos_stock_bajo: dashboard.stockBajo.productos_stock_bajo,
        valor_total: dashboard.totalProductos.valor_inventario,
        porcentaje_stock_bajo: dashboard.totalProductos.total_productos > 0 ?
          ((dashboard.stockBajo.productos_stock_bajo / dashboard.totalProductos.total_productos) * 100).toFixed(2) : 0
      },
      
      mermas: {
        total_casos: dashboard.mermasMes.total_mermas,
        cantidad_perdida: dashboard.mermasMes.cantidad_perdida,
        valor_perdido: dashboard.mermasMes.valor_perdido,
        porcentaje_vs_inventario: dashboard.totalProductos.total_productos > 0 ?
          ((dashboard.mermasMes.total_mermas / dashboard.totalProductos.total_productos) * 100).toFixed(2) : 0
      },
      
      top_productos: topProductos,
      metodos_pago: metodosPago,
      
      indicadores: {
        ticket_promedio: dashboard.ventasHoy.ticket_promedio,
        margen_ganancia_estimado: totalIngresosPeriodo > 0 ?
          ((gananciaEstimada / totalIngresosPeriodo) * 100).toFixed(2) : 0,
        rotacion_inventario: 'N/A', // Requiere más datos históricos
        efectividad_ventas: promedioVentasDiarias > 0 ? 'Buena' : 'Baja'
      }
    };

    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener top productos
const getTopProductos = async (req, res) => {
  try {
    const { limit = 10, fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {};
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;

    const topProductos = await estadisticasQueries.getTopProductos(parseInt(limit), filtros);

    res.json({
      success: true,
      data: topProductos,
      count: topProductos.length,
      filtros
    });
  } catch (error) {
    console.error('Error al obtener top productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener ventas por método de pago
const getVentasPorMetodoPago = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {};
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;

    const ventasPorMetodo = await estadisticasQueries.getVentasPorMetodoPago(filtros);

    // Calcular totales
    const totales = {
      total_transacciones: ventasPorMetodo.reduce((sum, m) => sum + parseInt(m.total_transacciones), 0),
      monto_total: ventasPorMetodo.reduce((sum, m) => sum + parseFloat(m.monto_total), 0)
    };

    // Calcular porcentajes
    const conPorcentajes = ventasPorMetodo.map(metodo => ({
      ...metodo,
      porcentaje_transacciones: totales.total_transacciones > 0 ?
        ((parseInt(metodo.total_transacciones) / totales.total_transacciones) * 100).toFixed(2) : 0,
      porcentaje_monto: totales.monto_total > 0 ?
        ((parseFloat(metodo.monto_total) / totales.monto_total) * 100).toFixed(2) : 0
    }));

    res.json({
      success: true,
      data: conPorcentajes,
      totales,
      filtros
    });
  } catch (error) {
    console.error('Error al obtener ventas por método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getEstadisticasVentas,
  getEstadisticasProductos,
  getDashboard,
  getResumenGeneral,
  getTopProductos,
  getVentasPorMetodoPago
};