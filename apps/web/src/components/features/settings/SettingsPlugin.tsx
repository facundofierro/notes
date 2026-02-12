"use client";

import * as React from "react";
import { Button, Input } from "@agelum/shadcn";
import { Key, Trash2, Copy, Check, Loader2, Plus } from "lucide-react";

export function SettingsPlugin() {
  const [keys, setKeys] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [revealedKey, setRevealedKey] = React.useState<{ id: string; rawKey: string } | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      setKeys(data);
    } catch (error) {
      console.error("Failed to fetch keys:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = async () => {
    if (!newKeyName.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      setRevealedKey({ id: data.id, rawKey: data.rawKey });
      setNewKeyName("");
      fetchKeys();
    } catch (error) {
      console.error("Failed to generate key:", error);
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      await fetch("/api/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchKeys();
      if (revealedKey?.id === id) setRevealedKey(null);
    } catch (error) {
      console.error("Failed to delete key:", error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium text-white mb-1">Chrome Plugin API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Generate API keys to use the Agelum Chrome Plugin for reporting issues.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Key Name (e.g. My MacBook)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          className="bg-background border-border text-white"
        />
        <Button 
          onClick={generateKey} 
          disabled={generating || !newKeyName.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generate Key
        </Button>
      </div>

      {revealedKey && (
        <div className="p-4 bg-amber-600/10 border border-amber-600/30 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-500 flex items-center gap-2">
              <Check className="w-4 h-4" />
              New Key Generated
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setRevealedKey(null)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-600/10 h-7 px-2">
              Dismiss
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy this key now. It will not be shown again for security reasons.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border border-border p-2 rounded text-xs font-mono break-all text-white">
              {revealedKey.rawKey}
            </div>
            <Button 
              onClick={() => copyToClipboard(revealedKey.rawKey, "revealed")}
              className="bg-secondary text-white"
            >
              {copiedId === "revealed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Last Used</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading keys...
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No API keys yet.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{key.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteKey(key.id)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
