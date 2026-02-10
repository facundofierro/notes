import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const AGELUM_STRUCTURE = [
  "doc/docs",
  "doc/plan",
  "doc/ideas",
  "work/tasks/backlog",
  "work/tasks/fixes",
  "work/tasks/pending",
  "work/tasks/doing",
  "work/tasks/done",
  "ai/commands",
  "ai/skills",
  "ai/agents",
  "doc/context",
  "work/epics",
  "work/tests",
  "temp",
];

const AGENT_BROWSER_SKILL_TEMPLATE = `# Agent Browser Skill

## Overview

Use \`agelum\` CLI to interact with browsers programmatically for web automation and testing.

## Core Workflow

1. Navigate to a URL: \`agelum open <url>\`
2. Take a snapshot to identify elements: \`agelum snapshot\`
3. Interact using element refs (\`@e1\`) or CSS selectors
4. Re-snapshot after DOM changes

## Commands

**Navigation:**
- \`agelum open <url>\` — Navigate to URL
- \`agelum back\` — Go back
- \`agelum forward\` — Go forward
- \`agelum reload\` — Reload page

**Snapshot:**
- \`agelum snapshot\` — Get interactive elements with refs

**Interaction:**
- \`agelum click <selector>\` — Click element (@ref or CSS selector)
- \`agelum fill <selector> "<text>"\` — Clear and type into field
- \`agelum type <selector> "<text>"\` — Type without clearing
- \`agelum press <key>\` — Press key (Enter, Tab, Escape, etc.)
- \`agelum select <selector> "<option>"\` — Select dropdown option
- \`agelum check <selector>\` — Check checkbox
- \`agelum hover <selector>\` — Hover element
- \`agelum scroll <direction> [px]\` — Scroll (up/down/left/right)

**Waiting:**
- \`agelum wait <selector>\` — Wait for element
- \`agelum wait <ms>\` — Wait milliseconds

**Capture:**
- \`agelum screenshot\` — Capture screenshot
- \`agelum eval "<js>"\` — Execute JavaScript

## Notes

- Element refs (e.g., \`@e1\`) become invalid after navigation or DOM changes
- Always re-snapshot after interactions that modify the page
- Use CSS selectors for stable, deterministic test steps
- Use \`@ref\` for flexible, context-aware interactions
`;

function getGlobalTemplateDir(): string {
  return path.join(os.homedir(), ".agelum", "templates");
}

function getGlobalSkillTemplatePath(): string {
  return path.join(getGlobalTemplateDir(), "agent-browser.md");
}

function ensureGlobalSkillTemplate(): string {
  const templateDir = getGlobalTemplateDir();
  const templatePath = getGlobalSkillTemplatePath();

  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  if (!fs.existsSync(templatePath)) {
    fs.writeFileSync(templatePath, AGENT_BROWSER_SKILL_TEMPLATE, "utf-8");
  }

  return templatePath;
}

export function getAgelumPath(repoPath: string): string {
  return path.join(repoPath, ".agelum");
}

export function ensureAgelumStructure(repoPath: string): string {
  const agelumPath = getAgelumPath(repoPath);

  fs.mkdirSync(agelumPath, { recursive: true });
  AGELUM_STRUCTURE.forEach((dir) => {
    fs.mkdirSync(path.join(agelumPath, dir), { recursive: true });
  });

  // Ensure the agent-browser skill file exists in this project
  const skillPath = path.join(agelumPath, "ai/skills", "agent-browser.md");
  if (!fs.existsSync(skillPath)) {
    const templatePath = ensureGlobalSkillTemplate();
    fs.copyFileSync(templatePath, skillPath);
  }

  return agelumPath;
}
