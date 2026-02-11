"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGELUM_STRUCTURE = void 0;
exports.getAgelumPath = getAgelumPath;
exports.ensureAgelumStructure = ensureAgelumStructure;
exports.ensureSkillFile = ensureSkillFile;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
exports.AGELUM_STRUCTURE = [
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
3. Interact using CSS selectors (preferred for testing) or element refs (\`@e1\`)
4. Re-snapshot after DOM changes

## Selector Strategies

When selecting elements, prioritize:
1. ID: \`#submit-button\`
2. Data attributes: \`[data-testid="submit"]\`
3. Unique Classes: \`.main-nav .login-btn\`
4. CSS Combinators: \`form > button[type="submit"]\`
5. Text content (if stable): \`button:contains("Login")\` (if supported) or via XPath

Avoid:
- Generic tags: \`div\`, \`button\` (without context)
- Long detailed paths: \`div > div > div > span\`
- Dynamic/Generated classes: \`.css-1a2b3c\`

## Commands

**Navigation:**
- \`agelum browser open <url>\` — Navigate to URL
- \`agelum browser back\` — Go back
- \`agelum browser forward\` — Go forward
- \`agelum browser reload\` — Reload page

**Snapshot:**
- \`agelum browser snapshot\` — Get interactive elements with refs

**Interaction:**
- \`agelum browser click <selector>\` — Click element
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
function getGlobalTemplateDir() {
    return node_path_1.default.join(node_os_1.default.homedir(), ".agelum", "templates");
}
function getGlobalSkillTemplatePath() {
    return node_path_1.default.join(getGlobalTemplateDir(), "agent-browser.md");
}
function ensureGlobalSkillTemplate() {
    const templateDir = getGlobalTemplateDir();
    const templatePath = getGlobalSkillTemplatePath();
    if (!node_fs_1.default.existsSync(templateDir)) {
        node_fs_1.default.mkdirSync(templateDir, { recursive: true });
    }
    // Always write the latest template content so it stays up-to-date
    node_fs_1.default.writeFileSync(templatePath, AGENT_BROWSER_SKILL_TEMPLATE, "utf-8");
    return templatePath;
}
function getAgelumPath(repoPath) {
    return node_path_1.default.join(repoPath, ".agelum");
}
function ensureAgelumStructure(repoPath) {
    const agelumPath = getAgelumPath(repoPath);
    node_fs_1.default.mkdirSync(agelumPath, { recursive: true });
    exports.AGELUM_STRUCTURE.forEach((dir) => {
        node_fs_1.default.mkdirSync(node_path_1.default.join(agelumPath, dir), { recursive: true });
    });
    // Ensure the agent-browser skill file is up-to-date in this project
    const skillPath = node_path_1.default.join(agelumPath, "ai/skills", "agent-browser.md");
    const templatePath = ensureGlobalSkillTemplate();
    node_fs_1.default.copyFileSync(templatePath, skillPath);
    return agelumPath;
}
function ensureSkillFile(repoPath) {
    const agelumPath = getAgelumPath(repoPath);
    const skillsDir = node_path_1.default.join(agelumPath, "ai/skills");
    const skillPath = node_path_1.default.join(skillsDir, "agent-browser.md");
    if (!node_fs_1.default.existsSync(skillsDir)) {
        return; // .agelum not initialized yet; skip silently
    }
    const templatePath = ensureGlobalSkillTemplate();
    node_fs_1.default.copyFileSync(templatePath, skillPath);
}
