const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Placeholder for future native hooks
  invoke: (channel, payload) =>
    ipcRenderer.invoke(channel, payload),
});
