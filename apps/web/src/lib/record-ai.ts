import fs from "node:fs";
import path from "node:path";
import { readSettings } from "./settings";
import { isCommandAvailable, getExtendedPath } from "./agent-tools";
import { spawn } from "child_process";
import { generateStructuredObject } from "@agelum/llm-provider";
import { z } from "zod";

export interface AIBackendInfo {
  id: string; // "gemini-cli" or apiKey.id
  label: string;
  model: string;
  provider?: string;
}

export interface AIRecommendation {
  type: "command" | "prompt";
  command: string;
  args: string[];
  instruction?: string; // original prompt for non-deterministic steps
  explanation: string;
  stepDescription: string;
}

interface AIRecommendationInput {
  screenshot?: string; // base64
  snapshot: string;
  prompt: string;
  deterministic: boolean;
  backend: string; // "gemini-cli" or apiKey.id
  projectPath?: string;
}

// Detailed prompt for Gemini CLI (local file access)
const DETERMINISTIC_CLI_SYSTEM_PROMPT = `You are a browser automation agent. Translate the user instruction into a JSON command for the "agelum browser" tool.

Resources:
- Skill definition: {{SKILL_PATH}}
- Current Page Snapshot: {{SNAPSHOT_PATH}}

Your task:
1. Read the Snapshot file to understand the current page state.
2. Consult the Skill definition to identify the correct "agelum browser" command (e.g., "click", "fill", "open", "type", "press").
3. Determine the arguments (selectors, text, etc.). PREFER CSS selectors (id, data-testid) over @ref for reliability.
4. Return the result in the following JSON format ONLY:

{
  "command": "click", // The action (without 'agelum browser' prefix)
  "args": ["#selector"], // Arguments for the action
  "explanation": "Brief explanation of why this element was chosen",
  "stepDescription": "Human-readable step"
}
`;

function getSkillFilePath(cwd: string): string {
  return path.join(cwd, ".agelum", "ai", "skills", "agent-browser.md");
}

function getSnapshotFilePath(cwd: string): string {
  return path.join(cwd, ".agelum", "temp", "snapshot.txt");
}

function saveSnapshotToFile(snapshot: string, cwd: string): string {
  const snapshotPath = getSnapshotFilePath(cwd);
  const dir = path.dirname(snapshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(snapshotPath, snapshot, "utf-8");
  return snapshotPath;
}

export async function detectAvailableBackends(): Promise<AIBackendInfo[]> {
  const backends: AIBackendInfo[] = [];
  const settings = await readSettings();

  // 1. Add Configured API Keys
  if (settings.apiKeys && settings.apiKeys.length > 0) {
    settings.apiKeys.forEach((key) => {
      backends.push({
        id: key.id,
        label: `${key.name} (${key.provider})`,
        model: "default", // We could allow model selection in settings later
        provider: key.provider,
      });
    });
  } else {
    // 2. Fallback to legacy single keys (Google only for now as it was supported)
    const googleApiKey =
      settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (googleApiKey) {
      backends.push({
        id: "google-legacy",
        label: "Google AI API (Legacy)",
        model: "gemini-2.0-flash",
        provider: "google",
      });
    }
  }

  // 3. Check gemini CLI (Always available if installed)
  const hasGeminiCli = await isCommandAvailable("gemini");
  if (hasGeminiCli) {
    backends.push({
      id: "gemini-cli",
      label: "Gemini CLI (Local)",
      model: "gemini-cli",
    });
  }

  return backends;
}

const StepSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  explanation: z.string(),
  stepDescription: z.string(),
});

async function getProviderRecommendation(
  input: AIRecommendationInput,
  backendId: string,
): Promise<AIRecommendation> {
  const settings = await readSettings();

  // Find the key config
  let config: any = null;

  if (backendId === "google-legacy") {
    const key =
      settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error("Google API key not found");
    config = {
      provider: "google",
      apiKey: key,
      model: "gemini-2.0-flash",
    };
  } else {
    const keyConfig = settings.apiKeys?.find((k) => k.id === backendId);
    if (!keyConfig)
      throw new Error(`API Key configuration not found for ID: ${backendId}`);

    // Select default models based on provider if not specified
    let model = "gpt-4o";
    if (keyConfig.provider === "google") model = "gemini-2.0-flash";
    if (keyConfig.provider === "anthropic")
      model = "claude-3-5-sonnet-20241022";
    if (keyConfig.provider === "xai") model = "grok-2-latest"; // Verify model name
    if (keyConfig.provider === "openrouter")
      model = "google/gemini-2.0-flash-001"; // Default or configured

    config = {
      provider:
        keyConfig.provider === "openrouter" ? "custom" : keyConfig.provider,
      apiKey: keyConfig.key,
      baseURL: keyConfig.baseURL,
      model: model,
    };
  }

  const systemPrompt = `You are a browser automation agent. Translate the browser instruction into a single step.
  
  Available commands:
  - click(selector): Click an element.
  - type(selector, text): Type text into an input.
  - press(key): Press a key (e.g., 'Enter').
  - wait(ms): Wait for a duration.
  - scroll(x, y): Scroll part of the page.
  
  Return a structured object with the command, arguments (CSS selector preferred), explanation, and a short step description.`;

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: `DOM Snapshot:\n${input.snapshot}` },
        { type: "text" as const, text: `User instruction: ${input.prompt}` },
        ...(input.screenshot
          ? [{ type: "image" as const, image: input.screenshot }]
          : []),
      ],
    },
  ];

  try {
    const result = await generateStructuredObject(config, messages, StepSchema);

    const object = result.object as z.infer<typeof StepSchema>;

    return {
      type: "command",
      command: object.command,
      args: object.args,
      explanation: object.explanation,
      stepDescription: object.stepDescription,
    };
  } catch (error: any) {
    console.error("LLM Provider Error:", error);
    throw new Error(`AI Provider failed: ${error.message}`);
  }
}

