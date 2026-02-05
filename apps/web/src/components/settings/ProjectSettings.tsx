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
  Switch,
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
        Project &quot;{projectName}&quot; not found.
      </div>
    );
  }

  const updateProject = (updates: Partial<ProjectConfig>) => {
    const updatedProjects = (settings.projects || []).map((p) =>
      p.name === projectName ? { ...p, ...updates } : p
    );
    onChange("projects", updatedProjects);
  };

  const updateCommand = (cmd: keyof Required<ProjectConfig>["commands"], value: string) => {
    updateProject({
      commands: {
        ...(project.commands || {}),
        [cmd]: value,
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-medium text-white">Project Settings</h3>
        <p className="text-sm text-gray-400">
          Configuration for <strong>{projectName}</strong>
        </p>
      </div>

      <div className="grid gap-8">
        {/* Basic Info */}
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


          </div>
        </div>

        {/* Commands Configuration */}
        <div className="grid gap-6 p-6 rounded-xl border border-border bg-secondary/30">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Commands</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-gray-300 text-xs">Build Command</Label>
                <Input
                  value={project.commands?.build || ""}
                  onChange={(e) => updateCommand("build", e.target.value)}
                  placeholder="pnpm run build"
                  className="bg-background border-border text-white text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-300 text-xs">Dev Command</Label>
                <Input
                  value={project.commands?.dev || ""}
                  onChange={(e) => updateCommand("dev", e.target.value)}
                  placeholder="pnpm run dev"
                  className="bg-background border-border text-white text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-300 text-xs">Run/Test Command</Label>
                <Input
                  value={project.commands?.run || ""}
                  onChange={(e) => updateCommand("run", e.target.value)}
                  placeholder="pnpm test"
                  className="bg-background border-border text-white text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-gray-300 text-xs">Start Command</Label>
                <Input
                  value={project.commands?.start || ""}
                  onChange={(e) => updateCommand("start", e.target.value)}
                  placeholder="pnpm start"
                  className="bg-background border-border text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Auto-run */}
        <div className="grid gap-6 p-6 rounded-xl border border-border bg-secondary/30">
          <div className="space-y-6">
            <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Preview & Execution</h4>
            
            <div className="grid gap-2">
              <Label className="text-gray-200">Browser Preview URL</Label>
              <Input
                value={project.url || ""}
                onChange={(e) => updateProject({ url: e.target.value })}
                placeholder="http://localhost:3000"
                className="bg-background border-border text-white"
              />
              <p className="text-xs text-gray-400">
                The URL to open when previewing the application.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-background/40 border border-border/50">
              <div className="space-y-0.5">
                <Label className="text-gray-200">Auto-run on Startup</Label>
                <p className="text-xs text-gray-400">
                  Automatically start the dev server when opening this project.
                </p>
              </div>
              <Switch
                checked={project.autoRun || false}
                onCheckedChange={(checked) => updateProject({ autoRun: checked })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
