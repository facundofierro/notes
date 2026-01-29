"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Input,
} from "@agelum/shadcn";
import {
  useSettings,
  UserSettings,
} from "@/hooks/use-settings";
import {
  RotateCcw,
  Save,
} from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewMode =
  UserSettings["defaultView"];

export function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
  } = useSettings();
  const [
    localSettings,
    setLocalSettings,
  ] =
    React.useState<UserSettings>(
      settings
    );
  const [hasChanges, setHasChanges] =
    React.useState(false);

  // Update local settings when settings change from the server
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <
    K extends keyof UserSettings,
  >(
    key: K,
    value: UserSettings[K]
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
        localSettings
      );
      setHasChanges(false);
      onOpenChange(false);
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

  const viewModeOptions: {
    value: ViewMode;
    label: string;
  }[] = [
    { value: "ideas", label: "Ideas" },
    { value: "docs", label: "Docs" },
    { value: "plan", label: "Plan" },
    { value: "epics", label: "Epics" },
    { value: "kanban", label: "Tasks" },
    { value: "tests", label: "Tests" },
    {
      value: "commands",
      label: "Commands",
    },
    {
      value: "cli-tools",
      label: "CLI Tools",
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Appearance
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="theme"
                  className="text-gray-300"
                >
                  Theme
                </Label>
                <Select
                  value={
                    localSettings.theme
                  }
                  onValueChange={(
                    value
                  ) =>
                    handleChange(
                      "theme",
                      value as UserSettings["theme"]
                    )
                  }
                >
                  <SelectTrigger
                    id="theme"
                    className="bg-gray-800 border-gray-700 text-gray-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="light">
                      Light
                    </SelectItem>
                    <SelectItem value="dark">
                      Dark
                    </SelectItem>
                    <SelectItem value="system">
                      System
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="language"
                  className="text-gray-300"
                >
                  Language
                </Label>
                <Select
                  value={
                    localSettings.language
                  }
                  onValueChange={(
                    value
                  ) =>
                    handleChange(
                      "language",
                      value
                    )
                  }
                >
                  <SelectTrigger
                    id="language"
                    className="bg-gray-800 border-gray-700 text-gray-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="en">
                      English
                    </SelectItem>
                    <SelectItem value="es">
                      Español
                    </SelectItem>
                    <SelectItem value="pt">
                      Português
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Editor Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Editor
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="fontSize"
                  className="text-gray-300"
                >
                  Font Size
                </Label>
                <Input
                  id="fontSize"
                  type="number"
                  min={8}
                  max={32}
                  value={
                    localSettings.editorFontSize
                  }
                  onChange={(e) =>
                    handleChange(
                      "editorFontSize",
                      parseInt(
                        e.target.value,
                        10
                      ) || 14
                    )
                  }
                  className="bg-gray-800 border-gray-700 text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="fontFamily"
                  className="text-gray-300"
                >
                  Font Family
                </Label>
                <Select
                  value={
                    localSettings.editorFontFamily
                  }
                  onValueChange={(
                    value
                  ) =>
                    handleChange(
                      "editorFontFamily",
                      value
                    )
                  }
                >
                  <SelectTrigger
                    id="fontFamily"
                    className="bg-gray-800 border-gray-700 text-gray-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="monospace">
                      Monospace
                    </SelectItem>
                    <SelectItem value="serif">
                      Serif
                    </SelectItem>
                    <SelectItem value="sans-serif">
                      Sans Serif
                    </SelectItem>
                    <SelectItem value="Fira Code">
                      Fira Code
                    </SelectItem>
                    <SelectItem value="JetBrains Mono">
                      JetBrains Mono
                    </SelectItem>
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
                checked={
                  localSettings.showLineNumbers
                }
                onCheckedChange={(
                  checked
                ) =>
                  handleChange(
                    "showLineNumbers",
                    checked
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label
                htmlFor="wordWrap"
                className="text-gray-300 cursor-pointer"
              >
                Word Wrap
              </Label>
              <Switch
                id="wordWrap"
                checked={
                  localSettings.wordWrap
                }
                onCheckedChange={(
                  checked
                ) =>
                  handleChange(
                    "wordWrap",
                    checked
                  )
                }
              />
            </div>
          </div>

          {/* Application Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Application
            </h3>

            <div className="space-y-2">
              <Label
                htmlFor="defaultView"
                className="text-gray-300"
              >
                Default View
              </Label>
              <Select
                value={
                  localSettings.defaultView
                }
                onValueChange={(
                  value
                ) =>
                  handleChange(
                    "defaultView",
                    value as ViewMode
                  )
                }
              >
                <SelectTrigger
                  id="defaultView"
                  className="bg-gray-800 border-gray-700 text-gray-100"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {viewModeOptions.map(
                    (option) => (
                      <SelectItem
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </SelectItem>
                    )
                  )}
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
                checked={
                  localSettings.notifications
                }
                onCheckedChange={(
                  checked
                ) =>
                  handleChange(
                    "notifications",
                    checked
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label
                htmlFor="autoSave"
                className="text-gray-300 cursor-pointer"
              >
                Auto Save
              </Label>
              <Switch
                id="autoSave"
                checked={
                  localSettings.autoSave
                }
                onCheckedChange={(
                  checked
                ) =>
                  handleChange(
                    "autoSave",
                    checked
                  )
                }
              />
            </div>
          </div>

          {/* AI Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              AI Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="aiProvider"
                  className="text-gray-300"
                >
                  AI Provider
                </Label>
                <Select
                  value={
                    localSettings.aiProvider
                  }
                  onValueChange={(
                    value
                  ) =>
                    handleChange(
                      "aiProvider",
                      value
                    )
                  }
                >
                  <SelectTrigger
                    id="aiProvider"
                    className="bg-gray-800 border-gray-700 text-gray-100"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="auto">
                      Auto
                    </SelectItem>
                    <SelectItem value="openai">
                      OpenAI
                    </SelectItem>
                    <SelectItem value="anthropic">
                      Anthropic
                    </SelectItem>
                    <SelectItem value="google">
                      Google
                    </SelectItem>
                    <SelectItem value="local">
                      Local
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="aiModel"
                  className="text-gray-300"
                >
                  Default Model
                </Label>
                <Input
                  id="aiModel"
                  value={
                    localSettings.aiModel
                  }
                  onChange={(e) =>
                    handleChange(
                      "aiModel",
                      e.target.value
                    )
                  }
                  placeholder="default"
                  className="bg-gray-800 border-gray-700 text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center border-t border-gray-700 pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
            className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
              disabled={isLoading}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isLoading || !hasChanges
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
