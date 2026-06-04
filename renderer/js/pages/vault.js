'use strict';

/** Pagina principale Vault. */
(() => {
  const ICONS = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  };

  let pageState = {
    filter: { special: 'all', categoryId: null, favorite: false, search: '', sort: 'recent' },
    entries: [],
    categories: [],
    selectedId: null,
    totpTimer: null,
    autotypeHandler: null
  };

  async function reloadCategories() {
    pageState.categories = await window.API.vault.categories.list();
  }

  async function reloadEntries() {
    pageState.entries = await window.API.vault.list(pageState.filter);
    renderEntries();
  }

  function renderSidebar(container) {
    const sb = container.querySelector('.vault-sidebar');
    sb.innerHTML = `
      <div class="nav-section-title">Vault</div>
      <div class="nav-item ${pageState.filter.special === 'all' && !pageState.filter.categoryId && !pageState.filter.favorite ? 'active' : ''}" data-f="all">
        ${ICONS.list}<span>Tutte le voci</span>
      </div>
      <div class="nav-item ${pageState.filter.favorite ? 'active' : ''}" data-f="fav">
        ${ICONS.star}<span>Preferiti</span>
      </div>
      <div class="nav-item ${pageState.filter.special === 'recent' ? 'active' : ''}" data-f="recent">
        ${ICONS.clock}<span>Recenti</span>
      </div>
      <div class="nav-item ${pageState.filter.special === 'weak' ? 'active' : ''}" data-f="weak">
        ${ICONS.alert}<span>Password deboli</span>
      </div>
      <div class="nav-item ${pageState.filter.special === 'old' ? 'active' : ''}" data-f="old">
        ${ICONS.key}<span>Password vecchie</span>
      </div>

      <div class="nav-section-title">Categorie</div>
      <div id="catList"></div>
      <div class="nav-item" id="newCat" style="color:var(--text-3)">
        ${ICONS.plus}<span>Nuova categoria</span>
      </div>

      <div class="nav-section-title">Sessione</div>
      <div class="nav-item" id="openGenerator">${ICONS.key}<span>Generatore</span></div>
      <div class="nav-item" id="openSettings">${ICONS.cog}<span>Impostazioni</span></div>
      <div class="nav-item" id="lockNow">${ICONS.lock}<span>Blocca vault</span></div>

      <div class="sidebar-footer">VaultX · locale · crittografato</div>
    `;

    const catList = sb.querySelector('#catList');
    if (!pageState.categories.length) {
      catList.innerHTML = '<div class="nav-empty">Nessuna categoria</div>';
    } else {
      catList.innerHTML = pageState.categories.map((c) => `
        <div class="nav-item cat-item ${pageState.filter.categoryId === c.id ? 'active' : ''}" data-cat="${c.id}">
          <span class="cat-dot" style="background:${safeColor(c.colore)}"></span>
          <span class="cat-name truncate">${escapeHtml(c.nome)}</span>
          <span class="count">${c.count || 0}</span>
          <button class="cat-edit" data-cat-edit="${c.id}" title="Modifica categoria">${ICONS.edit}</button>
        </div>
      `).join('');
    }

    sb.querySelectorAll('[data-f]').forEach((el) => {
      el.onclick = () => {
        const f = el.dataset.f;
        pageState.filter.categoryId = null;
        pageState.filter.favorite = false;
        pageState.filter.special = 'all';
        if (f === 'fav') pageState.filter.favorite = true;
        else pageState.filter.special = f === 'all' ? 'all' : f;
        refresh(container);
      };
    });
    sb.querySelectorAll('[data-cat]').forEach((el) => {
      el.onclick = () => {
        pageState.filter.categoryId = el.dataset.cat;
        pageState.filter.favorite = false;
        pageState.filter.special = 'all';
        refresh(container);
      };
    });
    sb.querySelectorAll('[data-cat-edit]').forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        const cat = pageState.categories.find((c) => c.id === el.dataset.catEdit);
        if (cat) openCategoryModal(cat);
      };
    });
    sb.querySelector('#newCat').onclick = () => openCategoryModal();
    sb.querySelector('#lockNow').onclick = async () => { await window.API.auth.lock(); };
    sb.querySelector('#openSettings').onclick = () => window.Router.route('settings');
    sb.querySelector('#openGenerator').onclick = () => window.Router.route('generator');
  }

  async function refresh(container) {
    await reloadCategories();
    await reloadEntries();
    renderSidebar(container);
  }

  function renderEntries() {
    const pane = document.getElementById('entriesPane');
    if (!pane) return;
    const items = pageState.entries;
    if (items.length === 0) {
      pane.innerHTML = `
        <div class="empty-state">
          ${ICONS.folder}
          <h3>Nessuna voce</h3>
          <p>${pageState.filter.search ? 'Nessun risultato per la ricerca corrente.' : 'Aggiungi la tua prima password cliccando "Nuova voce" in alto.'}</p>
        </div>
      `;
      return;
    }
    pane.innerHTML = items.map((e) => entryCardHtml(e)).join('');
    pane.querySelectorAll('[data-id]').forEach((card) => {
      const id = card.dataset.id;
      card.onclick = () => selectEntry(id);
      card.querySelectorAll('[data-action]').forEach((btn) => {
        btn.onclick = async (ev) => {
          ev.stopPropagation();
          const action = btn.dataset.action;
          await handleEntryAction(action, id);
        };
      });
    });
  }

  function entryCardHtml(e) {
    const initial = (e.title || '?').charAt(0).toUpperCase();
    const color = strengthColor(e.strength);
    const badges = [];
    if (e.favorite) badges.push(`<span class="chip chip-fav">★</span>`);
    if (e.strength < 50) badges.push('<span class="chip chip-weak">debole</span>');
    return `
      <div class="entry-card ${pageState.selectedId === e.id ? 'selected' : ''}" data-id="${e.id}">
        <div class="entry-favicon">${initial}</div>
        <div class="entry-meta">
          <div class="entry-title">${escapeHtml(e.title)} ${badges.join('')}</div>
          <div class="entry-sub">${escapeHtml(e.username || '—')}</div>
        </div>
        <div class="strength-dot" style="color:${color}; background:${color}" title="Forza ${e.strength}/100"></div>
        <div class="entry-actions">
          <button class="btn btn-icon btn-ghost btn-sm" data-action="copy-user" title="Copia username">${ICONS.copy}</button>
          <button class="btn btn-icon btn-ghost btn-sm" data-action="copy-pwd" title="Copia password">${ICONS.key}</button>
          <button class="btn btn-icon btn-ghost btn-sm" data-action="edit" title="Modifica">${ICONS.edit}</button>
        </div>
      </div>
    `;
  }

  function strengthColor(score) {
    if (score >= 85) return '#10b981';
    if (score >= 65) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  async function handleEntryAction(action, id) {
    const entry = await window.API.vault.get(id);
    if (!entry) return;
    if (action === 'copy-user') {
      await window.API.clipboard.copy(entry.username || '');
      window.Toast.info('Username copiato');
    } else if (action === 'copy-pwd') {
      await window.API.clipboard.copy(entry.password || '');
      await window.API.vault.touch(id);
      window.Toast.info('Password copiata (auto-clear 30s)');
    } else if (action === 'edit') {
      window.PageEntry.openEditor({
        entry,
        onSaved: async () => { await reloadEntries(); selectEntry(id); },
        categories: pageState.categories
      });
    }
  }

  async function selectEntry(id) {
    pageState.selectedId = id;
    const detail = document.getElementById('detailPane');
    const content = document.getElementById('vaultContent');
    const entry = await window.API.vault.get(id);
    if (!entry) {
      detail.classList.remove('open');
      content.classList.add('no-detail');
      detail.innerHTML = '';
      return;
    }
    renderDetail(detail, entry);
    content.classList.remove('no-detail');
    renderEntries();
  }

  function closeDetail() {
    pageState.selectedId = null;
    const detail = document.getElementById('detailPane');
    const content = document.getElementById('vaultContent');
    detail.classList.remove('open');
    content.classList.add('no-detail');
    setTimeout(() => { if (!pageState.selectedId) detail.innerHTML = ''; }, 240);
    stopTotpTimer();
    renderEntries();
  }

  function renderDetail(detail, entry) {
    detail.classList.add('open');
    const cat = pageState.categories.find((c) => c.id === entry.categoryId);
    detail.innerHTML = `
      <div class="detail-header">
        <div class="entry-favicon" style="width:44px;height:44px">${(entry.title || '?').charAt(0).toUpperCase()}</div>
        <div style="flex:1; min-width:0;">
          <div class="detail-title truncate">${escapeHtml(entry.title)}</div>
          <div class="detail-sub">${cat ? escapeHtml(cat.nome) : 'Senza categoria'}${entry.favorite ? ' · <span style="color:var(--warning)">★ Preferito</span>' : ''}</div>
        </div>
        <button class="btn btn-icon btn-ghost" id="closeDetail" title="Chiudi">${ICONS.close}</button>
      </div>

      <div class="detail-section">
        <div class="detail-label">Username</div>
        <div class="detail-value">
          <span class="val">${escapeHtml(entry.username || '—')}</span>
          <div class="detail-actions">
            <button class="btn btn-icon btn-ghost" id="copyUser" title="Copia">${ICONS.copy}</button>
          </div>
        </div>

        <div class="detail-label" style="margin-top:var(--sp-4)">Password</div>
        <div class="detail-value">
          <span class="val text-mono" id="pwdVal" data-visible="0">••••••••••••</span>
          <div class="detail-actions">
            <button class="btn btn-icon btn-ghost" id="togglePwdV" title="Mostra">${ICONS.eye}</button>
            <button class="btn btn-icon btn-ghost" id="copyPwd" title="Copia">${ICONS.copy}</button>
          </div>
        </div>
        <div id="strengthBar" style="margin-top:var(--sp-2)"></div>
        ${entry.passwordChangedAt ? `<div class="detail-sub" style="margin-top:var(--sp-2)">Ultimo cambio: ${formatDate(entry.passwordChangedAt)}</div>` : ''}

        ${entry.url ? `
          <div class="detail-label" style="margin-top:var(--sp-4)">URL</div>
          <div class="detail-value">
            <a class="val truncate" id="openUrl" href="#">${escapeHtml(entry.url)}</a>
            <div class="detail-actions">
              <button class="btn btn-icon btn-ghost" id="openExt" title="Apri nel browser">${ICONS.external}</button>
              <button class="btn btn-icon btn-ghost" id="copyUrl" title="Copia">${ICONS.copy}</button>
            </div>
          </div>
        ` : ''}

        ${entry.hasTotp ? `
          <div class="detail-label" style="margin-top:var(--sp-4)">Codice TOTP</div>
          <div class="totp-box">
            <div class="totp-code" id="totpCode">— — — — — —</div>
            <div class="totp-ring" id="totpRing" style="--p:100"><span id="totpSec">30</span></div>
            <button class="btn btn-icon btn-ghost" id="copyTotp" title="Copia">${ICONS.copy}</button>
          </div>
        ` : ''}

        ${entry.notes ? `
          <div class="detail-label" style="margin-top:var(--sp-4)">Note</div>
          <div class="detail-value" style="align-items:flex-start; min-height:auto; padding-top:var(--sp-3); padding-bottom:var(--sp-3)">
            <span class="val" id="notesVal" data-visible="0" style="white-space:pre-wrap">•••• (clicca l'occhio per mostrare)</span>
            <div class="detail-actions"><button class="btn btn-icon btn-ghost" id="toggleNotes" title="Mostra">${ICONS.eye}</button></div>
          </div>
        ` : ''}
      </div>

      <div class="detail-section">
        <div class="detail-label">Storico password</div>
        <div id="historyBox" class="text-muted" style="font-size:var(--fs-xs)">Caricamento…</div>
      </div>

      <div class="detail-section">
        <div class="flex gap-sm wrap">
          <button class="btn grow" id="editBtn">${ICONS.edit} Modifica</button>
          <button class="btn grow" id="favBtn">${entry.favorite ? ICONS.starFill + ' Rimuovi' : ICONS.star + ' Preferito'}</button>
        </div>
        <div class="flex gap-sm wrap mt-sm">
          <button class="btn grow" id="dupBtn">${ICONS.copy} Duplica</button>
          <button class="btn btn-danger grow" id="delBtn">${ICONS.trash} Elimina</button>
        </div>
        <button class="btn btn-block mt-sm" id="autoTypeBtn">${ICONS.zap} Auto-type (Ctrl+Shift+A)</button>
        <div class="detail-sub mt-md">
          Creato: ${formatDate(entry.createdAt)}<br>
          Modificato: ${formatDate(entry.updatedAt)}<br>
          Ultimo utilizzo: ${formatDate(entry.lastUsed)}
        </div>
      </div>
    `;

    window.Strength.render(detail.querySelector('#strengthBar'), scoreToStrength(entry));

    detail.querySelector('#closeDetail').onclick = closeDetail;
    detail.querySelector('#copyUser').onclick = async () => {
      await window.API.clipboard.copy(entry.username || '');
      window.Toast.info('Username copiato');
    };
    detail.querySelector('#copyPwd').onclick = async () => {
      await window.API.clipboard.copy(entry.password || '');
      await window.API.vault.touch(entry.id);
      window.Toast.info('Password copiata (auto-clear 30s)');
    };
    const pwdVal = detail.querySelector('#pwdVal');
    detail.querySelector('#togglePwdV').onclick = () => {
      const v = pwdVal.dataset.visible === '1';
      pwdVal.dataset.visible = v ? '0' : '1';
      pwdVal.textContent = v ? '••••••••••••' : (entry.password || '');
    };
    if (entry.url) {
      const openExt = () => {
        const url = entry.url.startsWith('http') ? entry.url : 'https://' + entry.url;
        window.API.shell.openExternal(url);
      };
      detail.querySelector('#openUrl').onclick = (ev) => { ev.preventDefault(); openExt(); };
      detail.querySelector('#openExt').onclick = openExt;
      detail.querySelector('#copyUrl').onclick = async () => {
        await window.API.clipboard.copy(entry.url || '', 0);
        window.Toast.info('URL copiato');
      };
    }
    if (entry.notes) {
      const notesVal = detail.querySelector('#notesVal');
      detail.querySelector('#toggleNotes').onclick = () => {
        const v = notesVal.dataset.visible === '1';
        notesVal.dataset.visible = v ? '0' : '1';
        notesVal.textContent = v ? '•••• (clicca l\'occhio per mostrare)' : entry.notes;
      };
    }
    if (entry.hasTotp) startTotpTimer(detail, entry.id);

    window.API.vault.history(entry.id).then((hist) => {
      const box = detail.querySelector('#historyBox');
      if (!box) return;
      if (!hist.length) { box.textContent = 'Nessuna password precedente salvata.'; return; }
      box.innerHTML = hist.map((h, i) => `
        <div class="history-item">
          <span class="hist-pwd">${'•'.repeat(Math.min(14, h.password.length))}</span>
          <span class="hist-date">${formatDate(h.changedAt)}</span>
          <button class="btn btn-sm btn-ghost" data-hp="${i}">Copia</button>
        </div>
      `).join('');
      box.querySelectorAll('[data-hp]').forEach((b) => {
        b.onclick = async () => {
          await window.API.clipboard.copy(hist[parseInt(b.dataset.hp, 10)].password);
          window.Toast.info('Password storica copiata');
        };
      });
    });

    detail.querySelector('#editBtn').onclick = () => {
      window.PageEntry.openEditor({
        entry,
        categories: pageState.categories,
        onSaved: async () => { await reloadEntries(); selectEntry(entry.id); }
      });
    };
    detail.querySelector('#dupBtn').onclick = async () => {
      const id = await window.API.vault.duplicate(entry.id);
      window.Toast.success('Voce duplicata');
      await reloadEntries();
      selectEntry(id);
    };
    detail.querySelector('#delBtn').onclick = async () => {
      if (!confirm('Eliminare definitivamente questa voce?')) return;
      await window.API.vault.delete(entry.id);
      closeDetail();
      await reloadEntries();
      window.Toast.success('Voce eliminata');
    };
    detail.querySelector('#favBtn').onclick = async () => {
      await window.API.vault.favorite(entry.id, !entry.favorite);
      await reloadEntries();
      selectEntry(entry.id);
    };
    detail.querySelector('#autoTypeBtn').onclick = () => triggerAutotype(entry.id);
  }

  function scoreToStrength(entry) {
    const s = entry.strength || 0;
    let label = 'Debole';
    if (s >= 85) label = 'Fortissima';
    else if (s >= 65) label = 'Forte';
    else if (s >= 40) label = 'Media';
    return { score: s, label, entropyBits: Math.round(s * 1.3) };
  }

  function startTotpTimer(detail, entryId) {
    stopTotpTimer();
    const tick = async () => {
      try {
        const r = await window.API.vault.totp.compute(entryId);
        if (!r) return;
        const code = detail.querySelector('#totpCode');
        const sec = detail.querySelector('#totpSec');
        const ring = detail.querySelector('#totpRing');
        if (!code || !ring) return;
        code.textContent = r.code.replace(/(\d{3})(\d{3})/, '$1 $2');
        sec.textContent = String(r.remaining);
        ring.style.setProperty('--p', Math.round((r.remaining / r.step) * 100));
        if (r.remaining <= 5) {
          code.classList.add('animate-pulse');
          ring.style.setProperty('--c', 'var(--warning)');
        } else {
          code.classList.remove('animate-pulse');
          ring.style.setProperty('--c', 'var(--accent)');
        }
      } catch (_e) { /* swallow */ }
    };
    tick();
    pageState.totpTimer = setInterval(tick, 1000);
    const copyBtn = detail.querySelector('#copyTotp');
    if (copyBtn) copyBtn.onclick = async () => {
      const r = await window.API.vault.totp.compute(entryId);
      if (r) {
        await window.API.clipboard.copy(r.code, 30);
        window.Toast.info('Codice TOTP copiato');
      }
    };
  }

  function stopTotpTimer() {
    if (pageState.totpTimer) { clearInterval(pageState.totpTimer); pageState.totpTimer = null; }
  }

  async function triggerAutotype(entryId) {
    const avail = await window.API.autotype.available();
    if (!avail) return window.Toast.warning('Auto-type non disponibile (robotjs non installato).');
    window.Toast.info('Apri la finestra di destinazione entro 1 secondo…');
    setTimeout(async () => {
      try {
        await window.API.autotype.type(entryId);
        window.Toast.success('Auto-type eseguito');
      } catch (e) {
        window.Toast.error('Auto-type fallito: ' + e.message);
      }
    }, 1000);
  }

  const SWATCHES = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#22c55e', '#06b6d4', '#3b82f6', '#64748b'];

  function openCategoryModal(existing) {
    const initColor = safeColor(existing?.colore);
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <span>${existing ? 'Modifica categoria' : 'Nuova categoria'}</span>
          <button class="btn btn-icon btn-ghost" id="x">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Nome</label>
            <div class="cat-name-preview">
              <span class="cat-dot lg" id="cPreviewDot" style="background:${initColor}"></span>
              <input class="input" id="cName" value="${escapeHtml(existing?.nome || '')}" placeholder="Es: Lavoro, Social, Banche" />
            </div>
          </div>
          <div class="field">
            <label>Colore</label>
            <div class="color-picker-row">
              <input type="color" id="cColor" value="${initColor}" />
              <div class="color-swatches" id="swatches">
                ${SWATCHES.map((s) => `<button type="button" class="swatch ${s.toLowerCase() === initColor.toLowerCase() ? 'sel' : ''}" data-sw="${s}" style="background:${s}" title="${s}"></button>`).join('')}
              </div>
            </div>
          </div>
          ${existing ? `<div class="cat-del-note">Eliminando la categoria, le <strong>${existing.count || 0} voci</strong> al suo interno NON verranno eliminate: resteranno senza categoria.</div>` : ''}
        </div>
        <div class="modal-footer">
          ${existing ? `<button class="btn btn-danger" id="cDel" style="margin-right:auto">${ICONS.trash} Elimina</button>` : ''}
          <button class="btn" id="cCancel">Annulla</button>
          <button class="btn btn-primary" id="cSave">${existing ? 'Salva modifiche' : 'Crea categoria'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    const close = () => root.remove();
    const colorInp = root.querySelector('#cColor');
    const dot = root.querySelector('#cPreviewDot');
    const nameInp = root.querySelector('#cName');

    const syncColor = (val) => {
      colorInp.value = val;
      dot.style.background = val;
      root.querySelectorAll('.swatch').forEach((b) =>
        b.classList.toggle('sel', b.dataset.sw.toLowerCase() === val.toLowerCase()));
    };
    colorInp.oninput = () => syncColor(colorInp.value);
    root.querySelectorAll('.swatch').forEach((b) => {
      b.onclick = () => syncColor(b.dataset.sw);
    });

    root.querySelector('#x').onclick = close;
    root.querySelector('#cCancel').onclick = close;

    const reloadAfter = async () => {
      const container = document.querySelector('.vault-layout').parentElement;
      await refresh(container);
    };

    if (existing) root.querySelector('#cDel').onclick = async () => {
      if (!confirm(`Eliminare la categoria "${existing.nome}"?\n\nLe voci al suo interno NON verranno eliminate.`)) return;
      await window.API.vault.categories.delete(existing.id);
      // Se stavamo filtrando per questa categoria, torna a "tutte"
      if (pageState.filter.categoryId === existing.id) {
        pageState.filter.categoryId = null;
        pageState.filter.special = 'all';
      }
      close();
      await reloadAfter();
      window.Toast.success('Categoria eliminata');
    };
    root.querySelector('#cSave').onclick = async () => {
      const name = nameInp.value.trim();
      const color = safeColor(colorInp.value);
      if (!name) return window.Toast.error('Nome richiesto');
      if (existing) await window.API.vault.categories.update(existing.id, { nome: name, colore: color, icona: existing.icona || 'folder' });
      else await window.API.vault.categories.create({ nome: name, colore: color });
      close();
      await reloadAfter();
      window.Toast.success(existing ? 'Categoria aggiornata' : 'Categoria creata');
    };

    nameInp.focus();
  }

  function safeColor(c) {
    const v = String(c || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#6366f1';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('it-IT'); } catch (_e) { return iso; }
  }

  async function mount(container, { navigate }) {
    container.innerHTML = `
      <div class="vault-layout">
        <aside class="vault-sidebar"></aside>
        <header class="vault-header">
          <div id="searchHost" style="flex:1; max-width:520px;"></div>
          <select class="select" id="sortSel" style="width:auto; max-width:160px">
            <option value="recent">Più recenti</option>
            <option value="used">Più usati</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
          <button class="btn btn-primary" id="newEntryBtn">${ICONS.plus}<span>Nuova voce</span></button>
        </header>
        <div class="vault-content no-detail" id="vaultContent">
          <div id="entriesPane" class="entries-pane"></div>
          <aside id="detailPane" class="detail-pane"></aside>
        </div>
      </div>
    `;

    const searchBox = window.SearchBox.create({
      placeholder: 'Cerca per titolo, username, URL…',
      onChange: (v) => { pageState.filter.search = v; reloadEntries(); }
    });
    container.querySelector('#searchHost').appendChild(searchBox.el);

    container.querySelector('#sortSel').onchange = (e) => {
      pageState.filter.sort = e.target.value;
      reloadEntries();
    };

    container.querySelector('#newEntryBtn').onclick = () => {
      window.PageEntry.openEditor({
        categories: pageState.categories,
        onSaved: async () => { await reloadEntries(); }
      });
    };

    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchBox.input.focus();
        searchBox.input.select();
      }
      if (e.key === 'Escape') {
        if (pageState.selectedId) closeDetail();
      }
    };
    window.addEventListener('keydown', onKey);

    pageState.autotypeHandler = () => {
      if (pageState.selectedId) triggerAutotype(pageState.selectedId);
      else window.Toast.warning('Seleziona una voce prima di usare auto-type');
    };
    window.addEventListener('vaultx:autotype', pageState.autotypeHandler);

    await refresh(container);

    return {
      destroy() {
        stopTotpTimer();
        window.removeEventListener('keydown', onKey);
        if (pageState.autotypeHandler) window.removeEventListener('vaultx:autotype', pageState.autotypeHandler);
      }
    };
  }

  window.PageVault = { mount };
})();
