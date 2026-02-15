export interface OAuthUser {
  email: string;
  name: string;
  picture?: string;
  provider?: "github" | "google" | "yandex";
}

export interface ConnectionSettings {
  serverUrl: string;
  apiKey: string;
  projectRepo: string;
  reporterEmail?: string;
  oauthToken?: string;
  oauthUser?: OAuthUser;
}

export const DEFAULT_SETTINGS: ConnectionSettings = {
  serverUrl: "http://localhost:6600",
  apiKey: "",
  projectRepo: "",
  reporterEmail: "",
};

export async function getSettings(): Promise<ConnectionSettings> {
  const result = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

export async function saveSettings(settings: ConnectionSettings): Promise<void> {
  await chrome.storage.local.set({ settings });
}
