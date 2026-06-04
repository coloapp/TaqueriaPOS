---
name: taqueria-ops
description: Specialized skill for TaqueriaPOS maintenance and synchronization. Use when modifying core logic (DB, Router, Printer) to ensure context efficiency and prevent file corruption.
---
# Taqueria-Ops

## Procedimientos Core

### 1. Modificación de DB (db.js)
- **SIEMPRE** verifica la presencia de funciones críticas: `verificarActivacion`, `addEmpleado`, `guardarPedido`.
- Al usar `replace`, incluye suficiente contexto para evitar cortes accidentales del archivo.
- **NO** elimines las funciones de persistencia de SQLite.

### 2. Sincronización e Impresión
- Comandas (Cocina) -> MAC de Cocina (si está activa).
- Tickets (Caja) -> MAC de Caja.
- Formatos: 58mm (default) o 80mm.

### 3. Workflow de Activación
- Paso 1: Datos Local + Código (ID Equipo al revés).
- Paso 2: Usuario Admin + PIN (4 dígitos).

## Referencias Rápidas
- Ver [architecture.md](../codebase-auditor/references/architecture.md) para mapeo de archivos.
- Ver [logic.md](../codebase-auditor/references/logic.md) para reglas de negocio.
