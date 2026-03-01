const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  toggleExpand: () => ipcRenderer.invoke("toggle-expand"),
  getExpandedState: () => ipcRenderer.invoke("get-expanded-state"),
  summarize: (notes) => ipcRenderer.invoke("summarize", notes),
  ask: (sessionsContext, question) => ipcRenderer.invoke("ask", sessionsContext, question),
  getSessions: () => ipcRenderer.invoke("db:get-sessions"),
  createSession: (id, name, note, sessionType) => ipcRenderer.invoke("db:create-session", id, name, note, sessionType),
  updateSessionNote: (sessionId, note) => ipcRenderer.invoke("db:update-session-note", sessionId, note),
  updateSessionName: (sessionId, name) => ipcRenderer.invoke("db:update-session-name", sessionId, name),
  updateSummary: (sessionId, summary) => ipcRenderer.invoke("db:update-summary", sessionId, summary),
  deleteSession: (sessionId) => ipcRenderer.invoke("db:delete-session", sessionId),
  extractItems: (sessionId, note) => ipcRenderer.invoke("extract-items", sessionId, note),
  getItems: (sessionIds) => ipcRenderer.invoke("db:get-items", sessionIds),
  markItemDone: (itemId) => ipcRenderer.invoke("db:mark-item-done", itemId),
});
