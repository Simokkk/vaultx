'use strict';

/**
 * IPC: aggiornamenti applicazione (auto-update via GitHub Releases).
 */

const Updater = require('../services/updater');

function registerUpdateIpc(ipcMain) {
  ipcMain.handle('update:check', () => Updater.check());
  ipcMain.handle('update:download', () => Updater.download());
  ipcMain.handle('update:install', () => Updater.install());
  ipcMain.handle('update:version', () => Updater.currentVersion());
}

module.exports = { registerUpdateIpc };
