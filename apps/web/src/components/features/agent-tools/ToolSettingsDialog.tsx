"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useHomeStore } from "@/store/useHomeStore";
import { DEFAULT_TOOL_SETTINGS, ToolSettings } from "@/lib/tool-settings";

interface ToolSettingsDialogProps {
  tool: { name: string; displayName: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolSettingsDialog({
  tool,
  open,
  onOpenChange,
}: ToolSettingsDialogProps) {
  const { settings, updateSettings } = useHomeStore();
  const [localSettings, setLocalSettings] = React.useState<ToolSettings>(
    DEFAULT_TOOL_SETTINGS,
  );

  React.useEffect(() => {
    if (tool && settings.agentToolSettings?.[tool.name]) {
      setLocalSettings(settings.agentToolSettings[tool.name]);
    } else {
      setLocalSettings(DEFAULT_TOOL_SETTINGS);
    }
  }, [tool, settings.agentToolSettings]);

  const handleSave = async () => {
    if (!tool) return;
    const newAgentToolSettings = {
      ...(settings.agentToolSettings || {}),
      [tool.name]: localSettings,
    };
    await updateSettings({ agentToolSettings: newAgentToolSettings });
    onOpenChange(false);
  };

  if (!tool) return null;

  const renderGeneralTab = () => (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Default Permissions</Label>
          <div className="text-[13px] text-muted-foreground">
            Allow tool to modify files by default
          </div>
        </div>
        <Switch
          checked={localSettings.defaultPermissions}
          onCheckedChange={(checked) =>
            setLocalSettings({ ...localSettings, defaultPermissions: checked })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>Default Model</Label>
        <Input
          value={localSettings.defaultModel}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, defaultModel: e.target.value })
          }
          placeholder="e.g. gpt-4o, claude-3-5-sonnet"
        />
      </div>
      <div className="space-y-2">
        <Label>Extra CLI Parameters</Label>
        <Input
          value={localSettings.cliParameters}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, cliParameters: e.target.value })
          }
          placeholder="e.g. --verbose --no-cache"
        />
      </div>
    </div>
  );

  const renderWorkflowTab = (workflow: string) => {
    const overrides = localSettings.workflowOverrides[workflow] || {};

    const updateOverride = (field: string, value: any) => {
      setLocalSettings({
        ...localSettings,
        workflowOverrides: {
          ...localSettings.workflowOverrides,
          [workflow]: {
            ...overrides,
            [field]: value,
          },
        },
      });
    };

    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Override Permissions</Label>
          </div>
          <Switch
            checked={
              overrides.defaultPermissions ?? localSettings.defaultPermissions
            }
            onCheckedChange={(checked) =>
              updateOverride("defaultPermissions", checked)
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Override Model</Label>
          <Input
            value={overrides.defaultModel ?? ""}
            onChange={(e) => updateOverride("defaultModel", e.target.value)}
            placeholder={localSettings.defaultModel || "Inherit default"}
          />
        </div>
        <div className="space-y-2">
          <Label>Override CLI Parameters</Label>
          <Input
            value={overrides.cliParameters ?? ""}
            onChange={(e) => updateOverride("cliParameters", e.target.value)}
            placeholder={localSettings.cliParameters || "Inherit default"}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings: {tool.displayName}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="start">Start</TabsTrigger>
            <TabsTrigger value="modify">Modify</TabsTrigger>
          </TabsList>
          <TabsContent value="general">{renderGeneralTab()}</TabsContent>
          <TabsContent value="plan">{renderWorkflowTab("plan")}</TabsContent>
          <TabsContent value="start">{renderWorkflowTab("start")}</TabsContent>
          <TabsContent value="modify">
            {renderWorkflowTab("modify")}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
