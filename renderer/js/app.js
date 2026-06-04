'use strict';

/**
 * Router SPA minimale. Gestisce transizioni tra: setup, unlock, vault, generator, settings.
 */
(() => {
  const App = {
    state: { route: 'boot', params: {} },
    rootEl: null,
    /** @type {null|{destroy?:()=>void}} */
    currentPage: null
  };

  function destroyCurrent() {
    if (App.currentPage && typeof App.currentPage.destroy === 'function') {
      try { App.currentPage.destroy(); } catch (_e) { /* swallow */ }
    }
    App.currentPage = null;
  }

  async function route(name, params = {}) {
    destroyCurrent();
    App.state.route = name;
    App.state.params = params;
    App.rootEl.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'animate-fade-in';
    container.style.flex = '1';
    container.style.display = 'flex';
    container.style.height = '100%';
    container.style.width = '100%';
    App.rootEl.appendChild(container);

    let page;
    switch (name) {
      case 'setup':     page = window.PageSetup;     break;
      case 'unlock':    page = window.PageUnlock;    break;
      case 'vault':     page = window.PageVault;     break;
      case 'generator': page = window.PageGenerator; break;
      case 'settings':  page = window.PageSettings;  break;
      default:          page = window.PageUnlock;
    }

    App.currentPage = await page.mount(container, { navigate: route, params });
  }

  async function boot() {
    App.rootEl = document.getElementById('app');

    // Titlebar bindings
    document.getElementById('tbMin').onclick = () => window.API.window.minimize();
    document.getElementById('tbMax').onclick = () => window.API.window.toggleMaximize();
    document.getElementById('tbClose').onclick = () => window.API.window.close();

    // Eventi dal main
    window.API.on('session:locked', ({ reason } = {}) => {
      window.Toast.warning('Vault bloccato' + (reason ? ` (${reason})` : ''));
      route('unlock');
    });
    window.API.on('session:unlocked', () => {
      // Vault mostra toast propria al mount
    });
    window.API.on('ui:navigate', (where) => {
      if (where === 'generator') route('generator');
    });
    window.API.on('ui:trigger-autotype', async () => {
      // Gestito dalla pagina vault se aperta
      window.dispatchEvent(new CustomEvent('vaultx:autotype'));
    });
    window.API.on('clipboard:cleared', () => {
      window.Toast.info('Appunti puliti');
    });
    window.API.on('update:available', ({ version } = {}) => {
      window.Toast.info(`Aggiornamento disponibile (v${version || '?'}). Apri Impostazioni → Aggiornamenti per installarlo.`);
    });
    window.API.on('update:downloaded', ({ version } = {}) => {
      window.Toast.success(`Versione ${version || ''} pronta. Riavvia da Impostazioni per installarla.`);
    });

    // Routing iniziale
    try {
      const initialized = await window.API.auth.isInitialized();
      if (!initialized) return route('setup');
      const unlocked = await window.API.auth.isUnlocked();
      return route(unlocked ? 'vault' : 'unlock');
    } catch (e) {
      window.Toast.error('Impossibile avviare VaultX: ' + e.message);
    }
  }

  window.Router = { route };
  document.addEventListener('DOMContentLoaded', boot);
})();
