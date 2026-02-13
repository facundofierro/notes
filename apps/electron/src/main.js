const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
  shell,
} = require("electron");
const { spawn } = require("child_process");
const path = require("path");

const DEV_URL =
  process.env.AGELUM_WEB_URL ||
  "http://localhost:6500";
const PROD_URL = "http://127.0.0.1:6500";

let nextProcess = null;

// Track WebContentsView per BrowserWindow + tab index
// Key format: "winId:tabIndex"
const browserViews = new Map();

function viewKey(winId, tabIndex) {
  return `${winId}:${tabIndex}`;
}

function startNextServer() {
  const serverPath = path.join(
    process.resourcesPath,
    "web-standalone",
    "apps",
    "web",
    "server.js",
  );

  nextProcess = spawn(
    process.execPath,
    [serverPath],
    {
      env: {
        ...process.env,
        PORT: "6500",
        HOSTNAME: "127.0.0.1",
      },
      stdio: "inherit",
    },
  );
}

/**
 * Get or create the WebContentsView for a given BrowserWindow + tab index.
 */
function getOrCreateBrowserView(win, tabIndex = 0) {
  const key = viewKey(win.id, tabIndex);
  let entry = browserViews.get(key);
  if (entry) return entry;

  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  entry = { view, attached: false, insecure: false, tabIndex };
  browserViews.set(key, entry);

  // Forward navigation events to the renderer (include tabIndex)
  const wc = view.webContents;

  wc.on("did-navigate", (_event, url) => {
    if (!win.isDestroyed()) {
      entry.insecure = false;
      win.webContents.send("browser-view:navigated", url, false, tabIndex);
    }
  });

  wc.on("did-navigate-in-page", (_event, url) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:navigated", url, entry.insecure, tabIndex);
    }
  });

  wc.on("page-title-updated", (_event, title) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:title-updated", title, tabIndex);
    }
  });

  wc.on("did-start-loading", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:loading-changed", true, tabIndex);
    }
  });

  wc.on("did-stop-loading", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:loading-changed", false, tabIndex);
    }
  });

  wc.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:load-failed", validatedURL, errorDescription, errorCode, tabIndex);
    }
  });

  wc.on("page-favicon-updated", (_event, favicons) => {
    if (!win.isDestroyed() && favicons.length > 0) {
      win.webContents.send("browser-view:favicon-updated", favicons[0], tabIndex);
    }
  });

  // Setup debugger for network logs
  try {
    wc.debugger.attach("1.3");
    wc.debugger.on("message", (event, method, params) => {
      if (!win.isDestroyed()) {
        if (method === "Network.requestWillBeSent") {
          win.webContents.send("browser-view:network-request", params, tabIndex);
        } else if (method === "Network.responseReceived") {
          win.webContents.send("browser-view:network-response", params, tabIndex);
        } else if (method === "Network.loadingFinished") {
          win.webContents.send("browser-view:network-finished", params, tabIndex);
        } else if (method === "Network.loadingFailed") {
          win.webContents.send("browser-view:network-failed", params, tabIndex);
        }
      }
    });
    wc.debugger.sendCommand("Network.enable");
  } catch (err) {
    console.error("Failed to attach debugger:", err);
  }

  return entry;
}

/**
 * Remove and destroy the WebContentsView for a given key.
 */
function destroyBrowserViewByKey(key) {
  const entry = browserViews.get(key);
  if (!entry) return;
  // Extract winId from key
  const winId = parseInt(key.split(":")[0], 10);
  const win = BrowserWindow.fromId(winId);
  if (win && !win.isDestroyed() && entry.attached) {
    try {
      win.contentView.removeChildView(entry.view);
    } catch (_) {
      // view may already be detached
    }
  }
  entry.view.webContents.close();
  browserViews.delete(key);
}

/**
 * Destroy all WebContentsViews for a given window id.
 */
function destroyAllBrowserViews(winId) {
  const keysToDelete = [];
  for (const key of browserViews.keys()) {
    if (key.startsWith(`${winId}:`)) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    destroyBrowserViewByKey(key);
  }
}

