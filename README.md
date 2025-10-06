# Amir Realtime Demo (Ready for Deployment)

This is a ready-to-deploy React demo that shows **realtime prices** (via Binance public websocket) and **local demo trading** (Buy/Sell simulated trades that update a demo wallet balance).

## Features
- Realtime price ticks for multiple symbols (change them in UI)
- Local demo trading (Buy/Sell $1k by default), simulated positions and PnL
- Animated UI using framer-motion
- No API keys required (all client-side simulation)

## How to run locally
1. Install dependencies:
```bash
npm install
```
2. Run dev server:
```bash
npm run dev
```
3. Open the URL printed by Vite (e.g. http://localhost:5173).

## Deploy to Vercel (one-click flow)
1. Create a new GitHub repository and push this project.
2. Go to https://vercel.com/new and import the GitHub repo.
3. Vercel will auto-detect the project. Click **Deploy**.
4. The site will be live (e.g. https://your-repo.vercel.app).

If you want, I can provide exact Git commands to create the repo and push — or guide you step-by-step while you run them.

---
Note: For best visuals install Tailwind CSS and optionally add fonts. The app works without Tailwind but will look nicer with it.