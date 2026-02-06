const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
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

  entry = { view, attached: false };
  browserViews.set(winId, entry);

  // Forward navigation events to the renderer
  const wc = view.webContents;

  wc.on("did-navigate", (_event, url) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:navigated", url);
    }
  });

  wc.on("did-navigate-in-page", (_event, url) => {
    if (!win.isDestroyed()) {
      win.webContents.send("browser-view:navigated", url);
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
    await entry.view.webContents.loadURL(url);
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
