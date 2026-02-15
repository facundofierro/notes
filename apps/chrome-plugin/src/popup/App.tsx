import React, { useEffect, useState } from "react";
import { getSettings, saveSettings, ConnectionSettings, OAuthUser } from "../shared/storage";
import { Settings, Save, CheckCircle2, LayoutPanelTop, LogOut, User, Loader2, Github, Chrome, Mail } from "lucide-react";

type Tab = "settings" | "account";

export default function App() {
  const [settings, setSettings] = useState<ConnectionSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  const handleOAuthLogin = (provider: "github" | "google" | "yandex") => {
    if (!settings?.serverUrl) return;
    setLoggingIn(true);
    setLoginError(null);

    const redirectUrl = chrome.identity.getRedirectURL("oauth");
    const loginUrl = `${settings.serverUrl}/api/gateway/login?redirect_uri=${encodeURIComponent(redirectUrl)}&provider=${provider}`;

    chrome.identity.launchWebAuthFlow(
      { url: loginUrl, interactive: true },
      async (callbackUrl) => {
        setLoggingIn(false);
        if (chrome.runtime.lastError || !callbackUrl) {
          setLoginError(chrome.runtime.lastError?.message || "Login cancelled");
          return;
        }
        try {
          const url = new URL(callbackUrl);
          const token = url.searchParams.get("token");
          const email = url.searchParams.get("email");
          const name = url.searchParams.get("name");

          if (!token || !email) {
            setLoginError("Invalid login response");
            return;
          }

          const providerFromCallback = (url.searchParams.get("provider") as OAuthUser["provider"]) || provider;
          const user: OAuthUser = { email, name: name || email, provider: providerFromCallback };
          const updated: ConnectionSettings = {
            ...settings!,
            oauthToken: token,
            oauthUser: user,
            reporterEmail: email,
          };
          await saveSettings(updated);
          setSettings(updated);
        } catch {
          setLoginError("Failed to process login response");
        }
      }
    );
  };

  const handleGitHubLogin = () => handleOAuthLogin("github");
  const handleGoogleLogin = () => handleOAuthLogin("google");
  const handleYandexLogin = () => handleOAuthLogin("yandex");

  const handleLogout = async () => {
    if (!settings) return;
    const updated: ConnectionSettings = {
      ...settings,
      oauthToken: undefined,
      oauthUser: undefined,
    };
    await saveSettings(updated);
    setSettings(updated);
  };

  if (!settings) return null;

  const isLoggedIn = !!settings.oauthUser;

  return (
    <div className="w-[320px] dark bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-base font-bold flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Agelum Settings
        </h1>
        <button
          type="button"
          onClick={openSidePanel}
          className="flex items-center justify-center bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium hover:bg-secondary/80 transition-all"
          title="Open Sidepanel"
        >
          <LayoutPanelTop className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === "settings"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Connection
        </button>
        <button
          onClick={() => setActiveTab("account")}
          className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "account"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Account
          {isLoggedIn && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "settings" && (
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
              />
              <p className="text-[10px] text-muted-foreground">Get your API key from the Agelum web app settings.</p>
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

            {!isLoggedIn && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Email (Reporter)</label>
                <input
                  type="email"
                  value={settings.reporterEmail || ""}
                  onChange={(e) => setSettings({ ...settings, reporterEmail: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground">Or login via the Account tab to auto-fill.</p>
              </div>
            )}

            {isLoggedIn && (
              <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <User className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-green-400 truncate">{settings.oauthUser?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{settings.oauthUser?.email}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
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
          </form>
        )}

        {activeTab === "account" && (
          <div className="space-y-4">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-lg font-bold text-green-400">
                    {settings.oauthUser!.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{settings.oauthUser!.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{settings.oauthUser!.email}</p>
                    {settings.oauthUser!.provider && (
                      <p className="text-[10px] text-muted-foreground capitalize">via {settings.oauthUser!.provider}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  You're logged in. Your email is automatically used as the reporter when submitting issues.
                </p>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2 rounded-lg font-medium hover:bg-secondary/80 transition-all text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white">Sign in to Agelum</h3>
                  <p className="text-xs text-muted-foreground">
                    Login to automatically identify yourself as the reporter on issues you submit. Your email will be verified against the project's allowed users list.
                  </p>
                </div>

                {loginError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                    {loginError}
                  </div>
                )}

                {!settings.serverUrl ? (
                  <div className="p-3 bg-secondary/30 border border-border rounded-lg text-xs text-muted-foreground">
                    Configure your Server URL in the Connection tab first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleGitHubLogin}
                      disabled={loggingIn}
                      className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-lg font-medium hover:bg-white/90 transition-all text-sm disabled:opacity-50"
                    >
                      {loggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Github className="w-4 h-4" />
                      )}
                      Continue with GitHub
                    </button>

                    <button
                      onClick={handleGoogleLogin}
                      disabled={loggingIn}
                      className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-all text-sm disabled:opacity-50"
                    >
                      {loggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Chrome className="w-4 h-4" />
                      )}
                      Continue with Google
                    </button>

                    <button
                      onClick={handleYandexLogin}
                      disabled={loggingIn}
                      className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-600/90 transition-all text-sm disabled:opacity-50"
                    >
                      {loggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Continue with Yandex
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground text-center">
                  Login requires access to your Agelum web app at{" "}
                  <span className="text-foreground">{settings.serverUrl || "localhost"}</span>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
