use crate::types::{EntityType, TaskResponse};

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    entity: EntityType,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Task => list_tasks(client, url, repo).await,
        _ => {
            println!("List command for {} not yet implemented", entity);
            Ok(())
        }
    }
}

async fn list_tasks(client: &reqwest::Client, url: &str, repo: &str) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/tasks?repo={}", url, encoded_repo);
    let resp = client.get(request_url).send().await?;

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

    Ok(())
}
