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
  type TEXT NOT NULL DEFAULT 'login',
  title_enc TEXT NOT NULL,
  username_enc TEXT,
  password_enc TEXT,
  url_enc TEXT,
  notes_enc TEXT,
  totp_secret_enc TEXT,
  extra_enc TEXT,
  favorite INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_used TEXT,
  password_changed_at TEXT,
  deleted_at TEXT,
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
  migrate(db);
  return db;
}

/**
 * Migrazioni schema additive e idempotenti.
 * Non rimuove mai colonne/dati: aggiunge solo ciò che manca.
 * @param {import('better-sqlite3').Database} database
 */
function migrate(database) {
  // v1.3: soft-delete (cestino) — colonna deleted_at su entries
  let cols = database.prepare(`PRAGMA table_info(entries)`).all();
  if (!cols.some((c) => c.name === 'deleted_at')) {
    database.exec(`ALTER TABLE entries ADD COLUMN deleted_at TEXT`);
  }
  database.exec(`CREATE INDEX IF NOT EXISTS idx_entries_deleted ON entries(deleted_at)`);

  // v1.5: tipi di voce — colonne type + extra_enc, e password_enc reso opzionale.
  // Richiede la ricostruzione della tabella (SQLite non rimuove NOT NULL con ALTER).
  // Procedura sicura con FK disattivate per non innescare il CASCADE su password_history.
  cols = database.prepare(`PRAGMA table_info(entries)`).all();
  if (!cols.some((c) => c.name === 'type')) {
    database.pragma('foreign_keys = OFF');
    const rebuild = database.transaction(() => {
      database.exec(`
        CREATE TABLE entries_new (
          id TEXT PRIMARY KEY,
          category_id TEXT,
          type TEXT NOT NULL DEFAULT 'login',
          title_enc TEXT NOT NULL,
          username_enc TEXT,
          password_enc TEXT,
          url_enc TEXT,
          notes_enc TEXT,
          totp_secret_enc TEXT,
          extra_enc TEXT,
          favorite INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_used TEXT,
          password_changed_at TEXT,
          deleted_at TEXT,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        );
      `);
      database.exec(`
        INSERT INTO entries_new
          (id, category_id, type, title_enc, username_enc, password_enc, url_enc,
           notes_enc, totp_secret_enc, extra_enc, favorite, created_at, updated_at,
           last_used, password_changed_at, deleted_at)
        SELECT
           id, category_id, 'login', title_enc, username_enc, password_enc, url_enc,
           notes_enc, totp_secret_enc, NULL, favorite, created_at, updated_at,
           last_used, password_changed_at, deleted_at
        FROM entries;
      `);
      database.exec(`DROP TABLE entries`);
      database.exec(`ALTER TABLE entries_new RENAME TO entries`);
      database.exec(`CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id)`);
      database.exec(`CREATE INDEX IF NOT EXISTS idx_entries_favorite ON entries(favorite)`);
      database.exec(`CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at)`);
      database.exec(`CREATE INDEX IF NOT EXISTS idx_entries_deleted ON entries(deleted_at)`);
    });
    rebuild();
    const fkErrors = database.pragma('foreign_key_check');
    database.pragma('foreign_keys = ON');
    if (Array.isArray(fkErrors) && fkErrors.length > 0) {
      throw new Error('Migrazione 1.5 fallita: violazioni di integrità rilevate.');
    }
  }
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
