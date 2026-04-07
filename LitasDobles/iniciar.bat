@echo off
setlocal enabledelayedexpansion
title Monitor Sismico - Listas Doblemente Enlazadas

echo.
echo  =====================================================
echo   Monitor Sismico con Capas Geologicas
echo   Listas Doblemente Enlazadas - Python + Flask
echo  =====================================================
echo.

set PYTHON_CMD=

:: ── Try uv (fastest, if user installed via uv) ──────────────────────────────
where uv >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Se encontro uv. Usando uv para ejecutar el proyecto.
    echo.
    echo [1/2] Instalando dependencias con uv...
    uv pip install flask flask-cors --quiet 2>nul
    if !errorlevel! neq 0 (
        uv venv --quiet 2>nul
        uv pip install flask flask-cors --quiet
    )
    echo [2/2] Iniciando servidor Flask...
    echo.
    echo  Abre tu navegador en: http://localhost:5000
    echo  Presiona Ctrl+C para detener.
    echo.
    uv run python app.py
    goto :end
)

:: ── Try python (standard) ────────────────────────────────────────────────────
where python >nul 2>&1
if %errorlevel% == 0 (
    python --version 2>&1 | findstr /R "Python [23]\." >nul
    if !errorlevel! == 0 (
        set PYTHON_CMD=python
        goto :run_python
    )
)

:: ── Try python3 ──────────────────────────────────────────────────────────────
where python3 >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=python3
    goto :run_python
)

:: ── Try py launcher ──────────────────────────────────────────────────────────
where py >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=py
    goto :run_python
)

:: ── Not found ────────────────────────────────────────────────────────────────
echo [ERROR] No se encontro Python ni uv en el sistema.
echo.
echo  Opciones para instalar Python:
echo   1. Descarga Python desde: https://www.python.org/downloads/
echo      (marcando "Add Python to PATH" al instalar)
echo   2. O instala uv desde: https://docs.astral.sh/uv/
echo      powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
echo.
pause
exit /b 1

:run_python
echo [OK] Python encontrado: %PYTHON_CMD%
echo.
echo [1/2] Instalando dependencias...
%PYTHON_CMD% -m pip install flask flask-cors --quiet
echo [2/2] Iniciando servidor Flask...
echo.
echo  Abre tu navegador en: http://localhost:5000
echo  Presiona Ctrl+C para detener.
echo.
%PYTHON_CMD% app.py

:end
echo.
echo  Servidor detenido.
pause
