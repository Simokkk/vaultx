'use strict';

/**
 * Auto-lock service.
 *  - Timer configurabile (minuti, 0 = mai)
 *  - Lock manuale, lock su eventi OS
 *  - Gestione tentativi falliti (blocco 30 min dopo 5 fail)
 */

const VaultService = require('./vault');
const Database = require('./database');

const FAIL_LIMIT = 5;
const FAIL_BLOCK_MS = 30 * 60 * 1000;

/** @type {NodeJS.Timeout|null} */
let timer = null;
let timeoutMs = 5 * 60 * 1000;
/** @type {((reason:string)=>void)|null} */
let onLockCb = null;

let failedAttempts = 0;
/** @type {number|null} */
let blockUntil = null;

/** Carica timeout dalle settings (minuti). */
function loadTimeout() {
  const v = parseInt(Database.getSetting('autoLockMinutes') || '5', 10);
  timeoutMs = Number.isFinite(v) && v >= 0 ? v * 60 * 1000 : 5 * 60 * 1000;
}

function init({ onLock }) {
  onLockCb = onLock || null;
  loadTimeout();
}

function reset() {
  loadTimeout();
  if (timer) clearTimeout(timer);
  timer = null;
  if (timeoutMs > 0 && VaultService.isUnlocked()) {
    timer = setTimeout(() => lock('auto-timeout'), timeoutMs);
  }
}

/** Chiamata dal main su blur finestra: rispetta setting `lockOnBlur`. */
function onWindowBlur() {
  const v = Database.getSetting('lockOnBlur');
  if (v === '1' && VaultService.isUnlocked()) {
    lock('window-blur');
  }
}

function lock(reason = 'manual') {
  if (!VaultService.isUnlocked()) return;
  try {
    VaultService.lock();
  } catch (_err) {
    /* swallow */
  }
  if (timer) clearTimeout(timer);
  timer = null;
  if (onLockCb) {
    try {
      onLockCb(reason);
    } catch (_err) {
      /* swallow */
    }
  }
}

function isBlocked() {
  return blockUntil && Date.now() < blockUntil;
}

function remainingBlockMs() {
  if (!isBlocked()) return 0;
  return blockUntil - Date.now();
}

function recordFail() {
  failedAttempts++;
  if (failedAttempts >= FAIL_LIMIT) {
    blockUntil = Date.now() + FAIL_BLOCK_MS;
    failedAttempts = 0;
  }
}

function resetFailures() {
  failedAttempts = 0;
  blockUntil = null;
}

module.exports = {
  init,
  reset,
  lock,
  onWindowBlur,
  isBlocked,
  remainingBlockMs,
  recordFail,
  resetFailures,
  getFailedAttempts: () => failedAttempts,
  getBlockUntil: () => blockUntil
};
