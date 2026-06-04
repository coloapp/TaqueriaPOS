# Arquitectura de TaqueriaPOS

## Visión General
El proyecto es una **SPA (Single Page Application)** construida con Vanilla JS, CSS y HTML, empaquetada con **Capacitor**. Utiliza un modelo de persistencia local y sincronización inalámbrica ad-hoc.

## Módulos Principales

### 1. `app.js` (Orquestador)
- **Función**: Punto de entrada. Maneja el splash screen, activación de licencia y arranque de UI.
- **Flujo**: `init()` -> `db.init()` -> `sync.init()` -> `startUI()`.
- **Seguridad**: Pantalla de activación basada en `deviceId`.

### 2. `db.js` (Capa de Datos y Negocio)
- **Tecnología**: `@capacitor-community/sqlite`.
- **Caché**: Mantiene objetos en memoria (`productos`, `carnes`, `mesas`) para UI instantánea.
- **Lógica de Precios**: Centralizada en `calcularTotal`.
- **Turnos**: Maneja `abrirTurno` y `cerrarTurno` (Corte de caja).

### 3. `sync.js` (Sincronización Offline)
- **Roles**:
  - **Caja**: Servidor HTTP (puerto 8080) + Zeroconf Broadcast.
  - **Mesero**: Zeroconf Watcher + Cliente HTTP + Cola Offline (`localStorage`).
- **Endpoint**: `POST /api/pedido`.

### 4. `router.js` (Navegación y Plantillas)
- **Patrón**: Manipulación directa del DOM basada en un `switch` de vistas.
- **Templates**: Almacenados como literales de cadena dentro de las funciones `renderView`.
- **Estado de Orden**: Gestiona el objeto `ordenActual` mientras el usuario agrega ítems.

### 5. `printer.js` (Impresión ESC/POS)
- **Formato**: Genera comandos raw (`\u001B`, `\u001D`) para tickets de 58mm/80mm.
- **Tickets**: `KitchenOrder` (Cocina) y `Bill` (Cuenta).

## Dependencias de Archivos
- `app.js` -> `db.js`, `sync.js`, `router.js`
- `router.js` -> `db.js`, `sync.js`, `printer.js`
- `sync.js` -> `db.js`, `app.js`
- `printer.js` -> `db.js`
