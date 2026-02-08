import { TestEngine } from "./engine";
import { TestScenario } from "./types";
import { defaultProvider } from "@agelum/llm-provider";
import fs from "fs";
import path from "path";

async function main() {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    console.error("Please provide a scenario file path");
    process.exit(1);
  }

  const absolutePath = path.resolve(scenarioPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Scenario file not found: ${absolutePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    const json = JSON.parse(content);
    
    // Parse using Zod schema
    const scenario = TestScenario.parse(json);

    const engine = new TestEngine(defaultProvider);
    
    console.log("Starting engine...");
    await engine.start({ headless: process.env.HEADLESS !== "false" });

    try {
      await engine.runScenario(scenario);
      console.log("Scenario completed successfully.");
    } catch (error: any) {
      console.error("Scenario failed:", error.message);
      process.exit(1);
    } finally {
      await engine.stop();
    }

  } catch (error: any) {
    console.error("Failed to load or parse scenario:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
