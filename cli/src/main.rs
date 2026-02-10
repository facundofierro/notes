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
    }

    Ok(())
}
