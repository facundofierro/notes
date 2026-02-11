import * as React from "react";
import { Input, Label } from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";

interface SettingsTestsProps {
  settings: UserSettings;
  onChange: (key: keyof UserSettings, value: any) => void;
}

export function SettingsTests({ settings, onChange }: SettingsTestsProps) {
  const renderStatus = (value: string) => {
    const isSet = value.trim().length > 0;
    return (
      <span
        className={`text-[11px] ${isSet ? "text-emerald-400" : "text-muted-foreground"}`}
      >
        {isSet ? "Saved" : "Not set"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">
          Test Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure testing tools and API keys.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Stagehand API Key</Label>
            {renderStatus(settings.stagehandApiKey || "")}
          </div>
          <Input
            type="password"
            value={settings.stagehandApiKey || ""}
            onChange={(e) => onChange("stagehandApiKey", e.target.value)}
            placeholder="sk_..."
            className="bg-background border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Required for running Stagehand browser tests (Browserbase).
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>OpenAI API Key</Label>
            {renderStatus(settings.openaiApiKey || "")}
          </div>
          <Input
            type="password"
            value={settings.openaiApiKey || ""}
            onChange={(e) => onChange("openaiApiKey", e.target.value)}
            placeholder="sk-..."
            className="bg-background border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Used for Stagehand if no other key is provided.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Anthropic API Key</Label>
            {renderStatus(settings.anthropicApiKey || "")}
          </div>
          <Input
            type="password"
            value={settings.anthropicApiKey || ""}
            onChange={(e) => onChange("anthropicApiKey", e.target.value)}
            placeholder="sk-ant-..."
            className="bg-background border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Alternative LLM provider for Stagehand.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Google API Key</Label>
            {renderStatus(settings.googleApiKey || "")}
          </div>
          <Input
            type="password"
            value={settings.googleApiKey || ""}
            onChange={(e) => onChange("googleApiKey", e.target.value)}
            placeholder="AIza..."
            className="bg-background border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Used for Google Gemini models.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Grok API Key</Label>
            {renderStatus(settings.grokApiKey || "")}
          </div>
          <Input
            type="password"
            value={settings.grokApiKey || ""}
            onChange={(e) => onChange("grokApiKey", e.target.value)}
            placeholder="xai-..."
            className="bg-background border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Used for Grok (xAI) models in Stagehand tests.
          </p>
        </div>
      </div>
    </div>
  );
}
