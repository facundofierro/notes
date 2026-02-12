export interface ConnectionSettings {
  serverUrl: string;
  apiKey: string;
  projectRepo: string;
}

export const DEFAULT_SETTINGS: ConnectionSettings = {
  serverUrl: "http://localhost:6600",
  apiKey: "",
  projectRepo: "",
};

export async function getSettings(): Promise<ConnectionSettings> {
  const result = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

export async function saveSettings(settings: ConnectionSettings): Promise<void> {
  await chrome.storage.local.set({ settings });
}
