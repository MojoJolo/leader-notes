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
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      summary TEXT,
      session_type INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

function createSession(id, name, note, sessionType = 0) {
  getDb()
    .prepare("INSERT INTO sessions (id, name, note, session_type) VALUES (?, ?, ?, ?)")
    .run(id, name, note, sessionType);
  return { id, name, note, summary: null, session_type: sessionType };
}

function updateSessionNote(sessionId, note) {
  getDb()
    .prepare("UPDATE sessions SET note = ?, updated_at = datetime('now') WHERE id = ?")
    .run(note, sessionId);
}

function updateSessionName(sessionId, name) {
  getDb()
    .prepare("UPDATE sessions SET name = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, sessionId);
}

function updateSummary(sessionId, summary) {
  getDb()
    .prepare("UPDATE sessions SET summary = ?, updated_at = datetime('now') WHERE id = ?")
    .run(summary, sessionId);
}

function deleteSession(sessionId) {
  getDb()
    .prepare("DELETE FROM sessions WHERE id = ?")
    .run(sessionId);
}

function getAllSessions() {
  const d = getDb();
  return d
    .prepare("SELECT id, name, note, summary, created_at, updated_at, session_type FROM sessions ORDER BY id ASC")
    .all();
}

module.exports = { createSession, updateSessionNote, updateSessionName, updateSummary, deleteSession, getAllSessions };
