import * as React from "react";
import { UserSettings, ApiKeyConfig } from "@/lib/settings";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label } from "@agelum/shadcn";
import { Trash2, Plus, Edit2, Bot, Globe, Key } from "lucide-react";

interface SettingsLLMProps {
  settings: UserSettings;
  onChange: (key: keyof UserSettings, value: any) => void;
}

export function SettingsLLM({ settings, onChange }: SettingsLLMProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState<ApiKeyConfig | null>(null);
  
  // Form state
  const [provider, setProvider] = React.useState<ApiKeyConfig["provider"]>("openai");
  const [name, setName] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [baseURL, setBaseURL] = React.useState("");

  const handleOpenDialog = (key?: ApiKeyConfig) => {
    if (key) {
      setEditingKey(key);
      setProvider(key.provider);
      setName(key.name);
      setApiKey(key.key);
      setBaseURL(key.baseURL || "");
    } else {
      setEditingKey(null);
      setProvider("openai");
      setName("");
      setApiKey("");
      setBaseURL("");
    }
    setIsDialogOpen(true);
  };

  const handleSaveKey = () => {
    const newKey: ApiKeyConfig = {
      id: editingKey?.id || crypto.randomUUID(),
      provider,
      name: name || `${provider} key`,
      key: apiKey,
      baseURL: baseURL || undefined,
    };

    const currentKeys = settings.apiKeys || [];
    let newKeys;
    
    if (editingKey) {
      newKeys = currentKeys.map(k => k.id === editingKey.id ? newKey : k);
    } else {
      newKeys = [...currentKeys, newKey];
    }

    onChange("apiKeys", newKeys);
    setIsDialogOpen(false);
  };

  const handleDeleteKey = (id: string) => {
    const newKeys = (settings.apiKeys || []).filter(k => k.id !== id);
    onChange("apiKeys", newKeys);
  };

  const getProviderIcon = (p: string) => {
    switch (p) {
      case "openai": return <Bot className="w-4 h-4" />;
      case "google": return <Globe className="w-4 h-4" />; // Replace with specific icons if available
      case "anthropic": return <Bot className="w-4 h-4" />;
      case "xai": return <span className="font-bold text-xs">X</span>;
      case "openrouter": return <Globe className="w-4 h-4" />;
      default: return <Key className="w-4 h-4" />;
    }
  };

  const PROVIDERS = [
    { value: "openai", label: "OpenAI" },
    { value: "google", label: "Google Gemini" },
    { value: "anthropic", label: "Anthropic" },
    { value: "xai", label: "xAI (Grok)" },
    { value: "openrouter", label: "OpenRouter" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-foreground">LLM Configuration</h3>
          <p className="text-sm text-muted-foreground">Manage your AI provider API keys.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Add Key
        </Button>
      </div>

      <div className="space-y-3">
        {(settings.apiKeys || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            No API keys configured. Add one to use AI features.
          </div>
        )}
        
        {(settings.apiKeys || []).map((key) => (
          <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-md">
                {getProviderIcon(key.provider)}
              </div>
              <div>
                <div className="font-medium text-sm">{key.name}</div>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <span className="capitalize">{key.provider}</span>
                  {key.baseURL && <span className="opacity-70">Custom URL</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(key)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteKey(key.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Legacy Keys Warning/Migration Helper could go here */}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKey ? "Edit API Key" : "Add API Key"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="My API Key" 
              />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                type="password" 
                placeholder="sk-..." 
              />
            </div>

            {(provider === "openrouter" || provider === "openai") && (
              <div className="space-y-2">
                <Label>Base URL (Optional)</Label>
                <Input 
                  value={baseURL} 
                  onChange={e => setBaseURL(e.target.value)} 
                  placeholder="https://api.openai.com/v1" 
                />
                <p className="text-[10px] text-muted-foreground">Override default API endpoint</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveKey}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