function setupIpcHandlers() {
  // Load a URL in the WebContentsView
  ipcMain.handle("browser-view:load-url", async (event, url, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const entry = getOrCreateBrowserView(win, tabIndex);
    if (!entry.attached) {
      win.contentView.addChildView(entry.view);
      entry.attached = true;
    }
    try {
      await entry.view.webContents.loadURL(url);
    } catch (err) {
      if (err.code !== "ERR_ABORTED") {
        console.error(`Error loading URL ${url}:`, err);
      }
    }
  });

  // Set the bounds (position + size) of the WebContentsView
  ipcMain.on("browser-view:set-bounds", (event, bounds, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry) return;
    // bounds: { x, y, width, height } — integers
    entry.view.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    });
  });

  // Hide the WebContentsView (remove from parent)
  ipcMain.on("browser-view:hide", (event, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry || !entry.attached) return;
    try {
      win.contentView.removeChildView(entry.view);
    } catch (_) {
      // already removed
    }
    entry.attached = false;
  });

  // Hide ALL WebContentsViews for the sender's window
  ipcMain.on("browser-view:hide-all", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    for (const [key, entry] of browserViews.entries()) {
      if (key.startsWith(`${win.id}:`) && entry.attached) {
        try {
          win.contentView.removeChildView(entry.view);
        } catch (_) {}
        entry.attached = false;
      }
    }
  });

  // Show ALL WebContentsViews for the sender's window
  ipcMain.on("browser-view:show-all", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    for (const [key, entry] of browserViews.entries()) {
      if (key.startsWith(`${win.id}:`) && !entry.attached) {
        win.contentView.addChildView(entry.view);
        entry.attached = true;
      }
    }
  });

  // Show the WebContentsView (re-add to parent)
  ipcMain.on("browser-view:show", (event, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry || entry.attached) return;
    win.contentView.addChildView(entry.view);
    entry.attached = true;
  });

  // Capture a screenshot of the WebContentsView
  ipcMain.handle("browser-view:capture", async (event, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry) return null;
    try {
      const image = await entry.view.webContents.capturePage();
      return image.toDataURL();
    } catch (_) {
      return null;
    }
  });

  // Execute JavaScript in the WebContentsView
  ipcMain.handle("browser-view:execute-js", async (event, code, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry) return null;
    try {
      return await entry.view.webContents.executeJavaScript(code);
    } catch (err) {
      return { __error: err.message };
    }
  });

  // Get the current URL of the WebContentsView
  ipcMain.handle("browser-view:get-url", (event, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return "";
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry) return "";
    return entry.view.webContents.getURL();
  });

  // Destroy a specific WebContentsView
  ipcMain.on("browser-view:destroy", (event, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = viewKey(win.id, tabIndex);
    destroyBrowserViewByKey(key);
  });

  // Reload the WebContentsView
  ipcMain.on("browser-view:reload", (event, tabIndex = 0) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const key = viewKey(win.id, tabIndex);
    const entry = browserViews.get(key);
    if (!entry) return;
    entry.view.webContents.reload();
  });

  // Open URL in external browser
  ipcMain.on("shell:open-external", (event, url) => {
    shell.openExternal(url);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#0b0b0b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadURL(app.isPackaged ? PROD_URL : DEV_URL);

  // Clean up all WebContentsViews when window is closed
  win.on("closed", () => {
    destroyAllBrowserViews(win.id);
  });
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    startNextServer();
  }
  setupIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
  // Find which browser view this belongs to
  for (const [key, entry] of browserViews.entries()) {
    if (entry.view.webContents === webContents) {
      entry.insecure = true;
      const winId = parseInt(key.split(":")[0], 10);
      const win = BrowserWindow.fromId(winId);
      if (win && !win.isDestroyed()) {
        win.webContents.send("browser-view:navigated", url, true, entry.tabIndex);
      }
      break;
    }
  }

  event.preventDefault();
  callback(true);
});

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
