use crate::types::EntityType;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    entity: EntityType,
    entity_id: &str,
    from_state: &str,
    to_state: &str,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Task => move_task(client, url, repo, entity_id, from_state, to_state).await,
        _ => {
            println!("Move command for {} not yet implemented", entity);
            Ok(())
        }
    }
}

async fn move_task(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    task_id: &str,
    from_state: &str,
    to_state: &str,
) -> anyhow::Result<()> {
    let body = serde_json::json!({
        "repo": repo,
        "action": "move",
        "taskId": task_id,
        "fromState": from_state,
        "toState": to_state
    });

    let resp = client
        .post(format!("{}/api/tasks", url))
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

    Ok(())
}
