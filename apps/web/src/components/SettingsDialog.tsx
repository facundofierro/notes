"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  Button,
} from "@agelum/shadcn";
import {
  useSettings,
  UserSettings,
} from "@/hooks/use-settings";
import {
  RotateCcw,
  Save,
  Folder,
  Bot,
  TestTube,
  Settings as SettingsIcon,
  LayoutTemplate,
} from "lucide-react";
import { SettingsProjects } from "./settings/SettingsProjects";
import { SettingsAgents } from "./settings/SettingsAgents";
import { SettingsTests } from "./settings/SettingsTests";
import { SettingsDefaults } from "./settings/SettingsDefaults";
import { SettingsWorkflows } from "./settings/SettingsWorkflows";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

type Tab =
  | "projects"
  | "agents"
  | "tests"
  | "defaults"
  | "workflows";

export function SettingsDialog({
  open,
  onOpenChange,
  onSave,
}: SettingsDialogProps) {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
  } = useSettings();
  const [
    localSettings,
    setLocalSettings,
  ] =
    React.useState<UserSettings>(
      settings,
    );
  const [hasChanges, setHasChanges] =
    React.useState(false);
  const [activeTab, setActiveTab] =
    React.useState<Tab>("defaults");

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <
    K extends keyof UserSettings,
  >(
    key: K,
    value: UserSettings[K],
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings(
        localSettings,
      );
      setHasChanges(false);
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      setHasChanges(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const tabs: {
    id: Tab;
    label: string;
    icon: any;
  }[] = [
    {
      id: "projects",
      label: "Projects",
      icon: Folder,
    },
    {
      id: "agents",
      label: "Agents",
      icon: Bot,
    },
    {
      id: "tests",
      label: "Tests",
      icon: TestTube,
    },
    {
      id: "defaults",
      label: "Defaults",
      icon: SettingsIcon,
    },
    {
      id: "workflows",
      label: "Workflows",
      icon: LayoutTemplate,
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-5xl h-[80vh] flex gap-0 p-0 overflow-hidden bg-background border-border text-foreground">
        {/* Sidebar */}
        <div className="flex flex-col gap-2 p-4 w-64 border-r border-border bg-background">
          <div className="px-2 pt-2 mb-4">
            <h2 className="text-lg font-bold text-white">
              Settings
            </h2>
          </div>

          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`w-full justify-start gap-3 ${activeTab === tab.id ? "bg-secondary text-white" : "text-muted-foreground hover:text-white hover:bg-secondary/50"}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 pt-4 mt-auto border-t border-border">
            {error ? (
              <div className="px-2 py-1 text-xs text-red-400">
                {error}
              </div>
            ) : null}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="gap-2 justify-start w-full text-muted-foreground bg-transparent border-border hover:bg-secondary hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Defaults
            </Button>

            <Button
              onClick={handleSave}
              disabled={
                isLoading || !hasChanges
              }
              className="gap-2 justify-start w-full text-white bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-8 bg-background">
          {activeTab === "projects" && (
            <SettingsProjects
              settings={localSettings}
              onChange={handleChange}
            />
          )}
          {activeTab === "agents" && (
            <SettingsAgents
              settings={localSettings}
              onChange={handleChange}
            />
          )}
          {activeTab === "tests" && (
            <SettingsTests
              settings={localSettings}
              onChange={handleChange}
            />
          )}
          {activeTab === "defaults" && (
            <SettingsDefaults
              settings={localSettings}
              onChange={handleChange}
            />
          )}
          {activeTab ===
            "workflows" && (
            <SettingsWorkflows
              settings={localSettings}
              onChange={handleChange}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
