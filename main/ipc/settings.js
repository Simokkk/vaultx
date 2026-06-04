'use strict';

/**
 * IPC: impostazioni applicazione.
 */

const Database = require('../services/database');
const LockService = require('../services/lock');
const SecurityUtils = require('../utils/security');

const DEFAULTS = {
  autoLockMinutes: '5',
  lockOnBlur: '0',
  clipboardClearSec: '30',
  screenshotProtection: '0',
  theme: 'dark',
  language: 'it',
  fontSize: 'medium',
  autoStart: '0',
  minimizeToTray: '1'
};

function registerSettingsIpc(ipcMain, { getMainWindow, setAutoStart, onProtectionChanged }) {
  ipcMain.handle('settings:get', (_e, key) => {
    const v = Database.getSetting(key);
    return v === null ? DEFAULTS[key] ?? null : v;
  });

  ipcMain.handle('settings:set', (_e, key, value) => {
    Database.setSetting(String(key), String(value));
    applySideEffects(key, value, { getMainWindow, setAutoStart, onProtectionChanged });
    return { ok: true };
  });

  ipcMain.handle('settings:all', () => {
    const all = Database.allSettings();
    return { ...DEFAULTS, ...all };
  });
}

/**
 * Applica side-effect in tempo reale quando cambiano settings critiche.
 * @param {string} key
 * @param {string} value
 * @param {{getMainWindow: ()=>any, setAutoStart: (b:boolean)=>void}} ctx
 */
function applySideEffects(key, value, { getMainWindow, setAutoStart, onProtectionChanged }) {
  switch (key) {
    case 'autoLockMinutes':
      LockService.reset();
      break;
    case 'screenshotProtection': {
      const w = getMainWindow && getMainWindow();
      if (w) SecurityUtils.setContentProtection(w, String(value) === '1');
      if (typeof onProtectionChanged === 'function') onProtectionChanged();
      break;
    }
    case 'autoStart':
      if (typeof setAutoStart === 'function') setAutoStart(String(value) === '1');
      break;
    default:
      break;
  }
}

module.exports = { registerSettingsIpc, DEFAULTS };
