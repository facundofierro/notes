"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserSettings,
  ProjectConfig,
  WorkflowConfig,
} from "@/types/settings";

export type { UserSettings, ProjectConfig, WorkflowConfig };


const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  notifications: true,
  autoSave: true,
  defaultView: "kanban",
  sidebarCollapsed: false,
  editorFontSize: 14,
  editorFontFamily: "monospace",
  showLineNumbers: true,
  wordWrap: true,
  aiModel: "default",
  aiProvider: "auto",
  apiKeys: [],
  projects: [],
  enabledAgents: ["*"],
  stagehandApiKey: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  googleApiKey: "",
  grokApiKey: "",
  workflows: [],
  activeWorkflow: "default",
  createBranchPerTask: false,
  agentToolSettings: {},
};

interface UseSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = (await response.json()) as {
        settings: UserSettings;
      };
      setSettings(data.settings);
      setError(null);
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Failed to load settings");
      // Keep default settings on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            settings: newSettings,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update settings");
        }

        const data = (await response.json()) as {
          settings: UserSettings;
        };
        setSettings(data.settings);
        setError(null);
      } catch (err) {
        console.error("Error updating settings:", err);
        setError("Failed to save settings");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resetSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to reset settings");
      }

      const data = (await response.json()) as {
        settings: UserSettings;
      };
      setSettings(data.settings);
      setError(null);
    } catch (err) {
      console.error("Error resetting settings:", err);
      setError("Failed to reset settings");
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
    refetch: fetchSettings,
  };
}
