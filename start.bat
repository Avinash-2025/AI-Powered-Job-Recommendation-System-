@echo off
title Dream Job Finder - Starting Servers...

echo ============================================
echo    Dream Job Finder - Development Servers
echo ============================================
echo.

:: Start Backend (Flask) in a new window
echo [*] Starting Backend (Flask) on http://localhost:5000 ...
start "Dream Job Finder - Backend" cmd /k "cd /d %~dp0 && python backend\app.py"

:: Small delay to let backend initialize first
timeout /t 3 /nobreak >nul

:: Start Frontend (Vite) in a new window
echo [*] Starting Frontend (Vite) on http://localhost:8080 ...
start "Dream Job Finder - Frontend" cmd /k "cd /d %~dp0 && npx.cmd vite --host 0.0.0.0"

echo.
echo ============================================
echo    Both servers are starting!
echo.
echo    Frontend : http://localhost:8080
echo    Backend  : http://localhost:5000
echo    Health   : http://localhost:5000/api/health
echo ============================================
echo.
echo Close the backend and frontend windows to stop the servers.
pause
