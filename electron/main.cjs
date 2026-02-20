const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const ai = require("./ai/index.cjs");
const db = require("./db.cjs");

let mainWindow;
let expanded = false;

const COMPACT = { width: 500, height: 400 };
const EXPANDED = { width: 1050, height: 750 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: COMPACT.width,
    height: COMPACT.height,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  }
}

ipcMain.handle("db:get-sessions", () => {
  return db.getAllSessions();
});

ipcMain.handle("db:create-session", (_event, id, name) => {
  return db.createSession(id, name);
});

ipcMain.handle("db:add-note", (_event, sessionId, content) => {
  return db.addNote(sessionId, content);
});

ipcMain.handle("db:update-summary", (_event, sessionId, summary) => {
  db.updateSummary(sessionId, summary);
});

ipcMain.handle("ask", async (_event, notes, question) => {
  return ai.ask(notes, question);
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
