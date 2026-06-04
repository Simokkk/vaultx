'use strict';

/**
 * Utility clipboard con auto-clear.
 * Cancella il contenuto dopo N secondi (default 30).
 */

const { clipboard } = require('electron');
const Database = require('../services/database');

/** @type {NodeJS.Timeout|null} */
let timer = null;
/** @type {string|null} */
let lastValue = null;
/** @type {((info:{reason:string})=>void)|null} */
let onClearCb = null;

function init(onClear) {
  onClearCb = typeof onClear === 'function' ? onClear : null;
}

function getTimeoutSec() {
  const v = parseInt(Database.getSetting('clipboardClearSec') || '30', 10);
  return Number.isFinite(v) && v >= 0 ? v : 30;
}

/**
 * Copia un valore con timer di pulizia.
 * @param {string} value
 * @param {number} [timeoutSecOverride]
 */
function copy(value, timeoutSecOverride) {
  if (typeof value !== 'string') throw new Error('Valore clipboard non valido.');
  clipboard.writeText(value);
  lastValue = value;
  if (timer) clearTimeout(timer);
  const t =
    typeof timeoutSecOverride === 'number' ? timeoutSecOverride : getTimeoutSec();
  if (t > 0) {
    timer = setTimeout(() => clearIfOurs('timeout'), t * 1000);
  }
}

function clearIfOurs(reason) {
  try {
    if (lastValue !== null && clipboard.readText() === lastValue) {
      clipboard.clear();
    }
  } catch (_err) {
    /* swallow */
  }
  lastValue = null;
  timer = null;
  if (onClearCb) {
    try {
      onClearCb({ reason });
    } catch (_err) {
      /* swallow */
    }
  }
}

function clearNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  try {
    clipboard.clear();
  } catch (_err) {
    /* swallow */
  }
  lastValue = null;
}

module.exports = { init, copy, clearIfOurs, clearNow, getTimeoutSec };
