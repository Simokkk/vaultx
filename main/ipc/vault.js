'use strict';

/**
 * IPC: CRUD vault + categorie + TOTP + import/export.
 */

const { dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const VaultService = require('../services/vault');
const LockService = require('../services/lock');
const TOTP = require('../services/totp');
const CryptoSvc = require('../services/crypto');
const Importer = require('../services/importer');
const SSH = require('../services/ssh');

/** Esegue un handler dentro un reset del timer di auto-lock. */
function guard(fn) {
  return async (...args) => {
    LockService.reset();
    return fn(...args);
  };
}

function registerVaultIpc(ipcMain) {
  ipcMain.handle('vault:list', guard((_e, filter) => VaultService.listEntries(filter || {})));
  ipcMain.handle('vault:get', guard((_e, id) => VaultService.getEntry(id)));
  ipcMain.handle('vault:create', guard((_e, data) => VaultService.createEntry(data)));
  ipcMain.handle('vault:update', guard((_e, id, data) => {
    VaultService.updateEntry(id, data);
    return { ok: true };
  }));
  ipcMain.handle('vault:delete', guard((_e, id) => {
    VaultService.deleteEntry(id);
    return { ok: true };
  }));
  ipcMain.handle('vault:duplicate', guard((_e, id) => VaultService.duplicateEntry(id)));
  ipcMain.handle('vault:favorite', guard((_e, id, state) => {
    VaultService.setFavorite(id, !!state);
    return { ok: true };
  }));
  ipcMain.handle('vault:history', guard((_e, entryId) => VaultService.getHistory(entryId)));
  ipcMain.handle('vault:touch', guard((_e, id) => {
    VaultService.touchEntry(id);
    return { ok: true };
  }));
  ipcMain.handle('vault:stats', guard(() => VaultService.stats()));
  ipcMain.handle('vault:health', guard(() => VaultService.healthReport()));

  // Cestino (soft-delete)
  ipcMain.handle('vault:trash:list', guard(() => VaultService.listTrash()));
  ipcMain.handle('vault:trash:count', guard(() => VaultService.trashCount()));
  ipcMain.handle('vault:trash:restore', guard((_e, id) => {
    VaultService.restoreEntry(id);
    return { ok: true };
  }));
  ipcMain.handle('vault:trash:delete', guard((_e, id) => {
    VaultService.permanentDeleteEntry(id);
    return { ok: true };
  }));
  ipcMain.handle('vault:trash:empty', guard(() => {
    const n = VaultService.emptyTrash();
    return { ok: true, deleted: n };
  }));

  ipcMain.handle('vault:categories:list', guard(() => VaultService.listCategories()));
  ipcMain.handle('vault:categories:create', guard((_e, data) => VaultService.createCategory(data)));
  ipcMain.handle('vault:categories:update', guard((_e, id, data) => {
    VaultService.updateCategory(id, data);
    return { ok: true };
  }));
  ipcMain.handle('vault:categories:delete', guard((_e, id) => {
    VaultService.deleteCategory(id);
    return { ok: true };
  }));

  ipcMain.handle('vault:totp:compute', guard((_e, entryId) => {
    const entry = VaultService.getEntry(entryId);
    if (!entry || !entry.totpSecret) return null;
    return TOTP.compute(entry.totpSecret);
  }));

  // Connessioni SSH (autenticazione a chiave)
  ipcMain.handle('ssh:available', () => SSH.isAvailable());
  ipcMain.handle('ssh:connect', guard((_e, entryId) => {
    const entry = VaultService.getEntry(entryId);
    if (!entry || entry.type !== 'ssh') throw new Error('Voce SSH non trovata.');
    const extra = entry.extra || {};
    const res = SSH.connect({
      host: extra.host,
      port: extra.port,
      username: entry.username,
      privateKey: extra.privateKey,
      passphrase: extra.passphrase,
      label: entry.title
    });
    VaultService.touchEntry(entryId);
    return res;
  }));

  // EXPORT .vaultx
  ipcMain.handle('vault:export', guard(async (_e, password) => {
    if (typeof password !== 'string' || password.length === 0) {
      throw new Error('Password di export richiesta.');
    }
    const snap = VaultService.exportPlain();
    const blob = await CryptoSvc.encryptJsonWithPassword(snap, password);
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const res = await dialog.showSaveDialog({
      title: 'Esporta vault',
      defaultPath: `VaultX_backup_${stamp}.vaultx`,
      filters: [{ name: 'VaultX backup', extensions: ['vaultx'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(res.filePath, JSON.stringify(blob), 'utf8');
    return { ok: true, path: res.filePath };
  }));

  // IMPORT .vaultx
  ipcMain.handle('vault:import', guard(async (_e, { password, mode }) => {
    const res = await dialog.showOpenDialog({
      title: 'Importa backup VaultX',
      properties: ['openFile'],
      filters: [{ name: 'VaultX backup', extensions: ['vaultx', 'json'] }]
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
    const txt = fs.readFileSync(res.filePaths[0], 'utf8');
    const blob = JSON.parse(txt);
    const snap = await CryptoSvc.decryptJsonWithPassword(blob, password);
    const report = VaultService.importPlain(snap, mode === 'replace' ? 'replace' : 'merge');
    return { ok: true, ...report };
  }));

  // IMPORT CSV / KeePass XML
  ipcMain.handle('vault:importCsv', guard(async (_e, { kind, mode }) => {
    const filters = {
      bitwarden: [{ name: 'Bitwarden CSV', extensions: ['csv'] }],
      lastpass: [{ name: 'LastPass CSV', extensions: ['csv'] }],
      onepassword: [{ name: '1Password CSV', extensions: ['csv'] }],
      keepass: [{ name: 'KeePass XML', extensions: ['xml'] }]
    };
    const res = await dialog.showOpenDialog({
      title: 'Seleziona file da importare',
      properties: ['openFile'],
      filters: filters[kind] || [{ name: 'Tutti', extensions: ['*'] }]
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
    const text = fs.readFileSync(res.filePaths[0], 'utf8');
    let data;
    if (kind === 'keepass') data = Importer.fromKeePassXml(text);
    else data = Importer.fromCsv(text, kind);
    const report = VaultService.importPlain(data, mode === 'replace' ? 'replace' : 'merge');
    return { ok: true, ...report, source: path.basename(res.filePaths[0]) };
  }));
}

module.exports = { registerVaultIpc };
