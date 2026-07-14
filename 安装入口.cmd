@echo off
setlocal
set LAUNCHER=%~dp0scripts\entry-launcher.ps1

if not exist %LAUNCHER% (
  echo Launcher not found: %LAUNCHER%
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File %LAUNCHER% -Install
if errorlevel 1 (
  echo Installation failed. Please send a screenshot to the maintainer.
  pause
  exit /b 1
)

endlocal
