'use strict';

/**
 * VaultService — logica vault cifrato.
 *
 * Mantiene la chiave di sessione in memoria **solo** quando sbloccato.
 * Su lock() la chiave viene azzerata.
 */

const crypto = require('node:crypto');
const Database = require('./database');
const CryptoSvc = require('./crypto');

/** @type {Buffer|null} */
let sessionKey = null;
let unlockedAt = null;

const DEFAULT_CATEGORIES = [
  { nome: 'Login', icona: 'globe', colore: '#58a6ff', ordine: 0 },
  { nome: 'Email', icona: 'mail', colore: '#3fb950', ordine: 1 },
  { nome: 'Social', icona: 'users', colore: '#d29922', ordine: 2 },
  { nome: 'Banca', icona: 'banknote', colore: '#f85149', ordine: 3 },
  { nome: 'Carte di credito', icona: 'credit-card', colore: '#bc8cff', ordine: 4 },
  { nome: 'Note sicure', icona: 'file-lock', colore: '#7d8590', ordine: 5 },
  { nome: 'Altro', icona: 'folder', colore: '#56d4dd', ordine: 6 }
];

/** @returns {string} */
function uuid() {
  return crypto.randomUUID();
}

/** @returns {string} */
function nowIso() {
  return new Date().toISOString();
}

function init() {
  // noop — DB già inizializzato dal main
}

/** @returns {boolean} */
function isUnlocked() {
  return sessionKey !== null;
}

/** @returns {Buffer} */
function requireKey() {
  if (!sessionKey) throw new Error('Vault bloccato.');
  return sessionKey;
}

/**
 * @param {Buffer} key
 */
function setSessionKey(key) {
  if (sessionKey) CryptoSvc.zeroBuffer(sessionKey);
  sessionKey = Buffer.from(key);
  unlockedAt = nowIso();
  Database.logEvent('unlock');
}

function clearSession() {
  if (sessionKey) CryptoSvc.zeroBuffer(sessionKey);
  sessionKey = null;
  unlockedAt = null;
  Database.logEvent('lock');
}

/** @returns {boolean} */
function isInitialized() {
  const row = Database.get().prepare('SELECT id FROM vault_config WHERE id = 1').get();
  return !!row;
}

/**
 * Crea un nuovo vault (primo setup).
 * @param {string} masterPassword
 * @returns {Promise<void>}
 */
