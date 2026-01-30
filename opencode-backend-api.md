# OpenCode Backend API (from `/doc`)

This document lists the backend HTTP API exposed by the running `opencode web` server at:

- Base URL: `http://localhost:9988`
- OpenAPI spec: `GET /doc` (OpenAPI 3.1.1)

The endpoints below come from the live OpenAPI document returned by `GET http://localhost:9988/doc`.

## Quick Start

```bash
export OPENCODE_BASE_URL="http://localhost:9988"

# Fetch the OpenAPI document
curl -s "$OPENCODE_BASE_URL/doc" | jq '.info, (.paths | keys)'
```

## Common Curl Snippets

```bash
# Health
curl -s "$OPENCODE_BASE_URL/global/health" | jq

# List sessions
curl -s "$OPENCODE_BASE_URL/session" | jq

# Create session
curl -s -X POST "$OPENCODE_BASE_URL/session" \
  -H 'content-type: application/json' \
  -d '{}' | jq

# Send a message to a session (replace SESSION_ID)
curl -s -X POST "$OPENCODE_BASE_URL/session/SESSION_ID/message" \
  -H 'content-type: application/json' \
  -d '{
    "parts": [{ "type": "text", "text": "hello" }]
  }' | jq

# Subscribe to events (Server-Sent Events)
curl -N "$OPENCODE_BASE_URL/event"
```

## Endpoints (All)

Format:

- Method + Path — Summary (operationId)

### DELETE

- `DELETE /experimental/worktree` — Remove worktree (`worktree.remove`)
- `DELETE /mcp/{name}/auth` — Remove MCP OAuth (`mcp.auth.remove`)
- `DELETE /pty/{ptyID}` — Remove PTY session (`pty.remove`)
- `DELETE /session/{sessionID}` — Delete session (`session.delete`)
- `DELETE /session/{sessionID}/message/{messageID}/part/{partID}` — (`part.delete`)
- `DELETE /session/{sessionID}/share` — Unshare session (`session.unshare`)

### GET

- `GET /agent` — List agents (`app.agents`)
- `GET /command` — List commands (`command.list`)
- `GET /config` — Get configuration (`config.get`)
- `GET /config/providers` — List config providers (`config.providers`)
- `GET /event` — Subscribe to events (`event.subscribe`)
- `GET /experimental/resource` — Get MCP resources (`experimental.resource.list`)
- `GET /experimental/tool` — List tools (`tool.list`)
- `GET /experimental/tool/ids` — List tool IDs (`tool.ids`)
- `GET /experimental/worktree` — List worktrees (`worktree.list`)
- `GET /file` — List files (`file.list`)
- `GET /file/content` — Read file (`file.read`)
- `GET /file/status` — Get file status (`file.status`)
- `GET /find` — Find text (`find.text`)
- `GET /find/file` — Find files (`find.files`)
- `GET /find/symbol` — Find symbols (`find.symbols`)
- `GET /formatter` — Get formatter status (`formatter.status`)
- `GET /global/event` — Get global events (`global.event`)
- `GET /global/health` — Get health (`global.health`)
- `GET /lsp` — Get LSP status (`lsp.status`)
- `GET /mcp` — Get MCP status (`mcp.status`)
- `GET /path` — Get paths (`path.get`)
- `GET /permission` — List pending permissions (`permission.list`)
- `GET /project` — List all projects (`project.list`)
- `GET /project/current` — Get current project (`project.current`)
- `GET /provider` — List providers (`provider.list`)
- `GET /provider/auth` — Get provider auth methods (`provider.auth`)
- `GET /pty` — List PTY sessions (`pty.list`)
- `GET /pty/{ptyID}` — Get PTY session (`pty.get`)
- `GET /pty/{ptyID}/connect` — Connect to PTY session (`pty.connect`)
- `GET /question` — List pending questions (`question.list`)
- `GET /session` — List sessions (`session.list`)
- `GET /session/{sessionID}` — Get session (`session.get`)
- `GET /session/{sessionID}/children` — Get session children (`session.children`)
- `GET /session/{sessionID}/diff` — Get message diff (`session.diff`)
- `GET /session/{sessionID}/message` — Get session messages (`session.messages`)
- `GET /session/{sessionID}/message/{messageID}` — Get message (`session.message`)
- `GET /session/{sessionID}/todo` — Get session todos (`session.todo`)
- `GET /session/status` — Get session status (`session.status`)
- `GET /skill` — List skills (`app.skills`)
- `GET /tui/control/next` — Get next TUI request (`tui.control.next`)
- `GET /vcs` — Get VCS info (`vcs.get`)

