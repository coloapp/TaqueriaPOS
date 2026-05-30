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

## Estado del Proyecto: DESARROLLO ACTIVO (Sincronización Git)
- [x] Repositorio Git configurado y vinculado a GitHub (Privado).
- [x] Respaldo de Memoria (MEMORY.md incluido en Git).
- [x] Flujo de trabajo automatizado: Commit y Push después de cada cambio validado.
- [x] Seguridad: Dual PIN (Admin/Staff) activo y funcional.
- [x] Robustez: Cola de sincronización offline operativa.
- [x] Precios: Sistema flexible de "Extras Premium" configurable en Ajustes.
- [x] Catálogo: Rediseño total con gestión CRUD de categorías y productos.
- [x] UI/UX: Restauración de Constructor de Mesas (Croquis) y área de Personal (HRM).
- [x] Analíticas: Métricas de rendimiento por tipo de carne en Dashboard.

## Análisis Técnico (Actualización 30/05/2026)
- **Control de Versiones:** Se utiliza un enfoque de "Continuous Sync" para evitar pérdida de datos, especialmente ante el próximo formateo de la máquina del usuario.
- **Instrucciones:** `GEMINI.md` contiene ahora el mandato de sincronización automática.
- **Respaldo:** El repositorio privado en GitHub sirve como "nube" para el proyecto y la memoria del agente.

## Próximos Pasos Identificados
1. **QR Dinámico:** Generar el QR de pago basado en los datos bancarios de la configuración.
2. **Impresión Física:** Validar los comandos ESC/POS con impresoras térmicas Bluetooth reales.
3. **Refactorización:** Mover los componentes UI a archivos externos para mayor limpieza.

## Log de Cambios (Automático)
- [29/05/2026 15:30:00] APK Generado con éxito. (Fase 1)
- [29/05/2026 17:00:00] APK Generado con éxito. (Fase 2: Seguridad y Catálogo)
- [29/05/2026 17:40:00] APK Generado con éxito. (Fase Final: Precios Flexibles y Restauración UI)
- [29/05/2026 17:55:59.52] APK Generado con exito. 
- [29/05/2026 18:08:21.62] APK Generado con exito. 
- [29/05/2026 18:24:53.89] APK Generado con exito. 
- [29/05/2026 18:33:16.12] APK Generado con exito. 
