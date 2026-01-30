import * as React from "react";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Input,
} from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";

interface SettingsDefaultsProps {
  settings: UserSettings;
  onChange: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

type ViewMode = UserSettings["defaultView"];

export function SettingsDefaults({ settings, onChange }: SettingsDefaultsProps) {
  const viewModeOptions: { value: ViewMode; label: string }[] = [
    { value: "ideas", label: "Ideas" },
    { value: "docs", label: "Docs" },
    { value: "plan", label: "Plan" },
    { value: "epics", label: "Epics" },
    { value: "kanban", label: "Tasks" },
    { value: "tests", label: "Tests" },
    { value: "commands", label: "Commands" },
    { value: "cli-tools", label: "CLI Tools" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Default Configuration</h3>
        <p className="text-sm text-gray-400">
          Set default settings for projects.
        </p>
      </div>

      {/* Appearance Section */}
      <div className="space-y-4 border-t border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Appearance
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="theme" className="text-gray-300">
              Theme
            </Label>
            <Select
              value={settings.theme}
              onValueChange={(value) =>
                onChange("theme", value as UserSettings["theme"])
              }
            >
              <SelectTrigger
                id="theme"
                className="bg-gray-800 border-gray-700 text-gray-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language" className="text-gray-300">
              Language
            </Label>
            <Select
              value={settings.language}
              onValueChange={(value) => onChange("language", value)}
            >
              <SelectTrigger
                id="language"
                className="bg-gray-800 border-gray-700 text-gray-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Editor Section */}
      <div className="space-y-4 border-t border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Editor
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fontSize" className="text-gray-300">
              Font Size
            </Label>
            <Input
              id="fontSize"
              type="number"
              min={8}
              max={32}
              value={settings.editorFontSize}
              onChange={(e) =>
                onChange("editorFontSize", parseInt(e.target.value, 10) || 14)
              }
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontFamily" className="text-gray-300">
              Font Family
            </Label>
            <Select
              value={settings.editorFontFamily}
              onValueChange={(value) => onChange("editorFontFamily", value)}
            >
              <SelectTrigger
                id="fontFamily"
                className="bg-gray-800 border-gray-700 text-gray-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="monospace">Monospace</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="sans-serif">Sans Serif</SelectItem>
                <SelectItem value="Fira Code">Fira Code</SelectItem>
                <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <Label
            htmlFor="showLineNumbers"
            className="text-gray-300 cursor-pointer"
          >
            Show Line Numbers
          </Label>
          <Switch
            id="showLineNumbers"
            checked={settings.showLineNumbers}
            onCheckedChange={(checked) => onChange("showLineNumbers", checked)}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <Label htmlFor="wordWrap" className="text-gray-300 cursor-pointer">
            Word Wrap
          </Label>
          <Switch
            id="wordWrap"
            checked={settings.wordWrap}
            onCheckedChange={(checked) => onChange("wordWrap", checked)}
          />
        </div>
      </div>

      {/* Application Section */}
      <div className="space-y-4 border-t border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Application
        </h3>

        <div className="space-y-2">
          <Label htmlFor="defaultView" className="text-gray-300">
            Default View
          </Label>
          <Select
            value={settings.defaultView}
            onValueChange={(value) =>
              onChange("defaultView", value as ViewMode)
            }
          >
            <SelectTrigger
              id="defaultView"
              className="bg-gray-800 border-gray-700 text-gray-100"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {viewModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultWorkflow" className="text-gray-300">
            Default Workflow
          </Label>
          <Select
            value={settings.defaultWorkflowId || "default"}
            onValueChange={(value) =>
              onChange("defaultWorkflowId", value === "default" ? undefined : value)
            }
          >
            <SelectTrigger
              id="defaultWorkflow"
              className="bg-gray-800 border-gray-700 text-gray-100"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="default">Default (All items)</SelectItem>
              {(settings.workflows || []).map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between py-2">
          <Label
            htmlFor="notifications"
            className="text-gray-300 cursor-pointer"
          >
            Enable Notifications
          </Label>
          <Switch
            id="notifications"
            checked={settings.notifications}
            onCheckedChange={(checked) => onChange("notifications", checked)}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <Label htmlFor="autoSave" className="text-gray-300 cursor-pointer">
            Auto Save
          </Label>
          <Switch
            id="autoSave"
            checked={settings.autoSave}
            onCheckedChange={(checked) => onChange("autoSave", checked)}
          />
        </div>
        
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="createBranchPerTask" className="text-gray-300 cursor-pointer">
            Create Branch per Task (Default)
          </Label>
          <Switch
            id="createBranchPerTask"
            checked={settings.createBranchPerTask}
            onCheckedChange={(checked) => onChange("createBranchPerTask", checked)}
          />
        </div>
      </div>

      {/* AI Section */}
      <div className="space-y-4 border-t border-gray-800 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          AI Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="aiProvider" className="text-gray-300">
              AI Provider
            </Label>
            <Select
              value={settings.aiProvider}
              onValueChange={(value) => onChange("aiProvider", value)}
            >
              <SelectTrigger
                id="aiProvider"
                className="bg-gray-800 border-gray-700 text-gray-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiModel" className="text-gray-300">
              Default Model
            </Label>
            <Input
              id="aiModel"
              value={settings.aiModel}
              onChange={(e) => onChange("aiModel", e.target.value)}
              placeholder="default"
              className="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