### PATCH

- `PATCH /config` — Update configuration (`config.update`)
- `PATCH /project/{projectID}` — Update project (`project.update`)
- `PATCH /session/{sessionID}` — Update session (`session.update`)
- `PATCH /session/{sessionID}/message/{messageID}/part/{partID}` — (`part.update`)

### POST

- `POST /experimental/worktree` — Create worktree (`worktree.create`)
- `POST /experimental/worktree/reset` — Reset worktree (`worktree.reset`)
- `POST /global/dispose` — Dispose instance (`global.dispose`)
- `POST /instance/dispose` — Dispose instance (`instance.dispose`)
- `POST /log` — Write log (`app.log`)
- `POST /mcp` — Add MCP server (`mcp.add`)
- `POST /mcp/{name}/auth` — Start MCP OAuth (`mcp.auth.start`)
- `POST /mcp/{name}/auth/authenticate` — Authenticate MCP OAuth (`mcp.auth.authenticate`)
- `POST /mcp/{name}/auth/callback` — Complete MCP OAuth (`mcp.auth.callback`)
- `POST /mcp/{name}/connect` — (`mcp.connect`)
- `POST /mcp/{name}/disconnect` — (`mcp.disconnect`)
- `POST /permission/{requestID}/reply` — Respond to permission request (`permission.reply`)
- `POST /provider/{providerID}/oauth/authorize` — OAuth authorize (`provider.oauth.authorize`)
- `POST /provider/{providerID}/oauth/callback` — OAuth callback (`provider.oauth.callback`)
- `POST /pty` — Create PTY session (`pty.create`)
- `POST /question/{requestID}/reject` — Reject question request (`question.reject`)
- `POST /question/{requestID}/reply` — Reply to question request (`question.reply`)
- `POST /session` — Create session (`session.create`)
- `POST /session/{sessionID}/abort` — Abort session (`session.abort`)
- `POST /session/{sessionID}/command` — Send command (`session.command`)
- `POST /session/{sessionID}/fork` — Fork session (`session.fork`)
- `POST /session/{sessionID}/init` — Initialize session (`session.init`)
- `POST /session/{sessionID}/message` — Send message (`session.prompt`)
- `POST /session/{sessionID}/permissions/{permissionID}` — Respond to permission (`permission.respond`)
- `POST /session/{sessionID}/prompt_async` — Send async message (`session.prompt_async`)
- `POST /session/{sessionID}/revert` — Revert message (`session.revert`)
- `POST /session/{sessionID}/share` — Share session (`session.share`)
- `POST /session/{sessionID}/shell` — Run shell command (`session.shell`)
- `POST /session/{sessionID}/summarize` — Summarize session (`session.summarize`)
- `POST /session/{sessionID}/unrevert` — Restore reverted messages (`session.unrevert`)
- `POST /tui/append-prompt` — Append TUI prompt (`tui.appendPrompt`)
- `POST /tui/clear-prompt` — Clear TUI prompt (`tui.clearPrompt`)
- `POST /tui/control/response` — Submit TUI response (`tui.control.response`)
- `POST /tui/execute-command` — Execute TUI command (`tui.executeCommand`)
- `POST /tui/open-help` — Open help dialog (`tui.openHelp`)
- `POST /tui/open-models` — Open models dialog (`tui.openModels`)
- `POST /tui/open-sessions` — Open sessions dialog (`tui.openSessions`)
- `POST /tui/open-themes` — Open themes dialog (`tui.openThemes`)
- `POST /tui/publish` — Publish TUI event (`tui.publish`)
- `POST /tui/select-session` — Select session (`tui.selectSession`)
- `POST /tui/show-toast` — Show TUI toast (`tui.showToast`)
- `POST /tui/submit-prompt` — Submit TUI prompt (`tui.submitPrompt`)

### PUT

- `PUT /auth/{providerID}` — Set auth credentials (`auth.set`)
- `PUT /pty/{ptyID}` — Update PTY session (`pty.update`)

## Note: How This Repo Starts The Server

This repo’s Next.js app starts (or reuses) the external `opencode web` process and then talks to it at `http://localhost:9988`:

- Next.js route: [api/opencode/route.ts](file:///Users/facundofierro/git/notes/apps/web/src/app/api/opencode/route.ts#L4-L144)
- Sidecar manager: [ensureServer](file:///Users/facundofierro/git/notes/apps/web/src/lib/sidecar.ts#L60-L130)
