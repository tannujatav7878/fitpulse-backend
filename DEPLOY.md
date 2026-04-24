# FitPulse Website - Deployment Guide

This guide shows how to deploy FitPulse to any popular hosting platform.
The ZIP is configured for **Render, Railway, Heroku, Fly.io, Replit**, and any **VPS / shared Node.js host**.

---

## Quick Local Test (before deploying)

```bash
npm install
npm start
```
Open http://localhost:3000 — that's it.

---

## Option 1 — Render.com  (FREE, recommended)

1. Push this folder to a new GitHub repo.
2. Go to https://render.com → **New → Web Service**.
3. Connect your repo.
4. Render auto-detects `render.yaml` — just click **Create Web Service**.
5. Wait 2 minutes — your site is live at `https://your-app.onrender.com`.

(No manual config needed. `render.yaml` is included.)

---

## Option 2 — Railway.app

1. Go to https://railway.app → **New Project → Deploy from GitHub Repo**.
2. Select this repo.
3. Railway auto-detects Node.js, runs `npm install` and `npm start`.
4. Click **Generate Domain** — done.

---

## Option 3 — Heroku

```bash
heroku login
heroku create fitpulse-app
git push heroku main
```
The included `Procfile` tells Heroku how to start.

---

## Option 4 — Fly.io

```bash
fly launch        # accepts defaults from fly.toml
fly deploy
```

---

## Option 5 — Replit

1. Go to https://replit.com → **Create Repl → Import from upload**.
2. Upload this ZIP.
3. Click **Run** — Replit reads `.replit` and starts the server.

---

## Option 6 — Your own VPS (Ubuntu / Debian)

```bash
# 1. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Upload this folder (e.g. via scp or git)
cd FitPulse-Website
npm install
npm start

# 3. (Optional) Run forever with PM2
sudo npm install -g pm2
pm2 start server.js --name fitpulse
pm2 startup
pm2 save
```

Use **nginx** or **Caddy** to put HTTPS in front of port 3000.

---

## Environment Variables (optional)

| Variable | Default | Description           |
|----------|---------|-----------------------|
| `PORT`   | `3000`  | Port the server binds |

---

## What's stored?

A single SQLite file (`fitpulse.db`) is created next to `server.js`.
On free hosts with ephemeral storage (Heroku, Render free tier), data may
reset on redeploy. For persistence, attach a disk volume in your host's
dashboard pointing to the project folder.

---

## Demo Account
- Email: `demo@fitpulse.app`
- Password: `demo123`
(Auto-created on first launch.)
