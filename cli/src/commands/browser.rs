use crate::types::TestStepResponse;
use std::process::Command;

pub async fn execute(
    client: &reqwest::Client,
    url: &str,
    args: Vec<String>,
) -> anyhow::Result<()> {
    // Check if this is a "navigate" command with a test ID
    if args.len() >= 2 && args[0] == "navigate" {
        let test_id = &args[1];
        
        // Extract repo from args if provided with --repo flag
        let repo = extract_repo_arg(&args);
        
        if let Some(repo) = repo {
            navigate_test(client, url, &repo, test_id).await?;
        } else {
            eprintln!("Error: --repo flag is required for 'navigate' command");
            eprintln!("Usage: agelum browser navigate <test_id> --repo <repo>");
        }
    } else {
        // Pass through to agent-browser
        passthrough_to_agent_browser(args)?;
    }

    Ok(())
}

fn extract_repo_arg(args: &[String]) -> Option<String> {
    for i in 0..args.len() {
        if args[i] == "--repo" && i + 1 < args.len() {
            return Some(args[i + 1].clone());
        }
    }
    None
}

async fn navigate_test(
    client: &reqwest::Client,
    url: &str,
    repo: &str,
    test_id: &str,
) -> anyhow::Result<()> {
    println!("Fetching test steps for test: {}", test_id);
    
    // Fetch test steps
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
        return Ok(());
    }

    println!("Executing {} steps...", steps_resp.steps.len());
    
    // Execute each step in order
    for step in steps_resp.steps {
        println!("\n▶ Step {}: {} {}", step.order, step.command, step.args.join(" "));
        
        let mut full_args = vec![step.command];
        full_args.extend(step.args);
        
        passthrough_to_agent_browser(full_args)?;
    }

    println!("\n✓ Test navigation completed");
    Ok(())
}

fn passthrough_to_agent_browser(args: Vec<String>) -> anyhow::Result<()> {
    // Execute agent-browser with the provided arguments
    let status = Command::new("agent-browser")
        .args(&args)
        .status()?;

    if !status.success() {
        eprintln!("agent-browser command failed with status: {}", status);
    }

    Ok(())
}
