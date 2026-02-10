# Test Step Types

## Overview

The test framework now supports three main step types designed to work with the [Vercel Agent Browser](https://github.com/vercel-labs/agent-browser):

1. **Open** - Navigate to URLs
2. **Command** - Execute any agent-browser command
3. **Prompt** - AI-driven execution using Gemini CLI

## Step Types

### 1. Open

Opens a URL in the browser.

**Fields:**

- `url` (string) - The URL to navigate to

**Example:**

```json
{
  "action": "open",
  "url": "https://example.com"
}
```

### 2. Command

Execute any command supported by agent-browser. This gives you direct access to all agent-browser capabilities including clicks, typing, screenshots, element inspection, and more.

**Fields:**

- `command` (string) - The agent-browser command to execute

**Example:**

```json
{
  "action": "command",
  "command": "click @submit"
}
```

```json
{
  "action": "command",
  "command": "fill #email test@example.com"
}
```

```json
{
  "action": "command",
  "command": "screenshot login-page.png"
}
```

**Available Commands:**

The UI displays a reference table with all available commands that can be clicked to use as templates:

#### Core Commands

- `open <url>` - Navigate to URL
- `click <selector>` - Click element
- `dblclick <selector>` - Double-click element
- `type <selector> <text>` - Type into element
- `fill <selector> <text>` - Clear and fill element
- `press <key>` - Press key (Enter, Tab, etc.)
- `hover <selector>` - Hover element
- `select <selector> <value>` - Select dropdown option
- `check <selector>` - Check checkbox
- `uncheck <selector>` - Uncheck checkbox
- `scroll <direction> [px]` - Scroll (up/down/left/right)
- `screenshot [path]` - Take screenshot
- `snapshot` - Get accessibility tree with refs
- `wait <selector>` - Wait for element
- `eval <js>` - Run JavaScript

#### Get Info

- `get text <selector>` - Get text content
- `get value <selector>` - Get input value
- `get attr <selector> <attr>` - Get attribute
- `get title` - Get page title
- `get url` - Get current URL

#### Navigation

- `back` - Go back
- `forward` - Go forward
- `reload` - Reload page

#### Check State

- `is visible <selector>` - Check if visible
- `is enabled <selector>` - Check if enabled
- `is checked <selector>` - Check if checked

### 3. Prompt

AI-driven test execution. Describe what you want to happen in natural language, and the AI (Gemini CLI) will use agent-browser to execute the action.

**Fields:**

- `instruction` (string) - Natural language description of what the AI should do

**Example:**

```json
{
  "action": "prompt",
  "instruction": "Click the blue submit button and wait for the success modal to appear"
}
```

```json
{
  "action": "prompt",
  "instruction": "Fill out the login form with test credentials and submit"
}
```

## UI Features

### Command Reference

When creating or editing a Command step, the UI displays an interactive reference table showing all available agent-browser commands. You can click any command to use it as a template.

### Step Display

- **Open steps** show the URL
- **Command steps** show the command in a monospace font with emerald color
- **Prompt steps** show the first 60 characters of the instruction in italics

## Migration from Old Step Types

The following old step types have been replaced:

| Old Type        | New Equivalent                                                      |
| --------------- | ------------------------------------------------------------------- |
| `click`         | `command` with `click <selector>`                                   |
| `type`          | `command` with `type <selector> <text>` or `fill <selector> <text>` |
| `wait`          | `command` with `wait <selector>`                                    |
| `snapshot`      | `command` with `snapshot`                                           |
| `verifyVisible` | `command` with `is visible <selector>`                              |
| `screenshot`    | `command` with `screenshot [path]`                                  |
| `setViewport`   | `command` with `set viewport <w> <h>`                               |

The old `prompt` type is now enhanced to use Gemini CLI with agent-browser for more powerful AI-driven testing.

## Implementation Notes

- All commands are executed through the agent-browser CLI
- The Prompt type executes Gemini CLI in the background, which in turn uses agent-browser
- Selectors can use:
  - `@ref` for AI-detected elements
  - CSS selectors (e.g., `#id`, `.class`)
  - Text selectors (e.g., `text=Submit`)
  - XPath selectors
