-- Esquema Inicial TaqueriaPOS (Actualizado para coincidir con db.js)

-- 1. Categorías de productos (Tacos, Bebidas, etc.)
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL
);

-- 2. Productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER,
    nombre TEXT NOT NULL,
    abreviatura TEXT,
    precio REAL NOT NULL,
    requiereCarne INTEGER DEFAULT 0,
    precioSencillo REAL DEFAULT 0,
    variantes TEXT,
    agotado INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- 3. Carnes (Variantes)
CREATE TABLE IF NOT EXISTS carnes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    abreviatura TEXT,
    disponible INTEGER DEFAULT 1,
    premium INTEGER DEFAULT 0,
    exclusivaTaco INTEGER DEFAULT 0
);

-- 4. Mesas
CREATE TABLE IF NOT EXISTS mesas (
    id INTEGER PRIMARY KEY,
    numero TEXT NOT NULL,
    x REAL,
    y REAL,
    ancho REAL,
    alto REAL,
    forma TEXT,
    estado TEXT DEFAULT 'libre'
);

-- 5. Empleados
CREATE TABLE IF NOT EXISTS empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    puesto TEXT,
    pago_dia REAL DEFAULT 0,
    pin TEXT
);

-- 6. Turnos (Cortes de Caja)
CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    hora_inicio TEXT,
    hora_fin TEXT,
    inicioCaja REAL DEFAULT 0,
    ventas REAL DEFAULT 0,
    gastos REAL DEFAULT 0,
    retiros REAL DEFAULT 0,
    estado TEXT DEFAULT 'abierto'
);

-- 7. Gastos
CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion TEXT,
    monto REAL,
    fecha TEXT,
    hora TEXT,
    estado TEXT DEFAULT 'pendiente'
);

-- 8. Logs de Auditoría
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    accion TEXT,
    detalles TEXT,
    fecha TEXT,
    hora TEXT
);

-- 9. Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY,
    tipo TEXT NOT NULL, -- 'mesa', 'llevar', 'domicilio'
    mesaId INTEGER,
    mesaNumero TEXT,
    cliente TEXT, -- JSON con nombre, tel, dir
    platos TEXT, -- JSON con platos e items
    total REAL DEFAULT 0,
    metodo_pago TEXT,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'pagado', 'cancelado', 'deuda'
    fecha TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    descuento REAL DEFAULT 0,
    fiar_a TEXT
);

-- Datos iniciales de prueba (Menú base)
INSERT INTO categorias (id, nombre) VALUES (1, 'Tacos'), (2, 'Especialidades'), (3, 'Ordenes'), (4, 'Bebidas');

INSERT INTO carnes (id, nombre, abreviatura, disponible, premium) VALUES 
('pastor', 'Pastor', 'PAS', 1, 0), ('suadero', 'Suadero', 'SUA', 1, 0), 
('cabeza', 'Cabeza', 'CAB', 1, 0), ('carnaza', 'Carnaza', 'CAR', 1, 0),
('ojo', 'Ojo', 'OJO', 1, 0), ('bistec', 'Bistec', 'BIS', 1, 0), 
('chorizo', 'Chorizo', 'CHO', 1, 0),
('arrachera', 'Arrachera', 'ARR', 1, 1), ('labio', 'Labio', 'LAB', 1, 1),
('lengua', 'Lengua', 'LEN', 1, 1), ('sesos', 'Sesos', 'SES', 1, 1),
('tripa', 'Tripa', 'TRI', 1, 1);

INSERT INTO productos (id, categoria_id, nombre, abreviatura, precio, requiereCarne, precioSencillo) VALUES 
(1, 1, 'Taco Pastor', 'T_PAS', 18, 1, 0),
(2, 1, 'Taco Suadero', 'T_SUA', 18, 1, 0),
(3, 1, 'Taco Bistec', 'T_BIS', 18, 1, 0),
(7, 2, 'Quesadilla', 'QUESA', 35, 1, 25),
(8, 2, 'Gringa', 'GRI', 45, 1, 35),
(9, 2, 'Lonche', 'LON', 45, 1, 35),
(10, 2, 'Volcan', 'VOL', 35, 1, 25),
(11, 2, 'Papa Rellena', 'PAPA', 75, 1, 60),
(20, 4, 'Refresco 500ml', 'REF', 25, 0, 0),
(21, 4, 'Agua 1L', 'AGU', 35, 0, 0),
(22, 4, 'Agua 0.5L', 'AGU5', 20, 0, 0);

INSERT INTO mesas (id, numero, x, y, estado, ancho, alto, forma) VALUES 
(1, '1', 50, 50, 'libre', 70, 70, 'cuadrada'),
(2, '2', 150, 50, 'libre', 70, 70, 'cuadrada'),
(3, '3', 250, 50, 'libre', 70, 70, 'redonda');
