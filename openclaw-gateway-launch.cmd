@echo off
setlocal

rem Workspace-owned gateway launcher that pins the default OpenClaw state/config.
set "OPENCLAW_PROFILE="
set "OPENCLAW_STATE_DIR=C:\Users\ethan\.openclaw"
set "OPENCLAW_CONFIG_PATH=C:\Users\ethan\.openclaw\openclaw.json"
set "OPENCLAW_GATEWAY_PORT=18789"
set "TMPDIR=C:\Users\ethan\AppData\Local\Temp"

call "C:\Users\ethan\AppData\Roaming\npm\openclaw.cmd" gateway --port 18789
