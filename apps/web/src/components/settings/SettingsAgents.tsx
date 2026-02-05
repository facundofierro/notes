import * as React from "react";
import { Switch } from "@agelum/shadcn";
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
        <h3 className="text-lg font-medium text-foreground mb-4">Agent Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Select which AI agents and tools are available in the interface.
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {tools.map(tool => {
          const isEnabled = (settings.enabledAgents || []).includes(tool.name);
          return (
            <div 
              key={tool.name} 
              className={`flex flex-col w-full rounded-lg border overflow-hidden transition-all ${
                isEnabled 
                  ? "border-border bg-secondary hover:border-muted-foreground shadow-sm"
                  : "border-border bg-card opacity-50 hover:opacity-100"
              }`}
            >
              <div className="flex-1 px-3 py-3 text-left">
                <div className="flex gap-2 items-center mb-0.5">
                  <div className="text-sm font-medium text-foreground">
                    {tool.displayName}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                   {tool.available ? "Available" : "Not installed"}
                </div>
              </div>
              
              <div className="px-3 py-2 border-t bg-background/50 border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Enabled</span>
                <Switch 
                  checked={isEnabled}
                  onCheckedChange={(c) => toggleAgent(tool.name, c)}
                  className="scale-75 origin-right"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
