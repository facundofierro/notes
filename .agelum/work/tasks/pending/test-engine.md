---
created: 2026-02-08T19:12:14.956Z
state: pending
---
# Browser Testing Engine

This task involves the implementation of a new browser testing engine based on Vercel Agent Browser and the migration of existing test structures to a more integrated and flexible architecture.

## Overview
The goal is to transition from the current standalone testing directory to a fully integrated testing suite within the `.agelum` directory. The engine will use **Vercel Agent Browser** as its core execution layer, supporting both deterministic actions and AI-powered non-deterministic actions. This allows for natural language interactions, robust element identification via accessibility trees, and visual validations.

## Vercel Agent Browser Integration
We will leverage [Vercel Agent Browser](https://github.com/vercel-labs/agent-browser) for all browser interactions. It provides a CLI-like interface and a rich set of commands optimized for AI agents.

### Element Identification
Agent Browser supports multiple ways to identify elements, prioritizing accessibility-based "refs":
- **Refs (`@ref`)**: Deterministic identifiers obtained from a `snapshot` command (e.g., `@e1`). This is the preferred method for AI-driven steps.
- **CSS Selectors**: Standard selectors like `#id` or `.class`.
- **Semantic Locators**: Identification by role, name, label, or placeholder (e.g., `role button --name "Submit"`).
- **Text & XPath**: `text="Click Me"` or standard XPath expressions.

### Key Parameters & Configuration
- `--session <name>`: Used to isolate browser sessions for different tests.
- `--profile <path>`: For persistent browser profiles (e.g., maintaining login state).
- `set viewport <w> <h>`: Configures the browser resolution.
- `set device <name>`: Emulates specific mobile or desktop devices.

## Step Types
The testing engine supports the following step types, mapping directly to Agent Browser commands or internal AI logic:

### 1. Navigation & Setup
- `open`: Navigates to a specific URL.
- `wait`: Waits for an element, specific text, a URL pattern, or a fixed duration.
- `set viewport`: Adjusts the browser window size.

### 2. Interaction (Deterministic & AI-Assisted)
These steps can use standard selectors or AI-resolved `refs`.
- `click`: Click an element.
- `type` / `fill`: Enter text into input fields.
- `select`: Choose an option from a dropdown.
- `check` / `uncheck`: Toggle checkboxes or radio buttons.
- `hover`: Move the mouse over an element.
- `press`: Execute keyboard actions (e.g., `Enter`, `Escape`).
- `scroll`: Scroll the page or into a specific element's view.

### 3. State & Observation
- `snapshot`: Captures the accessibility tree and generates `refs`. This is used by the AI to "see" the page structure and decide on the next `ref` to interact with.
- `screenshot`: Takes a visual capture of the current page state.
- `get text/value/attr`: Retrieves specific data from elements for validation.

### 4. Non-Deterministic & Validation
- **AI Prompt**: A high-level natural language instruction (e.g., "Add the item to the cart"). The engine will use `snapshot` to identify the elements and map the instruction to a sequence of interaction steps.
- **Validation Steps**: Asserts UI state via AI analysis of screenshots and snapshots. Examples:
    - `verify visible`: Check if specific text or elements are present.
    - `verify visual`: Check for UI regressions, color tones, or layout issues using AI vision.
    - `eval`: Run custom JavaScript for complex state assertions.

## Visual Editor and Execution
A visual editor will be implemented in the web application to allow users to create and manage test steps without manual JSON editing. The end goal of each execution is to return a pass/fail status and generate a series of screenshots for manual review.

## Related Files in Source Code

### Legacy / Current Implementation
- `agelum-test/`: Current root-level testing directory using Stagehand.
- `apps/web/src/app/api/(testing)/`: Current API endpoints for running and managing tests.
- `apps/web/src/hooks/usePromptBuilder.ts`: Contains references to the current testing path.

### Target / New Implementation
- `.agelum/tests/`: Future location for all test definitions and executions.
- `packages/`: Location for the new `llm-provider` and `test-engine` packages.
- `apps/web/src/app/tests/`: Potential location for the new visual test editor.
- `apps/web/src/app/api/(testing)/`: Existing API routes that will need to be refactored to support the new engine and storage path.