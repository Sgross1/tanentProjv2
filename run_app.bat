@echo off
if exist secrets.bat call secrets.bat
echo ===================================================
echo   Tenant Rating - One Click Setup & Run
echo ===================================================
echo.
echo [1/3] Checking environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: .NET SDK is not installed or not in PATH.
    echo Please install .NET 9 SDK.
    pause
    exit /b
)

echo.
echo [2/3] Installing Client Dependencies (Angular)...
echo This might take a few minutes...
cd TenantRating.Client
call npm install
if %errorlevel% neq 0 (
    echo Error installing NPM packages.
    pause
    exit /b
)

echo.
echo [3/3] Starting Application...
echo Starting Angular Client (opens in browser)...
start "Tenant Rating Client" npm start

echo Starting .NET API Server...
cd ..\TenantRating.API
start "Tenant Rating Server" cmd /k "dotnet run --urls=http://localhost:5000"

echo.
echo DONE! The app should be running now.
echo Client: http://localhost:4200
echo Server: http://localhost:5000/swagger
echo.
pause
