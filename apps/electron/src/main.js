const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

const DEV_URL =
  process.env.AGELUM_WEB_URL ||
  "http://localhost:6500";
const PROD_URL = "http://127.0.0.1:6500";

let nextProcess = null;

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
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    startNextServer();
  }
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
