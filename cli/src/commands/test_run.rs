pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    test_id: &str,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/tests/{}/run?repo={}", url, test_id, encoded_repo);
    
    let resp = client.post(request_url).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error running test: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    println!("✓ Test started successfully");
    Ok(())
}
