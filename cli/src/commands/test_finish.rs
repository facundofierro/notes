use serde_json::json;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    test_id: &str,
    status: &str,
    error: Option<String>,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/tests/{}/finish?repo={}", url, test_id, encoded_repo);
    
    let body = json!({
        "status": status,
        "error": error,
    });

    let resp = client.post(request_url).json(&body).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error finishing test: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    println!("✓ Test finished with status: {}", status);
    Ok(())
}
