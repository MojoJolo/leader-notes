const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  toggleExpand: () => ipcRenderer.invoke("toggle-expand"),
  getExpandedState: () => ipcRenderer.invoke("get-expanded-state"),
  summarize: (notes) => ipcRenderer.invoke("summarize", notes),
  getSessions: () => ipcRenderer.invoke("db:get-sessions"),
  createSession: (id, name, note) => ipcRenderer.invoke("db:create-session", id, name, note),
  updateSessionNote: (sessionId, note) => ipcRenderer.invoke("db:update-session-note", sessionId, note),
  updateSessionName: (sessionId, name) => ipcRenderer.invoke("db:update-session-name", sessionId, name),
  updateSummary: (sessionId, summary) => ipcRenderer.invoke("db:update-summary", sessionId, summary),
  deleteSession: (sessionId) => ipcRenderer.invoke("db:delete-session", sessionId),
});
