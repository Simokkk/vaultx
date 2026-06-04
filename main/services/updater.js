'use strict';

/**
 * Servizio auto-update VaultX (electron-updater + GitHub Releases).
 *
 * Flusso UX:
 *   1. Renderer chiama update:check
 *   2. Se disponibile → evento 'update:available' con versione/note
 *   3. Renderer chiama update:download → eventi 'update:progress'
 *   4. Quando pronto → evento 'update:downloaded'
 *   5. Renderer chiama update:install → quitAndInstall (riavvio)
 *
 * I dati utente (%APPDATA%\VaultX\vaultx.db) NON vengono mai toccati:
 * electron-updater sostituisce solo i file dell'applicazione.
 */

const { app } = require('electron');

/** @type {import('electron-updater').AppUpdater | null} */
let autoUpdater = null;
let getWindow = () => null;
let wired = false;
let busy = false;

/** Carica electron-updater in modo lazy (può mancare in dev). */
function loadUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    // eslint-disable-next-line global-require
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (_err) {
    autoUpdater = null;
  }
  return autoUpdater;
}

/** Invia un evento al renderer se la finestra è viva. */
function emit(channel, payload) {
  try {
    const w = getWindow();
    if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
  } catch (_err) {
    /* swallow */
  }
}

/**
 * Inizializza il servizio updater.
 * @param {{ getMainWindow: () => Electron.BrowserWindow | null }} ctx
 */
function init({ getMainWindow }) {
  getWindow = getMainWindow || (() => null);
  const up = loadUpdater();
  if (!up) return;

  // Controllo manuale: niente download/installazione automatica silenziosa.
  up.autoDownload = false;
  up.autoInstallOnAppQuit = false;
  up.allowDowngrade = false;

  if (wired) return;
  wired = true;

  up.on('checking-for-update', () => emit('update:checking'));
  up.on('update-available', (info) => {
    emit('update:available', {
      version: info?.version || null,
      releaseNotes: normalizeNotes(info?.releaseNotes),
      releaseName: info?.releaseName || null,
      releaseDate: info?.releaseDate || null
    });
  });
  up.on('update-not-available', (info) => {
    emit('update:none', { version: info?.version || app.getVersion() });
  });
  up.on('download-progress', (p) => {
    emit('update:progress', {
      percent: Math.round(p?.percent || 0),
      transferred: p?.transferred || 0,
      total: p?.total || 0,
      bytesPerSecond: p?.bytesPerSecond || 0
    });
  });
  up.on('update-downloaded', (info) => {
    busy = false;
    emit('update:downloaded', { version: info?.version || null });
  });
  up.on('error', (err) => {
    busy = false;
    emit('update:error', { message: (err && err.message) || String(err) });
  });
}

/** Normalizza le release notes (GitHub può restituire stringa o array). */
function normalizeNotes(notes) {
  if (!notes) return '';
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes)) {
    return notes.map((n) => (typeof n === 'string' ? n : n?.note || '')).join('\n');
  }
  return '';
}

/**
 * Controlla la presenza di aggiornamenti.
 * @returns {Promise<{ ok: boolean, available?: boolean, version?: string, reason?: string }>}
 */
async function check() {
  const up = loadUpdater();
  if (!up) return { ok: false, reason: 'updater-non-disponibile' };
  if (!app.isPackaged) {
    // In dev electron-updater non può aggiornare l'eseguibile.
    emit('update:none', { version: app.getVersion(), dev: true });
    return { ok: true, available: false, reason: 'dev-mode' };
  }
  try {
    const res = await up.checkForUpdates();
    const remote = res?.updateInfo?.version || null;
    const available = !!remote && remote !== app.getVersion();
    return { ok: true, available, version: remote || undefined };
  } catch (err) {
    emit('update:error', { message: (err && err.message) || String(err) });
    return { ok: false, reason: (err && err.message) || 'check-failed' };
  }
}

/** Avvia il download dell'aggiornamento disponibile. */
async function download() {
  const up = loadUpdater();
  if (!up) return { ok: false, reason: 'updater-non-disponibile' };
  if (!app.isPackaged) return { ok: false, reason: 'dev-mode' };
  if (busy) return { ok: false, reason: 'gia-in-corso' };
  busy = true;
  try {
    await up.downloadUpdate();
    return { ok: true };
  } catch (err) {
    busy = false;
    emit('update:error', { message: (err && err.message) || String(err) });
    return { ok: false, reason: (err && err.message) || 'download-failed' };
  }
}

/** Installa l'aggiornamento scaricato e riavvia. */
function install() {
  const up = loadUpdater();
  if (!up) return { ok: false, reason: 'updater-non-disponibile' };
  // isSilent=false (mostra wizard NSIS), isForceRunAfter=true (riapre l'app).
  setImmediate(() => up.quitAndInstall(false, true));
  return { ok: true };
}

/** @returns {string} versione corrente dell'app */
function currentVersion() {
  return app.getVersion();
}

module.exports = { init, check, download, install, currentVersion };
