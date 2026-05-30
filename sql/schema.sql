-- Esquema Inicial TaqueriaPOS

-- 1. Categorías de productos (Tacos, Bebidas, etc.)
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
);

-- 2. Productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- 3. Mesas
CREATE TABLE IF NOT EXISTS mesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL,
    estado TEXT DEFAULT 'libre' -- 'libre', 'ocupada', 'pendiente_pago'
);

-- 4. Pedidos (Cabecera)
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mesa_id INTEGER, -- NULL si es "Para llevar" o "Domicilio"
    tipo TEXT NOT NULL, -- 'mesa', 'llevar', 'domicilio'
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'cocinando', 'listo', 'pagado', 'cancelado'
    cliente_nombre TEXT, -- Útil para pedidos a domicilio o para llevar
    cliente_telefono TEXT,
    total REAL DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
);

-- 5. Detalle del Pedido (Partidas)
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER,
    producto_id INTEGER,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    notas TEXT, -- Ejemplo: "Sin cebolla", "Bien doradito"
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'entregado'
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Datos iniciales de prueba (Menú base)
INSERT INTO categorias (nombre) VALUES ('Tacos'), ('Especialidades'), ('Bebidas');

INSERT INTO productos (categoria_id, nombre, precio) VALUES 
(1, 'Pastor', 20.00), (1, 'Suadero', 20.00), (1, 'Cabeza', 22.00), (1, 'Chorizo', 20.00),
(1, 'Bistec', 25.00), (1, 'Arrachera', 30.00), (1, 'Lengua', 30.00), (1, 'Sesos', 22.00), (1, 'Carnaza', 20.00), (1, 'Tripa', 25.00),
(2, 'Quesadilla', 45.00), (2, 'Lonche', 60.00), (2, 'Volcan', 35.00), (2, 'Papa Rellena', 85.00),
(3, 'Agua 1L', 40.00), (3, 'Agua 0.5L', 25.00), (3, 'Coca-Cola 0.5L', 25.00);
