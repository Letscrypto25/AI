# Buddy

Buddy is an AI notebook assistant for messy real life thoughts.

It should let Ethan dump notes from WhatsApp chats, app notes, random thoughts, plans, ideas, voice-style text, doodles, and half-finished concepts into one place. Buddy then remembers them, categorizes them, connects them, and turns them into a simple ordered "crazy book" that can be searched, chatted with, and used later.

## Core Idea

Buddy is not just a notes app.

It is a memory app that:

- takes messy notes without forcing structure first
- keeps the original raw thought exactly as written
- adds clean categories, tags, summaries, dates, and links
- lets Ethan ask questions like "what did I say about WHATB pricing?" or "show all ideas about WhatsApp bots"
- turns scattered notes into ordered pages, projects, checklists, or plans
- remembers important people, apps, projects, decisions, and repeated ideas

## First App Shape

The app should open directly into a working notes surface:

- top tabs for Diary, Notes, WhatsApp Inbox, Categorised Thoughts, Projects, Search, and Buddy Chat
- left side or top strip: quick capture inbox
- center: the active tab content
- right side: Buddy chat and memory lookup when useful
- bottom or side panel: categories, timeline, and linked thoughts

No landing page. The first screen should be the actual assistant notebook.

## Main Tabs

### Diary

The Diary tab should feel like a simple black-and-white book.

Each day gets its own page with:

- date
- daily quote
- daily title
- raw diary writing
- AI summary of the day
- AI-categorised sections from that day
- important thoughts
- decisions made
- tasks or reminders
- linked notes from the Notes tab

Diary pages should be navigated like a book:

- previous day
- today
- next day
- month index
- search inside diary

The diary should never overwrite the raw page. AI should create a cleaned view beside or below the original writing.

### Notes

The Notes tab is the fast dump zone.

It should accept:

- quick notes
- pasted WhatsApp messages
- random thoughts
- rough project ideas
- links
- reminders
- rough writing that may later become a diary page

Notes can stay messy. Buddy should organize them in the background.

### WhatsApp Inbox

The WhatsApp Inbox tab should show messages received through WHATB.

This tab should let Ethan:

- review incoming WhatsApp notes before they become permanent memory
- send a message into Notes
- send a message into today's Diary page
- turn a WhatsApp thread into categorised thoughts
- ask Buddy to summarize a WhatsApp conversation
- link a WhatsApp message to a project

WhatsApp messages should keep their original text, sender label, timestamp, and source.

### Categorised Thoughts

The Categorised Thoughts tab is where Buddy turns chaos into order.

It should show:

- categories
- tags
- repeated themes
- related notes
- daily clusters
- project clusters
- thoughts that need Ethan to confirm the right category

This tab should make random notes easy to browse without forcing Ethan to manually sort everything.

### Projects

The Projects tab holds small project ideas and generated code workspaces.

Each project should link back to the notes, diary pages, and thoughts that created it.

### Search

The Search tab should let Ethan find anything Buddy remembers.

Search should work across:

- diary pages
- notes
- WhatsApp messages
- categories
- projects
- generated code
- decisions
- reminders

### Buddy Chat

The Buddy Chat tab should let Ethan ask the AI about everything stored in the app.

Buddy should answer with references to the diary pages, notes, projects, or categories it used.

## WhatsApp Bot Through WHATB

Buddy should connect to the existing WHATB WhatsApp hub instead of trying to become the WhatsApp transport itself.

The boundary should be:

- WHATB handles WhatsApp connection, webhook delivery, message sending, and WhatsApp-specific setup
- Buddy handles memory, diary pages, notes, categorising, AI summaries, search, and recall
- Supabase stores Buddy notes, diary pages, categories, linked WhatsApp messages, and project memory
- Groq powers the AI replies and categorising

Expected message flow:

1. Ethan sends or forwards a thought in WhatsApp.
2. WHATB receives the WhatsApp message.
3. WHATB sends the message to Buddy's integration API.
4. Buddy saves the raw message in the WhatsApp Inbox.
5. Buddy uses Groq to suggest category, diary placement, tags, and next actions.
6. Ethan can approve, edit, or reject the AI organisation inside Buddy.
7. Buddy can send a simple reply back through WHATB when needed.

Buddy integration API ideas:

- `POST /api/integrations/whatb/messages` for inbound WhatsApp messages
- `POST /api/integrations/whatb/replies` for Buddy-generated replies that WHATB should send
- `GET /api/integrations/whatb/status` for connection health
- `POST /api/integrations/whatb/sync` for backfilling or syncing missed messages

WhatsApp commands can be simple:

- `note: ...` saves a quick note
- `diary: ...` adds to today's diary page
- `find: ...` asks Buddy to search memory
- `project: ...` creates or updates a project idea
- `todo: ...` creates a task/reminder

Safety rules:

- WhatsApp messages can request terminal commands, code generation, installs, internet checks, and deployment actions.
- Buddy should only run the exact thing Ethan asks for, inside the selected project or approved workspace.
- If the request is broad or risky, Buddy must ask a short confirmation before running it.
- Destructive actions, account changes, secret changes, broad installs, and production deploys need explicit confirmation.
- Code generation from WhatsApp can create or edit small projects when Ethan directly asks for it.
- Buddy must not invent extra commands, extra deployments, or extra file changes beyond the requested task.
- WhatsApp tokens, webhook secrets, Supabase keys, and Groq keys must stay in environment variables only.

## Main Features

### 1. Quick Capture

