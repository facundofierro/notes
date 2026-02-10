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

Use \`agelum browser\` CLI to interact with browsers programmatically for web automation and testing.

## Core Workflow

1. Navigate to a URL: \`agelum browser open <url>\`
2. Take a snapshot to identify elements: \`agelum browser snapshot\`
3. Interact using element refs (\`@e1\`) or CSS selectors
4. Re-snapshot after DOM changes

## Commands

**Navigation:**
- \`agelum browser open <url>\` — Navigate to URL
- \`agelum browser back\` — Go back
- \`agelum browser forward\` — Go forward
- \`agelum browser reload\` — Reload page

**Snapshot:**
- \`agelum browser snapshot\` — Get interactive elements with refs

**Interaction:**
- \`agelum browser click <selector>\` — Click element (@ref or CSS selector)
- \`agelum browser fill <selector> "<text>"\` — Clear and type into field
- \`agelum browser type <selector> "<text>"\` — Type without clearing
- \`agelum browser press <key>\` — Press key (Enter, Tab, Escape, etc.)
- \`agelum browser select <selector> "<option>"\` — Select dropdown option
- \`agelum browser check <selector>\` — Check checkbox
- \`agelum browser hover <selector>\` — Hover element
- \`agelum browser scroll <direction> [px]\` — Scroll (up/down/left/right)

**Waiting:**
- \`agelum browser wait <selector>\` — Wait for element
- \`agelum browser wait <ms>\` — Wait milliseconds

**Capture:**
- \`agelum browser screenshot\` — Capture screenshot
- \`agelum browser eval "<js>"\` — Execute JavaScript

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

  // Always write the latest template content so it stays up-to-date
  fs.writeFileSync(templatePath, AGENT_BROWSER_SKILL_TEMPLATE, "utf-8");

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

export function ensureSkillFile(repoPath: string): void {
  const agelumPath = getAgelumPath(repoPath);
  const skillsDir = path.join(agelumPath, "ai/skills");
  const skillPath = path.join(skillsDir, "agent-browser.md");

  if (!fs.existsSync(skillPath)) {
    if (!fs.existsSync(skillsDir)) {
      return; // .agelum not initialized yet; skip silently
    }
    const templatePath = ensureGlobalSkillTemplate();
    fs.copyFileSync(templatePath, skillPath);
  }
}
