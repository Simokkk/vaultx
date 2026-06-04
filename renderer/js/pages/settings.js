'use strict';

/** Pagina impostazioni. */
(() => {
  const ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };

  async function mount(container, { navigate }) {
    const s = await window.API.settings.all();
    const stats = await window.API.vault.stats().catch(() => null);
    const autoTypeAvail = await window.API.autotype.available();
    const appVersion = await window.API.update.version().catch(() => '1.0.0');

    container.innerHTML = `
      <div class="page-scroll">
        <div class="page-container page-enter">
          <div class="page-header">
            <button class="back-btn" id="back">${ICONS.back} Indietro</button>
            <h1>Impostazioni</h1>
          </div>

          <div class="section-card">
            <div class="section-title">Sicurezza</div>
            ${row('Auto-lock', 'Tempo di inattività prima del blocco del vault',
              `<select class="select" id="autoLockMinutes" style="width:150px">
                <option value="1">1 minuto</option>
                <option value="5">5 minuti</option>
                <option value="15">15 minuti</option>
                <option value="30">30 minuti</option>
                <option value="0">Mai</option>
              </select>`)}
            ${row('Blocco alla perdita del focus', 'Blocca il vault quando la finestra perde il focus',
              toggleHtml('lockOnBlur', s.lockOnBlur === '1'))}
            ${row('Pulizia appunti', 'Auto-clear della clipboard dopo un tempo configurabile',
              `<select class="select" id="clipboardClearSec" style="width:150px">
                <option value="15">15 secondi</option>
                <option value="30">30 secondi</option>
                <option value="60">60 secondi</option>
                <option value="0">Mai</option>
              </select>`)}
            ${row('Screenshot protection', 'Non supportata su questa configurazione Windows (causa invisibilità della finestra)',
              `<span class="badge badge-warning">non disponibile</span>`)}
            ${row('Master password', 'Cambia la master password del vault (ricifra tutti i dati)',
              `<button class="btn" id="changeMaster">Cambia…</button>`)}
          </div>

          <div class="section-card">
            <div class="section-title">Aspetto</div>
            ${row('Tema', 'Scegli tra aspetto scuro e chiaro',
              `<select class="select" id="theme" style="width:150px">
                <option value="dark">Scuro</option>
                <option value="light">Chiaro</option>
              </select>`)}
          </div>

          <div class="section-card">
            <div class="section-title">Sistema</div>
            ${row('Avvia con Windows', 'Avvia VaultX automaticamente al login',
              toggleHtml('autoStart', s.autoStart === '1'))}
            ${row('Minimizza nel system tray', 'Chiudere la finestra la nasconde nella tray',
              toggleHtml('minimizeToTray', s.minimizeToTray === '1'))}
          </div>

          <div class="section-card">
            <div class="section-title">Vault — Import / Export</div>
            ${row('Export backup .vaultx', 'Crea backup cifrato di tutto il vault',
              `<button class="btn" id="exportBtn">Esporta…</button>`)}
            ${row('Import backup .vaultx', 'Ripristina da backup cifrato',
              `<button class="btn" id="importBtn">Importa…</button>`)}
            ${row('Import da altri password manager', 'Bitwarden, LastPass, 1Password (CSV) · KeePass (XML)',
              `<div class="flex gap-sm wrap" style="justify-content:flex-end">
                <button class="btn btn-sm" data-imp="bitwarden">Bitwarden</button>
                <button class="btn btn-sm" data-imp="lastpass">LastPass</button>
                <button class="btn btn-sm" data-imp="onepassword">1Password</button>
                <button class="btn btn-sm" data-imp="keepass">KeePass</button>
              </div>`)}
          </div>

          <div class="section-card">
            <div class="section-title">Statistiche</div>
            ${row('Voci totali', '', `<span class="stat-pill">${stats?.total ?? 0}</span>`)}
            ${row('Forza media', 'Score medio calcolato su tutte le voci', `<span class="stat-pill">${stats?.averageStrength ?? 0}/100</span>`)}
            ${row('Password deboli', 'Score inferiore a 50/100', `<span class="stat-pill">${stats?.weak ?? 0}</span>`)}
            ${row('Password vecchie', 'Non aggiornate da più di 90 giorni', `<span class="stat-pill">${stats?.old ?? 0}</span>`)}
            ${row('Duplicati', 'Password identiche in più voci', `<span class="stat-pill">${stats?.duplicates ?? 0}</span>`)}
          </div>

          <div class="section-card">
            <div class="section-title">Aggiornamenti</div>
            ${row('Versione installata', 'VaultX in esecuzione su questo dispositivo', `<span class="stat-pill" id="curVer">${escapeHtml(appVersion)}</span>`)}
            ${row('Controlla aggiornamenti', 'Scarica e installa automaticamente le nuove versioni da GitHub',
              `<button class="btn btn-primary" id="checkUpdate">Cerca aggiornamenti</button>`)}
            <div id="updateStatus" class="update-status hidden"></div>
          </div>

          <div class="section-card">
            <div class="section-title">Informazioni</div>
            ${row('Versione', 'VaultX ' + appVersion, `<span class="text-muted">Electron ${escapeHtml(window.API.sys.version)}</span>`)}
            ${row('Auto-type', autoTypeAvail ? 'robotjs caricato — Ctrl+Shift+A per auto-type' : 'robotjs non disponibile — auto-type disabilitato', autoTypeAvail ? `<span class="badge badge-success">attivo</span>` : `<span class="badge badge-warning">non disponibile</span>`)}
            ${row('Dati', 'Posizione del database locale', `<span class="text-muted text-mono text-xs">%APPDATA%\\VaultX\\vaultx.db</span>`)}
          </div>
        </div>
      </div>
    `;

    container.querySelector('#autoLockMinutes').value = s.autoLockMinutes || '5';
    container.querySelector('#clipboardClearSec').value = s.clipboardClearSec || '30';
    container.querySelector('#theme').value = s.theme || 'dark';

    // Tema: salva e applica subito
    container.querySelector('#theme').onchange = async (e) => {
      await window.API.settings.set('theme', e.target.value);
      if (window.applyTheme) window.applyTheme(e.target.value);
      window.Toast.success('Tema aggiornato');
    };

    container.querySelector('#back').onclick = () => window.Router.route('vault');

    const bindSelect = (id) => {
      container.querySelector('#' + id).onchange = async (e) => {
        await window.API.settings.set(id, e.target.value);
        window.Toast.success('Salvato');
      };
    };
    bindSelect('autoLockMinutes');
    bindSelect('clipboardClearSec');

    container.querySelectorAll('[data-toggle]').forEach((inp) => {
      inp.onchange = async () => {
        await window.API.settings.set(inp.dataset.toggle, inp.checked ? '1' : '0');
        window.Toast.success('Salvato');
      };
    });

    container.querySelector('#changeMaster').onclick = openChangeMaster;
    container.querySelector('#exportBtn').onclick = openExport;
    container.querySelector('#importBtn').onclick = openImport;
    container.querySelectorAll('[data-imp]').forEach((b) => {
      b.onclick = () => openImportCsv(b.dataset.imp);
    });

    // --- Flusso aggiornamenti ---
    const statusEl = container.querySelector('#updateStatus');
    const checkBtn = container.querySelector('#checkUpdate');
    const unsubs = [];

    const showStatus = (html) => {
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = html;
    };

    unsubs.push(window.API.on('update:checking', () => {
      showStatus('<span class="spinner-sm"></span> Ricerca aggiornamenti in corso…');
    }));

    unsubs.push(window.API.on('update:none', ({ dev } = {}) => {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Cerca aggiornamenti';
      if (dev) {
        showStatus('<span class="text-muted">Modalità sviluppo: aggiornamenti disponibili solo nell\'app installata.</span>');
      } else {
        showStatus('<span class="badge badge-success">✓</span> VaultX è già aggiornato all\'ultima versione.');
      }
    }));

    unsubs.push(window.API.on('update:available', ({ version, releaseNotes }) => {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Cerca aggiornamenti';
      showStatus(`
        <div class="update-avail">
          <div class="update-head">
            <span class="badge badge-accent">Nuova versione ${escapeHtml(version || '')}</span>
          </div>
          ${releaseNotes ? `<div class="update-notes">${escapeHtml(releaseNotes).slice(0, 600)}</div>` : ''}
          <button class="btn btn-primary mt-sm" id="dlUpdate">Scarica aggiornamento</button>
        </div>
      `);
      const dl = statusEl.querySelector('#dlUpdate');
      if (dl) dl.onclick = async () => {
        dl.disabled = true;
        showStatus('<span class="spinner-sm"></span> Download in corso… <span id="pct">0%</span><div class="progress-track mt-sm"><div class="progress-bar" id="pbar" style="width:0%"></div></div>');
        await window.API.update.download();
      };
    }));

    unsubs.push(window.API.on('update:progress', ({ percent }) => {
      const pct = statusEl.querySelector('#pct');
      const bar = statusEl.querySelector('#pbar');
      if (pct) pct.textContent = percent + '%';
      if (bar) bar.style.width = percent + '%';
    }));

    unsubs.push(window.API.on('update:downloaded', ({ version }) => {
      showStatus(`
        <div class="update-avail">
          <span class="badge badge-success">Pronto</span>
          <span>Versione ${escapeHtml(version || '')} scaricata. Riavvia per installarla.</span>
          <button class="btn btn-primary mt-sm" id="installUpdate">Riavvia e installa</button>
        </div>
      `);
      const btn = statusEl.querySelector('#installUpdate');
      if (btn) btn.onclick = () => window.API.update.install();
    }));

    unsubs.push(window.API.on('update:error', ({ message }) => {
      checkBtn.disabled = false;
      checkBtn.textContent = 'Cerca aggiornamenti';
      showStatus(`<span class="badge badge-warning">Errore</span> <span class="text-secondary">${escapeHtml(message || 'Impossibile verificare gli aggiornamenti.')}</span>`);
    }));

    checkBtn.onclick = async () => {
      checkBtn.disabled = true;
      checkBtn.textContent = 'Controllo…';
      await window.API.update.check();
    };

    return {
      destroy() {
        unsubs.forEach((u) => { try { u(); } catch (_e) { /* */ } });
      }
    };
  }

  function row(title, desc, right) {
    return `<div class="setting-row">
      <div class="meta">
        <span class="t">${escapeHtml(title)}</span>
        ${desc ? `<span class="d">${escapeHtml(desc)}</span>` : ''}
      </div>
      <div>${right}</div>
    </div>`;
  }

  function toggleHtml(id, checked) {
    return `<label class="switch"><input type="checkbox" data-toggle="${id}" ${checked ? 'checked' : ''} /><span class="slider"></span></label>`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function openChangeMaster() {
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span>Cambia master password</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <p class="text-secondary mb-md">Tutti i dati verranno ricifrati con la nuova password. L'operazione può richiedere alcuni secondi.</p>
          <div class="field"><label>Password attuale</label><input class="input input-mono" id="old" type="password" autocomplete="current-password" /></div>
          <div class="field"><label>Nuova password</label><input class="input input-mono" id="new" type="password" autocomplete="new-password" /><div id="ns" style="margin-top:6px"></div></div>
          <div class="field"><label>Conferma nuova password</label><input class="input input-mono" id="new2" type="password" autocomplete="new-password" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="cancel">Annulla</button>
          <button class="btn btn-primary" id="go">Aggiorna</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    const close = () => root.remove();
    root.querySelector('#x').onclick = close;
    root.querySelector('#cancel').onclick = close;
    window.Strength.attach(root.querySelector('#new'), root.querySelector('#ns'));
    root.querySelector('#go').onclick = async () => {
      const o = root.querySelector('#old').value;
      const n = root.querySelector('#new').value;
      const n2 = root.querySelector('#new2').value;
      const btn = root.querySelector('#go');
      if (!o || !n) return window.Toast.error('Compila tutti i campi');
      if (n !== n2) return window.Toast.error('Le nuove password non coincidono');
      if (n.length < 12) return window.Toast.error('Almeno 12 caratteri');
      btn.disabled = true;
      btn.textContent = 'Ricifratura in corso…';
      try {
        await window.API.auth.changeMaster(o, n);
        window.Toast.success('Master password aggiornata');
        close();
      } catch (_e) {
        btn.disabled = false;
        btn.textContent = 'Aggiorna';
      }
    };
  }

  function openExport() {
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span>Esporta backup</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <p class="text-secondary mb-md">Il backup sarà un file <span class="text-mono">.vaultx</span> cifrato con la password che sceglierai. Conservalo in un luogo sicuro.</p>
          <div class="field"><label>Password di export</label><input class="input input-mono" id="pwd" type="password" placeholder="Almeno 8 caratteri" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="cancel">Annulla</button>
          <button class="btn btn-primary" id="go">Esporta</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('#x').onclick = () => root.remove();
    root.querySelector('#cancel').onclick = () => root.remove();
    root.querySelector('#go').onclick = async () => {
      const p = root.querySelector('#pwd').value;
      if (p.length < 8) return window.Toast.error('Minimo 8 caratteri');
      const res = await window.API.vault.export(p);
      if (res.ok) {
        window.Toast.success('Backup salvato: ' + res.path);
        root.remove();
      }
    };
  }

  function openImport() {
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span>Importa backup</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Password del backup</label><input class="input input-mono" id="pwd" type="password" /></div>
          <label class="checkbox"><input type="checkbox" id="replace" /><span>Sostituisci tutti i dati esistenti</span></label>
        </div>
        <div class="modal-footer">
          <button class="btn" id="cancel">Annulla</button>
          <button class="btn btn-primary" id="go">Importa</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('#x').onclick = () => root.remove();
    root.querySelector('#cancel').onclick = () => root.remove();
    root.querySelector('#go').onclick = async () => {
      const p = root.querySelector('#pwd').value;
      const rep = root.querySelector('#replace').checked;
      const res = await window.API.vault.import({ password: p, mode: rep ? 'replace' : 'merge' });
      if (res.ok) {
        window.Toast.success(`Importate ${res.imported} voci, ${res.skipped} saltate`);
        root.remove();
      }
    };
  }

  function openImportCsv(kind) {
    const labels = { bitwarden: 'Bitwarden CSV', lastpass: 'LastPass CSV', onepassword: '1Password CSV', keepass: 'KeePass XML' };
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <span>Importa da ${labels[kind]}</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <p class="text-secondary mb-md">Seleziona il file esportato dal tuo gestore corrente. VaultX leggerà il contenuto e importerà le voci.</p>
          <label class="checkbox"><input type="checkbox" id="replace" /><span>Sostituisci tutti i dati esistenti</span></label>
        </div>
        <div class="modal-footer">
          <button class="btn" id="cancel">Annulla</button>
          <button class="btn btn-primary" id="go">Scegli file…</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('#x').onclick = () => root.remove();
    root.querySelector('#cancel').onclick = () => root.remove();
    root.querySelector('#go').onclick = async () => {
      const rep = root.querySelector('#replace').checked;
      const res = await window.API.vault.importCsv({ kind, mode: rep ? 'replace' : 'merge' });
      if (res.ok) {
        window.Toast.success(`Importate ${res.imported} voci da ${res.source || kind}`);
        root.remove();
      }
    };
  }

  window.PageSettings = { mount };
})();
