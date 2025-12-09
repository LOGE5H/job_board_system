@echo off
echo Starting Job Portal Servers...
echo.

:: Start MongoDB check
echo Checking MongoDB connection...

:: Start Backend Server
echo Starting Backend Server on port 5000...
start "Backend Server" cmd /k "cd /d d:\NOOO\job-portal\backend && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 /nobreak > nul

:: Start Frontend Server
echo Starting Frontend Server on port 3000...
start "Frontend Server" cmd /k "cd /d d:\NOOO\job-portal\frontend && npm run dev"

echo.
echo ========================================
echo Servers are starting...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo You can close this window.
pause
