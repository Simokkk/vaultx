'use strict';

/**
 * Wrapper su better-sqlite3 per VaultX.
 * Gestisce inizializzazione, migrazioni schema e statement preparati.
 */

const path = require('node:path');
const fs = require('node:fs');

/** @type {import('better-sqlite3').Database | null} */
let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salt TEXT NOT NULL,
  verification_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icona TEXT,
  colore TEXT,
  ordine INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  title_enc TEXT NOT NULL,
  username_enc TEXT,
  password_enc TEXT NOT NULL,
  url_enc TEXT,
  notes_enc TEXT,
  totp_secret_enc TEXT,
  favorite INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used TEXT,
  password_changed_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id);
CREATE INDEX IF NOT EXISTS idx_entries_favorite ON entries(favorite);
CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at);

CREATE TABLE IF NOT EXISTS password_history (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  password_enc TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_entry ON password_history(entry_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  at TEXT NOT NULL
);
`;

/**
 * Inizializza la connessione al DB.
 * @param {string} dbPath
 */
function init(dbPath) {
  if (db) return db;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // eslint-disable-next-line global-require
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  db.exec(SCHEMA);
  return db;
}

/** @returns {import('better-sqlite3').Database} */
function get() {
  if (!db) throw new Error('Database non inizializzato.');
  return db;
}

function close() {
  if (db) {
    try {
      db.close();
    } catch (_err) {
      /* swallow */
    }
    db = null;
  }
}

/**
 * Log di un evento (apertura vault, lock, ecc.)
 * @param {string} event
 */
function logEvent(event) {
  try {
    get().prepare('INSERT INTO access_log (event, at) VALUES (?, ?)').run(
      event,
      new Date().toISOString()
    );
  } catch (_err) {
    /* swallow */
  }
}

/** @returns {string|null} */
function getSetting(key) {
  try {
    const row = get().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (_err) {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
function setSetting(key, value) {
  get()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, String(value));
}

/** @returns {Record<string,string>} */
function allSettings() {
  const rows = get().prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

module.exports = {
  init,
  get,
  close,
  logEvent,
  getSetting,
  setSetting,
  allSettings
};
