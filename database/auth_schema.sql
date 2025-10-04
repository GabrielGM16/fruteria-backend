-- Script SQL para crear el sistema de autenticación y roles
-- Frutería Inventory System - Authentication Schema

-- Crear tabla de roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    permisos JSON,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- Insertar roles iniciales con permisos detallados
INSERT INTO roles (nombre, descripcion, permisos) VALUES
('admin', 'Administrador del sistema', JSON_OBJECT(
    'dashboard', true,
    'inventario_lectura', true,
    'inventario_escritura', true,
    'ventas_lectura', true,
    'ventas_escritura', true,
    'entradas_lectura', true,
    'entradas_escritura', true,
    'mermas_lectura', true,
    'mermas_escritura', true,
    'reportes_lectura', true,
    'usuarios_lectura', true,
    'usuarios_escritura', true,
    'configuracion', true
)),
('dueño', 'Propietario del negocio', JSON_OBJECT(
    'dashboard', true,
    'inventario_lectura', true,
    'inventario_escritura', true,
    'ventas_lectura', true,
    'ventas_escritura', true,
    'entradas_lectura', true,
    'entradas_escritura', true,
    'mermas_lectura', true,
    'mermas_escritura', true,
    'reportes_lectura', true,
    'usuarios_lectura', true,
    'usuarios_escritura', false,
    'configuracion', false
)),
('vendedor', 'Cajero/Vendedor', JSON_OBJECT(
    'dashboard', true,
    'inventario_lectura', true,
    'inventario_escritura', false,
    'ventas_lectura', true,
    'ventas_escritura', true,
    'entradas_lectura', true,
    'entradas_escritura', true,
    'mermas_lectura', false,
    'mermas_escritura', false,
    'reportes_lectura', false,
    'usuarios_lectura', false,
    'usuarios_escritura', false,
    'configuracion', false
));

-- Insertar usuario administrador inicial (password: admin123)
INSERT INTO usuarios (username, password_hash, nombre, rol_id) VALUES
('admin', '$2b$10$rOvHPGkwYvYFQVlXiB5tUeK7sXM5tY8qJQvQqGQvQqGQvQqGQvQqG', 'Administrador Principal', 1),
('dueno', '$2b$10$rOvHPGkwYvYFQVlXiB5tUeK7sXM5tY8qJQvQqGQvQqGQvQqGQvQqG', 'Propietario', 2),
('vendedor1', '$2b$10$rOvHPGkwYvYFQVlXiB5tUeK7sXM5tY8qJQvQqGQvQqGQvQqGQvQqG', 'Vendedor Principal', 3);

-- Modificar tablas existentes para agregar usuario_id
-- Nota: Ejecutar solo si las tablas ya existen

-- Agregar usuario_id a tabla ventas (si existe)
-- ALTER TABLE ventas ADD COLUMN usuario_id INT;
-- ALTER TABLE ventas ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
-- CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);

-- Agregar usuario_id a tabla entradas (si existe)
-- ALTER TABLE entradas ADD COLUMN usuario_id INT;
-- ALTER TABLE entradas ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
-- CREATE INDEX idx_entradas_usuario ON entradas(usuario_id);

-- Agregar usuario_id a tabla mermas (si existe)
-- ALTER TABLE mermas ADD COLUMN usuario_id INT;
-- ALTER TABLE mermas ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
-- CREATE INDEX idx_mermas_usuario ON mermas(usuario_id);

-- Consultas útiles para verificar la configuración
-- SELECT u.id, u.username, u.nombre, r.nombre as rol, r.permisos 
-- FROM usuarios u 
-- JOIN roles r ON u.rol_id = r.id 
-- WHERE u.activo = true;