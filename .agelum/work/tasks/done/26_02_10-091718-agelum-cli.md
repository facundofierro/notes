---
created: 2026-02-10T01:53:26.908Z
state: pending
---

# Agelum CLI - Pending Implementation Tasks

This task covers the remaining work required to fully enable the test management and browser automation features in the Agelum project.

## 1. Web API Endpoints Implementation

The CLI is configured to interact with the following API endpoints which need to be implemented in the Next.js web application.

- **Files to create/modify:**
  - `apps/web/src/app/api/test-groups/route.ts`: Handling GET (list) and POST (create) for test groups.
  - `apps/web/src/app/api/tests/route.ts`: Handling GET (list) and POST (create) for tests.
  - `apps/web/src/app/api/tests/[id]/steps/route.ts`: Handling GET (list steps) and POST (add step).
  - `apps/web/src/app/api/tests/[id]/run/route.ts`: Handling POST to trigger a test run.
  - `apps/web/src/app/api/tests/[id]/finish/route.ts`: Handling POST to mark execution as finished.
  - `apps/web/src/app/api/tests/[id]/executions/route.ts`: Handling GET for execution history.

## 2. Environment Setup & Dependencies

Ensure that the browser automation engine (`agent-browser`) is properly installed and accessible to the CLI.

- **Related Files:**
  - `cli/README.md`: Update with specific installation instructions for different OS.
  - `cli/src/commands/browser.rs`: Verify the path to the `agent-browser` binary.

## 3. Integration Testing & Validation

Verify the end-to-end flow from CLI command to browser action and data persistence in `.agelum`.

- **Related Files:**
  - `cli/TESTS_AND_BROWSER.md`: Use this as a guide for manual validation steps.
  - `cli/src/main.rs`: Ensure the CLI correctly handles different server responses.

## Reference: Implemented CLI Files

The following files have been implemented or modified as part of the initial CLI extension:

- `cli/src/main.rs`
- `cli/src/types.rs`
- `cli/src/commands/mod.rs`
- `cli/src/commands/test_add_step.rs`
- `cli/src/commands/test_run.rs`
- `cli/src/commands/test_finish.rs`
- `cli/src/commands/test_executions.rs`
- `cli/src/commands/test_steps.rs`
- `cli/src/commands/browser.rs`
- `cli/src/commands/list.rs`
- `cli/src/commands/create.rs`
- `cli/TESTS_AND_BROWSER.md`
