@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 or newer from https://nodejs.org/
  echo Then open START-SHOHSTORE.bat again.
  pause
  exit /b 1
)
node scripts\launch.mjs
if errorlevel 1 pause
endlocal
