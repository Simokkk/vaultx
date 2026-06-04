'use strict';

/**
 * Auto-type via robotjs (se disponibile).
 * Fallback sicuro: se robotjs non è installato, errore esplicito.
 */

/** @type {any} */
let robot = null;
let available = false;

try {
  // eslint-disable-next-line global-require
  robot = require('robotjs');
  available = true;
} catch (_err) {
  available = false;
}

/** @returns {boolean} */
function isAvailable() {
  return available;
}

/**
 * @param {string} text
 */
function typeString(text) {
  if (!available || !robot) throw new Error('Auto-type non disponibile (robotjs non installato).');
  robot.setKeyboardDelay(10);
  robot.typeString(String(text));
}

function tapKey(name) {
  if (!available || !robot) throw new Error('Auto-type non disponibile.');
  robot.keyTap(name);
}

/**
 * Esegue sequenza username → Tab → password → Enter.
 * @param {string} username
 * @param {string} password
 */
async function runAutoType(username, password) {
  if (!available || !robot) throw new Error('Auto-type non disponibile.');
  // Piccolo delay per dare tempo all'utente di focalizzare la finestra
  await new Promise((r) => setTimeout(r, 400));
  if (username) {
    robot.typeString(username);
    robot.keyTap('tab');
  }
  robot.typeString(password);
  robot.keyTap('enter');
}

module.exports = {
  isAvailable,
  typeString,
  tapKey,
  runAutoType
};
