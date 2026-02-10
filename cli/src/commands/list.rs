use crate::types::{EntityType, TaskResponse, TestGroupResponse, TestResponse};

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    entity: EntityType,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Task => list_tasks(client, url, repo).await,
        EntityType::TestGroup => list_test_groups(client, url, repo).await,
        EntityType::Test => list_tests(client, url, repo).await,
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

async fn list_test_groups(client: &reqwest::Client, url: &str, repo: &str) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/test-groups?repo={}", url, encoded_repo);
    let resp = client.get(request_url).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error fetching test groups: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    let group_resp: TestGroupResponse = resp.json().await?;
    for group in group_resp.groups {
        println!("- [{}] {}", group.id, group.name);
        if let Some(desc) = group.description {
            println!("  Description: {}", desc);
        }
    }

    Ok(())
}

async fn list_tests(client: &reqwest::Client, url: &str, repo: &str) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/tests?repo={}", url, encoded_repo);
    let resp = client.get(request_url).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error fetching tests: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    let test_resp: TestResponse = resp.json().await?;
    for test in test_resp.tests {
        let group_info = test.group.as_ref().map(|g| format!(" [Group: {}]", g)).unwrap_or_default();
        println!("- [{}] {}{}", test.id, test.name, group_info);
        if let Some(desc) = test.description {
            println!("  Description: {}", desc);
        }
    }

    Ok(())
}
