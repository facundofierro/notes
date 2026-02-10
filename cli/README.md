# Agelum CLI

A Rust-based CLI tool for interacting with the Agelum application.
This tool is designed to be used by AI agents or for automation, communicating with the running Agelum instance (default port 6500).

## Features

- **Project Management**: List repositories, manage tasks, epics, ideas, docs, and tools
- **Test Management**: Create and manage test groups and browser automation tests
- **Browser Automation**: Full integration with agent-browser for automated testing
- **File Operations**: Read, write, and delete files
- **AI Integration**: Modify and start AI configurations

## Requirements

- Rust and Cargo
- Agelum Web App running (`pnpm web:dev` or inside Electron)
- `agent-browser` installed (for browser automation features)

## Installation

```bash
cd cli
cargo build --release
```

The binary will be available using `cargo run` or `./target/release/cli`.

## Usage

By default, the CLI connects to `http://localhost:6500`. You can override this using `--url`.

### List Repositories

```bash
agelum list-repos
```

### Entity Management

The CLI supports multiple entity types: `task`, `epic`, `idea`, `doc`, `tool`, `testgroup`, `test`

#### List Entities

```bash
# List tasks
agelum list --repo <repo-name> --entity task

# List test groups
agelum list --repo <repo-name> --entity testgroup

# List tests
agelum list --repo <repo-name> --entity test
```

#### Create Entities

```bash
# Create a task
agelum create --repo <repo-name> --entity task \
  --title "Implement Login" \
  --description "Add OAuth support" \
  --state "pending"

# Create a test group
agelum create --repo <repo-name> --entity testgroup \
  --title "Login Tests" \
  --description "Tests for login functionality"

# Create a test
agelum create --repo <repo-name> --entity test \
  --title "Test Login Form" \
  --description "Verify login form works" \
  --state "login-group-name"
```

#### Move Task

```bash
agelum move --repo <repo-name> --entity task \
  --id "task-id" \
  --from-state pending \
  --to-state doing
```

### Test Management & Browser Automation

For detailed documentation on test management and browser automation commands, see [TESTS_AND_BROWSER.md](./TESTS_AND_BROWSER.md).

Quick examples:

```bash
# Add a step to a test
agelum test-add-step --repo <repo-name> --test-id <test-id> \
  --command "open" --args "https://example.com"

# Run a test
agelum test-run --repo <repo-name> --test-id <test-id>

# View test steps
agelum test-steps --repo <repo-name> --test-id <test-id>

# Execute browser commands (wraps agent-browser)
agelum browser open https://example.com
agelum browser snapshot
agelum browser click @e2

# Navigate through a test automatically
agelum browser navigate <test-id> --repo <repo-name>
```

### File Operations

#### Read File

```bash
agelum read --repo <repo-name> --entity doc --path /path/to/file.md
```

#### Write File

```bash
agelum write --repo <repo-name> --entity doc \
  --path /path/to/file.md \
  --content "# Hello World"
```

#### Delete File

```bash
agelum delete --repo <repo-name> --entity doc --path /path/to/file.md
```

## Documentation

- [Test Management & Browser Automation Guide](./TESTS_AND_BROWSER.md) - Comprehensive guide for test and browser features
