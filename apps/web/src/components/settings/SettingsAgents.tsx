import * as React from "react";
import { Switch, Label } from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";

interface SettingsAgentsProps {
  settings: UserSettings;
  onChange: (key: keyof UserSettings, value: any) => void;
}

export function SettingsAgents({ settings, onChange }: SettingsAgentsProps) {
  const [tools, setTools] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    fetch("/api/agents?action=tools")
      .then(res => res.json())
      .then(data => setTools(data.tools || []));
  }, []);

  const toggleAgent = (name: string, checked: boolean) => {
    const current = settings.enabledAgents || []; 
    if (checked) {
      onChange("enabledAgents", [...current, name]);
    } else {
      onChange("enabledAgents", current.filter(n => n !== name));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Agent Configuration</h3>
        <p className="text-sm text-gray-400">
          Select which AI agents and tools are available in the interface.
        </p>
      </div>
      
      <div className="grid gap-4">
        {tools.map(tool => (
          <div key={tool.name} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-900">
            <div>
              <div className="font-medium text-gray-200">{tool.displayName}</div>
              <div className="text-xs text-gray-500">
                 {tool.available ? "Available" : "Not installed/Available"}
              </div>
            </div>
            <Switch 
              checked={(settings.enabledAgents || []).includes(tool.name)}
              onCheckedChange={(c) => toggleAgent(tool.name, c)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
