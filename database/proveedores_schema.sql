-- Script SQL para crear la tabla proveedores
-- Frutería Inventory System - Proveedores Schema

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(255),
    direccion TEXT,
    rfc VARCHAR(13),
    productos_suministrados TEXT,
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para mejorar el rendimiento
    INDEX idx_nombre (nombre),
    INDEX idx_activo (activo),
    INDEX idx_created_at (created_at)
);

-- Insertar algunos proveedores de ejemplo
INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, rfc, productos_suministrados, notas, activo) VALUES
('Frutas del Valle S.A. de C.V.', 'Juan Pérez', '555-0123', 'contacto@frutasdelvalle.com', 'Av. Principal 123, Col. Centro', 'FVA123456789', 'Manzanas, Naranjas, Plátanos, Fresas', 'Proveedor principal de frutas frescas', TRUE),
('Verduras Orgánicas Ltda.', 'María González', '555-0456', 'ventas@verdurasorganicas.com', 'Calle Verde 456, Col. Ecológica', 'VOL987654321', 'Lechuga, Tomate, Cebolla, Zanahoria', 'Especialista en productos orgánicos certificados', TRUE),
('Distribuidora La Cosecha', 'Carlos Rodríguez', '555-0789', 'pedidos@lacosecha.mx', 'Mercado Central Local 15', 'DLC456789123', 'Productos variados de temporada', 'Proveedor local con buenos precios', TRUE);