async function getDeterministicGeminiCliRecommendation(
  input: AIRecommendationInput,
): Promise<AIRecommendation> {
  const cwd = input.projectPath || process.cwd();
  const snapshotPath = saveSnapshotToFile(input.snapshot, cwd);
  const skillPath = getSkillFilePath(cwd);

  const systemPrompt = DETERMINISTIC_CLI_SYSTEM_PROMPT.replace(
    "{{SKILL_PATH}}",
    skillPath,
  ).replace("{{SNAPSHOT_PATH}}", snapshotPath);

  const prompt = `${systemPrompt}\n\nUser instruction: ${input.prompt}`;

  return new Promise((resolve, reject) => {
    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    const child = spawn("gemini", ["-p", "", "-o", "json"], {
      cwd,
      env: { ...process.env, PATH: getExtendedPath() },
    });

    if (child.stdin) {
      child.stdin.end(prompt);
    } else {
      reject(new Error("Failed to create stdin for Gemini CLI process"));
      return;
    }

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      outputChunks.push(chunk);
      process.stdout.write(`[Gemini CLI] ${chunk}`);
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      errorChunks.push(chunk);
      process.stderr.write(`[Gemini CLI ERR] ${chunk}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Gemini CLI exited with code ${code}: ${errorChunks.join("")}`,
          ),
        );
        return;
      }

      const output = outputChunks.join("").trim();
      try {
        let jsonStr = output;
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        let result = JSON.parse(jsonStr);

        // Handle Gemini CLI wrapper (when -o json is used)
        if (result.response && typeof result.response === "string") {
          let innerJson = result.response.trim();
          // Remove markdown code blocks if present
          if (innerJson.startsWith("```")) {
            innerJson = innerJson
              .replace(/^```(?:json)?\n?/, "")
              .replace(/\n?```$/, "");
          }
          result = JSON.parse(innerJson);
        }

        resolve({
          type: "command",
          command: result.command,
          args: Array.isArray(result.args) ? result.args.map(String) : [],
          explanation: result.explanation || "",
          stepDescription: result.stepDescription || result.explanation || "",
        });
      } catch (e) {
        // Only reject if we really couldn't get a valid result
        // It's possible the output was just the JSON directly (if CLI changes behavior)
        console.error("Parse error:", e);
        reject(new Error(`Failed to parse Gemini CLI output: ${output}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn gemini CLI: ${err.message}`));
    });

    setTimeout(() => {
      child.kill();
      reject(new Error("Gemini CLI timed out after 120 seconds"));
    }, 120000);
  });
}

async function getNonDeterministicRecommendation(
  input: AIRecommendationInput,
): Promise<AIRecommendation> {
  const cwd = input.projectPath || process.cwd();
  const snapshotPath = saveSnapshotToFile(input.snapshot, cwd);
  const skillPath = getSkillFilePath(cwd);

  const prompt = `You are a browser automation agent. Execute browser commands using the agelum CLI tool.

Skill reference (available commands): ${skillPath}
Current page snapshot: ${snapshotPath}

Read the snapshot file to understand current page state, then execute the appropriate agelum CLI commands to accomplish the following instruction:

${input.prompt}

Use agelum commands to complete this task. Take a new snapshot if needed after interactions.`;

  return new Promise((resolve, reject) => {
    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    const child = spawn("gemini", ["-p", ""], {
      cwd,
      env: { ...process.env, PATH: getExtendedPath() },
    });

    if (child.stdin) {
      child.stdin.end(prompt);
    } else {
      reject(new Error("Failed to create stdin for Gemini CLI process"));
      return;
    }

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      outputChunks.push(chunk);
      process.stdout.write(`[Gemini CLI] ${chunk}`);
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      errorChunks.push(chunk);
      process.stderr.write(`[Gemini CLI ERR] ${chunk}`);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Gemini CLI exited with code ${code}: ${errorChunks.join("")}`,
          ),
        );
        return;
      }

      // Non-deterministic: return the original prompt as the step instruction
      resolve({
        type: "prompt",
        command: "",
        args: [],
        instruction: input.prompt,
        explanation: `AI executed: ${input.prompt}`,
        stepDescription: input.prompt,
      });
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn gemini CLI: ${err.message}`));
    });

    setTimeout(() => {
      child.kill();
      reject(new Error("Gemini CLI timed out after 240 seconds"));
    }, 240000);
  });
}

export async function getAIRecommendation(
  input: AIRecommendationInput,
): Promise<AIRecommendation> {
  // Non-deterministic always uses gemini CLI with agelum tool execution
  if (!input.deterministic) {
    return getNonDeterministicRecommendation(input);
  }

  // Deterministic: use selected backend
  if (input.backend === "gemini-cli") {
    return getDeterministicGeminiCliRecommendation(input);
  }

  // Use LLM Provider
  return getProviderRecommendation(input, input.backend);
}
