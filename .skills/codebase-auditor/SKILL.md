---
name: codebase-auditor
description: Proporciona un análisis profundo y mapeo detallado del código de TaqueriaPOS. Úsalo al inicio de cada sesión para entender la arquitectura, lógica de precios, sincronización y dependencias sin tener que re-leer los archivos.
---

# Codebase Auditor - TaqueriaPOS

Esta habilidad te permite acceder instantáneamente al conocimiento estructurado del proyecto TaqueriaPOS, optimizando el uso del contexto.

## Guía de Uso

1. **Arquitectura y Archivos**: Consulta [architecture.md](references/architecture.md) para ver el desglose de cada módulo (app, db, sync, router, printer) y cómo interactúan.
2. **Lógica de Negocio**: Consulta [logic.md](references/logic.md) para detalles específicos sobre:
   - Reglas de precios dinámicos (extras premium).
   - Protocolo de sincronización (Caja vs Mesero).
   - Estructura de la base de datos (SQLite).
   - Flujo de impresión ESC/POS.

## Cuándo usarla
- Al inicio de una nueva tarea para recordar las dependencias.
- Antes de modificar el cálculo de totales o la sincronización.
- Para entender el flujo de navegación de la SPA en `router.js`.

## Referencias
- [Mapeo Arquitectónico](references/architecture.md)
- [Reglas y Lógica Crítica](references/logic.md)
