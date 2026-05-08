#!/usr/bin/env pwsh
# Railway Deployment Script for /ide Chat

Write-Host "=== /ide Chat Railway Deployment Setup ===" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Install from https://git-scm.com" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Railway CLI not found."
    Write-Host "Install: npm install -g @railway/cli"
    Write-Host "Then run: railway login"
    exit 1
}

Write-Host "Git found"
Write-Host "Railway CLI found"

if (-not (Test-Path .git)) {
    Write-Host "`nInitializing git repo..."
    git init
    git add .
    git commit -m "Initial /ide chat deployment"
    Write-Host "Git repo initialized"
} else {
    Write-Host "Git repo already exists"
}

Write-Host "`n=== Required Railway Environment Variables ===" -ForegroundColor Yellow
Write-Host @"
Set these in Railway after deploying:

1. GROQ_API_KEY
   - Your Groq API key

2. GROQ_BASE_URL
   - https://api.groq.com/openai/v1

3. GROQ_MODEL
   - llama-3.3-70b-versatile

4. DEEPSEEK_API_KEY
   - Your DeepSeek API key

5. DEEPSEEK_BASE_URL
   - https://api.deepseek.com

6. DEEPSEEK_MODEL
   - deepseek-v4-flash

7. RAILWAY_URL (optional)
   - Only set this if you want startup logs to print the public Railway URL
   - Format: https://your-app.up.railway.app

8. PORT
   - Leave blank, Railway sets this

9. NODE_ENV
   - production
"@

Write-Host "=== Deployment Ready ===" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Push to GitHub: git push origin main"
Write-Host "2. Run: railway up"
Write-Host "3. Set env vars in Railway dashboard"
Write-Host "4. Optional: set RAILWAY_URL to the public https://... address for cleaner logs"
Write-Host "5. App will auto-deploy"
