import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readSettings } from "../settings";
import { ensureEnvFileMissingOnly } from "../env-file";

function withTempHome<T>(fn: (homeDir: string) => T): T {
  const previousHome = process.env.HOME;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "agelum-home-"));
  process.env.HOME = temp;
  try {
    return fn(temp);
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    try {
      fs.rmSync(temp, {
        recursive: true,
        force: true,
      });
    } catch {}
  }
}

withTempHome((homeDir) => {
  delete process.env.BROWSERBASE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.XAI_API_KEY;

  const settings = readSettings();
  const settingsPath = path.join(homeDir, ".agelum", "user-settings.json");
  assert.ok(fs.existsSync(settingsPath));
  const raw = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  assert.equal(typeof raw.openaiApiKey, "string");
  assert.equal(settings.openaiApiKey, "");
});

withTempHome((homeDir) => {
  process.env.OPENAI_API_KEY = "sk-test-openai";
  const settings = readSettings();
  assert.equal(settings.openaiApiKey, "sk-test-openai");
  const settingsPath = path.join(homeDir, ".agelum", "user-settings.json");
  const raw = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  assert.equal(raw.openaiApiKey, "sk-test-openai");
});

withTempHome((homeDir) => {
  process.env.XAI_API_KEY = "xai-test-grok";
  const settings = readSettings();
  assert.equal(settings.grokApiKey, "xai-test-grok");
  const settingsPath = path.join(homeDir, ".agelum", "user-settings.json");
  const raw = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<
    string,
    unknown
  >;
  assert.equal(raw.grokApiKey, "xai-test-grok");
});

withTempHome(() => {
  process.env.OPENAI_API_KEY = "sk-env";
  const home = os.homedir();
  const settingsDir = path.join(home, ".agelum");
  fs.mkdirSync(settingsDir, {
    recursive: true,
  });
  const settingsPath = path.join(settingsDir, "user-settings.json");
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        openaiApiKey: "sk-stored",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  const settings = readSettings();
  assert.equal(settings.openaiApiKey, "sk-stored");
});

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agelum-env-"));
  try {
    const envPath = path.join(dir, ".env");
    fs.writeFileSync(envPath, "OPENAI_API_KEY=sk-existing\n", { mode: 0o600 });
    ensureEnvFileMissingOnly(dir, {
      OPENAI_API_KEY: "sk-new",
    });
    assert.equal(
      fs.readFileSync(envPath, "utf8"),
      "OPENAI_API_KEY=sk-existing\n",
    );

    ensureEnvFileMissingOnly(dir, {
      ANTHROPIC_API_KEY: "sk-ant",
    });
    const updated = fs.readFileSync(envPath, "utf8");
    assert.ok(updated.includes("OPENAI_API_KEY=sk-existing"));
    assert.ok(updated.includes("ANTHROPIC_API_KEY=sk-ant"));
  } finally {
    try {
      fs.rmSync(dir, {
        recursive: true,
        force: true,
      });
    } catch {}
  }
}
