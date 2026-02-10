use crate::types::EntityType;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    _repo: &str,
    entity: EntityType,
    path: &str,
) -> anyhow::Result<()> {
    match entity {
        EntityType::Doc => delete_doc(client, url, path).await,
        _ => {
            println!("Delete command for {} not yet implemented", entity);
            Ok(())
        }
    }
}

async fn delete_doc(client: &reqwest::Client, url: &str, path: &str) -> anyhow::Result<()> {
    let encoded_path = urlencoding::encode(path);
    let request_url = format!("{}/api/file?path={}", url, encoded_path);
    let resp = client.delete(request_url).send().await?;

    if resp.status().is_success() {
        println!("File deleted successfully");
    } else {
        eprintln!("Error deleting file: {}", resp.status());
        let text = resp.text().await?;
        eprintln!("{}", text);
    }

    Ok(())
}
