@echo off
REM ─────────────────────────────────────────────
REM Billboard Display Startup Script (Windows)
REM ─────────────────────────────────────────────

SET APP_URL=https://your-app.vercel.app
SET DEVICE_ID=your_device_mongo_id_here

echo Starting Billboard Display...
timeout /t 10 /nobreak

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --kiosk ^
  --disable-infobars ^
  --noerrdialogs ^
  --disable-session-crashed-bubble ^
  --no-first-run ^
  "%APP_URL%/playback/%DEVICE_ID%"
