@echo off
setlocal
:: TaqueriaPOS - Script de Compilación Profesional
:: Genera el APK con un solo clic asegurando el entorno correcto.

title TAQUERIA POS - GENERADOR DE APK

echo --------------------------------------------------
echo   TAQUERIA POS - SISTEMA DE COMPILACION
echo --------------------------------------------------

:: Configurar JAVA_HOME local (JDK 21 incluido en el proyecto)
echo [1/4] Configurando entorno Java (JDK 21 Local)...
set "JAVA_HOME=%~dp0jdk-21.0.11"
set "PATH=%JAVA_HOME%\bin;%PATH%"

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo.
    echo ERROR: No se encontro el JDK en %JAVA_HOME%
    echo Asegurate de que la carpeta 'jdk-21.0.11' este en la raiz del proyecto.
    pause
    exit /b 1
)

java -version
echo.

echo [2/4] Sincronizando archivos web y plugins...
:: Usamos copy y sync para asegurar que los cambios en www se reflejen
call npx cap copy
call npx cap sync android

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Error al sincronizar con Capacitor.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Compilando APK (Debug)...
cd android
:: Limpiamos antes de compilar para evitar inconsistencias
call .\gradlew.bat clean assembleDebug

if %errorlevel% neq 0 (
    echo.
    echo ERROR: La compilacion de Gradle fallo.
    cd ..
    pause
    exit /b %errorlevel%
)

echo.
echo [4/4] Finalizando...
cd ..
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk

if exist "%APK_PATH%" (
    echo.
    echo --------------------------------------------------
    echo   ¡EXITO! APK Generada correctamente.
    echo --------------------------------------------------
    :: LOG DE VERSION EN MEMORY.MD
    echo - [%date% %time%] APK Generado con exito. >> MEMORY.md
    echo.
    echo Ubicacion: %APK_PATH%
    echo.
    echo Presiona cualquier tecla para abrir la carpeta del APK...
    pause >nul
    explorer /select,"%APK_PATH%"
) else (
    echo.
    echo ERROR: No se encontro el archivo APK generado.
    pause
)

endlocal
