const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

let db;

function getDb() {
  if (db) return db;
  const dbPath = path.join(app.getPath("userData"), "leader-notes.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Session',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      summary TEXT
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function createSession(id, name) {
  getDb().prepare("INSERT INTO sessions (id, name) VALUES (?, ?)").run(id, name);
  const row = getDb().prepare("SELECT created_at FROM sessions WHERE id = ?").get(id);
  return { id, name, notes: [], summary: null, createdAt: row.created_at };
}

function addNote(sessionId, content) {
  const stmt = getDb().prepare("INSERT INTO notes (session_id, content) VALUES (?, ?)");
  const result = stmt.run(sessionId, content);
  return result.lastInsertRowid;
}

function updateSummary(sessionId, summary) {
  getDb().prepare("UPDATE sessions SET summary = ? WHERE id = ?").run(summary, sessionId);
}

function getAllSessions() {
  const d = getDb();
  const sessions = d.prepare("SELECT id, name, summary, created_at FROM sessions ORDER BY id ASC").all();
  const noteStmt = d.prepare("SELECT content FROM notes WHERE session_id = ? ORDER BY id ASC");
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    summary: s.summary,
    createdAt: s.created_at,
    notes: noteStmt.all(s.id).map((n) => n.content)
  }));
}

module.exports = { createSession, addNote, updateSummary, getAllSessions };
