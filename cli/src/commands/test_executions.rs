use crate::types::TestExecutionResponse;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    test_id: &str,
    last: usize,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!(
        "{}/api/tests/{}/executions?repo={}&last={}",
        url, test_id, encoded_repo, last
    );
    
    let resp = client.get(request_url).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error fetching test executions: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    let exec_resp: TestExecutionResponse = resp.json().await?;
    
    if exec_resp.executions.is_empty() {
        println!("No executions found for test {}", test_id);
    } else {
        println!("Test Executions for {}:", test_id);
        for exec in exec_resp.executions {
            println!(
                "  [{}/{}] {} - Status: {}{}",
                exec.id,
                exec.timestamp,
                exec.test_id,
                exec.status,
                exec.error.as_ref().map(|e| format!(" (Error: {})", e)).unwrap_or_default()
            );
        }
    }

    Ok(())
}
