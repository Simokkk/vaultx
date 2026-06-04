'use strict';

/** Editor voce (modal). */
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

  function openEditor({ entry = null, categories = [], onSaved }) {
    const isEdit = !!entry;
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <span>${isEdit ? 'Modifica voce' : 'Nuova voce'}</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Titolo *</label>
            <input class="input" id="f_title" value="${escapeHtml(entry?.title || '')}" placeholder="Es: Gmail, Twitter, Banca XYZ" />
          </div>
          <div class="field">
            <label>Categoria</label>
            <select class="select" id="f_cat">
              <option value="">Nessuna categoria</option>
              ${categories.map((c) => `<option value="${c.id}" ${entry?.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('')}
            </select>
          </div>
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
          <div class="field">
            <label>Note</label>
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

    root.querySelector('#save').onclick = async () => {
      const data = {
        title: root.querySelector('#f_title').value.trim(),
        categoryId: root.querySelector('#f_cat').value || null,
        username: root.querySelector('#f_user').value.trim(),
        password: pwd.value,
        url: root.querySelector('#f_url').value.trim(),
        totpSecret: root.querySelector('#f_totp').value.trim().replace(/\s+/g, ''),
        notes: root.querySelector('#f_notes').value,
        favorite: root.querySelector('#f_fav').checked
      };
      if (!data.title) return window.Toast.error('Titolo richiesto');
      if (!data.password) return window.Toast.error('Password richiesta');
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
