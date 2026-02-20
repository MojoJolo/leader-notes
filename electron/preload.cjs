const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  toggleExpand: () => ipcRenderer.invoke("toggle-expand"),
  summarize: (notes) => ipcRenderer.invoke("summarize", notes),
  getSessions: () => ipcRenderer.invoke("db:get-sessions"),
  createSession: (id, name) => ipcRenderer.invoke("db:create-session", id, name),
  addNote: (sessionId, content) => ipcRenderer.invoke("db:add-note", sessionId, content),
  updateSummary: (sessionId, summary) => ipcRenderer.invoke("db:update-summary", sessionId, summary),
});
