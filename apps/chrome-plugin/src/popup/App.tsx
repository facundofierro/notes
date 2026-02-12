import React, { useEffect, useState } from "react";
import { getSettings, saveSettings, ConnectionSettings } from "../shared/storage";
import { Settings, Save, CheckCircle2, LayoutPanelTop } from "lucide-react";

export default function App() {
  const [settings, setSettings] = useState<ConnectionSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.sidePanel.open({ tabId: activeTab.id });
      }
    });
  };

  if (!settings) return null;

  return (
    <div className="w-[320px] dark bg-background text-foreground p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Agelum Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Server URL</label>
          <input
            type="url"
            value={settings.serverUrl}
            onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
            placeholder="http://localhost:6500"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Key</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            placeholder="ak_..."
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Name</label>
          <input
            type="text"
            value={settings.projectRepo}
            onChange={(e) => setSettings({ ...settings, projectRepo: e.target.value })}
            placeholder="e.g. agelum"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={openSidePanel}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-all"
            title="Open Sidepanel"
          >
            <LayoutPanelTop className="w-4 h-4" />
          </button>
        </div>
      </form>
      
      <p className="mt-4 text-[10px] text-center text-muted-foreground">
        Get your API key from the Agelum web app settings.
      </p>
    </div>
  );
}
