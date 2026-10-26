@echo off
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required to start UFO Blaster Freeze Tag.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

echo Starting UFO Blaster Freeze Tag...

start "UFO Blaster Freeze Tag Server" cmd /k "npm.cmd run dev -- --host 127.0.0.1"

powershell.exe -NoProfile -Command "$deadline = (Get-Date).AddMinutes(8); while ((Get-Date) -lt $deadline) { try { $reply = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5174/freeze-tag/' -TimeoutSec 1; if ($reply.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo The game server did not start. Check the server window for details.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5174/freeze-tag/"
exit /b 0
