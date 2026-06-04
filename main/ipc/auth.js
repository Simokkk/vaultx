'use strict';

/**
 * IPC: autenticazione / sessione.
 */

const VaultService = require('../services/vault');
const LockService = require('../services/lock');
const Database = require('../services/database');

function registerAuthIpc(ipcMain, { getMainWindow }) {
  ipcMain.handle('auth:isInitialized', () => VaultService.isInitialized());

  ipcMain.handle('auth:setup', async (_e, masterPassword) => {
    await VaultService.setupVault(masterPassword);
    LockService.resetFailures();
    LockService.reset();
    const w = getMainWindow && getMainWindow();
    if (w) w.webContents.send('session:unlocked');
    return { ok: true };
  });

  ipcMain.handle('auth:unlock', async (_e, masterPassword) => {
    if (LockService.isBlocked()) {
      return { ok: false, blocked: true, remainingMs: LockService.remainingBlockMs() };
    }
    const ok = await VaultService.unlock(masterPassword);
    if (!ok) {
      LockService.recordFail();
      return {
        ok: false,
        attempts: LockService.getFailedAttempts(),
        blocked: LockService.isBlocked(),
        remainingMs: LockService.remainingBlockMs()
      };
    }
    LockService.resetFailures();
    LockService.reset();
    const w = getMainWindow && getMainWindow();
    if (w) w.webContents.send('session:unlocked');
    return { ok: true };
  });

  ipcMain.handle('auth:lock', () => {
    LockService.lock('manual');
    return { ok: true };
  });

  ipcMain.handle('auth:isUnlocked', () => VaultService.isUnlocked());

  ipcMain.handle('auth:changeMaster', async (_e, oldPwd, newPwd) => {
    await VaultService.changeMasterPassword(oldPwd, newPwd);
    LockService.reset();
    return { ok: true };
  });

  ipcMain.handle('auth:getFailedAttempts', () => ({
    attempts: LockService.getFailedAttempts(),
    blocked: LockService.isBlocked(),
    remainingMs: LockService.remainingBlockMs()
  }));

  ipcMain.handle('auth:resetSessionTimer', () => {
    LockService.reset();
    return { ok: true };
  });

  ipcMain.handle('auth:getLastAccess', () => VaultService.getLastAccess());
}

module.exports = { registerAuthIpc };
