# Railway Deployment Ready

**Status:** Complete - Ready for deployment

## Files Created for Railway

- `server.js` - Express backend with Groq primary and DeepSeek fallback chat integration
- `public/index.html` - Chat UI with Joe and Davis persona selector
- `package.json` - Dependencies configured (`express`, `cors`, `dotenv`)
- `railway.json` - Railway deployment config
- `Procfile` - Process definition for Railway
- `deploy-railway.ps1` - PowerShell deployment script
- `.gitignore` - Git ignore rules
- `.env` - Template with all required variables

## Configuration

**In `.env`:**
- `GROQ_API_KEY` = primary Groq key
- `GROQ_BASE_URL` = `https://api.groq.com/openai/v1`
- `GROQ_MODEL` = `llama-3.3-70b-versatile`
- `DEEPSEEK_API_KEY` = DeepSeek fallback key
- `DEEPSEEK_BASE_URL` = `https://api.deepseek.com`
- `DEEPSEEK_MODEL` = `deepseek-v4-flash`
- `PORT` = `3000` (Railway overrides this)
- `NODE_ENV` = `production`
- `RAILWAY_URL` = optional; only set it if you want startup logs to print the public Railway URL

**What the server does:**
1. Loads `brain.md` and `Actions/` system context automatically.
2. Serves Joe and Davis personas through one local chat surface.
3. Accepts chat messages with conversation history.
4. Calls Groq first and falls back to DeepSeek if Groq fails.
5. Returns real-time chat responses with provider metadata.

## How to Deploy

### Option 1: Railway CLI
```powershell
npm install -g @railway/cli
railway login
cd "C:\Users\ethan\Saved Games\ide"
railway up
```

### Option 2: Git Push
```powershell
git add .
git commit -m "/ide chat ready for Railway"
git push origin main
```

## After Deployment

1. Railway assigns a URL such as `https://your-app-xxxx.up.railway.app`
2. The frontend already uses relative `/api/*` routes, so no frontend code change is needed
3. Optional: update `.env` with `RAILWAY_URL=https://your-app-xxxx.up.railway.app` if you want startup logs to advertise the production URL

**Then tell me:**
- Your Railway URL
- Confirm Groq and DeepSeek env vars are set in Railway

## What You Get

- Independent `/ide` chat, not dependent on OpenClaw
- Joe and Davis personas ready to use
- Full `brain.md` plus `Actions/` workflow injected
- Real-time API-backed chat with Groq first and DeepSeek fallback
- Persistent Railway deployment
- Production-ready for self-growth and coding

**Ready to ship.**
