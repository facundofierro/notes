import * as React from "react";
import { Switch } from "@agelum/shadcn";
import { UserSettings } from "@/hooks/use-settings";
import { Terminal, Globe, Monitor } from "lucide-react";

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
    let current = settings.enabledAgents || ["*"]; 
    if (current.includes("*")) {
      current = tools.map(t => t.name);
    }

    if (checked) {
      if (!current.includes(name)) {
        onChange("enabledAgents", [...current, name]);
      }
    } else {
      onChange("enabledAgents", current.filter(n => n !== name));
    }
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case "cli": return <Terminal className="w-3.5 h-3.5" />;
      case "web": return <Globe className="w-3.5 h-3.5" />;
      case "app": return <Monitor className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const leftTools = tools.filter(t => t.type === "web" || t.type === "cli");
  const rightTools = tools.filter(t => t.type === "app");
  const maxRows = Math.max(leftTools.length, rightTools.length);

  const renderTool = (tool: any) => {
    if (!tool) return <div className="invisible" />;
    const isEnabled = (settings.enabledAgents || ["*"]).includes("*") || (settings.enabledAgents || []).includes(tool.name);
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
          <div className="flex justify-between items-start mb-0.5">
            <div className="text-sm font-medium text-foreground">
              {tool.displayName}
            </div>
            <div className="text-muted-foreground">
              {getToolIcon(tool.type)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-muted-foreground">
              {tool.available ? "Available" : "Not installed"}
            </div>
            {tool.supportedModels && tool.supportedModels.length > 0 && (
              <div className="text-[10px] text-muted-foreground/70 truncate">
                {tool.supportedModels.join(", ")}
              </div>
            )}
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Agent Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Select which AI agents and tools are available in the interface.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">CLI & Web</div>
          {leftTools.map(renderTool)}
        </div>
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Applications</div>
          {rightTools.map(renderTool)}
        </div>
      </div>
    </div>
  );
}
