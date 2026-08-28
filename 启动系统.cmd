@echo off
setlocal

set "LAUNCHER=%~dp0scripts\entry-launcher.ps1"

if not exist "%LAUNCHER%" (
  echo Launcher not found: "%LAUNCHER%"
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%" "cqtools://start?source=cmd"
if errorlevel 1 (
  echo Startup failed. Please check the CQ Tools launcher log.
  pause
  exit /b 1
)

endlocal