async function setupVault(masterPassword) {
  if (isInitialized()) throw new Error('Vault già inizializzato.');
  if (typeof masterPassword !== 'string' || masterPassword.length < 12) {
    throw new Error('La master password deve avere almeno 12 caratteri.');
  }

  const salt = CryptoSvc.generateSalt();
  const key = await CryptoSvc.deriveKey(masterPassword, salt);
  const hash = CryptoSvc.verificationHash(key);

  const db = Database.get();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO vault_config (id, salt, verification_hash, created_at, version)
       VALUES (1, ?, ?, ?, 1)`
    ).run(salt.toString('hex'), hash, nowIso());

    // Popola categorie default
    const insCat = db.prepare(
      `INSERT INTO categories (id, nome, icona, colore, ordine) VALUES (?, ?, ?, ?, ?)`
    );
    for (const c of DEFAULT_CATEGORIES) {
      insCat.run(uuid(), c.nome, c.icona, c.colore, c.ordine);
    }
  });
  tx();

  setSessionKey(key);
}

/**
 * Sblocca il vault.
 * @param {string} masterPassword
 * @returns {Promise<boolean>} true se sbloccato
 */
async function unlock(masterPassword) {
  const row = Database.get()
    .prepare('SELECT salt, verification_hash FROM vault_config WHERE id = 1')
    .get();
  if (!row) throw new Error('Vault non inizializzato.');

  const salt = Buffer.from(row.salt, 'hex');
  const key = await CryptoSvc.deriveKey(masterPassword, salt);
  const hash = CryptoSvc.verificationHash(key);

  if (!CryptoSvc.constantTimeEqualHex(hash, row.verification_hash)) {
    CryptoSvc.zeroBuffer(key);
    Database.logEvent('unlock-fail');
    return false;
  }

  setSessionKey(key);
  return true;
}

function lock() {
  clearSession();
}

/**
 * Cambia master password: ricifra tutti i campi.
 * @param {string} oldPwd
 * @param {string} newPwd
 */
async function changeMasterPassword(oldPwd, newPwd) {
  if (typeof newPwd !== 'string' || newPwd.length < 12) {
    throw new Error('La nuova password deve avere almeno 12 caratteri.');
  }
  const ok = await unlock(oldPwd);
  if (!ok) throw new Error('Password attuale errata.');

  const db = Database.get();
  const rows = db
    .prepare(
      `SELECT id, title_enc, username_enc, password_enc, url_enc, notes_enc, totp_secret_enc
       FROM entries`
    )
    .all();
  const histRows = db.prepare(`SELECT id, password_enc FROM password_history`).all();

  // Decifra tutto con chiave corrente
  const plain = rows.map((r) => ({
    id: r.id,
    title: CryptoSvc.decrypt(r.title_enc, sessionKey),
    username: CryptoSvc.decrypt(r.username_enc, sessionKey),
    password: CryptoSvc.decrypt(r.password_enc, sessionKey),
    url: CryptoSvc.decrypt(r.url_enc, sessionKey),
    notes: CryptoSvc.decrypt(r.notes_enc, sessionKey),
    totp: CryptoSvc.decrypt(r.totp_secret_enc, sessionKey)
  }));
  const histPlain = histRows.map((r) => ({
    id: r.id,
    password: CryptoSvc.decrypt(r.password_enc, sessionKey)
  }));

  const newSalt = CryptoSvc.generateSalt();
  const newKey = await CryptoSvc.deriveKey(newPwd, newSalt);
  const newHash = CryptoSvc.verificationHash(newKey);

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE vault_config SET salt = ?, verification_hash = ? WHERE id = 1`
    ).run(newSalt.toString('hex'), newHash);

    const upd = db.prepare(
      `UPDATE entries SET
         title_enc = ?, username_enc = ?, password_enc = ?, url_enc = ?, notes_enc = ?, totp_secret_enc = ?
       WHERE id = ?`
    );
    for (const p of plain) {
      upd.run(
        CryptoSvc.encrypt(p.title, newKey),
        CryptoSvc.encrypt(p.username, newKey),
        CryptoSvc.encrypt(p.password, newKey),
        CryptoSvc.encrypt(p.url, newKey),
        CryptoSvc.encrypt(p.notes, newKey),
        CryptoSvc.encrypt(p.totp, newKey),
        p.id
      );
    }
    const updH = db.prepare(`UPDATE password_history SET password_enc = ? WHERE id = ?`);
    for (const h of histPlain) {
      updH.run(CryptoSvc.encrypt(h.password, newKey), h.id);
    }
  });
  tx();

  setSessionKey(newKey);
  Database.logEvent('master-changed');
}

/**
 * @typedef {Object} EntryInput
 * @property {string} title
 * @property {string} [categoryId]
 * @property {string} [username]
 * @property {string} password
 * @property {string} [url]
 * @property {string} [notes]
 * @property {string} [totpSecret]
 * @property {boolean} [favorite]
 */

/**
 * @param {EntryInput} data
 * @returns {string} id
 */
