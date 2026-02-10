use crate::types::EntityType;

pub async fn execute(
    _client: &reqwest::Client,
    _url: &str,
    repo: &str,
    entity: EntityType,
) -> anyhow::Result<()> {
    println!("StartAI command for {} in repo {} not yet implemented", entity, repo);
    // TODO: Implement AI start functionality
    Ok(())
}
