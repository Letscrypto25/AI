# Helper Bot 🤖

AI-powered Help Desk + Smart App Manager built on Base44.

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in your VITE_BASE44_APP_ID in .env
npm run dev
```

## Stack
- React 18 + Vite
- Tailwind CSS + shadcn/ui
- Base44 SDK (entities, agents, auth)
- Recharts (analytics)

## Features
- 💬 **Chat** — AI Helper Bot powered by Base44 agents
- 📋 **Jobs Queue** — Full approval workflow with guardrails
- ⚡ **Commands** — 7-command constitution (READ, PROPOSE_VALUE_CHANGE, FLAG_ANOMALY, etc.)
- 🗺️ **System View** — Live read-only DB panel
- 📊 **Analytics** — Bot health score, charts, CSV export
- 📦 **Export** — jobs.md, app-values.json, action-log.csv, system snapshot
- ⚙️ **App Values** — Guardrail-protected value management
- 📱 **WhatsApp** — Connect via WhatsApp

## Environment Variables
See `.env.example` for all required config.

## Entities Required
Create these entities in your Base44 dashboard:
- `Job` — see entities/Job.json
- `AppValue` — see entities/AppValue.json
- `ActionLog` — see entities/ActionLog.json
- `CommandRegistry` — see entities/CommandRegistry.json

## Agent
Import `agents/helper_bot.json` in your Base44 dashboard.
