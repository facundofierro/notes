import fs from "node:fs";
import path from "node:path";
import { readSettings } from "./settings";
import { isCommandAvailable, getExtendedPath } from "./agent-tools";
import { spawn } from "child_process";

export interface AIBackendInfo {
  id: "google-api" | "gemini-cli";
  label: string;
  model: string;
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
  backend: "google-api" | "gemini-cli";
}

// Shorter deterministic system prompt for Google API
const DETERMINISTIC_SYSTEM_PROMPT = `Translate the browser instruction into a JSON agent-browser command.
Given the DOM snapshot and instruction, return ONLY valid JSON:
{
  "command": "click",
  "args": ["#selector"],
  "explanation": "Brief description",
  "stepDescription": "Human-readable step"
}
Use CSS selectors (id, data-testid, class-based) for deterministic, repeatable steps. No @ref references.`;

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

function getSkillFilePath(): string {
  return path.join(process.cwd(), ".agelum", "ai", "skills", "agent-browser.md");
}

function getSnapshotFilePath(): string {
  return path.join(process.cwd(), ".agelum", "temp", "snapshot.txt");
}

function saveSnapshotToFile(snapshot: string): string {
  const snapshotPath = getSnapshotFilePath();
  const dir = path.dirname(snapshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(snapshotPath, snapshot, "utf-8");
  return snapshotPath;
}

export async function detectAvailableBackends(): Promise<AIBackendInfo[]> {
  const backends: AIBackendInfo[] = [];

  // Check Google API key
  const settings = await readSettings();
  const googleApiKey =
    settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleApiKey) {
    backends.push({
      id: "google-api",
      label: "Google AI API",
      model: "gemini-2.0-flash",
    });
  }

  // Check gemini CLI
  const hasGeminiCli = await isCommandAvailable("gemini");
  if (hasGeminiCli) {
    backends.push({
      id: "gemini-cli",
      label: "Gemini CLI",
      model: "gemini-cli",
    });
  }

  return backends;
}

async function getGoogleApiRecommendation(
  input: AIRecommendationInput,
  apiKey: string,
): Promise<AIRecommendation> {
  const parts: any[] = [];

  if (input.screenshot) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: input.screenshot,
      },
    });
  }

  parts.push({
    text: `DOM Snapshot:\n${input.snapshot}\n\nUser instruction: ${input.prompt}`,
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: DETERMINISTIC_SYSTEM_PROMPT }],
        },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Google AI API");
  }

  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const result = JSON.parse(jsonStr);
  return {
    type: "command",
    command: result.command,
    args: Array.isArray(result.args) ? result.args.map(String) : [],
    explanation: result.explanation || "",
    stepDescription: result.stepDescription || result.explanation || "",
  };
}

async function getDeterministicGeminiCliRecommendation(
  input: AIRecommendationInput,
): Promise<AIRecommendation> {
  const snapshotPath = saveSnapshotToFile(input.snapshot);
  const skillPath = getSkillFilePath();

  const systemPrompt = DETERMINISTIC_CLI_SYSTEM_PROMPT.replace(
    "{{SKILL_PATH}}",
    skillPath,
  ).replace("{{SNAPSHOT_PATH}}", snapshotPath);

  const prompt = `${systemPrompt}\n\nUser instruction: ${input.prompt}`;

  return new Promise((resolve, reject) => {
    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    const child = spawn("gemini", ["-p", "", "-o", "json"], {
      env: { ...process.env, PATH: getExtendedPath() },
    });

    if (child.stdin) {
      child.stdin.end(prompt);
    } else {
      reject(new Error("Failed to create stdin for Gemini CLI process"));
      return;
    }

    child.stdout.on("data", (data) => {
      outputChunks.push(data.toString());
    });

    child.stderr.on("data", (data) => {
      errorChunks.push(data.toString());
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

        const result = JSON.parse(jsonStr);
        resolve({
          type: "command",
          command: result.command,
          args: Array.isArray(result.args) ? result.args.map(String) : [],
          explanation: result.explanation || "",
          stepDescription: result.stepDescription || result.explanation || "",
        });
      } catch (e) {
        reject(new Error(`Failed to parse Gemini CLI output: ${output}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn gemini CLI: ${err.message}`));
    });

    setTimeout(() => {
      child.kill();
      reject(new Error("Gemini CLI timed out after 60 seconds"));
    }, 60000);
  });
}

async function getNonDeterministicRecommendation(
  input: AIRecommendationInput,
): Promise<AIRecommendation> {
  const snapshotPath = saveSnapshotToFile(input.snapshot);
  const skillPath = getSkillFilePath();

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
      env: { ...process.env, PATH: getExtendedPath() },
    });

    if (child.stdin) {
      child.stdin.end(prompt);
    } else {
      reject(new Error("Failed to create stdin for Gemini CLI process"));
      return;
    }

    child.stdout.on("data", (data) => {
      outputChunks.push(data.toString());
    });

    child.stderr.on("data", (data) => {
      errorChunks.push(data.toString());
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
      reject(new Error("Gemini CLI timed out after 120 seconds"));
    }, 120000);
  });
}

export async function getAIRecommendation(
  input: AIRecommendationInput,
): Promise<AIRecommendation> {
  // Non-deterministic always uses gemini CLI with agelum tool execution
  if (!input.deterministic) {
    return getNonDeterministicRecommendation(input);
  }

  // Deterministic: use selected backend to generate a command
  if (input.backend === "google-api") {
    const settings = await readSettings();
    const apiKey =
      settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key not configured");
    }
    return getGoogleApiRecommendation(input, apiKey);
  }

  if (input.backend === "gemini-cli") {
    return getDeterministicGeminiCliRecommendation(input);
  }

  throw new Error(`Unknown AI backend: ${input.backend}`);
}
