---
created: 2026-02-13T19:57:22.275Z
state: pending
summary: .agelum/work/summaries/landing-page-changes-1771016133201.md
---

# landing-page-changes

## Changes Required for Agelum Notes Landing Page

### 1. Add Screenshot to Hero Section

Replace or supplement the terminal demo in the hero section with an actual screenshot from the application.

**Screenshot to use:** `apps/site/public/screenshoot.png`

**Files to modify:**

- `apps/site/src/app/page.tsx` - Hero section (lines 114-153)
- Possibly `apps/site/src/app/globals.css` - For screenshot styling

### 2. Update Logo to Match Application Branding

The logo should use the same font and colors as in the Agelum Notes application:

- **Reference implementation:** `packages/shadcn/src/components/logo/DerivedLogo.tsx` (check the `notes` variant logic)
- **"Agelum"**: White (#ffffff), bold, system-ui/-apple-system sans-serif
- **"notes"**: Yellow (#fbbf24), Caveat font (cursive), rotated -5deg

**Files to modify:**

- `apps/site/src/app/page.tsx` - Replace existing logo/eyebrow (lines 117-119)
- `apps/site/src/app/globals.css` - Add Caveat font import if not present

### 3. Page Style Alignment

Modify the landing page style to match the logo branding. The page's aesthetic (colors, highlights) should be updated to complement the white and yellow (#fbbf24) theme of the logo.

**Files to modify:**
- `apps/site/src/app/globals.css` - Update theme colors and component styles

### 4. Simplified "Start Using" Flow

Agelum Notes is free to download for Linux, macOS, and Windows. Replace current CTAs with a clear "Download for Free" button.

**Files to modify:**
- `apps/site/src/app/page.tsx` - Update Hero CTAs and pricing section

### 5. Remove MCP References

Replace all MCP mentions with references to agent definitions, skills, and CLI tools.

**Current references to update:**

- `apps/site/src/app/page.tsx:22` - "AI Context" card mentions MCP
- `apps/site/src/app/page.tsx:67-68` - "Ship" step mentions MCP
- `apps/site/src/app/page.tsx:83` - Use case mentions MCP
- `apps/site/src/app/page.tsx:92` - Free plan features mention MCP
- `apps/site/src/app/page.tsx:148` - Terminal demo mentions MCP

**Replacement suggestions:**

- Use "agent definitions" or "skills" instead of MCP
- Emphasize "CLI tools" and "agent integrations"
- Example: "Structured access through agent definitions" or "Skills provide structured context to AI tools"

### 4. Add Customization & Extensibility Messaging

Add mentions about:

- Highly customizable workflows
- Ability to develop custom plugins
- Ability to create custom AI tools/agents

**Where to add:**

- Add new bento card(s) about extensibility
- Update existing cards or create new use cases
- Update terminal demo to show custom skills/agents

**Files to modify:**

- `apps/site/src/app/page.tsx` - Add new cards to `bentoCards` array (lines 12-49) or update existing content
- Consider adding examples like: "Create your own skills", "Build custom plugins", "Define your own agents"

### 5. Add CLI Tool Capabilities

Update messaging to mention that all Agelum operations can be executed via the CLI, and that even agents can use the CLI.

**Updates needed:**

- `apps/site/src/app/page.tsx:56` - Update "Initialize" step code example
- `apps/site/src/app/page.tsx:62` - Update "Create" step
- `apps/site/src/app/page.tsx:67-68` - Update "Ship" step
- Add new card(s) about CLI capabilities
- Update terminal demo to show `agelum` CLI commands

**Example additions:**

- "Execute all Agelum operations with the agelum CLI"
- "Agents can perform any operation via CLI"
- CLI examples: `agelum create`, `agelum move`, `agelum get`, etc.
