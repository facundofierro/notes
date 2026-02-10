# Agelum CLI

A Rust-based CLI tool for interacting with the Agelum application.
This tool is designed to be used by AI agents or for automation, communicating with the running Agelum instance (default port 6500).

## Requirements

- Rust and Cargo
- Agelum Web App running (`pnpm web:dev` or inside Electron)

## Installation

```bash
cd cli
cargo build --release
```

The binary will be available at using `cargo run` or `./target/release/cli`.

## Usage

By default, the CLI connects to `http://localhost:6500`. You can override this using `--url`.

### List Repositories

```bash
cargo run -- list-repos
```

### List Tasks

List tasks for a specific repository (e.g., `agelum`).

```bash
cargo run -- list-tasks --repo agelum
```

### Create Task

```bash
cargo run -- create-task --repo agelum --title "Implement Login" --description "Add OAuth support"
```

### Move Task

```bash
cargo run -- move-task --repo agelum --task-id "task-file-name" --from-state pending --to-state doing
```

### File Operations

#### Read File

```bash
cargo run -- read-file --path /absolute/path/to/file.md
```

#### Write File

```bash
cargo run -- write-file --path /absolute/path/to/file.md --content "# Hello World"
```

#### Delete File

```bash
cargo run -- delete-file --path /absolute/path/to/file.md
```
