const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Generic invoke (kept for backwards compat)
  invoke: (channel, payload) =>
    ipcRenderer.invoke(channel, payload),
  loadUrl: (url) => ipcRenderer.invoke("auth-view:open", url),
  closeInternalView: () => ipcRenderer.send("auth-view:close"),
  onAuthNavigated: (callback) => {
    const handler = (_event, url) => callback(url);
    ipcRenderer.on("auth-view:navigated", handler);
    return () => ipcRenderer.removeListener("auth-view:navigated", handler);
  },
  onAuthToken: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("auth-view:token", handler);
    return () => ipcRenderer.removeListener("auth-view:token", handler);
  },

  // WebContentsView-based browser preview (supports multiple tabs via tabIndex)
  browserView: {
    loadUrl: (url, tabIndex = 0) =>
      ipcRenderer.invoke("browser-view:load-url", url, tabIndex),
    setBounds: (bounds, tabIndex = 0) =>
      ipcRenderer.send("browser-view:set-bounds", bounds, tabIndex),
    hide: (tabIndex = 0) =>
      ipcRenderer.send("browser-view:hide", tabIndex),
    show: (tabIndex = 0) =>
      ipcRenderer.send("browser-view:show", tabIndex),
    hideAll: () => ipcRenderer.send("browser-view:hide-all"),
    showAll: () => ipcRenderer.send("browser-view:show-all"),
    capture: (tabIndex = 0) =>
      ipcRenderer.invoke("browser-view:capture", tabIndex),
    executeJs: (code, tabIndex = 0) =>
      ipcRenderer.invoke("browser-view:execute-js", code, tabIndex),
    getUrl: (tabIndex = 0) =>
      ipcRenderer.invoke("browser-view:get-url", tabIndex),
    destroy: (tabIndex = 0) =>
      ipcRenderer.send("browser-view:destroy", tabIndex),
    reload: (tabIndex = 0) =>
      ipcRenderer.send("browser-view:reload", tabIndex),

    // Event listeners from main → renderer (now include tabIndex)
    onNavigated: (callback) => {
      const handler = (_event, url, isInsecure, tabIndex) => callback(url, isInsecure, tabIndex);
      ipcRenderer.on("browser-view:navigated", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:navigated", handler);
    },
    onTitleUpdated: (callback) => {
      const handler = (_event, title, tabIndex) => callback(title, tabIndex);
      ipcRenderer.on("browser-view:title-updated", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:title-updated", handler);
    },
    onLoadingChanged: (callback) => {
      const handler = (_event, loading, tabIndex) => callback(loading, tabIndex);
      ipcRenderer.on("browser-view:loading-changed", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:loading-changed", handler);
    },
    onLoadFailed: (callback) => {
      const handler = (_event, url, errorDescription, errorCode, tabIndex) => callback(url, errorDescription, errorCode, tabIndex);
      ipcRenderer.on("browser-view:load-failed", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:load-failed", handler);
    },
    onNetworkRequest: (callback) => {
      const handler = (_event, params, tabIndex) => callback(params, tabIndex);
      ipcRenderer.on("browser-view:network-request", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:network-request", handler);
    },
    onFaviconUpdated: (callback) => {
      const handler = (_event, favicon, tabIndex) => callback(favicon, tabIndex);
      ipcRenderer.on("browser-view:favicon-updated", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:favicon-updated", handler);
    },
    onNetworkResponse: (callback) => {
      const handler = (_event, params, tabIndex) => callback(params, tabIndex);
      ipcRenderer.on("browser-view:network-response", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:network-response", handler);
    },
    onNetworkFinished: (callback) => {
      const handler = (_event, params, tabIndex) => callback(params, tabIndex);
      ipcRenderer.on("browser-view:network-finished", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:network-finished", handler);
    },
    onNetworkFailed: (callback) => {
      const handler = (_event, params, tabIndex) => callback(params, tabIndex);
      ipcRenderer.on("browser-view:network-failed", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:network-failed", handler);
    },
  },
  openExternal: (url) =>
    ipcRenderer.send("shell:open-external", url),
});
