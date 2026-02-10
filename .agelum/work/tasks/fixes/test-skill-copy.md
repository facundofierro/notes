---
created: 2026-02-10T21:46:19.504Z
state: fixes
---
# Fix: Skill Auto-Copy to All Opened Projects

## Context

The skill file (`agent-browser.md`) is currently only copied when `saveProjectConfig` is called.
Projects that are already configured and simply opened/loaded do not get the skill file.
Additionally, the skill content references `agent-browser` CLI directly instead of `agelum browser <cmd>`,
which is the correct wrapper command.

## Related Files

- `apps/web/src/lib/project.ts` — Contains `ensureAgelumStructure` and the skill template
- `apps/web/src/app/api/(project)/repositories/route.ts` — Project open/list entry point
- `apps/web/src/lib/settings.ts` — `readSettings` loads all projects on startup
- `~/.agelum/templates/agent-browser.md` — Global template source

## Steps to Complete

### 1. Rewrite the Skill File Template

- Download the original `SKILL.md` from `vercel-labs/agent-browser` repo
- Edit it to replace every `agent-browser <cmd>` with `agelum browser <cmd>
- Keep: navigation, snapshot, interaction, waiting, capture (screenshot, eval)
- Update `AGENT_BROWSER_SKILL_TEMPLATE` constant in `project.ts` with the cleaned content
- Delete the existing global template at `~/.agelum/templates/agent-browser.md` so it regenerates with the new content on next run (or add a version check)

### 2. Ensure Skill Is Copied When Projects Are Opened

Currently `ensureAgelumStructure` is only called from `saveProjectConfig` (write path).
It must also run on the read/open path. Identify and update all project-open entry points:

- `apps/web/src/app/api/(project)/repositories/route.ts` — `GET` handler that lists repositories; call `ensureAgelumStructure` for each project path
- Any other API routes that resolve or switch to a project should call it too
- Consider adding a lightweight `ensureSkillFile(projectPath)` helper (just the skill-copy part, not full structure creation) to avoid unnecessary directory creation on reads

### 3. Acceptance Criteria

- Opening any project in Agelum automatically creates `.agelum/ai/skills/agent-browser.md` if missing
- The skill file content uses `agelum browser <cmd>` syntax throughout
- The template at `~/.agelum/templates/agent-browser.md` reflects the updated content
- No references to `agent-browser` CLI remain in the skill file (only `agelum browser`)
- Existing projects that already have the skill file are not overwritten (copy only if missing)
