# Agelum CLI - Test & Browser Commands

This document describes the new test management and browser automation commands available in the Agelum CLI.

## Test Management Commands

### List Test Groups

List all test groups in a repository:

```bash
agelum list --repo <repo-name> --entity testgroup
```

### List Tests

List all tests in a repository:

```bash
agelum list --repo <repo-name> --entity test
```

### Create Test Group

Create a new test group:

```bash
agelum create --repo <repo-name> --entity testgroup \
  --title "Login Tests" \
  --description "Tests for login functionality"
```

### Create Test

Create a new test (optionally in a group):

```bash
# Without group
agelum create --repo <repo-name> --entity test \
  --title "Test Login Form" \
  --description "Verify login form works correctly"

# With group (use --state parameter for group name)
agelum create --repo <repo-name> --entity test \
  --title "Test Login Form" \
  --description "Verify login form works correctly" \
  --state "login"
```

### Add Test Step

Add a browser automation step to a test:

```bash
agelum test-add-step --repo <repo-name> --test-id <test-id> \
  --command "open" \
  --args "https://example.com"

agelum test-add-step --repo <repo-name> --test-id <test-id> \
  --command "click" \
  --args "@e2"
```

### Run Test

Execute a test:

```bash
agelum test-run --repo <repo-name> --test-id <test-id>
```

### Finish Test

Mark a test execution as finished:

```bash
agelum test-finish --repo <repo-name> --test-id <test-id> \
  --status "passed"

# With error
agelum test-finish --repo <repo-name> --test-id <test-id> \
  --status "failed" \
  --error "Element not found"
```

### Get Test Executions

View execution history for a test:

```bash
# Get last 5 executions (default)
agelum test-executions --repo <repo-name> --test-id <test-id>

# Get last 10 executions
agelum test-executions --repo <repo-name> --test-id <test-id> --last 10
```

### Get Test Steps

View all steps for a test:

```bash
agelum test-steps --repo <repo-name> --test-id <test-id>
```

## Browser Automation Commands

The Agelum CLI wraps `agent-browser` and provides all its commands plus an additional `navigate` command for test automation.

### Basic Browser Commands

All `agent-browser` commands work by prefixing with `agelum browser`:

```bash
# Open a URL
agelum browser open https://example.com

# Take a snapshot (get accessibility tree with refs)
agelum browser snapshot

# Click an element by ref
agelum browser click @e2

# Type into an element
agelum browser type @e5 "Hello World"

# Fill a form field
agelum browser fill @e3 "user@example.com"

# Press a key
agelum browser press Enter

# Take a screenshot
agelum browser screenshot /path/to/screenshot.png

# Get element text
agelum browser get text @e10

# Wait for an element
agelum browser wait .my-class

# Go back
agelum browser back

# Close browser
agelum browser close
```

### Navigate Command (Agelum-specific)

Execute all steps of a test automatically:

```bash
agelum browser navigate <test-id> --repo <repo-name>
```

This command:

1. Fetches all steps for the specified test from the API
2. Executes each step sequentially using `agent-browser`
3. Allows you to continue manual browser navigation after the test completes

## Complete Example Workflow

Here's a complete example of creating and running a browser test:

```bash
# 1. Create a test group
agelum create --repo my-repo --entity testgroup \
  --title "E2E Tests" \
  --description "End-to-end browser tests"

# 2. Create a test in that group
agelum create --repo my-repo --entity test \
  --title "Login Flow" \
  --description "Test the complete login flow" \
  --state "E2E Tests"

# 3. Add steps to the test (assuming test-id is "test-123")
agelum test-add-step --repo my-repo --test-id test-123 \
  --command "open" --args "https://myapp.com/login"

agelum test-add-step --repo my-repo --test-id test-123 \
  --command "fill" --args "#email" "test@example.com"

agelum test-add-step --repo my-repo --test-id test-123 \
  --command "fill" --args "#password" "secretpass"

agelum test-add-step --repo my-repo --test-id test-123 \
  --command "click" --args "#login-button"

agelum test-add-step --repo my-repo --test-id test-123 \
  --command "wait" --args ".dashboard"

# 4. View the test steps
agelum test-steps --repo my-repo --test-id test-123

# 5. Run the test automatically
agelum browser navigate test-123 --repo my-repo

# 6. Mark test as finished
agelum test-finish --repo my-repo --test-id test-123 --status "passed"

# 7. View execution history
agelum test-executions --repo my-repo --test-id test-123
```

## Browser Command Reference

For a complete list of available browser commands, see the [agent-browser documentation](https://github.com/vercel-labs/agent-browser).

Key command categories:

- **Core Commands**: open, click, type, fill, press, scroll, screenshot, snapshot
- **Get Info**: get text, get html, get value, get attr, get title, get url
- **Check State**: is visible, is enabled, is checked
- **Find Elements**: find role, find text, find label, find placeholder
- **Wait**: wait for elements, text, URL patterns, load states
- **Mouse Control**: mouse move, mouse down, mouse up
- **Browser Settings**: set viewport, set device, set geo, set offline
- **Cookies & Storage**: cookies, storage local, storage session
- **Network**: network route, network requests
- **Tabs & Windows**: tab, window new
- **Navigation**: back, forward, reload

## Notes

- The `--repo` flag is required for all test-related commands
- Test IDs are returned when creating tests and can be retrieved with `list` commands
- Browser commands require `agent-browser` to be installed on your system
- The `navigate` command executes test steps sequentially and stops if any step fails
