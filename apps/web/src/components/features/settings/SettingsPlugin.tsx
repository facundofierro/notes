"use client";

import * as React from "react";
import { Button, Input } from "@agelum/shadcn";
import { Trash2, Copy, Check, Loader2, Plus, Users, Globe, Tag, LogOut, Github, Wifi, WifiOff, AppWindow } from "lucide-react";

interface SettingsPluginProps {
  projectName?: string;
}

export function SettingsPlugin({ projectName }: SettingsPluginProps) {
  const [keys, setKeys] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [revealedKey, setRevealedKey] = React.useState<{ id: string; rawKey: string } | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // User whitelist state
  const [allowedUsers, setAllowedUsers] = React.useState<string[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [addingUser, setAddingUser] = React.useState(false);

  // Developer account (gateway auth) state
  const [authStatus, setAuthStatus] = React.useState<{ authenticated: boolean; user?: { email: string; name: string; image?: string }; offline?: boolean }>({ authenticated: false });
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [internalLoginLoading, setInternalLoginLoading] = React.useState(false);

  // Plugin config state
  const [pluginName, setPluginName] = React.useState("");
  const [pluginDomain, setPluginDomain] = React.useState("");
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [configSaved, setConfigSaved] = React.useState(false);
  const [projectPath, setProjectPath] = React.useState<string | null>(null);

  const checkGatewayAuth = React.useCallback(async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/gateway");
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ authenticated: false });
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.loadUrl;

  const buildGatewayLoginUrl = React.useCallback(() => {
    const redirectUrl = `${window.location.origin}/?gateway_login=1`;
    const path = `/api/gateway/login?redirect_uri=${encodeURIComponent(redirectUrl)}&provider=github`;
    return new URL(path, window.location.origin).toString();
  }, []);

  const handleGatewayLogin = React.useCallback(() => {
    window.open(buildGatewayLoginUrl(), "_blank");
  }, [buildGatewayLoginUrl]);

  const handleInternalGatewayLogin = React.useCallback(async () => {
    if (!window.electronAPI?.loadUrl) return;
    setInternalLoginLoading(true);
    await window.electronAPI.loadUrl(buildGatewayLoginUrl());
  }, [buildGatewayLoginUrl]);

  const handleGatewayLogout = async () => {
    await fetch("/api/gateway", { method: "DELETE" });
    setAuthStatus({ authenticated: false });
  };

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

  const fetchUsers = React.useCallback(async () => {
    if (!projectName) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/users?repo=${encodeURIComponent(projectName)}`);
      const data = await res.json();
      setAllowedUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setUsersLoading(false);
    }
  }, [projectName]);

  const fetchProjectConfig = React.useCallback(async () => {
    if (!projectName) return;
    try {
      const res = await fetch(`/api/repositories`);
      const data = await res.json();
      const repos: any[] = data.repositories || data.repos || [];
      const project = repos.find((r: any) => r.name === projectName);
      if (project?.path) {
        setProjectPath(project.path);
        const configRes = await fetch(`/api/project/config?path=${encodeURIComponent(project.path)}`);
        const configData = await configRes.json();
        if (configData.config) {
          setPluginName(configData.config.pluginName || "");
          setPluginDomain(configData.config.pluginDomain || "");
        }
      }
    } catch (error) {
      console.error("Failed to fetch project config:", error);
    }
  }, [projectName]);

  React.useEffect(() => {
    fetchKeys();
    checkGatewayAuth();
  }, [checkGatewayAuth]);

  React.useEffect(() => {
    const unsubscribeToken = window.electronAPI?.onAuthToken?.(async ({ token, user }) => {
      try {
        await fetch("/api/gateway", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, user }),
        });
      } catch (error) {
        console.error("Failed to sync auth token from internal login:", error);
      } finally {
        setInternalLoginLoading(false);
        checkGatewayAuth();
      }
    });

    const unsubscribeNavigated = window.electronAPI?.onAuthNavigated?.((url) => {
      if (url.includes("error=")) {
        setInternalLoginLoading(false);
      }
    });

    return () => {
      unsubscribeToken?.();
      unsubscribeNavigated?.();
    };
  }, [checkGatewayAuth]);

  React.useEffect(() => {
    if (projectName) {
      fetchUsers();
      fetchProjectConfig();
    }
  }, [projectName, fetchUsers, fetchProjectConfig]);

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

  const addUser = async () => {
    if (!newUserEmail.trim() || !projectName) return;
    setAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: projectName, email: newUserEmail.trim() }),
      });
      const data = await res.json();
      setAllowedUsers(data.users || []);
      setNewUserEmail("");
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setAddingUser(false);
    }
  };

  const removeUser = async (email: string) => {
    if (!projectName) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: projectName, email }),
      });
      const data = await res.json();
      setAllowedUsers(data.users || []);
    } catch (error) {
      console.error("Failed to remove user:", error);
    }
  };

  const savePluginConfig = async () => {
    if (!projectPath) return;
    setSavingConfig(true);
    try {
      await fetch("/api/project/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: projectPath,
          config: { pluginName, pluginDomain },
        }),
      });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save plugin config:", error);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Developer Account Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white mb-1">Developer Account</h3>
          <p className="text-sm text-muted-foreground">
            Connect to the Agelum cloud registry to enable user management and project synchronization across devices.
          </p>
        </div>

        {checkingAuth ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection...
          </div>
        ) : authStatus.authenticated ? (
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              {authStatus.offline ? (
                <WifiOff className="w-4 h-4 text-yellow-500" />
              ) : (
                <Wifi className="w-4 h-4 text-green-400" />
              )}
              <div>
                <p className="text-sm font-medium text-green-400">
                  Connected{authStatus.offline ? " (offline)" : ""}
                </p>
                {authStatus.user?.email && (
                  <p className="text-xs text-muted-foreground">{authStatus.user.email}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGatewayLogout}
              className="text-muted-foreground hover:text-white gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              Login with GitHub to unlock advanced features: manage allowed plugin users, sync project configurations, and verify reporter identities.
            </p>
            {isElectron && (
              <Button
                onClick={handleInternalGatewayLogin}
                disabled={internalLoginLoading}
                className="bg-amber-600 text-white hover:bg-amber-700 gap-2"
              >
                {internalLoginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AppWindow className="w-4 h-4" />}
                Open Internal Login
              </Button>
            )}
            <Button
              onClick={handleGatewayLogin}
              disabled={internalLoginLoading}
              className="bg-white text-black hover:bg-white/90 gap-2"
            >
              {internalLoginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              Login with GitHub
            </Button>
            <p className="text-xs text-muted-foreground">
              {isElectron
                ? "Use Internal Login for in-app authentication, or use external browser fallback."
                : "After logging in, refresh this panel if the status does not update immediately."}
            </p>
          </div>
        )}
      </div>

      {/* API Keys Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white mb-1">Chrome Plugin API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Generate API keys to use the Agelum Chrome Plugin for reporting issues.
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Key Name (e.g. My MacBook)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateKey()}
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
          <div className="p-4 bg-amber-600/10 border border-amber-600/30 rounded-lg space-y-3 mb-4">
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

      {/* Project-specific sections */}
      {!projectName ? (
        <div className="p-4 bg-secondary/30 border border-border rounded-lg text-sm text-muted-foreground">
          Open this settings panel from a project to configure project-specific plugin settings (allowed users, name, domain).
        </div>
      ) : (
        <>
          {/* Plugin Project Configuration */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-medium text-white mb-1 flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Plugin Project Configuration
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure how this project appears in the Chrome plugin.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Plugin Display Name</label>
                <Input
                  placeholder={projectName}
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  className="bg-background border-border text-white"
                />
                <p className="text-xs text-muted-foreground">Name shown in the plugin when reporting issues for this project.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  Associated Domain
                </label>
                <Input
                  placeholder="myapp.com"
                  value={pluginDomain}
                  onChange={(e) => setPluginDomain(e.target.value)}
                  className="bg-background border-border text-white"
                />
                <p className="text-xs text-muted-foreground">Domain for auto-detecting this project when the plugin is opened on that site.</p>
              </div>

              <Button
                onClick={savePluginConfig}
                disabled={savingConfig || !projectPath}
                className="bg-secondary hover:bg-secondary/80 text-white gap-2"
              >
                {savingConfig ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : configSaved ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : null}
                {configSaved ? "Saved" : "Save Configuration"}
              </Button>
            </div>
          </div>

          {/* Allowed Users */}
          <div>
            <div className="mb-4">
              <h3 className="text-base font-medium text-white mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Allowed Plugin Users
              </h3>
              <p className="text-sm text-muted-foreground">
                Only users with these email addresses can report issues for <span className="text-white font-medium">{projectName}</span> via the plugin.
              </p>
            </div>

            <div className="flex gap-2 mb-3">
              <Input
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUser()}
                className="bg-background border-border text-white"
              />
              <Button
                onClick={addUser}
                disabled={addingUser || !newUserEmail.trim()}
                className="bg-secondary hover:bg-secondary/80 text-white gap-2"
              >
                {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>

            {usersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading users...
              </div>
            ) : allowedUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-3 px-4 bg-secondary/30 border border-border rounded-lg">
                No users added yet. All authenticated users can report issues.
              </div>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                {allowedUsers.map((email) => (
                  <div key={email} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                    <span className="text-sm text-white">{email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUser(email)}
                      className="text-muted-foreground hover:text-red-400 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
