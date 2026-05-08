# timeline.md

Rolling 24-hour action log for `/ide`.
Newest items should be appended with local time and source.

## Active window
- Date: 2026-05-01
- Rolling rule: when a new hour arrives, replace the matching hour from the prior day.

## Entries
- [2026-04-27 13:07] Request [8] claimed for workspace restructure.
- [2026-04-27 13:07] Started building `brain.md`, `Actions/`, and `mind/`.
- [2026-04-28 23:22] Heartbeat resumed workspace request [7], verified the local IDE chat app, restored missing `server.js`, and confirmed `/api/health` works.
- [2026-04-28 23:22] Historical note: an older provider path hit quota before the later Groq and DeepSeek switch.
- [2026-04-28 23:39] Request [10] rewired the local `/ide` chat to Groq primary with DeepSeek fallback, removed the old `openai` runtime usage, and updated the `/ide` UI plus deployment notes.
- [2026-04-28 23:39] Restarted the local `/ide` server on port `3000`, verified `/api/health`, and confirmed a live Joe chat response returned from Groq on `llama-3.3-70b-versatile`.
- [2026-04-30 17:52] Heartbeat found the local `/ide` server down, restarted it, verified `/api/health`, and confirmed a live Joe `/api/chat` round-trip returned `ok` from Groq.
- [2026-04-30 17:52] Synced request [7] from stale pending to complete because the current Saved Games workspace side is now verified locally.
- [2026-04-30 20:52] Heartbeat checked pending request [9], confirmed Railway env keys exist in `.env`, found no global Railway CLI, and left deployment blocked on external Railway project/tooling state.
- [2026-04-30 21:26] Heartbeat re-verified the local `/ide` app health endpoint. Groq primary and DeepSeek fallback are still configured, and the only remaining blocker stays external Railway project/tooling state.
- [2026-04-30 22:22] Heartbeat re-verified local `/ide` health, confirmed `RAILWAY_URL` is not a public app URL, and found that the stored Railway token does not authenticate for `railway status`, leaving request [9] blocked on external Railway access.
- [2026-04-30 23:22] Heartbeat re-verified the local `/ide` health endpoint. Groq primary and DeepSeek fallback are still configured, and the remaining Railway blocker is unchanged and external to the workspace.
- [2026-05-01 00:22] Heartbeat rolled the active timeline date forward and re-verified the local `/ide` health endpoint. Groq primary and DeepSeek fallback are still configured, and the remaining Railway blocker is unchanged and external to the workspace.
- [2026-05-01 00:52] Heartbeat re-verified the local `/ide` health endpoint. Groq primary and DeepSeek fallback are still configured, and the remaining Railway blocker is unchanged and external to the workspace.
- [2026-05-01 01:22] Heartbeat re-verified the local `/ide` health endpoint. Groq primary and DeepSeek fallback are still configured, and the remaining Railway blocker is unchanged and external to the workspace.
- [2026-05-01 01:52] Heartbeat re-verified the local `/ide` health endpoint. Groq primary and DeepSeek fallback are still configured, and the remaining Railway blocker is unchanged and external to the workspace.
