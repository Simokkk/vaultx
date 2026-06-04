'use strict';

/**
 * Wrapper unificato sulle API esposte da preload.js.
 * Centralizza error handling → toast.
 */
(() => {
  const { vaultx } = window;
  if (!vaultx) {
    document.body.innerHTML = '<div class="centered-screen"><div class="auth-card"><h1>Errore</h1><p>API non disponibili. Ricarica VaultX.</p></div></div>';
    return;
  }

  function wrap(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        const msg = (err && err.message) || 'Errore imprevisto';
        window.Toast && window.Toast.error(msg);
        throw err;
      }
    };
  }

  window.API = {
    sys: vaultx.system,
    window: vaultx.window,
    shell: vaultx.shell,
    on: vaultx.on,

    auth: {
      isInitialized: wrap(vaultx.auth.isInitialized),
      setup: wrap(vaultx.auth.setup),
      unlock: wrap(vaultx.auth.unlock),
      lock: wrap(vaultx.auth.lock),
      isUnlocked: wrap(vaultx.auth.isUnlocked),
      changeMaster: wrap(vaultx.auth.changeMaster),
      getFailedAttempts: wrap(vaultx.auth.getFailedAttempts),
      resetSessionTimer: wrap(vaultx.auth.resetSessionTimer),
      getLastAccess: wrap(vaultx.auth.getLastAccess)
    },

    vault: {
      list: wrap(vaultx.vault.list),
      get: wrap(vaultx.vault.get),
      create: wrap(vaultx.vault.create),
      update: wrap(vaultx.vault.update),
      delete: wrap(vaultx.vault.delete),
      duplicate: wrap(vaultx.vault.duplicate),
      favorite: wrap(vaultx.vault.favorite),
      history: wrap(vaultx.vault.history),
      touch: wrap(vaultx.vault.touch),
      stats: wrap(vaultx.vault.stats),
      categories: {
        list: wrap(vaultx.vault.categories.list),
        create: wrap(vaultx.vault.categories.create),
        update: wrap(vaultx.vault.categories.update),
        delete: wrap(vaultx.vault.categories.delete)
      },
      totp: { compute: wrap(vaultx.vault.totp.compute) },
      export: wrap(vaultx.vault.export),
      import: wrap(vaultx.vault.import),
      importCsv: wrap(vaultx.vault.importCsv)
    },

    generator: {
      generate: wrap(vaultx.generator.generate),
      passphrase: wrap(vaultx.generator.passphrase),
      strength: wrap(vaultx.generator.strength)
    },

    clipboard: {
      copy: wrap(vaultx.clipboard.copy),
      clear: wrap(vaultx.clipboard.clear)
    },

    autotype: {
      type: wrap(vaultx.autotype.type),
      available: wrap(vaultx.autotype.available)
    },

    settings: {
      get: wrap(vaultx.settings.get),
      set: wrap(vaultx.settings.set),
      all: wrap(vaultx.settings.all)
    },

    update: {
      check: wrap(vaultx.update.check),
      download: wrap(vaultx.update.download),
      install: wrap(vaultx.update.install),
      version: wrap(vaultx.update.version)
    }
  };
})();