function createEntry(data) {
  const key = requireKey();
  if (!data || typeof data.title !== 'string' || data.title.trim() === '') {
    throw new Error('Titolo mancante.');
  }
  if (typeof data.password !== 'string' || data.password.length === 0) {
    throw new Error('Password mancante.');
  }
  const id = uuid();
  const now = nowIso();
  Database.get()
    .prepare(
      `INSERT INTO entries
        (id, category_id, title_enc, username_enc, password_enc, url_enc, notes_enc, totp_secret_enc,
         favorite, created_at, updated_at, password_changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.categoryId || null,
      CryptoSvc.encrypt(data.title.trim(), key),
      CryptoSvc.encrypt(data.username || null, key),
      CryptoSvc.encrypt(data.password, key),
      CryptoSvc.encrypt(data.url || null, key),
      CryptoSvc.encrypt(data.notes || null, key),
      CryptoSvc.encrypt(data.totpSecret || null, key),
      data.favorite ? 1 : 0,
      now,
      now,
      now
    );
  return id;
}

/**
 * @param {string} id
 * @param {EntryInput & {favorite?: boolean}} data
 */
function updateEntry(id, data) {
  const key = requireKey();
  const db = Database.get();
  const current = db.prepare(`SELECT password_enc FROM entries WHERE id = ?`).get(id);
  if (!current) throw new Error('Voce non trovata.');

  const now = nowIso();
  const currentPwd = CryptoSvc.decrypt(current.password_enc, key);
  const passwordChanged = typeof data.password === 'string' && data.password !== currentPwd;

  const tx = db.transaction(() => {
    if (passwordChanged) {
      db.prepare(
        `INSERT INTO password_history (id, entry_id, password_enc, changed_at)
         VALUES (?, ?, ?, ?)`
      ).run(uuid(), id, current.password_enc, now);
    }
    db.prepare(
      `UPDATE entries SET
         category_id = ?,
         title_enc = ?,
         username_enc = ?,
         password_enc = ?,
         url_enc = ?,
         notes_enc = ?,
         totp_secret_enc = ?,
         favorite = ?,
         updated_at = ?,
         password_changed_at = CASE WHEN ? THEN ? ELSE password_changed_at END
       WHERE id = ?`
    ).run(
      data.categoryId || null,
      CryptoSvc.encrypt((data.title || '').trim(), key),
      CryptoSvc.encrypt(data.username || null, key),
      CryptoSvc.encrypt(data.password, key),
      CryptoSvc.encrypt(data.url || null, key),
      CryptoSvc.encrypt(data.notes || null, key),
      CryptoSvc.encrypt(data.totpSecret || null, key),
      data.favorite ? 1 : 0,
      now,
      passwordChanged ? 1 : 0,
      now,
      id
    );
  });
  tx();
}

/** @param {string} id */
function deleteEntry(id) {
  requireKey();
  Database.get().prepare(`DELETE FROM entries WHERE id = ?`).run(id);
}

/** @param {string} id @returns {string} nuovo id */
function duplicateEntry(id) {
  const key = requireKey();
  const row = Database.get().prepare(`SELECT * FROM entries WHERE id = ?`).get(id);
  if (!row) throw new Error('Voce non trovata.');
  const data = {
    title: (CryptoSvc.decrypt(row.title_enc, key) || '') + ' (copia)',
    username: CryptoSvc.decrypt(row.username_enc, key),
    password: CryptoSvc.decrypt(row.password_enc, key),
    url: CryptoSvc.decrypt(row.url_enc, key),
    notes: CryptoSvc.decrypt(row.notes_enc, key),
    totpSecret: CryptoSvc.decrypt(row.totp_secret_enc, key),
    categoryId: row.category_id,
    favorite: !!row.favorite
  };
  return createEntry(data);
}

/** @param {string} id @param {boolean} state */
function setFavorite(id, state) {
  requireKey();
  Database.get()
    .prepare(`UPDATE entries SET favorite = ? WHERE id = ?`)
    .run(state ? 1 : 0, id);
}

/** @param {string} id */
function touchEntry(id) {
  requireKey();
  Database.get()
    .prepare(`UPDATE entries SET last_used = ? WHERE id = ?`)
    .run(nowIso(), id);
}

/**
 * @param {string} id
 * @returns {object|null} voce decifrata
 */
function getEntry(id) {
  const key = requireKey();
  const row = Database.get().prepare(`SELECT * FROM entries WHERE id = ?`).get(id);
  if (!row) return null;
  return decryptRow(row, key);
}

/**
 * @param {any} row
 * @param {Buffer} key
 */
function decryptRow(row, key) {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: CryptoSvc.decrypt(row.title_enc, key) || '',
    username: CryptoSvc.decrypt(row.username_enc, key),
    password: CryptoSvc.decrypt(row.password_enc, key) || '',
    url: CryptoSvc.decrypt(row.url_enc, key),
    notes: CryptoSvc.decrypt(row.notes_enc, key),
    totpSecret: CryptoSvc.decrypt(row.totp_secret_enc, key),
    hasTotp: !!row.totp_secret_enc,
    favorite: !!row.favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsed: row.last_used,
    passwordChangedAt: row.password_changed_at
  };
}

/**
 * Elenca le voci applicando un filtro.
 * @param {object} [filter]
 * @param {string} [filter.categoryId]
 * @param {boolean} [filter.favorite]
 * @param {string} [filter.search]
 * @param {string} [filter.special] one of: all|recent|weak|old
 * @param {string} [filter.sort] one of: az|za|recent|used
 * @returns {object[]}
 */
function listEntries(filter = {}) {
  const key = requireKey();
  let sql = `SELECT * FROM entries`;
  const where = [];
  const params = [];
  if (filter.categoryId) {
    where.push(`category_id = ?`);
    params.push(filter.categoryId);
  }
  if (filter.favorite) {
    where.push(`favorite = 1`);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY updated_at DESC';

  const rows = Database.get().prepare(sql).all(...params);
  let items = rows.map((r) => decryptRow(r, key));

  // Filtro speciale
  const PwdGen = require('./generator');
  if (filter.special === 'recent') {
    items = items
      .filter((i) => i.lastUsed)
      .sort((a, b) => (a.lastUsed < b.lastUsed ? 1 : -1))
      .slice(0, 10);
  } else if (filter.special === 'weak') {
    items = items.filter((i) => PwdGen.strengthScore(i.password).score < 50);
  } else if (filter.special === 'old') {
    const ninety = Date.now() - 90 * 24 * 3600 * 1000;
    items = items.filter(
      (i) => !i.passwordChangedAt || new Date(i.passwordChangedAt).getTime() < ninety
    );
  }

  // Ricerca fuzzy su title/username/url
  if (filter.search && filter.search.trim() !== '') {
    const q = filter.search.toLowerCase();
    items = items.filter((i) => {
      const hay =
        (i.title || '') + ' ' + (i.username || '') + ' ' + (i.url || '');
      return hay.toLowerCase().includes(q);
    });
  }

  // Ordinamento
  switch (filter.sort) {
    case 'az':
      items.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'za':
      items.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'used':
      items.sort((a, b) => (a.lastUsed || '') < (b.lastUsed || '') ? 1 : -1);
      break;
    case 'recent':
    default:
      items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  // Allega strength score (senza esporre password nel list se usato per UI lista)
  return items.map((i) => ({
    ...i,
    strength: PwdGen.strengthScore(i.password).score
  }));
}

/**
 * @param {string} entryId
 * @returns {{id:string, password:string, changedAt:string}[]}
 */
function getHistory(entryId) {
  const key = requireKey();
  const rows = Database.get()
    .prepare(
      `SELECT id, password_enc, changed_at FROM password_history
       WHERE entry_id = ? ORDER BY changed_at DESC LIMIT 5`
    )
    .all(entryId);
  return rows.map((r) => ({
    id: r.id,
    password: CryptoSvc.decrypt(r.password_enc, key) || '',
    changedAt: r.changed_at
  }));
}

/** @returns {object[]} */
function listCategories() {
  return Database.get()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM entries e WHERE e.category_id = c.id) AS count
       FROM categories c ORDER BY ordine ASC, nome ASC`
    )
    .all();
}

