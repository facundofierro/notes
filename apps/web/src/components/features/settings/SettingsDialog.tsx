"use client";

import * as React from "react";
import { Dialog, DialogContent, Button } from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";
import {
  RotateCcw,
  Save,
  Folder,
  Bot,
  TestTube,
  Settings as SettingsIcon,
  LayoutTemplate,
  Terminal,
  Eye,
} from "lucide-react";
import { SettingsProjects } from "./SettingsProjects";
import { SettingsAgents } from "./SettingsAgents";
import { SettingsTests } from "./SettingsTests";
import { SettingsDefaults } from "./SettingsDefaults";
import { SettingsWorkflows } from "./SettingsWorkflows";
import { ProjectSettings } from "./ProjectSettings";
import { SettingsLLM } from "./SettingsLLM";
import { useHomeStore } from "@/store/useHomeStore";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  initialTab?: Tab;
  projectName?: string;
  projectPath?: string;
}

type Tab =
  | "projects"
  | "agents"
  | "tests"
  | "defaults"
  | "workflows"
  | "project-config"
  | "project-commands"
  | "project-preview"
  | "llm";

export function SettingsDialog({
  open,
  onOpenChange,
  onSave,
  initialTab,
  projectName,
  projectPath,
}: SettingsDialogProps) {
  const {
    settings,
    isSettingsLoading: isLoading,
    settingsError: error,
    updateSettings,
    resetSettings,
  } = useHomeStore();

  const [localSettings, setLocalSettings] =
    React.useState<UserSettings>(settings);

  React.useEffect(() => {
    const loadProjectConfig = async () => {
      if (
        open &&
        projectName &&
        projectPath &&
        settings.projects &&
        !settings.projects.find((p) => p.name === projectName)
      ) {
        try {
          const res = await fetch(
            `/api/project/config?path=${encodeURIComponent(projectPath)}`,
          );
          const data = await res.json();
          if (data.config) {
            const newProject = {
              id: crypto.randomUUID(),
              name: projectName,
              path: projectPath,
              type: "project" as const,
              ...data.config,
            };

            setLocalSettings((prev) => ({
              ...prev,
              projects: [...(prev.projects || []), newProject],
            }));
          }
        } catch (error) {
          console.error("Failed to load project config:", error);
        }
      }
    };

    loadProjectConfig();
  }, [open, projectName, projectPath, settings.projects]);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>(
    initialTab || (projectName ? "project-config" : "defaults"),
  );

  React.useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    } else if (open && projectName) {
      setActiveTab("project-config");
    }
  }, [open, initialTab, projectName]);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <K extends keyof UserSettings>(
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
      await updateSettings(localSettings);
      setHasChanges(false);
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      setHasChanges(false);
    } catch (error) {
      // Error is handled in the store
    }
  };

  const tabs: {
    id: Tab;
    label: string;
    icon: any;
    hidden?: boolean;
  }[] = [
    {
      id: "project-config",
      label: "Project",
      icon: LayoutTemplate,
      hidden: !projectName,
    },
    {
      id: "project-commands",
      label: "Commands",
      icon: Terminal,
      hidden: !projectName,
    },
    {
      id: "project-preview",
      label: "Preview",
      icon: Eye,
      hidden: !projectName,
    },
    {
      id: "projects",
      label: "Projects",
      icon: Folder,
      hidden: !!projectName,
    },
    {
      id: "agents",
      label: "Agents",
      icon: Bot,
      hidden: !!projectName,
    },
    {
      id: "tests",
      label: "Tests",
      icon: TestTube,
      hidden: !!projectName,
    },
    {
      id: "llm",
      label: "LLM / AI",
      icon: Bot,
      hidden: !!projectName,
    },
    {
      id: "defaults",
      label: "Global Defaults",
      icon: SettingsIcon,
      hidden: !!projectName,
    },
    {
      id: "workflows",
      label: "Workflow",
      icon: LayoutTemplate,
    },
  ];

  const visibleTabs = tabs.filter((t) => !t.hidden);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[85vh] flex gap-0 p-0 overflow-hidden bg-background border-border text-foreground">
        {/* Sidebar */}
        <div className="flex flex-col gap-2 p-4 w-64 border-r border-border bg-background">
          <div className="px-2 pt-2 mb-4">
            <h2 className="text-lg font-bold text-white">
              {projectName ? "Project Settings" : "System Settings"}
            </h2>
          </div>

          <div className="space-y-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
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
              <div className="px-2 py-1 text-xs text-red-400">{error}</div>
            ) : null}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="gap-2 justify-start w-full bg-transparent text-muted-foreground border-border hover:bg-secondary hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Defaults
            </Button>

            <Button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className="gap-2 justify-start w-full text-white bg-amber-600 shadow-lg hover:bg-amber-700 shadow-amber-600/20"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-8 bg-background">
          {activeTab === "project-config" && projectName && (
            <ProjectSettings
              projectName={projectName}
              settings={localSettings}
              onChange={handleChange}
              view="general"
            />
          )}
          {activeTab === "project-commands" && projectName && (
            <ProjectSettings
              projectName={projectName}
              settings={localSettings}
              onChange={handleChange}
              view="commands"
            />
          )}
          {activeTab === "project-preview" && projectName && (
            <ProjectSettings
              projectName={projectName}
              settings={localSettings}
              onChange={handleChange}
              view="preview"
            />
          )}
          {activeTab === "projects" && (
            <SettingsProjects
              settings={localSettings}
              onChange={handleChange}
            />
          )}
          {activeTab === "agents" && (
            <SettingsAgents settings={localSettings} onChange={handleChange} />
          )}
          {activeTab === "tests" && (
            <SettingsTests settings={localSettings} onChange={handleChange} />
          )}
          {activeTab === "defaults" && (
            <SettingsDefaults
              settings={localSettings}
              onChange={handleChange}
            />
          )}
          {activeTab === "llm" && (
            <SettingsLLM settings={localSettings} onChange={handleChange} />
          )}
          {activeTab === "workflows" && (
            <SettingsWorkflows
              settings={localSettings}
              onChange={handleChange}
              activeWorkflowId={
                projectName
                  ? localSettings.projects?.find((p) => p.name === projectName)
                      ?.workflowId
                  : undefined
              }
              onSelectWorkflow={
                projectName
                  ? (id) => {
                      const updatedProjects = (
                        localSettings.projects || []
                      ).map((p) =>
                        p.name === projectName
                          ? {
                              ...p,
                              workflowId: id === "default" ? undefined : id,
                            }
                          : p,
                      );
                      handleChange("projects", updatedProjects);
                    }
                  : undefined
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
