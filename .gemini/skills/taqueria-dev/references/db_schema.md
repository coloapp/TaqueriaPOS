# TaqueriaPOS Database Schema

## Tables

### categorias
- `id`: INTEGER PRIMARY KEY
- `nombre`: TEXT UNIQUE

### productos
- `id`: INTEGER PRIMARY KEY
- `categoria_id`: INTEGER
- `nombre`: TEXT
- `abreviatura`: TEXT
- `precio`: REAL
- `requiereCarne`: INTEGER (0/1)

### carnes
- `id`: TEXT PRIMARY KEY
- `nombre`: TEXT
- `abreviatura`: TEXT
- `disponible`: INTEGER
- `premium`: INTEGER
- `exclusivaTaco`: INTEGER

### mesas
- `id`: INTEGER PRIMARY KEY
- `numero`: TEXT
- `x`: REAL
- `y`: REAL
- `ancho`: REAL
- `alto`: REAL
- `forma`: TEXT
- `estado`: TEXT ('libre', 'ocupada', 'pendiente')

### empleados
- `id`: INTEGER PRIMARY KEY
- `nombre`: TEXT
- `puesto`: TEXT
- `pago_dia`: REAL
- `pin`: TEXT

### turnos
- `id`: INTEGER PRIMARY KEY
- `fecha`: TEXT
- `hora_inicio`: TEXT
- `hora_fin`: TEXT
- `inicioCaja`: REAL
- `ventas`: REAL
- `gastos`: REAL
- `retiros`: REAL
- `estado`: TEXT ('abierto', 'cerrado')

### gastos
- `id`: INTEGER PRIMARY KEY
- `descripcion`: TEXT
- `monto`: REAL
- `fecha`: TEXT
- `hora`: TEXT
- `estado`: TEXT

### logs_auditoria
- `id`: INTEGER PRIMARY KEY
- `usuario`: TEXT
- `accion`: TEXT
- `detalles`: TEXT
- `fecha`: TEXT
- `hora`: TEXT

### pedidos
- `id`: INTEGER PRIMARY KEY
- `tipo`: TEXT ('mesa', 'domicilio', 'llevar')
- `mesaId`: INTEGER
- `mesaNumero`: TEXT
- `cliente`: TEXT (JSON)
- `platos`: TEXT (JSON)
- `total`: REAL
- `metodo_pago`: TEXT
- `estado`: TEXT ('pendiente', 'cocinando', 'listo', 'pagado', 'cancelado')
- `fecha`: TEXT
- `fecha_creacion`: DATETIME DEFAULT CURRENT_TIMESTAMP
