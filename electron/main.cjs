const { app, BrowserWindow, ipcMain } = require("electron");

app.setName("Briefing");
const path = require("path");
const ai = require("./ai/index.cjs");
const db = require("./db.cjs");

let mainWindow;
let expanded = false;

const COMPACT = { width: 500, height: 400 };
const EXPANDED = { width: 1250, height: 750 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: COMPACT.width,
    height: COMPACT.height,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  mainWindow.loadURL("http://localhost:5173");
  // mainWindow.webContents.openDevTools();
}

ipcMain.handle("db:get-sessions", () => {
  return db.getAllSessions();
});

ipcMain.handle("db:create-session", (_event, id, name, note, sessionType = 0) => {
  return db.createSession(id, name, note, sessionType);
});

ipcMain.handle("db:update-session-note", (_event, sessionId, note) => {
  db.updateSessionNote(sessionId, note);
});

ipcMain.handle("db:update-session-name", (_event, sessionId, name) => {
  db.updateSessionName(sessionId, name);
});

ipcMain.handle("db:update-summary", (_event, sessionId, summary) => {
  db.updateSummary(sessionId, summary);
});

ipcMain.handle("db:delete-session", (_event, sessionId) => {
  db.deleteSession(sessionId);
});

ipcMain.handle("summarize", async (_event, notes) => {
  return ai.summarize(notes);
});

ipcMain.handle("toggle-expand", () => {
  if (!mainWindow) return false;
  expanded = !expanded;
  const size = expanded ? EXPANDED : COMPACT;
  mainWindow.setSize(size.width, size.height, true);
  mainWindow.center();
  return expanded;
});

ipcMain.handle("get-expanded-state", () => {
  return expanded;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
