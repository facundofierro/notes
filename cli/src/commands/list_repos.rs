use crate::types::RepositoryResponse;

pub async fn execute(client: &reqwest::Client, url: &str) -> anyhow::Result<()> {
    let resp = client
        .get(format!("{}/api/repositories", url))
        .send()
        .await?;
    
    if !resp.status().is_success() {
        eprintln!("Error fetching repos: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    let resp_json: RepositoryResponse = resp.json().await?;
    if let Some(err) = resp_json.error {
        eprintln!("API Error: {}", err);
    }
    for repo in resp_json.repositories {
        println!("- {} ({})", repo.name, repo.path);
    }
    
    Ok(())
}
