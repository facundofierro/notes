---
created: 2026-02-12T04:00:16.260Z
state: fixes
plan: .agelum/work/plans/chrome-plugin-1771106302323.md
summary: .agelum/work/summaries/chrome-plugin-1771111082629.md
---

# chrome-plugin

## User Instructions
Need to review and continue the functionality for the chrome plugin in this monorepo.

1. **Login Functionality:**
    - Implement login function in Web app (Electron) doing OAuth with GitHub.
    - Site app (notes.agelum.com) is the registry and handles user registration APIs.
    - Architecture: Should the Web app (Node.js server) act as a gateway to the Site app, or should the Electron frontend access the Site app directly?
    - **Recommendation:** A gateway in the Web app server is recommended to manage tokens securely and provide a unified API for the Electron app, keeping the Site app as the source of truth for user data.

2. **Configuration Settings:**
    - Show plugin configuration tab even when not logged in (with explanation and login button).
    - Enable users for the plugin: add emails for plugin users (customers/support) who will login with Google/Yandex OAuth.
    - Display available projects for the plugin user.
    - Settings for: Project Name (as seen in plugin) and Domain (for auto-identification).

3. **Inbox Functionality:**
    - Plugin creates tasks (MD file + image) stored temporarily in the database.
    - Web app receives these as an "Inbox".
    - UI: Add a vertical bar/column at the left of the Kanban.
    - Inbox characteristics: Thinner, fixed width, different task view (shows creator, priority colors: red/orange/yellow).
    - Draggable: Tasks can be moved from Inbox to other Kanban columns.

## Implementation Audit (2026-02-14)

### ✅ Implemented
- **Inbox UI:** 
    - Added a narrow "Inbox" column at the left of the Kanban board in `TaskKanban.tsx`.
    - Tasks with `state: "inbox"` are correctly filtered and displayed in this column.
    - Draggable functionality is supported via `@agelum/kanban`.
    - Respects `narrow: true` property for specialized styling.
- **Project Configuration:**
    - `SettingsPlugin.tsx` in the Web app now allows configuring `pluginName` (Project Name) and `pluginDomain` (Domain for auto-identification).
    - Added "Allowed Plugin Users" whitelist functionality to restrict who can report issues for a specific project.
- **Site App (Registry):**
    - OAuth providers (GitHub, Google, Yandex) are configured in `apps/site/src/auth.ts`.
    - User registration and verification APIs are present in `apps/site/src/app/api/v1/users`.

### ❌ Remaining / Missing
1. **OAuth Login in Plugin:**
    - The Chrome plugin (sidepanel and popup) still relies on manual API Key entry instead of OAuth.
    - **Missing:** Login button in the plugin settings and OAuth flow integration.
2. **Web App Gateway:**
    - The Web app does not yet act as a gateway for OAuth tokens between the plugin/Electron and the Site app.
3. **Plugin Settings UI:**
    - **Missing:** The plugin settings screen should show an explanation and a login button when not authenticated, as per instructions.
4. **Inbox Specifics:**
    - **Missing:** Enhanced task view in the Inbox column to show creator and specific priority colors (red/orange/yellow) as requested. Currently uses the standard Kanban card view.
