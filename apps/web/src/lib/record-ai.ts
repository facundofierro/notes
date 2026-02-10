import { readSettings } from "./settings";
import { isCommandAvailable, getExtendedPath } from "./agent-tools";
import { spawn } from "child_process";

export interface AIBackendInfo {
  id: "google-api" | "gemini-cli";
  label: string;
  model: string;
}

export interface AIRecommendation {
  command: string;
  args: string[];
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

const SYSTEM_PROMPT_TEMPLATE = (deterministic: boolean) => `You are an AI assistant that translates natural language instructions into agent-browser commands.

Given a browser screenshot and/or DOM snapshot, and a user instruction, return a JSON object with the exact agent-browser command to execute.

Available commands:
- open <url> — Navigate to URL
- click <selector> — Click element
- dblclick <selector> — Double-click element
- type <selector> <text> — Type into element
- fill <selector> <text> — Clear and fill element
- press <key> — Press key (Enter, Tab, Escape, etc.)
- hover <selector> — Hover element
- select <selector> <value> — Select dropdown option
- check <selector> — Check checkbox
- uncheck <selector> — Uncheck checkbox
- scroll <direction> [px] — Scroll (up/down/left/right)
- wait <selector> — Wait for element
- eval <js> — Run JavaScript
- back — Go back
- forward — Go forward
- reload — Reload page

${deterministic ? "IMPORTANT: You MUST use CSS selectors (id, data-testid, class-based selectors) instead of @ref snapshot references. This ensures deterministic, repeatable tests." : "You may use @ref references from the snapshot or CSS selectors to identify elements."}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside the JSON):
{
  "command": "click",
  "args": ["#submit-btn"],
  "explanation": "Clicks the submit button",
  "stepDescription": "Click the submit button"
}

The "command" field is the agent-browser command name.
The "args" field is an array of string arguments for the command.
The "explanation" field briefly explains what the command does.
The "stepDescription" field is a short human-readable description for the test step list.`;

export async function detectAvailableBackends(): Promise<AIBackendInfo[]> {
  const backends: AIBackendInfo[] = [];

  // Check Google API key
  const settings = await readSettings();
  const googleApiKey = settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
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
  apiKey: string
): Promise<AIRecommendation> {
  const parts: any[] = [];

  // Add screenshot as inline image if available
  if (input.screenshot) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: input.screenshot,
      },
    });
  }

  // Add snapshot and user prompt as text
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
          parts: [{ text: SYSTEM_PROMPT_TEMPLATE(input.deterministic) }],
        },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
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

  // Parse JSON from response (handle possible markdown wrapping)
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const result = JSON.parse(jsonStr);
  return {
    command: result.command,
    args: Array.isArray(result.args) ? result.args.map(String) : [],
    explanation: result.explanation || "",
    stepDescription: result.stepDescription || result.explanation || "",
  };
}

async function getGeminiCliRecommendation(
  input: AIRecommendationInput
): Promise<AIRecommendation> {
  const prompt = `${SYSTEM_PROMPT_TEMPLATE(input.deterministic)}\n\nDOM Snapshot:\n${input.snapshot}\n\nUser instruction: ${input.prompt}`;

  return new Promise((resolve, reject) => {
    const outputChunks: string[] = [];
    const errorChunks: string[] = [];

    const child = spawn("gemini", ["-i", prompt], {
      env: { ...process.env, PATH: getExtendedPath() },
    });

    child.stdout.on("data", (data) => {
      outputChunks.push(data.toString());
    });

    child.stderr.on("data", (data) => {
      errorChunks.push(data.toString());
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Gemini CLI exited with code ${code}: ${errorChunks.join("")}`));
        return;
      }

      const output = outputChunks.join("").trim();
      try {
        // Extract JSON from output
        let jsonStr = output;
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }

        const result = JSON.parse(jsonStr);
        resolve({
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

    // 60s timeout for CLI
    setTimeout(() => {
      child.kill();
      reject(new Error("Gemini CLI timed out after 60 seconds"));
    }, 60000);
  });
}

export async function getAIRecommendation(
  input: AIRecommendationInput
): Promise<AIRecommendation> {
  if (input.backend === "google-api") {
    const settings = await readSettings();
    const apiKey = settings.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key not configured");
    }
    return getGoogleApiRecommendation(input, apiKey);
  }

  if (input.backend === "gemini-cli") {
    return getGeminiCliRecommendation(input);
  }

  throw new Error(`Unknown AI backend: ${input.backend}`);
}
