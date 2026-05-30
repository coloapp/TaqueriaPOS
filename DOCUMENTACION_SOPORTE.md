# TaqueriaPOS - Documentación Técnica y de Compilación

Este documento detalla la solución al problema de persistencia de activación y el nuevo flujo de compilación del proyecto.

## 1. Problema de Activación (Corregido)

### Síntoma
La aplicación solicitaba el código de activación cada vez que se cerraba y abría, perdiendo la configuración del negocio (nombre, teléfono, etc.).

### Causa Raíz
1. **Carrera de hilos (Race Condition):** La app iniciaba la lógica de base de datos antes de que el motor de Capacitor estuviera listo.
2. **Buffering de SQLite:** Los cambios en la base de datos se mantenían en memoria pero no siempre se escribían físicamente en el archivo `.db` del celular al cerrar la app.
3. **Falta de Redundancia:** No había un mecanismo de recuperación si el archivo de base de datos se bloqueaba momentáneamente al inicio.

### Solución Implementada
Se aplicó una estrategia de **Persistencia Multicapa**:

*   **Evento de Dispositivo:** En `app.js`, se cambió `DOMContentLoaded` por `deviceready`. La app ahora espera a que el hardware y los plugins estén al 100% antes de intentar leer la licencia.
*   **Escritura Forzada (Flush):** En `db.js`, se implementó `this.dbConn.saveToStore()`. Esto obliga a Android a guardar físicamente los datos en el almacenamiento interno inmediatamente después de activar la app.
*   **Respaldo LocalStorage:** Se añadió un "espejo" de la configuración en el `localStorage` del navegador interno. Si SQLite falla, la app recupera la activación desde este respaldo, evitando que el usuario vea la pantalla de bloqueo.

---

## 2. Sistema de Compilación (`compilar.bat`)

Se ha actualizado el script para que cualquier persona pueda generar el APK con un solo clic sin configurar nada en su computadora.

### Requisitos Incluidos en el Proyecto
- **JDK 21:** Ubicado en la carpeta `jdk-21.0.11/`. El script lo usa automáticamente.
- **Android Studio / Gradle:** El proyecto contiene su propio `gradlew` para compilar.

### Pasos para Compilar
1. Asegúrate de que tu celular no esté bloqueando la conexión USB (si vas a instalarlo directo) o simplemente ejecuta el archivo.
2. Haz doble clic en `compilar.bat`.
3. El script realizará:
    - Configuración del entorno Java local.
    - Sincronización de archivos web (`www`) hacia Android.
    - Limpieza de compilaciones previas (`clean`).
    - Generación del nuevo APK (`assembleDebug`).
4. Al finalizar, se abrirá la carpeta `android\app\build\outputs\apk\debug\` con el archivo `app-debug.apk`.

---

## 3. Estructura de Archivos Clave

- `www/js/app.js`: Controla el ciclo de vida de inicio y la UI de activación.
- `www/js/db.js`: Maneja la base de datos SQLite y el respaldo de configuración.
- `compilar.bat`: Script automatizado de construcción.
- `sql/schema.sql`: Estructura inicial de las tablas de la base de datos.

---

## 4. Notas para Desarrolladores
- **Cambios en UI:** Si modificas algo en la carpeta `www`, debes ejecutar `compilar.bat` para que los cambios se vean en el APK.
- **ID de Dispositivo:** El ID que se muestra en la pantalla de activación es único por instalación. El código de activación es ese mismo ID escrito al revés (ej: `ABC-123` -> `321-CBA`).
