use crate::types::TestStepResponse;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    test_id: &str,
) -> anyhow::Result<()> {
    let encoded_repo = urlencoding::encode(repo);
    let request_url = format!("{}/api/tests/{}/steps?repo={}", url, test_id, encoded_repo);
    
    let resp = client.get(request_url).send().await?;

    if !resp.status().is_success() {
        eprintln!("Error fetching test steps: {}", resp.status());
        if let Ok(text) = resp.text().await {
            eprintln!("{}", text);
        }
        return Ok(());
    }

    let steps_resp: TestStepResponse = resp.json().await?;
    
    if steps_resp.steps.is_empty() {
        println!("No steps found for test {}", test_id);
    } else {
        println!("Test Steps for {}:", test_id);
        for step in steps_resp.steps {
            println!("  {}) {} {}", step.order, step.command, step.args.join(" "));
        }
    }

    Ok(())
}