Paste any note from WhatsApp, browser, chat, or app.

Buddy stores:

- raw note
- source, if known
- date and time
- detected people
- detected project
- detected category
- short summary
- possible next action

### 2. In-App Notepad

Ethan can write directly inside Buddy.

The notepad should support:

- normal notes
- rough bullets
- project ideas
- reminders
- questions
- pasted WhatsApp messages
- doodle/image attachments later

Notes written here can be sent to the Diary, kept as standalone notes, or used to create categorised thoughts.

### 3. Smart Categorizing

Buddy should automatically sort notes into categories like:

- Projects
- Business ideas
- WHATB
- AI assistants
- Apps to build
- Money and pricing
- Personal reminders
- Decisions
- Random ideas
- To-do items

Categories must be editable because AI can guess wrong.

### 4. Remember And Refer

Buddy should help Ethan remember and refer back to notes.

Example questions:

- "What was my idea for Buddy?"
- "Find the note where I talked about WhatsApp chat notes."
- "What decisions did I make about WHATB?"
- "Open my diary page for today."
- "What did I write last Tuesday?"
- "Turn my random notes from today into a plan."
- "What am I repeating a lot?"

### 5. Crazy Book Mode

Buddy can take chaotic notes and make them simple.

Outputs:

- daily digest
- project page
- ordered timeline
- decision log
- next-step list
- idea map
- simple book chapter from messy notes

The original messy notes must always stay saved underneath the cleaned version.

### 6. Small Project Builder

Buddy should include a simple in-app workspace for small code projects.

It should support:

- generate small apps, scripts, pages, and tools from notes
- keep each generated project linked back to the notes that inspired it
- show generated files in-app
- let Ethan edit code safely
- save project history so old versions can be restored
- explain what changed in plain language

### 7. Command Terminal

Buddy should include a command terminal for project work.

The terminal should be useful but controlled:

- run commands inside the selected project workspace
- show command output clearly
- support internet access for installs, API checks, docs lookups, and deployment commands
- ask for confirmation before destructive commands, account changes, secret changes, or broad installs
- keep a command history linked to the project
- never print or store secrets in notes or generated files

The terminal should not be an unsafe open shell by default. It should behave like an assistant-controlled workspace terminal with approvals, logs, and clear boundaries.

## Memory Rules

Buddy should remember:

- exact raw notes
- cleaned summaries
- projects mentioned
- people mentioned
- repeated themes
- confirmed decisions
- reminders and follow-ups

Buddy should not pretend uncertain guesses are facts. It should mark guesses as guesses until Ethan confirms them.

## Platform Stack

Buddy should be built for:

- Railway for hosting and deployment
- Supabase for database, auth, file storage, and note memory
- `DATABASE_URL` for the Supabase Postgres pooler connection when direct DB tools or migrations are needed
- Groq for the AI model layer
- WHATB for WhatsApp bot connection and message transport
- optional browser search or internet-enabled tools for current info and project setup

The first production target should be Railway + Supabase + Groq + WHATB, not a local-only prototype.

## AI Role

Groq should power:

- note categorizing
- note summaries
- memory search answers
- daily digests
- turning messy notes into ordered plans
- code generation for small in-app projects
- command suggestions and explanations

Buddy should answer from saved notes first. If it uses internet info, it should say that clearly.

## MVP Build Plan

1. Create the local Buddy app shell in `Projects\\buddy`.
2. Add the main tabs: Diary, Notes, WhatsApp Inbox, Categorised Thoughts, Projects, Search, and Buddy Chat.
3. Add daily diary pages with date, quote, raw writing, AI summary, and AI-categorised day sections.
4. Add a notepad with save, edit, delete, and search.
5. Add local storage/database for notes and diary pages.
6. Add AI categorizing for pasted notes and daily diary pages.
7. Add Buddy chat that answers using saved notes only.
8. Add daily digest and project pages.
9. Add Railway, Supabase, Groq, and WHATB environment setup.
10. Add WHATB WhatsApp integration endpoints.
11. Add the small project code generation workspace.
12. Add the guarded command terminal.
13. Add image/doodle upload and AI description later.

## First Data Model

Each note should have:

- id
- raw_text
- clean_title
- summary
- category
- tags
- source
- project
- people
- created_at
- updated_at
- status
- ai_confidence
- linked_note_ids

Each diary page should have:

- id
- diary_date
- quote
- title
- raw_text
- ai_summary
- ai_categories
- important_thoughts
- decisions
- tasks
- linked_note_ids
- created_at
- updated_at

Each WhatsApp message should have:

- id
- whatb_message_id
- sender_label
- raw_text
- received_at
- source_chat
- suggested_category
- suggested_tags
- linked_note_id
- linked_diary_page_id
- linked_project_id
- status
- created_at

## Design Feel

Buddy should feel like a practical memory desk:

- fast
- focused
- calm
- black and white
- simple
- minimal
- easy to dump thoughts into
- powerful when searching later
- not too polished or corporate
- more like a private AI notebook than a public website

The first visual theme should be black text on white surfaces, strong borders, simple spacing, and no colorful decoration unless Ethan asks for it later.

## Current Status

First working app created in `Projects\\buddy`.

Built:

- black-and-white app shell
- quick capture inbox
- editable notepad
- note search
- Buddy chat over saved notes
- Supabase schema
- Groq AI hooks
- Railway start config
- small project generator
- guarded command terminal endpoint

Next step is to add real Supabase and Groq env vars, run the schema in Supabase, then deploy to Railway.
