# Buddy

Buddy is a black-and-white AI notebook for messy thoughts, WhatsApp notes, in-app notes, ML memory signals, small code projects, and a guarded command terminal.

The app includes a Diary tab where each day opens like a book page with the current date, a daily quote, raw diary writing, AI-organized summary/categories/thoughts/decisions/tasks, and notes linked by that date.

Main components are surfaced as dashboard cards: Diary, Notes, ML, Projects, and Terminal. The ML tab summarizes category signals, repeated themes, project focus, and suggested next actions from saved memory.

Buddy is wrapped as a PWA. When it is served from Railway over HTTPS, supported browsers can install it from the in-app `Install` button or the browser install menu.

## Stack

- Railway: hosting
- Supabase: notes, memory, projects, logs
- Groq: AI categorizing, chat, summaries, and small code generation
- Node: no required npm dependencies for the first version

## Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` locally or set the same variables on Railway.

Required for production memory:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` for the Supabase Postgres pooler URL when Buddy needs direct DB tooling or migrations

Buddy loads these from Railway variables in production. For local testing, Buddy also loads a `.env` file from the project root before the server starts. The in-app status bar shows whether `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` are present, but it never prints the key value or pooler URL.

Required for AI:

- `GROQ_API_KEY`
- `GROQ_MODEL`

Required for the command terminal:

- `BUDDY_ACCESS_TOKEN`
- `BUDDY_ALLOW_TERMINAL=true`

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor.

If Supabase is not configured, Buddy falls back to a local JSON file in `data/buddy.json`. That is useful for local testing but not reliable on Railway because Railway filesystems are ephemeral.

Diary pages are stored in `buddy_diary_pages`; notes created on the same date are shown on that diary page and are included in Buddy chat memory.

## Terminal Safety

The terminal is on when `BUDDY_ALLOW_TERMINAL=true`.

Commands run only inside Buddy's `workspace/` directory, and the server blocks broad destructive commands. This is still powerful, so keep `BUDDY_ACCESS_TOKEN` set before deploying.
