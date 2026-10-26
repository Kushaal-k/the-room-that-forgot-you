@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.21 or newer from https://nodejs.org and run this again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing the museum's open-source dependencies...
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Preparing the stable museum build...
call npm.cmd run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo Opening Greyhaven Museum. Keep this window open while playing.
call npm.cmd run preview -- --open
pause
