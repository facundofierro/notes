use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};

#[derive(Parser)]
#[command(name = "agelum-cli")]
#[command(about = "CLI for Agelum", long_about = None)]
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
    /// List tasks for a repository
    ListTasks {
        #[arg(long)]
        repo: String,
    },
    /// Create a new task
    CreateTask {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        title: String,
        #[arg(long)]
        description: Option<String>,
        #[arg(long, default_value = "pending")]
        state: String,
    },
    /// Move a task
    MoveTask {
        #[arg(long)]
        repo: String,
        #[arg(long)]
        task_id: String,
        #[arg(long)]
        from_state: String,
        #[arg(long)]
        to_state: String,
    },
    /// Read file content
    ReadFile {
        #[arg(long)]
        path: String,
    },
    /// Write file content
    WriteFile {
        #[arg(long)]
        path: String,
        #[arg(long)]
        content: String,
    },
    /// Delete file
    DeleteFile {
        #[arg(long)]
        path: String,
    },
}

#[derive(Deserialize, Debug)]
struct Repository {
    name: String,
    path: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct Reposponse {
    repositories: Vec<Repository>,
    #[serde(default)]
    base_path: String,
    #[serde(default)]
    server_mode: bool,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
struct Task {
    id: String,
    title: String,
    state: String,
    #[serde(default)]
    epic: Option<String>,
}

#[derive(Deserialize, Debug)]
struct TaskResponse {
    tasks: Vec<Task>,
}

#[derive(Serialize)]
struct CreateTaskRequest {
    title: String,
    description: Option<String>,
    state: String,
}

#[derive(Deserialize, Debug)]
struct FileResponse {
    content: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let client = reqwest::Client::new();

    match cli.command {
        Commands::ListRepos => {
            let resp = client
                .get(format!("{}/api/repositories", cli.url))
                .send()
                .await?;
            
            if !resp.status().is_success() {
                 eprintln!("Error fetching repos: {}", resp.status());
                 // try to get text if possible
                 if let Ok(text) = resp.text().await {
                     eprintln!("{}", text);
                 }
                 return Ok(());
            }

            let resp_json: Reposponse = resp.json().await?;
            if let Some(err) = resp_json.error {
                 eprintln!("API Error: {}", err);
            }
            for repo in resp_json.repositories {
                println!("- {} ({})", repo.name, repo.path);
            }
        }
        Commands::ListTasks { repo } => {
            let encoded_repo = urlencoding::encode(&repo);
            let url = format!("{}/api/tasks?repo={}", cli.url, encoded_repo);
            let resp = client
                .get(url)
                .send()
                .await?;

            if !resp.status().is_success() {
                 eprintln!("Error fetching tasks: {}", resp.status());
                 if let Ok(text) = resp.text().await {
                     eprintln!("{}", text);
                 }
                 return Ok(());
            }

            let task_resp: TaskResponse = resp.json().await?;
            for task in task_resp.tasks {
                 println!("- [{}] {} (State: {})", task.id, task.title, task.state);
            }
        }
        Commands::CreateTask { repo, title, description, state } => {
            let body = serde_json::json!({
                "repo": repo,
                "action": "create",
                "data": {
                    "title": title,
                    "description": description,
                    "state": state
                }
            });
             let resp = client
                .post(format!("{}/api/tasks", cli.url))
                .json(&body)
                .send()
                .await?;
            
             if resp.status().is_success() {
                 println!("Task created successfully");
                 let json: serde_json::Value = resp.json().await?;
                 println!("{}", serde_json::to_string_pretty(&json)?);
             } else {
                 eprintln!("Error creating task: {}", resp.status());
                 let text = resp.text().await?;
                 eprintln!("{}", text);
             }
        }
        Commands::MoveTask { repo, task_id, from_state, to_state } => {
            let body = serde_json::json!({
                "repo": repo,
                "action": "move",
                "taskId": task_id,
                "fromState": from_state,
                "toState": to_state
            });
            let resp = client
                .post(format!("{}/api/tasks", cli.url))
                .json(&body)
                .send()
                .await?;
             if resp.status().is_success() {
                 println!("Task moved successfully");
             } else {
                 eprintln!("Error moving task: {}", resp.status());
                 let text = resp.text().await?;
                 eprintln!("{}", text);
             }
        }
        Commands::ReadFile { path } => {
            let encoded_path = urlencoding::encode(&path);
            let url = format!("{}/api/file?path={}", cli.url, encoded_path);
            let resp = client
                .get(url)
                .send()
                .await?;
            
             if resp.status().is_success() {
                 let json: serde_json::Value = resp.json().await?;
                 if let Some(content) = json.get("content").and_then(|c| c.as_str()) {
                     println!("{}", content);
                 } else {
                     eprintln!("No content returned or invalid format");
                 }
             } else {
                 eprintln!("Error reading file: {}", resp.status());
                 let text = resp.text().await?;
                 eprintln!("{}", text);
             }
        }
        Commands::WriteFile { path, content } => {
            let body = serde_json::json!({
                "path": path,
                "content": content
            });
            let resp = client
                .post(format!("{}/api/file", cli.url))
                .json(&body)
                .send()
                .await?;
            
             if resp.status().is_success() {
                 println!("File written successfully");
             } else {
                 eprintln!("Error writing file: {}", resp.status());
                 let text = resp.text().await?;
                 eprintln!("{}", text);
             }
        }
        Commands::DeleteFile { path } => {
            let encoded_path = urlencoding::encode(&path);
            let url = format!("{}/api/file?path={}", cli.url, encoded_path);
            let resp = client
                .delete(url)
                .send()
                .await?;
            
             if resp.status().is_success() {
                 println!("File deleted successfully");
             } else {
                 eprintln!("Error deleting file: {}", resp.status());
                 let text = resp.text().await?;
                 eprintln!("{}", text);
             }
        }
    }

    Ok(())
}
