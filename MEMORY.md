# TaqueriaPOS - Memoria del Proyecto

## Visión General
Sistema de punto de venta (POS) offline para una taquería. Gestión de ventas, inventario y pedidos.
- **Plataforma:** Android (APK via Capacitor).
- **Tecnología:** HTML, CSS, JS (Vanilla), SQLite.
- **Modo:** 100% Offline (sin internet, sin servidor en la nube).

## Roles del Sistema
1. **Mesero:** Toma pedidos en mesas.
2. **Cajera:** Gestiona pedidos a domicilio (Tel/WA), para llevar (en fila) y cobros.
3. **Taquero:** Recibe órdenes (Monitor de cocina / Impresión).

## Desafíos Técnicos
- **Sincronización:** Lograr que múltiples dispositivos se comuniquen sin internet/servidor central.
- **Impresión:** Evitar daño por calor/humo.
- **Entorno:** Grasa y humo dificultan el uso de monitores estándar.

## Menú
- **Tacos:** Pastor, suadero, cabeza, chorizo, bistec, arrachera, lengua, sesos, carnaza.
- **Otros:** Quesadillas, lonches, volcanes, papa rellena.
- **Bebidas:** Aguas (Jamaica/Horchata 1L/0.5L), Refrescos (Coca 0.5L).

## Estado del Proyecto: FASE PROTOTIPO FINALIZADA
- [x] Arquitectura de Sincronización Local (ZeroConf Discovery + HTTP Server).
- [x] UI Premium con Vanilla CSS (Implementado en `style.css` y `router.js`).
- [x] Lógica de Impresión Profesional ESC/POS (PDF Virtual + Native Sharing).
- [x] Seguridad por PIN y Autorización de Dispositivos (Implementado).
- [x] Persistencia de Datos Offline (SQLite con `@capacitor-community/sqlite`).
- [x] Gestión de Agotados, Fiado y Descuentos (Implementado).

## Análisis Técnico (Agente - 05/06/2026)
- **Frontend:** SPA con Vanilla JS. Navegación basada en templates en strings.
- **Persistencia:** `db.js` usa SQLite nativo. Se implementó `saveToStore()` para asegurar persistencia en Android.
- **Comunicación:** `sync.js` maneja el rol de Caja (Servidor) y Mesero (Cliente). Usa ZeroConf para auto-descubrimiento.
- **Impresión:** `printer.js` genera tickets ESC/POS y PDF para compartir vía WhatsApp.

## Pendientes Críticos
1. **Refinamiento de Sincronización:** Asegurar estabilidad del servidor HTTP en segundo plano en Android.
2. **Pruebas de Impresión Física:** Validar con impresoras Bluetooth reales (comprobar comandos ESC/POS).
3. **Optimización de UI:** Posible migración de templates a archivos externos si el tamaño de `router.js` sigue creciendo.
4. **Seguridad:** Implementar niveles de acceso más granulares si el cliente lo requiere.

## Log de Cambios Recientes
- [05/06/2026] Implementación de funciones de Agotado, Fiado y Descuentos.
- [05/06/2026] Corrección crítica de persistencia SQLite agregando `saveToStore()`.
- [05/06/2026] Actualización de esquema SQL para coincidir con la lógica de negocio actual.
- [05/06/2026 15:52:39.44] APK Generado con exito. 
- [05/06/2026 17:14:31.95] APK Generado con exito. 
- [05/06/2026 17:24:21.38] APK Generado con exito. 
- [05/06/2026 18:25:00.25] APK Generado con exito. 
- [06/06/2026  2:52:21.62] APK Generado con exito. 
- [06/06/2026  3:03:59.59] APK Generado con exito. 
- [06/06/2026  3:18:35.42] APK Generado con exito. 
- [06/06/2026 15:42:39.74] APK Generado con exito. 
- [06/06/2026 16:18:03.62] APK Generado con exito. 
- [06/06/2026 16:46:19.03] APK Generado con exito. 
- [07/06/2026 15:59:43.93] APK Generado con exito. 
- [07/06/2026 16:19:02.98] APK Generado con exito. 
- [07/06/2026 16:46:19.52] APK Generado con exito. 
- [07/06/2026 17:50:46.02] APK Generado con exito. 
