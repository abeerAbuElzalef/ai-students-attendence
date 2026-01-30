@echo off
chcp 65001 >nul
title מערכת נוכחות תלמידים - Student Attendance System

echo ══════════════════════════════════════════════════════════
echo     מערכת נוכחות תלמידים - Student Attendance System
echo ══════════════════════════════════════════════════════════
echo.

cd /d C:\ai-students-attendance

:: Check if ports are in use and kill existing processes
echo [1/4] Checking for existing processes...

:: Kill process on port 3001 (backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo      Stopping backend process (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 3000 (frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo      Stopping frontend process (PID: %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: Small delay to ensure ports are freed
timeout /t 2 /nobreak >nul

echo      Done!
echo.

:: Start Backend
echo [2/4] Starting backend server...
cd backend
start /B cmd /c "node server.js"
cd ..

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul
echo      Backend running on http://localhost:3001
echo.

:: Start Frontend
echo [3/4] Starting frontend server...
cd frontend
start /B cmd /c "npm run dev"
cd ..

:: Wait for frontend to initialize
timeout /t 5 /nobreak >nul
echo      Frontend running on http://localhost:3000
echo.

:: Open browser
echo [4/4] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ══════════════════════════════════════════════════════════
echo     System is running! 
echo     Open: http://localhost:3000
echo ══════════════════════════════════════════════════════════
echo.
echo Press any key to STOP the system and close...
pause >nul

:: Cleanup - kill processes when user closes
echo.
echo Stopping system...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo System stopped. Goodbye!
timeout /t 2 /nobreak >nul
