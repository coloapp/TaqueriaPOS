# Manual Técnico - TaqueriaPOS

Este manual te permite mantener el sistema sin necesidad de internet ni ayuda externa.

## 1. Cómo cambiar Precios o Colores
- **Precios:** Ve a la carpeta `www/js/db.js` y busca la sección `productos`. Cambia los números y guarda el archivo.
- **Colores:** Ve a `www/css/style.css` y cambia los códigos de color en `:root`.
- **Textos:** Busca el texto en `www/index.html` o `www/js/router.js`.

## 2. Cómo generar la nueva APK (Instalador)
Cada vez que hagas un cambio, debes "reconstruir" la aplicación:
1. Haz doble clic en el archivo `compilar.bat` que está en la carpeta principal.
2. Espera a que termine (dirá "¡EXITO!").
3. Ve a la carpeta: `android/app/build/outputs/apk/debug/`.
4. Ahí verás un archivo llamado `app-debug.apk`. Ese es el que instalas en los equipos.

## 3. Configuración de Red (Sin Internet)
Para que los meseros se conecten a la caja:
1. Conecta todos los equipos al mismo router WiFi (no importa si no tiene internet).
2. En la tablet de la Caja, ve a ajustes de Android y busca su "Dirección IP" (ej: 192.168.1.15).
3. En el celular del Mesero, abre la app y pon esa IP cuando te la pida.
4. Autoriza el dispositivo en la Caja (Botón de engranaje -> PIN 1234 -> Dispositivos).

## 5. Activación del Sistema (Seguridad)
El sistema de **Caja Central** requiere activación para funcionar. Esto te permite controlar el uso de la aplicación principal:
1. Al abrir la app en un nuevo dispositivo de Caja, aparecerá un **ID de Dispositivo** (ej: `TPOS-A1B2...`).
2. El cliente debe enviarte ese ID por WhatsApp.
3. El **Código de Activación** para esta versión es el **ID escrito al revés**. 
   - Ejemplo: Si el ID es `TPOS-123`, el código es `321-SOPT`.
4. Una vez activado, el dispositivo queda vinculado permanentemente como la Caja Central. Los meseros no requieren activación.

## 6. Control de Turnos y Cortes
- **Inicio de Día:** Al entrar a "Caja", si el turno no ha iniciado, se debe ingresar el "Fondo de Caja" (dinero inicial para cambio).
- **Cierre de Turno:** Al final de la jornada, usa el botón "Realizar Corte". El sistema te pedirá el efectivo real en caja y te dirá si hay sobrantes o faltantes.

## 7. Dashboard y Gastos
- **Gastos:** Registra compras (carne, verdura, etc.) en el menú lateral -> "Gestor de Gastos".
- **Dashboard:** Mira las ganancias netas (Ventas menos Gastos) y el historial de carnes que se agotaron para planear mejor tus compras futuras.
