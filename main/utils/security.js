'use strict';

/**
 * Utility di sicurezza UI: screenshot protection.
 */

const { BrowserWindow } = require('electron');

/**
 * Abilita/disabilita la content protection (blocca screen capture).
 * @param {BrowserWindow} win
 * @param {boolean} enabled
 */
function setContentProtection(win, enabled) {
  try {
    win.setContentProtection(!!enabled);
  } catch (_err) {
    /* swallow */
  }
}

module.exports = { setContentProtection };
