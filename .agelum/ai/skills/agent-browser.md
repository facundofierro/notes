# Agent Browser Skill

## Overview

Use `agelum browser` CLI to interact with browsers programmatically for web automation and testing.

## Core Workflow

1. Navigate to a URL: `agelum browser open <url>`
2. Take a snapshot to identify elements: `agelum browser snapshot`
3. Interact using CSS selectors (preferred for testing) or element refs (`@e1`)
4. Re-snapshot after DOM changes

## Selector Strategies

When selecting elements, prioritize:
1. ID: `#submit-button`
2. Data attributes: `[data-testid="submit"]`
3. Unique Classes: `.main-nav .login-btn`
4. CSS Combinators: `form > button[type="submit"]`
5. Text content (if stable): `button:contains("Login")` (if supported) or via XPath

Avoid:
- Generic tags: `div`, `button` (without context)
- Long detailed paths: `div > div > div > span`
- Dynamic/Generated classes: `.css-1a2b3c`

## Commands

**Navigation:**
- `agelum browser open <url>` — Navigate to URL
- `agelum browser back` — Go back
- `agelum browser forward` — Go forward
- `agelum browser reload` — Reload page

**Snapshot:**
- `agelum browser snapshot` — Get interactive elements with refs

**Interaction:**
- `agelum browser click <selector>` — Click element
- `agelum browser fill <selector> "<text>"` — Clear and type into field
- `agelum browser type <selector> "<text>"` — Type without clearing
- `agelum browser press <key>` — Press key (Enter, Tab, Escape, etc.)
- `agelum browser select <selector> "<option>"` — Select dropdown option
- `agelum browser check <selector>` — Check checkbox
- `agelum browser hover <selector>` — Hover element
- `agelum browser scroll <direction> [px]` — Scroll (up/down/left/right)

**Waiting:**
- `agelum browser wait <selector>` — Wait for element
- `agelum browser wait <ms>` — Wait milliseconds

**Capture:**
- `agelum browser screenshot` — Capture screenshot
- `agelum browser eval "<js>"` — Execute JavaScript

## Notes

- Element refs (e.g., `@e1`) become invalid after navigation or DOM changes
- Always re-snapshot after interactions that modify the page
- Use CSS selectors for stable, deterministic test steps
- Use `@ref` for flexible, context-aware interactions
