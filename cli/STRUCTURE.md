# Agelum CLI - Code Structure

## Overview

The CLI has been refactored to provide a clean, modular structure with entity-based command support.

## Directory Structure

```
cli/src/
├── main.rs              # Minimal entry point - CLI definition and command dispatch
├── types.rs             # Shared types and entity definitions
└── commands/            # Command implementations (one file per command)
    ├── mod.rs           # Module exports
    ├── list_repos.rs    # List all repositories
    ├── list.rs          # List entities
    ├── create.rs        # Create entities
    ├── move.rs          # Move/update entities
    ├── read.rs          # Read entity content
    ├── write.rs         # Write entity content
    ├── delete.rs        # Delete entities
    ├── modify_ai.rs     # Modify AI configuration
    └── start_ai.rs      # Start AI for an entity
```

## Entity Types

The CLI supports the following entity types:

- **epic** - Project epics
- **task** - Individual tasks
- **idea** - Ideas and concepts
- **doc** - Documentation files
- **tool** - Tools and utilities

## Commands

### ListRepos

Lists all available repositories.

```bash
agelum-cli list-repos
```

### List

Lists entities of a specific type in a repository.

```bash
agelum-cli list --repo <REPO> --entity <ENTITY_TYPE>
```

Example:

```bash
agelum-cli list --repo myproject --entity task
```

### Create

Creates a new entity.

```bash
agelum-cli create --repo <REPO> --entity <ENTITY_TYPE> --title <TITLE> [--description <DESC>] [--state <STATE>]
```

Example:

```bash
agelum-cli create --repo myproject --entity task --title "New feature" --description "Implement new feature" --state pending
```

### Move

Moves an entity from one state to another.

```bash
agelum-cli move --repo <REPO> --entity <ENTITY_TYPE> --id <ID> --from-state <FROM> --to-state <TO>
```

Example:

```bash
agelum-cli move --repo myproject --entity task --id task-123 --from-state pending --to-state in-progress
```

### Read

Reads the content of an entity.

```bash
agelum-cli read --repo <REPO> --entity <ENTITY_TYPE> --path <PATH>
```

Example:

```bash
agelum-cli read --repo myproject --entity doc --path docs/README.md
```

### Write

Writes content to an entity.

```bash
agelum-cli write --repo <REPO> --entity <ENTITY_TYPE> --path <PATH> --content <CONTENT>
```

Example:

```bash
agelum-cli write --repo myproject --entity doc --path docs/TODO.md --content "# Tasks\n- Task 1"
```

### Delete

Deletes an entity.

```bash
agelum-cli delete --repo <REPO> --entity <ENTITY_TYPE> --path <PATH>
```

Example:

```bash
agelum-cli delete --repo myproject --entity doc --path docs/old.md
```

### ModifyAI

Modifies AI configuration for an entity (not yet implemented).

```bash
agelum-cli modify-ai --repo <REPO> --entity <ENTITY_TYPE> --config <CONFIG>
```

### StartAI

Starts AI processing for an entity (not yet implemented).

```bash
agelum-cli start-ai --repo <REPO> --entity <ENTITY_TYPE>
```

## Adding New Commands

To add a new command:

1. Create a new file in `src/commands/` (e.g., `my_command.rs`)
2. Implement the command logic with the signature:
   ```rust
   pub async fn execute(
       client: &reqwest::Client,
       url: &str,
       // ... your parameters
   ) -> anyhow::Result<()> {
       // implementation
   }
   ```
3. Export the module in `src/commands/mod.rs`:
   ```rust
   pub mod my_command;
   ```
4. Add the command variant in `src/main.rs` in the `Commands` enum
5. Add the match arm in `main()` to dispatch to your command

## Adding Support for New Entity Types

To add support for a new entity type in an existing command:

1. Add the entity type variant in `src/types.rs` in the `EntityType` enum
2. Update the `Display` and `FromStr` implementations for the new type
3. Add a match arm in the command's `execute()` function to handle the new entity type
4. Implement the entity-specific logic

## Code Principles

- **Small main.rs**: The main file only handles CLI setup and command dispatch
- **One command per file**: Each command has its own file in `commands/`
- **Entity-based**: Commands operate on different entity types (epic, task, idea, doc, tool)
- **Extensible**: Easy to add new commands and entity types
- **Type-safe**: Using Rust's type system to ensure correctness
