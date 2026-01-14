@echo off
echo Running Diagnostics... > debug_log.txt
echo Date: %date% %time% >> debug_log.txt

echo. >> debug_log.txt
echo [CHECK 1] Node.js Version: >> debug_log.txt
node -v >> debug_log.txt 2>&1
if %errorlevel% neq 0 echo Node.js NOT found for User >> debug_log.txt

echo. >> debug_log.txt
echo [CHECK 2] .NET SDK Version: >> debug_log.txt
dotnet --version >> debug_log.txt 2>&1
if %errorlevel% neq 0 echo READ HERE: .NET SDK NOT found >> debug_log.txt

echo. >> debug_log.txt
echo [CHECK 3] Project Directory: >> debug_log.txt
dir "TenantRating.Client" >> debug_log.txt 2>&1

echo Diagnostics Complete.
