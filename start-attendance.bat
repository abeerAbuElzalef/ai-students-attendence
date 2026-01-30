@echo off
chcp 65001 >nul
title Student Attendance System

echo ===========================================================
echo     Student Attendance System - Starting...
echo ===========================================================
echo.

cd /d C:\ai-students-attendance

echo [1/4] Checking for existing processes...

:: Kill any node processes on our ports
taskkill /F /IM node.exe >nul 2>&1

:: Small delay to ensure ports are freed
ping localhost -n 3 >nul

echo      Done!
echo.

:: Start Backend
echo [2/4] Starting backend server...
cd backend
start "" /B cmd /c "node server.js"
cd ..

:: Wait for backend to initialize
ping localhost -n 4 >nul
echo      Backend running on http://localhost:3001
echo.

:: Start Frontend
echo [3/4] Starting frontend server...
cd frontend
start "" /B cmd /c "npm run dev"
cd ..

:: Wait for frontend to initialize
ping localhost -n 6 >nul
echo      Frontend running on http://localhost:3000
echo.

:: Open browser
echo [4/4] Opening browser...
ping localhost -n 3 >nul
start http://localhost:3000

echo.
echo ===========================================================
echo     System is running!
echo     Open: http://localhost:3000
echo ===========================================================
echo.
echo Press any key to STOP the system and close...
pause >nul

:: Cleanup - kill node processes when user closes
echo.
echo Stopping system...
taskkill /F /IM node.exe >nul 2>&1

echo System stopped. Goodbye!
ping localhost -n 3 >nul
