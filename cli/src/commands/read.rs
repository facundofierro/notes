use crate::types::EntityType;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    _repo: &str,
    entity: EntityType,
    path: &str,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Doc => read_doc(client, url, path).await,
        _ => {
            println!("Read command for {} not yet implemented", entity);
            Ok(())
        }
    }
}

async fn read_doc(client: &reqwest::Client, url: &str, path: &str) -> anyhow::Result<()> {
    let encoded_path = urlencoding::encode(path);
    let request_url = format!("{}/api/file?path={}", url, encoded_path);
    let resp = client.get(request_url).send().await?;

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

    Ok(())
}
