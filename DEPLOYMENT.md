# Billboard Marketplace — Full Cloud Deployment Guide

## Architecture
```
Display Laptop (anywhere) ──WebSocket──► Railway (Backend + Socket.io)
Seller/Buyer Browser      ──HTTPS────►  Vercel  (React Frontend)
                                              │
                                        MongoDB Atlas (Database)
                                        Railway /uploads (Ad files)
```

---

## Step 1 — MongoDB Atlas (Free Database)

1. Go to https://cloud.mongodb.com → Sign up free
2. Create a free cluster (M0 — free forever)
3. Under "Database Access" → Add a user (e.g. `billboarduser` / strong password)
4. Under "Network Access" → Add IP Address → Allow access from anywhere (0.0.0.0/0)
5. Click "Connect" → "Compass" → copy the connection string:
   ```
   mongodb+srv://billboarduser:<password>@cluster0.xxxxx.mongodb.net/billboard
   ```
   Replace `<password>` with your actual password.

---

## Step 2 — Deploy Backend to Railway (Free)

1. Go to https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo
   (OR use CLI: `npm install -g @railway/cli && railway login && cd backend && railway init && railway up`)
3. In Railway dashboard → Variables tab → Add these:
   ```
   MONGO_URI     = mongodb+srv://billboarduser:pass@cluster0.xxxxx.mongodb.net/billboard
   JWT_SECRET    = any_long_random_string_here_make_it_32chars
   PORT          = 5000
   CLIENT_URL    = https://your-app.vercel.app   ← add this AFTER Vercel deploy
   ```
4. Railway auto-detects Node.js and runs `node server.js`
5. Copy your Railway URL: `https://billboard-backend-xxxx.up.railway.app`

---

## Step 3 — Deploy Frontend to Vercel (Free)

1. Push code to GitHub (or use Vercel CLI)
2. Go to https://vercel.com → Import project → select your repo
3. Set Root Directory to `frontend`
4. Add Environment Variable:
   ```
   REACT_APP_API_URL = https://billboard-backend-xxxx.up.railway.app
   ```
5. Deploy → copy your Vercel URL: `https://billboard-xxxx.vercel.app`

6. Go back to Railway → update `CLIENT_URL` to your Vercel URL → redeploy

---

## Step 4 — Set Up Display Laptop (the billboard screen)

### One-time setup on the display laptop:

**Install Chrome/Chromium** (if not already installed)

**Create a startup script** — save as `start-billboard.sh`:
```bash
#!/bin/bash
# Replace DEVICE_ID with your actual device's MongoDB _id
# (find it in the seller dashboard → View Playback → copy from URL)

DEVICE_ID="your_device_mongo_id_here"
APP_URL="https://billboard-xxxx.vercel.app"

# Wait for internet connection
while ! ping -c1 8.8.8.8 &>/dev/null; do sleep 2; done

# Launch Chrome in kiosk mode
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk \
  --disable-infobars \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --disable-component-update \
  --no-first-run \
  "$APP_URL/playback/$DEVICE_ID"
```

**Make it executable:**
```bash
chmod +x start-billboard.sh
```

**Run it:**
```bash
./start-billboard.sh
```

### Auto-start on boot (Mac):
1. Open "System Settings" → "General" → "Login Items"
2. Add your `start-billboard.sh` script

OR create a Launch Agent:
```xml
<!-- ~/Library/LaunchAgents/com.billboard.display.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.billboard.display</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/YOUR_USERNAME/start-billboard.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
```
Then run: `launchctl load ~/Library/LaunchAgents/com.billboard.display.plist`

### Auto-start on boot (Windows):
1. Press Win+R → type `shell:startup`
2. Create a shortcut to a `.bat` file:
```batch
@echo off
timeout /t 10
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-infobars "https://billboard-xxxx.vercel.app/playback/YOUR_DEVICE_ID"
```

### Auto-start on boot (Linux):
```bash
# ~/.config/autostart/billboard.desktop
[Desktop Entry]
Type=Application
Name=Billboard Display
Exec=chromium-browser --kiosk --disable-infobars https://billboard-xxxx.vercel.app/playback/YOUR_DEVICE_ID
Hidden=false
X-GNOME-Autostart-enabled=true
```

---

## Step 5 — Register Your Device as a Seller

1. Open `https://billboard-xxxx.vercel.app` on ANY laptop/phone
2. Sign up → you're automatically a Buyer
3. Click "Switch to Seller" in the navbar
4. Go to "List New Device" → fill in your display laptop's details
5. Save → note the Device ID
6. Click "View Playback" → copy the URL (it ends in `/playback/MONGO_ID`)
7. Paste that MONGO_ID into your `start-billboard.sh` on the display laptop

---

## Step 6 — How Ads Display Remotely

```
Buyer uploads ad on Vercel app
        │
        ▼
Railway backend saves ad to DB + emits Socket.io event to device room
        │
        ▼
Display laptop browser (open to /playback/DEVICE_ID) receives WebSocket event
        │
        ▼
Ad appears on screen instantly (no refresh needed)
```

The display laptop only needs:
- Internet connection
- Chrome open to the playback URL
- No login required on the display device

---

## Quick Reference URLs (fill in after deployment)

| What | URL |
|------|-----|
| Frontend (buyers/sellers) | https://billboard-xxxx.vercel.app |
| Backend API | https://billboard-backend-xxxx.up.railway.app |
| Display laptop URL | https://billboard-xxxx.vercel.app/playback/DEVICE_ID |
| MongoDB Atlas | https://cloud.mongodb.com |

---

## Troubleshooting

**Ads not showing on display laptop?**
- Check Railway logs for socket errors
- Make sure `CLIENT_URL` in Railway matches your Vercel URL exactly (no trailing slash)
- Open browser console on display laptop — look for WebSocket connection errors

**CORS errors?**
- In Railway env vars, set `CLIENT_URL=https://your-exact-vercel-url.vercel.app`
- Redeploy Railway after changing env vars

**File uploads not working in production?**
- Railway's filesystem is ephemeral — uploaded files disappear on redeploy
- For production, migrate uploads to AWS S3 or Cloudflare R2 (ask me to add this)

**MongoDB connection refused?**
- Make sure Network Access in Atlas allows `0.0.0.0/0`
- Double-check the connection string has correct password
