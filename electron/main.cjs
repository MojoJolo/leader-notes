const { app, BrowserWindow, ipcMain } = require("electron");

app.setName("Briefing");
const path = require("path");
const ai = require("./ai/index.cjs");
const db = require("./db.cjs");
const { ASK_TEMPLATE, EXTRACT_TEMPLATE, CLASSIFY_TEMPLATE } = require("./ai/config.cjs");

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

ipcMain.handle("ask", async (_event, sessionsContext, question) => {
  // Classify the question first to determine if it targets tracked items
  let classification = { isItemQuery: false, category: null, scope: null };
  try {
    const classifyRaw = await ai.summarize([CLASSIFY_TEMPLATE(question)]);
    const cleaned = classifyRaw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.isItemQuery === 'boolean') classification = parsed;
  } catch {
    // Fall through to normal ask on parse failure
  }

  if (classification.isItemQuery) {
    const sessionIds = db.getAllSessions()
      .filter((s) => s.session_type === 0)
      .map((s) => s.id);
    let items = db.getItems(sessionIds);
    if (classification.category) {
      items = items.filter((i) => i.category === classification.category);
    }
    if (items.length === 0) return 'No items found.';

    const grouped = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    return Object.entries(grouped)
      .map(([cat, catItems]) => {
        const heading = `## ${cat.charAt(0).toUpperCase() + cat.slice(1)}s`;
        const lines = catItems.map((i) => `- ${i.done ? `~~${i.text}~~` : i.text}`);
        return [heading, ...lines].join('\n');
      })
      .join('\n\n');
  }

  const prompt = ASK_TEMPLATE(sessionsContext, question);
  return ai.summarize([prompt]);
});

ipcMain.handle("extract-items", async (_event, sessionId, note) => {
  const prompt = EXTRACT_TEMPLATE(note);
  const raw = await ai.summarize([prompt]);
  let items = [];
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    items = JSON.parse(cleaned);
    if (!Array.isArray(items)) items = [];
  } catch {
    return [];
  }
  db.replaceItems(sessionId, items);
  return items;
});

ipcMain.handle("db:get-items", (_event, sessionIds) => {
  return db.getItems(sessionIds);
});

ipcMain.handle("db:mark-item-done", (_event, itemId) => {
  db.markItemDone(itemId);
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
