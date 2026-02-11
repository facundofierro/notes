import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface AgentHistorySession {
  processId: string;
  toolName: string;
  contextKey: string;
  startedAt: number;
  prompt: string;
  projectName?: string;
  filePath?: string;
}

function getSettingsDir(): string {
  return path.join(os.homedir(), ".agelum");
}

function getHistoryFile(): string {
  return path.join(getSettingsDir(), "history.json");
}

function ensureSettingsDir(): void {
  const dir = getSettingsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function readAgentHistory(): Promise<AgentHistorySession[]> {
  try {
    ensureSettingsDir();
    const file = getHistoryFile();
    if (!fs.existsSync(file)) {
      return [];
    }
    const content = fs.readFileSync(file, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading agent history:", error);
    return [];
  }
}

export async function appendAgentHistory(session: AgentHistorySession): Promise<void> {
  try {
    ensureSettingsDir();
    const sessions = await readAgentHistory();
    // Add new session to the beginning
    const newSessions = [session, ...sessions];
    // Keep only last 100 sessions to prevent file from growing too large
    const trimmedSessions = newSessions.slice(0, 100);
    
    fs.writeFileSync(
      getHistoryFile(),
      JSON.stringify(trimmedSessions, null, 2),
      { mode: 0o600 }
    );
  } catch (error) {
    console.error("Error saving agent history:", error);
    throw error;
  }
}
