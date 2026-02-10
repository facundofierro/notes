use crate::types::EntityType;

pub async fn execute(
    _client: &reqwest::Client,
    _url: &str,
    repo: &str,
    entity: EntityType,
    config: &str,
) -> anyhow::Result<()> {
    println!("ModifyAI command for {} in repo {} not yet implemented", entity, repo);
    println!("Config: {}", config);
    // TODO: Implement AI configuration modification
    Ok(())
}
