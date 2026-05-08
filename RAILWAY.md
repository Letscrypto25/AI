# /ide Chat - Railway Deployment

## Current Status

- Server code ready
- Dependencies configured
- Environment variables updated for Groq plus DeepSeek
- Deployment files ready

## Files Created for Railway

- `railway.json` - Railway config
- `Procfile` - Process file
- `deploy-railway.ps1` - Deployment helper
- `.gitignore` - Git ignore rules
- `.env` - Local environment template

## Deployment Steps

1. **Get Railway Account**
   - Go to https://railway.app
   - Sign up or log in
   - Create a new project

2. **Set Environment Variables**
   - `GROQ_API_KEY`: your Groq key
   - `GROQ_BASE_URL`: `https://api.groq.com/openai/v1`
   - `GROQ_MODEL`: `llama-3.3-70b-versatile`
   - `DEEPSEEK_API_KEY`: your DeepSeek key
   - `DEEPSEEK_BASE_URL`: `https://api.deepseek.com`
   - `DEEPSEEK_MODEL`: `deepseek-v4-flash`
   - `RAILWAY_URL`: optional; only set it if you want startup logs to print the public app URL
   - `NODE_ENV`: `production`
   - `PORT`: leave blank, Railway sets it

3. **Push to Git**
   ```powershell
   cd "C:\Users\ethan\Saved Games\ide"
   git init
   git add .
   git commit -m "Initial /ide chat"
   ```

4. **Deploy via Railway CLI**
   ```powershell
   npm install -g @railway/cli
   railway login
   railway up
   ```

5. **Get Your URL**
   - Railway assigns a URL like `https://your-app.up.railway.app`
   - The frontend already uses relative `/api/health` and `/api/chat` routes, so no frontend code change is needed for production
   - Optional: set `RAILWAY_URL=https://your-app.up.railway.app` if you want startup logs to advertise the public URL

## Environment Variables Needed

From you:
- `GROQ_API_KEY`
- `DEEPSEEK_API_KEY`
- Railway project creation plus the public URL if you want me to verify the live deployment

## Ready to Go

Tell me:
1. Your Railway project URL once deployed
2. Confirm the Groq and DeepSeek env vars are set in Railway

Then I can verify the live Railway deployment end to end.
