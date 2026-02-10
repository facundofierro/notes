use crate::types::EntityType;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    _repo: &str,
    entity: EntityType,
    path: &str,
    content: &str,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Doc => write_doc(client, url, path, content).await,
        _ => {
            println!("Write command for {} not yet implemented", entity);
            Ok(())
        }
    }
}

async fn write_doc(client: &reqwest::Client, url: &str, path: &str, content: &str) -> anyhow::Result<()> {
    let body = serde_json::json!({
        "path": path,
        "content": content
    });

    let resp = client
        .post(format!("{}/api/file", url))
        .json(&body)
        .send()
        .await?;

    if resp.status().is_success() {
        println!("File written successfully");
    } else {
        eprintln!("Error writing file: {}", resp.status());
        let text = resp.text().await?;
        eprintln!("{}", text);
    }

    Ok(())
}
