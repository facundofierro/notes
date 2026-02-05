import * as React from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agelum/shadcn";
import { UserSettings, ProjectConfig } from "@/hooks/use-settings";

interface ProjectSettingsProps {
  projectName: string;
  settings: UserSettings;
  onChange: (key: keyof UserSettings, value: any) => void;
}

export function ProjectSettings({
  projectName,
  settings,
  onChange,
}: ProjectSettingsProps) {
  const project = (settings.projects || []).find((p) => p.name === projectName);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project "{projectName}" not found.
      </div>
    );
  }

  const updateProject = (updates: Partial<ProjectConfig>) => {
    const updatedProjects = (settings.projects || []).map((p) =>
      p.name === projectName ? { ...p, ...updates } : p
    );
    onChange("projects", updatedProjects);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-medium text-white">Project Settings</h3>
        <p className="text-sm text-gray-400">
          Configuration for <strong>{projectName}</strong>
        </p>
      </div>

      <div className="grid gap-6 p-6 rounded-xl border border-border bg-secondary/30">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-gray-200">Project Path</Label>
            <Input
              value={project.path}
              disabled
              className="text-gray-400 bg-background/50 border-border cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-500 italic">
              Path can only be changed in the global Projects tab.
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="text-gray-200">Active Workflow</Label>
            <Select
              value={project.workflowId || "default"}
              onValueChange={(value) =>
                updateProject({
                  workflowId: value === "default" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-full bg-background border-border text-white">
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border text-white">
                <SelectItem value="default">Default (All Items)</SelectItem>
                {(settings.workflows || []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Select which tools and layout to use for this project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
