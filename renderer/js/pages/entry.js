'use strict';

/** Editor voce (modal) — supporta tipi: login, nota sicura, SSH. */
(() => {
  const ICONS = {
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openEditor({ entry = null, categories = [], onSaved, defaultType = 'login' }) {
    const isEdit = !!entry;
    let type = isEdit ? (entry.type || 'login') : (defaultType || 'login');
    const ex = (entry && entry.extra) || {};
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <span>${isEdit ? 'Modifica voce' : 'Nuova voce'}</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          ${isEdit ? '' : `
          <div class="mode-switcher mb-md" id="typeSwitch">
            <button class="active" data-type="login">Login</button>
            <button data-type="note">Nota sicura</button>
            <button data-type="ssh">SSH</button>
          </div>`}

          <div class="field">
            <label>Titolo *</label>
            <input class="input" id="f_title" value="${escapeHtml(entry?.title || '')}" placeholder="Es: Gmail, Server di produzione…" />
          </div>
          <div class="field">
            <label>Categoria</label>
            <select class="select" id="f_cat">
              <option value="">Nessuna categoria</option>
              ${categories.map((c) => `<option value="${c.id}" ${entry?.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
            </select>
          </div>

          <div id="loginFields">
            <div class="field">
              <label>Username / Email</label>
              <input class="input" id="f_user" value="${escapeHtml(entry?.username || '')}" placeholder="utente@esempio.com" />
            </div>
            <div class="field">
              <label>Password *</label>
              <div class="input-group">
                <input class="input input-mono" id="f_pwd" type="password" value="${escapeHtml(entry?.password || '')}" />
                <div class="input-addon">
                  <button class="btn btn-icon btn-ghost" id="togglePwd" title="Mostra">${ICONS.eye}</button>
                  <button class="btn btn-icon btn-ghost" id="genPwd" title="Genera">${ICONS.dice}</button>
                </div>
              </div>
              <div id="strengthBar" style="margin-top:6px;"></div>
            </div>
            <div class="field">
              <label>URL</label>
              <input class="input" id="f_url" value="${escapeHtml(entry?.url || '')}" placeholder="https://esempio.com" />
            </div>
            <div class="field">
              <label>TOTP secret (base32)</label>
              <input class="input input-mono" id="f_totp" value="${escapeHtml(entry?.totpSecret || '')}" placeholder="JBSWY3DPEHPK3PXP" />
              <span class="hint">Lascia vuoto se non usi la 2FA. Accetta spazi — verranno rimossi.</span>
            </div>
          </div>

          <div id="sshFields">
            <div class="flex gap-sm">
              <div class="field grow">
                <label>Host *</label>
                <input class="input input-mono" id="f_host" value="${escapeHtml(ex.host || '')}" placeholder="192.168.1.10 o server.esempio.com" />
              </div>
              <div class="field" style="width:110px">
                <label>Porta</label>
                <input class="input input-mono" id="f_port" value="${escapeHtml(ex.port || 22)}" placeholder="22" />
              </div>
            </div>
            <div class="field">
              <label>Username SSH *</label>
              <input class="input input-mono" id="f_sshuser" value="${escapeHtml(entry?.username || '')}" placeholder="root, ubuntu, admin…" />
            </div>
            <div class="field">
              <label>Chiave privata *</label>
              <textarea class="textarea input-mono" id="f_key" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;…&#10;-----END OPENSSH PRIVATE KEY-----" style="min-height:130px">${escapeHtml(ex.privateKey || '')}</textarea>
              <span class="hint">La chiave viene cifrata nel vault. Usata solo al momento della connessione.</span>
            </div>
            <div class="field">
              <label>Passphrase chiave (opzionale)</label>
              <input class="input input-mono" id="f_pass" type="password" value="${escapeHtml(ex.passphrase || '')}" placeholder="Se la chiave è protetta da passphrase" />
            </div>
          </div>

          <div class="field">
            <label id="notesLabel">Note</label>
            <textarea class="textarea" id="f_notes" placeholder="Note private, cifrate nel vault">${escapeHtml(entry?.notes || '')}</textarea>
          </div>
          <label class="checkbox">
            <input type="checkbox" id="f_fav" ${entry?.favorite ? 'checked' : ''} />
            <span>Segna come preferito</span>
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn" id="cancel">Annulla</button>
          <button class="btn btn-primary" id="save">${isEdit ? 'Salva modifiche' : 'Crea voce'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    const close = () => root.remove();
    root.querySelector('#x').onclick = close;
    root.querySelector('#cancel').onclick = close;

    const pwd = root.querySelector('#f_pwd');
    window.Strength.attach(pwd, root.querySelector('#strengthBar'));

    root.querySelector('#togglePwd').onclick = () => pwd.type = pwd.type === 'password' ? 'text' : 'password';
    root.querySelector('#genPwd').onclick = async () => {
      const gen = await window.API.generator.generate({
        length: 20, upper: true, lower: true, digits: true, symbols: true, excludeAmbiguous: true
      });
      pwd.value = gen;
      pwd.dispatchEvent(new Event('input'));
      window.Toast.info('Password generata');
    };

    // Visibilità campi in base al tipo
    const applyType = () => {
      const isNote = type === 'note';
      const isSsh = type === 'ssh';
      root.querySelector('#loginFields').style.display = (!isNote && !isSsh) ? '' : 'none';
      root.querySelector('#sshFields').style.display = isSsh ? '' : 'none';
      root.querySelector('#notesLabel').textContent = isNote ? 'Contenuto *' : 'Note';
      const ta = root.querySelector('#f_notes');
      ta.style.minHeight = isNote ? '170px' : '';
      ta.placeholder = isNote ? 'Testo riservato, cifrato nel vault' : 'Note private, cifrate nel vault';
    };
    applyType();

    const switcher = root.querySelector('#typeSwitch');
    if (switcher) {
      switcher.querySelectorAll('[data-type]').forEach((b) => {
        b.onclick = () => {
          type = b.dataset.type;
          switcher.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('active', x === b));
          applyType();
        };
      });
    }

    root.querySelector('#save').onclick = async () => {
      const title = root.querySelector('#f_title').value.trim();
      if (!title) return window.Toast.error('Titolo richiesto');
      const categoryId = root.querySelector('#f_cat').value || null;
      const favorite = root.querySelector('#f_fav').checked;
      let data;

      if (type === 'note') {
        const content = root.querySelector('#f_notes').value;
        if (!content.trim()) return window.Toast.error('Contenuto richiesto');
        data = { type: 'note', title, categoryId, notes: content, favorite };
      } else if (type === 'ssh') {
        const host = root.querySelector('#f_host').value.trim();
        const sshUser = root.querySelector('#f_sshuser').value.trim();
        const key = root.querySelector('#f_key').value.trim();
        const port = parseInt(root.querySelector('#f_port').value, 10) || 22;
        const passphrase = root.querySelector('#f_pass').value;
        if (!host) return window.Toast.error('Host richiesto');
        if (!sshUser) return window.Toast.error('Username SSH richiesto');
        if (!key) return window.Toast.error('Chiave privata richiesta');
        data = {
          type: 'ssh',
          title,
          categoryId,
          username: sshUser,
          notes: root.querySelector('#f_notes').value,
          favorite,
          extra: { host, port, privateKey: key, passphrase }
        };
      } else {
        data = {
          type: 'login',
          title,
          categoryId,
          username: root.querySelector('#f_user').value.trim(),
          password: pwd.value,
          url: root.querySelector('#f_url').value.trim(),
          totpSecret: root.querySelector('#f_totp').value.trim().replace(/\s+/g, ''),
          notes: root.querySelector('#f_notes').value,
          favorite
        };
        if (!data.password) return window.Toast.error('Password richiesta');
      }

      try {
        if (isEdit) await window.API.vault.update(entry.id, data);
        else await window.API.vault.create(data);
        window.Toast.success(isEdit ? 'Voce aggiornata' : 'Voce creata');
        close();
        if (onSaved) await onSaved();
      } catch (_e) { /* toast mostrato da API wrap */ }
    };

    root.querySelector('#f_title').focus();
  }

  async function mount(container) {
    container.innerHTML = '<div class="centered-screen"><div class="auth-card">Apri l\'editor voce dal vault.</div></div>';
    return { destroy() {} };
  }

  window.PageEntry = { mount, openEditor };
})();
