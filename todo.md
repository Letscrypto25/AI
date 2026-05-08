# todo.md

Compatibility copy. Canonical action tracker now lives at `Actions/todo.md`.

#rules of todo.md 
1. fully detailed list of call tasks will be created if requested.
2. if any aditional steps taken during edits add them in respected place.(ignore deploy or git type steps )
3. always make a list in order todo.
4. there will be mulitple bots editing diffrent tasks, each chat will chosse a number and always note and keep to rules about this number.
5. ypir number is like your edit id. if you create edit or add anything on todo.md in brackets put the id number you chose. 
6. if tasks in todo list is taken make sure to claim each seassion tasks by order of steps and claim with id and maark as pending.
7. always makr completed or leave as pending if clamined and stoped at the end of each session. but all unclaimbed by the indvidel chat should stay unchouched. BLANK (CLAIMABLE) PENDING(CLAIMBED WITH ID BUT NOT DONE) COMPLETE(DONE WITH ID)

8. each major step of edit (eg, added a new featcher) should be makred with a number as a heading. the sub devied each step into list.

9. Add secrets and delete old as removed and marked by id as needed.
10. Max of 3-5 steps at a time.
11. always report changes and edits and notes and findings in 1 summrized pagraph when in need for the next tasks
12. all taks claimbed per session will be added to in chat todo list till complete then updated with nes onces once users allows 
16→ key ponits. detailed order claimed complete and maked 

# 1. Workspace request from requests.md [7]
- [7] COMPLETE Checked `C:\Users\ethan\Saved Games\ide\.env` and confirmed workspace-local Groq settings exist as environment keys.
- [7] COMPLETE Confirmed the live session auto-injects `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, and `MEMORY.md`. Other workspace markdown files such as `COMMANDS.md`, `CONSTRAINTS.md`, `PERMISSIONS.md`, `WORKFLOW.md`, `requests.md`, and `todo.md` are stored in the workspace and only affect behavior when explicitly read or handled by workflow rules.
- [7] COMPLETE Updated `HEARTBEAT.md` so wakes now re-check `requests.md` and the main custom-behavior markdown files in this workspace.
- [7] COMPLETE Identified outside-`Saved Games` changes and paused them: changing the active default model path and changing broader OpenClaw runtime/startup behavior would require edits under `C:\Users\ethan\.openclaw\...` or other non-workspace runtime config.
- [7] COMPLETE Added a workspace rule in `CONSTRAINTS.md` to avoid git actions by default unless Ethan explicitly asks in the current chat.
- [7] COMPLETE Findings note: Groq keys exist in workspace `.env`, heartbeat now reviews the workspace control markdown, the live session still auto-loads only the injected startup set above, and using Groq as the true active model path still appears blocked by runtime config outside `Saved Games`.
- [7] COMPLETE Verified the local IDE chat app exists in this workspace, restored missing `server.js`, and confirmed the server starts with a healthy `/api/health` response.
- [7] COMPLETE Historical note: an older provider path previously hit quota, but that blocker was later replaced by the Groq-primary and DeepSeek-fallback setup tracked under [10].
- [7] COMPLETE Restarted the local `/ide` server after it was found down on this wake, verified `/api/health`, and confirmed a live Joe `/api/chat` response returned `ok` from Groq on `llama-3.3-70b-versatile`.

Summary [7]: The workspace-local `/ide` chat is currently running and verified locally. The current Saved Games side of the request is satisfied, and any broader trigger or main-OpenClaw routing change remains outside the Saved Games workspace boundary.

# 2. Workspace restructure from requests.md [8]
- [8] COMPLETE Added the default rule that actionable Saved Games tasks should be done without pausing until the current request queue is complete.
- [8] COMPLETE Created the new structure for `brain.md`, `Actions/`, and `mind/`.
- [8] COMPLETE Seeded `Actions/timeline.md`, `Actions/future.md`, `Actions/scheduled-jobs.md`, `Actions/todays-jobs.md`, and `mind/thoughts.md` with readable starter formats.
- [8] COMPLETE Updated `HEARTBEAT.md` so the new structure is actively reviewed and tracked during wakes.
- [8] COMPLETE Summary: canonical copies now live in `brain.md`, `Actions/`, and `mind/`. Root `requests.md`, `todo.md`, and `MEMORY.md` remain as compatibility copies so the current workspace wiring does not break while the new layout takes over.

## 3. IDE Chat Build & Railway Setup [9]

- [9] COMPLETE Built independent IDE chat server (Node.js + Express + provider API)
- [9] COMPLETE Created web UI with Joe and Davis persona selector, conversation history, and real-time chat
- [9] COMPLETE Integrated `brain.md` plus `Actions/` system context into chat system prompts
- [9] COMPLETE Set up Railway deployment configuration: `railway.json`, `Procfile`, and `deploy-railway.ps1`
- [9] COMPLETE Updated `.env` template variables for the first provider pass, later superseded by the Groq and DeepSeek provider set
- [9] COMPLETE Created `RAILWAY.md` deployment guide with step-by-step instructions
- [9] COMPLETE Created `.gitignore` for git deployment
- [9] PENDING Railway deployment is not finished yet. The workspace has `RAILWAY_PROJECT`, `RAILWAY_TOKEN`, and provider env keys present. A later heartbeat confirmed `RAILWAY_URL` is not a public `https://...` app URL, and a repo-local Railway CLI status check failed with invalid token or missing access.

Summary [9]: The `/ide` chat build is ready for Railway, and the later [10] follow-up already moved the local runtime to Groq primary with DeepSeek fallback. The local `/ide` app is healthy, but public deployment is still blocked by external Railway state: the current token does not authenticate for the target resource and there is still no confirmed live public app URL to validate.

## 4. Provider switch and /ide launch follow-up [10]

- [10] COMPLETE Claimed the current /ide follow-up and kept all changes inside `C:\Users\ethan\Saved Games\ide`
- [10] COMPLETE Replaced the old single-provider chat wiring with Groq primary and DeepSeek fallback runtime handling in `server.js`
- [10] COMPLETE Updated `/ide/.env`, removed the `openai` package/runtime usage, and scrubbed the older inline key dump from the compatibility `requests.md`
- [10] COMPLETE Refreshed the `/ide` UI and deployment notes so the local chat shows the Groq-first / DeepSeek-fallback provider stack
- [10] COMPLETE Restarted the local `/ide` server on port `3000`, verified `/api/health`, and confirmed a live `/api/chat` response came back from Groq on `llama-3.3-70b-versatile`

Summary [10]: The independent `/ide` chat now runs locally at `http://127.0.0.1:3000` with Groq as primary and DeepSeek as fallback. The old OpenAI-only path is removed from the local chat runtime, the local provider keys are wired into `.env`, and a real Joe chat request completed successfully through Groq.

Summary [11]: The local `/ide` chat still works end to end, the startup log now falls back to a valid local URL unless `RAILWAY_URL` is a real `https://...` value, and the Railway docs no longer imply a frontend code change is needed for production. The only remaining blocker for public deployment is the external Railway project itself plus its live URL and env confirmation.

# 6. Git Push and Railway Deployment [12]

- [12] PENDING Initialize Git repository and perform initial commit
- [12] PENDING Push code to Git remote
- [12] PENDING Deploy to Railway and verify live status
- [12] PENDING Provide live chat link to user
