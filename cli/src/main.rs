use clap::{Parser, Subcommand};

mod commands;
mod types;

use types::EntityType;

#[derive(Parser)]
#[command(name = "agelum")]
#[command(about = "CLI for Agelum Notes", long_about = None)]
struct Cli {
    #[arg(long, default_value = "http://localhost:6500")]
    url: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// List available repositories
    ListRepos,
    
    /// List entities (epic, task, idea, doc, tool)
    List {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
    },
    
    /// Create a new entity
    Create {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
        #[arg(long)]
        title: String,
        #[arg(long)]
        description: Option<String>,
        #[arg(long)]
        state: Option<String>,
    },
    
    /// Move an entity (e.g., change task state)
    Move {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
        #[arg(long)]
        id: String,
        #[arg(long)]
        from_state: String,
        #[arg(long)]
        to_state: String,
    },
    
    /// Read an entity's content
    Read {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
        #[arg(long)]
        path: String,
    },
    
    /// Write content to an entity
    Write {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
        #[arg(long)]
        path: String,
        #[arg(long)]
        content: String,
    },
    
    /// Delete an entity
    Delete {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
        #[arg(long)]
        path: String,
    },
    
    /// Modify AI configuration
    ModifyAI {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
        #[arg(long)]
        config: String,
    },
    
    /// Start AI for an entity
    StartAI {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        entity: EntityType,
    },

    /// Add a step to a test
    TestAddStep {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        test_id: String,
        #[arg(long)]
        command: String,
        /// Space-separated arguments for the command
        #[arg(long)]
        args: Vec<String>,
    },

    /// Run a test
    TestRun {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        test_id: String,
    },

    /// Mark a test as finished
    TestFinish {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        test_id: String,
        #[arg(long)]
        status: String,
        #[arg(long)]
        error: Option<String>,
    },

    /// Get test executions
    TestExecutions {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        test_id: String,
        #[arg(long, default_value = "5")]
        last: usize,
    },

    /// Get test steps
    TestSteps {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        test_id: String,
    },

    /// Browser automation commands (wraps agent-browser)
    /// Usage: agelum browser <command> [args...]
    Browser {
        /// All arguments to pass to agent-browser
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        args: Vec<String>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let client = reqwest::Client::new();

    match cli.command {
        Commands::ListRepos => {
            commands::list_repos::execute(&client, &cli.url).await?;
        }
        Commands::List { repo, entity } => {
            commands::list::execute(&client, &cli.url, &repo, entity).await?;
        }
        Commands::Create { repo, entity, title, description, state } => {
            commands::create::execute(&client, &cli.url, &repo, entity, &title, description, state).await?;
        }
        Commands::Move { repo, entity, id, from_state, to_state } => {
            commands::r#move::execute(&client, &cli.url, &repo, entity, &id, &from_state, &to_state).await?;
        }
        Commands::Read { repo, entity, path } => {
            commands::read::execute(&client, &cli.url, &repo, entity, &path).await?;
        }
        Commands::Write { repo, entity, path, content } => {
            commands::write::execute(&client, &cli.url, &repo, entity, &path, &content).await?;
        }
        Commands::Delete { repo, entity, path } => {
            commands::delete::execute(&client, &cli.url, &repo, entity, &path).await?;
        }
        Commands::ModifyAI { repo, entity, config } => {
            commands::modify_ai::execute(&client, &cli.url, &repo, entity, &config).await?;
        }
        Commands::StartAI { repo, entity } => {
            commands::start_ai::execute(&client, &cli.url, &repo, entity).await?;
        }
        Commands::TestAddStep { repo, test_id, command, args } => {
            commands::test_add_step::execute(&client, &cli.url, &repo, &test_id, &command, args).await?;
        }
        Commands::TestRun { repo, test_id } => {
            commands::test_run::execute(&client, &cli.url, &repo, &test_id).await?;
        }
        Commands::TestFinish { repo, test_id, status, error } => {
            commands::test_finish::execute(&client, &cli.url, &repo, &test_id, &status, error).await?;
        }
        Commands::TestExecutions { repo, test_id, last } => {
            commands::test_executions::execute(&client, &cli.url, &repo, &test_id, last).await?;
        }
        Commands::TestSteps { repo, test_id } => {
            commands::test_steps::execute(&client, &cli.url, &repo, &test_id).await?;
        }
        Commands::Browser { args } => {
            commands::browser::execute(&client, &cli.url, args).await?;
        }
    }

    Ok(())
}
