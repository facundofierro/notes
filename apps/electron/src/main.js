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

// Track WebContentsView per BrowserWindow (by window id)
const browserViews = new Map();

function startNextServer() {
  const serverPath = path.join(
    process.resourcesPath,
    "app",
    "apps",
    "web",
    ".next",
    "standalone",
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
 * Get or create the WebContentsView for a given BrowserWindow.
 */
function getOrCreateBrowserView(win) {
  const winId = win.id;
  let entry = browserViews.get(winId);
  if (entry) return entry;

  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  entry = { view, attached: false, insecure: false };
  browserViews.set(winId, entry);

  // Forward navigation events to the renderer
  const wc = view.webContents;

  wc.on("did-navigate", (_event, url) => {
    if (!win.isDestroyed()) {
      // Reset insecure flag on new navigation
      entry.insecure = false;
      win.webContents.send("browser-view:navigated", url, false);
    }
  });

  wc.on("did-navigate-in-page", (_event, url) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:navigated", url, entry.insecure);
    }
  });

  wc.on("page-title-updated", (_event, title) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:title-updated", title);
    }
  });

  wc.on("did-start-loading", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:loading-changed", true);
    }
  });

  wc.on("did-stop-loading", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:loading-changed", false);
    }
  });

  wc.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:load-failed", validatedURL, errorDescription, errorCode);
    }
  });

  // Setup debugger for network logs
  try {
    wc.debugger.attach("1.3");
    wc.debugger.on("message", (event, method, params) => {
      if (!win.isDestroyed()) {
        if (method === "Network.requestWillBeSent") {
          win.webContents.send("browser-view:network-request", params);
        } else if (method === "Network.responseReceived") {
          win.webContents.send("browser-view:network-response", params);
        } else if (method === "Network.loadingFinished") {
          win.webContents.send("browser-view:network-finished", params);
        } else if (method === "Network.loadingFailed") {
          win.webContents.send("browser-view:network-failed", params);
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
 * Remove and destroy the WebContentsView for a given window id.
 */
function destroyBrowserView(winId) {
  const entry = browserViews.get(winId);
  if (!entry) return;
  const win = BrowserWindow.fromId(winId);
  if (win && !win.isDestroyed() && entry.attached) {
    try {
      win.contentView.removeChildView(entry.view);
    } catch (_) {
      // view may already be detached
    }
  }
  entry.view.webContents.close();
  browserViews.delete(winId);
}

function setupIpcHandlers() {
  // Load a URL in the WebContentsView
  ipcMain.handle("browser-view:load-url", async (event, url) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const entry = getOrCreateBrowserView(win);
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
  ipcMain.on("browser-view:set-bounds", (event, bounds) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const entry = browserViews.get(win.id);
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
  ipcMain.on("browser-view:hide", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const entry = browserViews.get(win.id);
    if (!entry || !entry.attached) return;
    try {
      win.contentView.removeChildView(entry.view);
    } catch (_) {
      // already removed
    }
    entry.attached = false;
  });

  // Show the WebContentsView (re-add to parent)
  ipcMain.on("browser-view:show", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const entry = browserViews.get(win.id);
    if (!entry || entry.attached) return;
    win.contentView.addChildView(entry.view);
    entry.attached = true;
  });

  // Capture a screenshot of the WebContentsView
  ipcMain.handle("browser-view:capture", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const entry = browserViews.get(win.id);
    if (!entry) return null;
    try {
      const image = await entry.view.webContents.capturePage();
      return image.toDataURL();
    } catch (_) {
      return null;
    }
  });

  // Execute JavaScript in the WebContentsView
  ipcMain.handle("browser-view:execute-js", async (event, code) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const entry = browserViews.get(win.id);
    if (!entry) return null;
    try {
      return await entry.view.webContents.executeJavaScript(code);
    } catch (err) {
      return { __error: err.message };
    }
  });

  // Get the current URL of the WebContentsView
  ipcMain.handle("browser-view:get-url", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return "";
    const entry = browserViews.get(win.id);
    if (!entry) return "";
    return entry.view.webContents.getURL();
  });

  // Destroy the WebContentsView
  ipcMain.on("browser-view:destroy", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    destroyBrowserView(win.id);
  });

  // Reload the WebContentsView
  ipcMain.on("browser-view:reload", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const entry = browserViews.get(win.id);
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

  // Clean up WebContentsView when window is closed
  win.on("closed", () => {
    destroyBrowserView(win.id);
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
  for (const [winId, entry] of browserViews.entries()) {
    if (entry.view.webContents === webContents) {
      entry.insecure = true;
      const win = BrowserWindow.fromId(winId);
      if (win && !win.isDestroyed()) {
        win.webContents.send("browser-view:navigated", url, true);
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
