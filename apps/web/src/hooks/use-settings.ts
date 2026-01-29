"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";

export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: boolean;
  autoSave: boolean;
  defaultView:
    | "ideas"
    | "docs"
    | "plan"
    | "epics"
    | "kanban"
    | "tests"
    | "commands"
    | "cli-tools";
  sidebarCollapsed: boolean;
  editorFontSize: number;
  editorFontFamily: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  aiModel: string;
  aiProvider: string;
}

const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  notifications: true,
  autoSave: true,
  defaultView: "epics",
  sidebarCollapsed: false,
  editorFontSize: 14,
  editorFontFamily: "monospace",
  showLineNumbers: true,
  wordWrap: true,
  aiModel: "default",
  aiProvider: "auto",
};

interface UseSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (
    newSettings: Partial<UserSettings>
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] =
    useState<UserSettings>(
      defaultSettings
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState<
    string | null
  >(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "/api/settings"
        );
        if (!response.ok) {
          throw new Error(
            "Failed to fetch settings"
          );
        }
        const data =
          (await response.json()) as {
            settings: UserSettings;
          };
        setSettings(data.settings);
        setError(null);
      } catch (err) {
        console.error(
          "Error fetching settings:",
          err
        );
        setError(
          "Failed to load settings"
        );
        // Keep default settings on error
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSettings();
  }, []);

  const updateSettings = useCallback(
    async (
      newSettings: Partial<UserSettings>
    ) => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "/api/settings",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              settings: newSettings,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to update settings"
          );
        }

        const data =
          (await response.json()) as {
            settings: UserSettings;
          };
        setSettings(data.settings);
        setError(null);
      } catch (err) {
        console.error(
          "Error updating settings:",
          err
        );
        setError(
          "Failed to save settings"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resetSettings =
    useCallback(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          "/api/settings",
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to reset settings"
          );
        }

        const data =
          (await response.json()) as {
            settings: UserSettings;
          };
        setSettings(data.settings);
        setError(null);
      } catch (err) {
        console.error(
          "Error resetting settings:",
          err
        );
        setError(
          "Failed to reset settings"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
  };
}
