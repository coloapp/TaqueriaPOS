# Proyecto TaqueriaPOS - Instrucciones para el Agente

Este archivo contiene reglas específicas para el desarrollo de este proyecto que deben ser seguidas por cualquier instancia de Gemini CLI.

## Flujo de Trabajo de Git (Control de Versiones Exhaustivo)

A solicitud del usuario, se ha establecido un flujo de trabajo de "Commit y Push Continuo":

1. **Frecuencia:** Después de cada cambio significativo o edición de archivos que haya sido validada, el agente DEBE realizar un commit descriptivo.
2. **Sincronización:** Cada commit debe ser seguido inmediatamente por un `git push origin main` para asegurar que el repositorio remoto esté siempre actualizado.
3. **Mensajes de Commit:** Los mensajes deben ser concisos y reflejar el cambio exacto realizado (ej: "Ajuste de estilos en el header", "Refactorización de db.js para manejo de errores").

## Prioridades del Proyecto
- Mantener la funcionalidad 100% offline.
- Asegurar que la persistencia de datos sea robusta (SQLite).
- Mantener la UI rápida y ligera con Vanilla JS/CSS.