/**
 * @param {{nome:string, icona?:string, colore?:string}} data
 * @returns {string} id
 */
function createCategory(data) {
  requireKey();
  if (!data || typeof data.nome !== 'string' || !data.nome.trim()) {
    throw new Error('Nome categoria mancante.');
  }
  const id = uuid();
  const ord =
    Database.get().prepare(`SELECT COALESCE(MAX(ordine), 0) + 1 AS n FROM categories`).get().n;
  Database.get()
    .prepare(
      `INSERT INTO categories (id, nome, icona, colore, ordine) VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, data.nome.trim(), data.icona || 'folder', data.colore || '#58a6ff', ord);
  return id;
}

/** @param {string} id @param {object} data */
function updateCategory(id, data) {
  requireKey();
  Database.get()
    .prepare(`UPDATE categories SET nome = ?, icona = ?, colore = ? WHERE id = ?`)
    .run(data.nome, data.icona || 'folder', data.colore || '#58a6ff', id);
}

/** @param {string} id */
function deleteCategory(id) {
  requireKey();
  Database.get().prepare(`DELETE FROM categories WHERE id = ?`).run(id);
}

/** @returns {object} */
function stats() {
  requireKey();
  const items = listEntries();
  const total = items.length;
  const avg =
    total === 0 ? 0 : Math.round(items.reduce((s, i) => s + i.strength, 0) / total);
  const weak = items.filter((i) => i.strength < 50).length;
  const ninety = Date.now() - 90 * 24 * 3600 * 1000;
  const old = items.filter(
    (i) => !i.passwordChangedAt || new Date(i.passwordChangedAt).getTime() < ninety
  ).length;
  const reuse = {};
  for (const i of items) reuse[i.password] = (reuse[i.password] || 0) + 1;
  const duplicates = Object.values(reuse).filter((n) => n > 1).length;
  return { total, averageStrength: avg, weak, old, duplicates };
}

/** @returns {string|null} */
function getLastAccess() {
  try {
    const row = Database.get()
      .prepare(`SELECT at FROM access_log WHERE event = 'unlock' ORDER BY id DESC LIMIT 1 OFFSET 1`)
      .get();
    return row ? row.at : null;
  } catch (_err) {
    return null;
  }
}

/** @returns {object} snapshot decifrato completo (per export) */
function exportPlain() {
  const key = requireKey();
  const db = Database.get();
  const entries = db
    .prepare(`SELECT * FROM entries`)
    .all()
    .map((r) => decryptRow(r, key));
  const categories = db.prepare(`SELECT * FROM categories`).all();
  const history = db
    .prepare(`SELECT entry_id, password_enc, changed_at FROM password_history`)
    .all()
    .map((r) => ({
      entryId: r.entry_id,
      password: CryptoSvc.decrypt(r.password_enc, key),
      changedAt: r.changed_at
    }));
  const settings = db.prepare(`SELECT key, value FROM settings`).all();
  return {
    exportedAt: nowIso(),
    entries,
    categories,
    history,
    settings
  };
}

/**
 * Importa un snapshot (da .vaultx decifrato).
 * @param {object} snapshot
 * @param {'merge'|'replace'} mode
 * @returns {{imported:number, skipped:number}}
 */
function importPlain(snapshot, mode = 'merge') {
  const key = requireKey();
  const db = Database.get();
  let imported = 0;
  let skipped = 0;

  const tx = db.transaction(() => {
    if (mode === 'replace') {
      db.exec('DELETE FROM password_history; DELETE FROM entries; DELETE FROM categories;');
    }

    if (Array.isArray(snapshot.categories)) {
      const ins = db.prepare(
        `INSERT OR IGNORE INTO categories (id, nome, icona, colore, ordine)
         VALUES (?, ?, ?, ?, ?)`
      );
      for (const c of snapshot.categories) {
        ins.run(c.id || uuid(), c.nome, c.icona || null, c.colore || null, c.ordine || 0);
      }
    }

    // Index esistenti per dedup (title+username)
    const existing = db.prepare(`SELECT title_enc, username_enc FROM entries`).all();
    const exSet = new Set();
    for (const r of existing) {
      const t = CryptoSvc.decrypt(r.title_enc, key) || '';
      const u = CryptoSvc.decrypt(r.username_enc, key) || '';
      exSet.add(`${t}::${u}`);
    }

    if (Array.isArray(snapshot.entries)) {
      const ins = db.prepare(
        `INSERT INTO entries
          (id, category_id, title_enc, username_enc, password_enc, url_enc, notes_enc, totp_secret_enc,
           favorite, created_at, updated_at, password_changed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const e of snapshot.entries) {
        const sig = `${e.title || ''}::${e.username || ''}`;
        if (exSet.has(sig) && mode === 'merge') {
          skipped++;
          continue;
        }
        const now = nowIso();
        ins.run(
          uuid(),
          e.categoryId || null,
          CryptoSvc.encrypt(e.title || '', key),
          CryptoSvc.encrypt(e.username || null, key),
          CryptoSvc.encrypt(e.password || '', key),
          CryptoSvc.encrypt(e.url || null, key),
          CryptoSvc.encrypt(e.notes || null, key),
          CryptoSvc.encrypt(e.totpSecret || null, key),
          e.favorite ? 1 : 0,
          e.createdAt || now,
          e.updatedAt || now,
          e.passwordChangedAt || now
        );
        imported++;
      }
    }
  });
  tx();

  return { imported, skipped };
}

module.exports = {
  init,
  isInitialized,
  isUnlocked,
  setupVault,
  unlock,
  lock,
  clearSession,
  changeMasterPassword,
  createEntry,
  updateEntry,
  deleteEntry,
  duplicateEntry,
  setFavorite,
  touchEntry,
  getEntry,
  listEntries,
  getHistory,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  stats,
  getLastAccess,
  exportPlain,
  importPlain,
  DEFAULT_CATEGORIES
};
