'use strict';

/**
 * IPC: generatore password + strength.
 */

const Generator = require('../services/generator');

function registerGeneratorIpc(ipcMain) {
  ipcMain.handle('generator:generate', (_e, opts) => Generator.generate(opts || {}));
  ipcMain.handle('generator:passphrase', (_e, opts) => Generator.passphrase(opts || {}));
  ipcMain.handle('generator:strength', (_e, pwd) => Generator.strengthScore(pwd || ''));
}

module.exports = { registerGeneratorIpc };
