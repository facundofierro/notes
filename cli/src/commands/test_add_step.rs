use serde_json::json;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    test_id: &str,
    command: &str,
    args: Vec<String>,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/tests/{}/steps?repo={}", url, test_id, encoded_repo);
    
    let body = json!({
        "command": command,
        "args": args,
    });

    let resp = client.post(request_url).json(&body).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error adding test step: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    println!("✓ Test step added successfully");
    Ok(())
}
