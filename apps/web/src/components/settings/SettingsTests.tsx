import * as React from "react";
import { Input, Label } from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";

interface SettingsTestsProps {
  settings: UserSettings;
  onChange: (key: keyof UserSettings, value: any) => void;
}

export function SettingsTests({ settings, onChange }: SettingsTestsProps) {
  return (
    <div className="space-y-6">
       <div>
        <h3 className="text-lg font-medium text-white mb-4">Test Configuration</h3>
        <p className="text-sm text-gray-400">
          Configure testing tools and API keys.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Stagehand API Key</Label>
          <Input 
            type="password"
            value={settings.stagehandApiKey || ""}
            onChange={(e) => onChange("stagehandApiKey", e.target.value)}
            placeholder="sk_..."
            className="bg-gray-900 border-gray-800 text-gray-100"
          />
          <p className="text-xs text-gray-500">
            Required for running Stagehand browser tests.
          </p>
        </div>
      </div>
    </div>
  );
}
