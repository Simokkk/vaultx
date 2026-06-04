'use strict';

/**
 * IPC: clipboard + auto-type.
 */

const Autotype = require('../services/autotype');
const VaultService = require('../services/vault');
const ClipboardUtils = require('../utils/clipboard');
const LockService = require('../services/lock');

function registerAutotypeIpc(ipcMain) {
  ipcMain.handle('autotype:available', () => Autotype.isAvailable());

  ipcMain.handle('autotype:type', async (_e, entryId) => {
    LockService.reset();
    const entry = VaultService.getEntry(entryId);
    if (!entry) throw new Error('Voce non trovata.');
    VaultService.touchEntry(entryId);
    await Autotype.runAutoType(entry.username || '', entry.password || '');
    return { ok: true };
  });

  ipcMain.handle('clipboard:copy', (_e, value, timeoutSec) => {
    ClipboardUtils.copy(String(value), typeof timeoutSec === 'number' ? timeoutSec : undefined);
    return { ok: true };
  });

  ipcMain.handle('clipboard:clear', () => {
    ClipboardUtils.clearNow();
    return { ok: true };
  });
}

module.exports = { registerAutotypeIpc };
