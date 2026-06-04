# Lógica Crítica y Reglas de Negocio

## 1. Cálculo de Totales (`db.calcularTotal`)
El sistema aplica precios dinámicos basados en la categoría y tipo de carne:
- **Tacos**: Precio fijo definido en el producto (ej: $19 o $25).
- **Especiales/Órdenes**: Si el producto `requiereCarne` y se elige una carne **Premium** (Tripa, Arrachera, Lengua, Labio, Sesos), se suma un extra:
  - `extraOrdenPremium`: $30 (configurable).
- **Lonches**: Extra de **$10** si se marca `conQueso`.
- **Comisiones**: Si el método es `tarjeta`, aplica `config.comisionTarjeta` %.
- **Domicilio**: Suma `cliente.zona` (costo de envío) si existe.

## 2. Protocolo de Sincronización
- **ID de Pedido**: `Date.now()`. Es vital para evitar duplicados en la base de datos de la Caja.
- **Flujo Mesero**:
  1. Crea pedido localmente.
  2. Intenta `POST` a IP de Caja.
  3. Si falla (red inestable), guarda en `offlineQueue`.
  4. Un intervalo procesa la cola cada 10s cuando la red vuelve.
- **Flujo Caja**:
  1. Recibe JSON.
  2. Ejecuta `db.guardarPedido()`.
  3. Si la vista actual es `cocina`, refresca automáticamente.

## 3. Seguridad y PINs
- **Niveles**:
  - `admin`: PIN configurable (default 1234). Requerido para cortes de caja, informes sensibles y ajustes.
  - `staff`: PIN configurable (default 0000). Requerido para abrir turno o acciones de supervisión básica.
- **Implementación**: `router.askForPin` bloquea la UI con un modal numérico.

## 4. Estructura SQLite (`initSchema`)
- **Tablas clave**:
  - `pedidos`: Cabecera (id, mesa_id, tipo, estado, total).
  - `pedido_detalles`: Ítems vinculados a un `plato_index` (permite agrupar "sin cebolla" por plato).
  - `config`: Almacén Key-Value para ajustes persistentes.
  - `carnes`: Control de inventario crítico (Agotado/Disponible).
