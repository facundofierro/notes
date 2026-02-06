const { app, BrowserWindow, webFrameMain } = require("electron");
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
      // Disable web security to allow cross-origin iframe access
      webSecurity: false,
    },
  });

  win.loadURL(app.isPackaged ? PROD_URL : DEV_URL);

  // Handle iframe navigation for cross-origin element access
  win.webContents.on("did-frame-navigate", (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
    if (!isMainFrame && frameProcessId && frameRoutingId) {
      const frame = webFrameMain.fromId(frameProcessId, frameRoutingId);
      if (frame) {
        // Inject full element picker handler into iframe for Electron context
        const injectionCode = `
          if (!window.__agelumFrameSetup) {
            window.__agelumFrameSetup = true;

            function __agelumGetSelector(element) {
              var testId = element.getAttribute('data-testid') ||
                           element.getAttribute('data-test') ||
                           element.getAttribute('data-qa');
              if (testId) return '[data-testid="' + testId + '"]';
              if (element.id) return '#' + element.id;
              var classList = Array.from(element.classList || []);
              if (classList.length > 0) {
                return '.' + classList.slice(0, 2).map(function(n) { return n.trim(); }).filter(Boolean).join('.');
              }
              var tag = element.tagName.toLowerCase();
              var parent = element.parentElement;
              if (!parent) return tag;
              var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === element.tagName; });
              if (siblings.length <= 1) return tag;
              return tag + ':nth-of-type(' + (siblings.indexOf(element) + 1) + ')';
            }

            function __agelumSerialize(element) {
              return {
                selector: __agelumGetSelector(element),
                tagName: element.tagName.toLowerCase(),
                textSnippet: (element.textContent || '').slice(0, 50).trim().replace(/\\s+/g, ' '),
              };
            }

            // Coordinate-based element picker (used by parent overlay)
            window.addEventListener('message', function(event) {
              var data = event.data;
              if (!data || data.type !== 'agelum:pick-at-point') return;
              var el = document.elementFromPoint(data.x, data.y);
              if (el && window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'agelum:pick-response',
                  id: data.id,
                  element: __agelumSerialize(el),
                }, '*');
              }
            });

            // Click-based element picker
            window.addEventListener('message', function(event) {
              var data = event.data;
              if (!data || data.type !== 'agelum:pick-request') return;

              var isPickingMode = true;
              var originalCursor = document.body.style.cursor;
              document.body.style.cursor = 'crosshair';

              var handleCancel = function(e) {
                if (e.key === 'Escape') {
                  isPickingMode = false;
                  document.body.style.cursor = originalCursor;
                  document.removeEventListener('click', handleClick, true);
                  document.removeEventListener('keydown', handleCancel, true);
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'agelum:pick-cancel', id: data.id }, '*');
                  }
                }
              };

              var handleClick = function(e) {
                if (!isPickingMode) return;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                var element = e.target;
                if (!element) return;
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({
                    type: 'agelum:pick-response',
                    id: data.id,
                    element: __agelumSerialize(element),
                  }, '*');
                }
                isPickingMode = false;
                document.body.style.cursor = originalCursor;
                document.removeEventListener('click', handleClick, true);
                document.removeEventListener('keydown', handleCancel, true);
                return false;
              };

              document.addEventListener('click', handleClick, true);
              document.addEventListener('keydown', handleCancel, true);
            });
          }
        `;
        try {
          frame.executeJavaScript(injectionCode).catch(() => {
            // Frame may not be accessible, that's okay
          });
        } catch (err) {
          // Silently fail for non-accessible frames
        }
      }
    }
  });
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
