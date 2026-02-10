use crate::types::EntityType;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    entity: EntityType,
    title: &str,
    description: Option<String>,
    state: Option<String>,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Task => create_task(client, url, repo, title, description, state).await,
        EntityType::TestGroup => create_test_group(client, url, repo, title, description).await,
        EntityType::Test => create_test(client, url, repo, title, description, state).await,
        _ => {
            println!("Create command for {} not yet implemented", entity);
            Ok(())
        }
    }
}

async fn create_task(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    title: &str,
    description: Option<String>,
    state: Option<String>,
) -> anyhow::Result<()> {
    let body = serde_json::json!({
        "repo": repo,
        "action": "create",
        "data": {
            "title": title,
            "description": description,
            "state": state.unwrap_or_else(|| "pending".to_string())
        }
    });

    let resp = client
        .post(format!("{}/api/tasks", url))
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

    Ok(())
}

async fn create_test_group(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    name: &str,
    description: Option<String>,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let body = serde_json::json!({
        "name": name,
        "description": description,
    });

    let resp = client
        .post(format!("{}/api/test-groups?repo={}", url, encoded_repo))
        .json(&body)
        .send()
        .await?;

    if resp.status().is_success() {
        println!("✓ Test group created successfully");
        let json: serde_json::Value = resp.json().await?;
        println!("{}", serde_json::to_string_pretty(&json)?);
    } else {
        eprintln!("Error creating test group: {}", resp.status());
        let text = resp.text().await?;
        eprintln!("{}", text);
    }

    Ok(())
}

async fn create_test(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    name: &str,
    description: Option<String>,
    group: Option<String>,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let body = serde_json::json!({
        "name": name,
        "description": description,
        "group": group,
    });

    let resp = client
        .post(format!("{}/api/tests?repo={}", url, encoded_repo))
        .json(&body)
        .send()
        .await?;

    if resp.status().is_success() {
        println!("✓ Test created successfully");
        let json: serde_json::Value = resp.json().await?;
        println!("{}", serde_json::to_string_pretty(&json)?);
    } else {
        eprintln!("Error creating test: {}", resp.status());
        let text = resp.text().await?;
        eprintln!("{}", text);
    }

    Ok(())
}
