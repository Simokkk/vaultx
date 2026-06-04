'use strict';

/**
 * VaultX — Preload script.
 * Espone al renderer (tramite contextBridge) un'API sicura e whitelisted.
 * Nessun accesso diretto a Node o Electron internals dal renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Helper che invoca un handler IPC e normalizza errori.
 * @param {string} channel
 * @param  {...any} args
 */
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

/**
 * Registra un listener sicuro su un canale whitelisted.
 * @param {string} channel
 * @param {(...args:any[])=>void} cb
 * @returns {()=>void} unsubscribe
 */
const on = (channel, cb) => {
  const allowed = new Set([
    'session:locked',
    'session:unlocked',
    'ui:navigate',
    'ui:trigger-autotype',
    'clipboard:cleared',
    'toast:show',
    'update:checking',
    'update:available',
    'update:none',
    'update:progress',
    'update:downloaded',
    'update:error'
  ]);
  if (!allowed.has(channel)) {
    throw new Error(`Canale non consentito: ${channel}`);
  }
  const listener = (_e, ...args) => {
    try {
      cb(...args);
    } catch (_err) {
      /* swallow */
    }
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('vaultx', {
  /** Info sistema */
  system: {
    platform: process.platform,
    version: process.versions.electron
  },

  /** Controlli finestra */
  window: {
    minimize: () => invoke('window:minimize'),
    toggleMaximize: () => invoke('window:toggleMaximize'),
    close: () => invoke('window:close'),
    quit: () => invoke('window:quit')
  },

  /** Apertura URL esterni */
  shell: {
    openExternal: (url) => invoke('shell:openExternal', url)
  },

  /** Autenticazione e sessione */
  auth: {
    isInitialized: () => invoke('auth:isInitialized'),
    setup: (masterPassword) => invoke('auth:setup', masterPassword),
    unlock: (masterPassword) => invoke('auth:unlock', masterPassword),
    lock: () => invoke('auth:lock'),
    isUnlocked: () => invoke('auth:isUnlocked'),
    changeMaster: (oldPwd, newPwd) => invoke('auth:changeMaster', oldPwd, newPwd),
    getFailedAttempts: () => invoke('auth:getFailedAttempts'),
    resetSessionTimer: () => invoke('auth:resetSessionTimer'),
    getLastAccess: () => invoke('auth:getLastAccess')
  },

  /** Vault CRUD */
  vault: {
    list: (filter) => invoke('vault:list', filter),
    get: (id) => invoke('vault:get', id),
    create: (data) => invoke('vault:create', data),
    update: (id, data) => invoke('vault:update', id, data),
    delete: (id) => invoke('vault:delete', id),
    duplicate: (id) => invoke('vault:duplicate', id),
    favorite: (id, state) => invoke('vault:favorite', id, state),
    history: (entryId) => invoke('vault:history', entryId),
    touch: (id) => invoke('vault:touch', id),
    stats: () => invoke('vault:stats'),
    health: () => invoke('vault:health'),
    trash: {
      list: () => invoke('vault:trash:list'),
      count: () => invoke('vault:trash:count'),
      restore: (id) => invoke('vault:trash:restore', id),
      delete: (id) => invoke('vault:trash:delete', id),
      empty: () => invoke('vault:trash:empty')
    },
    categories: {
      list: () => invoke('vault:categories:list'),
      create: (data) => invoke('vault:categories:create', data),
      update: (id, data) => invoke('vault:categories:update', id, data),
      delete: (id) => invoke('vault:categories:delete', id)
    },
    totp: {
      compute: (entryId) => invoke('vault:totp:compute', entryId)
    },
    export: (password) => invoke('vault:export', password),
    import: (payload) => invoke('vault:import', payload),
    importCsv: (payload) => invoke('vault:importCsv', payload)
  },

  /** Generatore password */
  generator: {
    generate: (opts) => invoke('generator:generate', opts),
    passphrase: (opts) => invoke('generator:passphrase', opts),
    strength: (pwd) => invoke('generator:strength', pwd)
  },

  /** Clipboard gestita */
  clipboard: {
    copy: (value, timeoutSec) => invoke('clipboard:copy', value, timeoutSec),
    clear: () => invoke('clipboard:clear')
  },

  /** Auto-type */
  autotype: {
    type: (id) => invoke('autotype:type', id),
    available: () => invoke('autotype:available')
  },

  /** Connessioni SSH */
  ssh: {
    available: () => invoke('ssh:available'),
    connect: (id) => invoke('ssh:connect', id)
  },

  /** Impostazioni */
  settings: {
    get: (key) => invoke('settings:get', key),
    set: (key, value) => invoke('settings:set', key, value),
    all: () => invoke('settings:all')
  },

  /** Aggiornamenti applicazione */
  update: {
    check: () => invoke('update:check'),
    download: () => invoke('update:download'),
    install: () => invoke('update:install'),
    version: () => invoke('update:version')
  },

  /** Eventi (whitelisted) */
  on
});
