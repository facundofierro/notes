const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Generic invoke (kept for backwards compat)
  invoke: (channel, payload) =>
    ipcRenderer.invoke(channel, payload),

  // WebContentsView-based browser preview
  browserView: {
    loadUrl: (url) =>
      ipcRenderer.invoke("browser-view:load-url", url),
    setBounds: (bounds) =>
      ipcRenderer.send("browser-view:set-bounds", bounds),
    hide: () =>
      ipcRenderer.send("browser-view:hide"),
    show: () =>
      ipcRenderer.send("browser-view:show"),
    capture: () =>
      ipcRenderer.invoke("browser-view:capture"),
    executeJs: (code) =>
      ipcRenderer.invoke("browser-view:execute-js", code),
    getUrl: () =>
      ipcRenderer.invoke("browser-view:get-url"),
    destroy: () =>
      ipcRenderer.send("browser-view:destroy"),

    // Event listeners from main → renderer
    onNavigated: (callback) => {
      const handler = (_event, url, isInsecure) => callback(url, isInsecure);
      ipcRenderer.on("browser-view:navigated", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:navigated", handler);
    },
    onTitleUpdated: (callback) => {
      const handler = (_event, title) => callback(title);
      ipcRenderer.on("browser-view:title-updated", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:title-updated", handler);
    },
    onLoadingChanged: (callback) => {
      const handler = (_event, loading) => callback(loading);
      ipcRenderer.on("browser-view:loading-changed", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:loading-changed", handler);
    },
    onLoadFailed: (callback) => {
      const handler = (_event, url, errorDescription, errorCode) => callback(url, errorDescription, errorCode);
      ipcRenderer.on("browser-view:load-failed", handler);
      return () =>
        ipcRenderer.removeListener("browser-view:load-failed", handler);
    },
  },
});
