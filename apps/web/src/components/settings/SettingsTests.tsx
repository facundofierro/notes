import * as React from "react";
import {
  Input,
  Label,
} from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";

interface SettingsTestsProps {
  settings: UserSettings;
  onChange: (
    key: keyof UserSettings,
    value: any,
  ) => void;
}

export function SettingsTests({
  settings,
  onChange,
}: SettingsTestsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">
          Test Configuration
        </h3>
        <p className="text-sm text-gray-400">
          Configure testing tools and
          API keys.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>
            Stagehand API Key
          </Label>
          <Input
            type="password"
            value={
              settings.stagehandApiKey ||
              ""
            }
            onChange={(e) =>
              onChange(
                "stagehandApiKey",
                e.target.value,
              )
            }
            placeholder="sk_..."
            className="bg-gray-900 border-gray-800 text-gray-100"
          />
          <p className="text-xs text-gray-500">
            Required for running
            Stagehand browser tests
            (Browserbase).
          </p>
        </div>

        <div className="space-y-2">
          <Label>OpenAI API Key</Label>
          <Input
            type="password"
            value={
              settings.openaiApiKey ||
              ""
            }
            onChange={(e) =>
              onChange(
                "openaiApiKey",
                e.target.value,
              )
            }
            placeholder="sk-..."
            className="bg-gray-900 border-gray-800 text-gray-100"
          />
          <p className="text-xs text-gray-500">
            Used for Stagehand if no
            other key is provided.
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            Anthropic API Key
          </Label>
          <Input
            type="password"
            value={
              settings.anthropicApiKey ||
              ""
            }
            onChange={(e) =>
              onChange(
                "anthropicApiKey",
                e.target.value,
              )
            }
            placeholder="sk-ant-..."
            className="bg-gray-900 border-gray-800 text-gray-100"
          />
          <p className="text-xs text-gray-500">
            Alternative LLM provider for
            Stagehand.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Google API Key</Label>
          <Input
            type="password"
            value={
              settings.googleApiKey ||
              ""
            }
            onChange={(e) =>
              onChange(
                "googleApiKey",
                e.target.value,
              )
            }
            placeholder="AIza..."
            className="bg-gray-900 border-gray-800 text-gray-100"
          />
          <p className="text-xs text-gray-500">
            Used for Google Gemini
            models.
          </p>
        </div>
      </div>
    </div>
  );
}
