#!/bin/bash
# ─────────────────────────────────────────────
# Billboard Display Startup Script
# Run this on the display laptop to show ads
# ─────────────────────────────────────────────

# 1. Set your Vercel frontend URL
APP_URL="https://your-app.vercel.app"

# 2. Set your device's MongoDB _id (from seller dashboard → View Playback → copy ID from URL)
DEVICE_ID="your_device_mongo_id_here"

echo "Starting Billboard Display..."
echo "App: $APP_URL/playback/$DEVICE_ID"

# Wait for internet
echo "Waiting for internet connection..."
while ! ping -c1 8.8.8.8 &>/dev/null; do sleep 2; done
echo "Internet connected."

# Detect OS and launch Chrome
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --kiosk \
    --disable-infobars \
    --noerrdialogs \
    --disable-session-crashed-bubble \
    --disable-component-update \
    --no-first-run \
    "$APP_URL/playback/$DEVICE_ID"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  chromium-browser \
    --kiosk \
    --disable-infobars \
    --noerrdialogs \
    "$APP_URL/playback/$DEVICE_ID"
else
  echo "Windows detected — run start-billboard.bat instead"
fi
