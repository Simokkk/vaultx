'use strict';

/** Dashboard salute password. */
(() => {
  const ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function color(score) {
    if (score >= 85) return '#10b981';
    if (score >= 65) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }
  function scoreLabel(score) {
    if (score >= 85) return 'Ottima';
    if (score >= 65) return 'Buona';
    if (score >= 40) return 'Da migliorare';
    return 'Critica';
  }

  function daysAgo(iso) {
    if (!iso) return null;
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000));
    return d;
  }

  function go(id) {
    window.Router.route('vault', { selectId: id });
  }

  function itemRow(e, rightHtml) {
    const initial = (e.title || '?').charAt(0).toUpperCase();
    return `
      <div class="health-item" data-go="${e.id}">
        <div class="entry-favicon sm">${initial}</div>
        <div class="health-item-meta">
          <div class="health-item-title truncate">${escapeHtml(e.title)}</div>
          <div class="health-item-sub truncate">${escapeHtml(e.username || '—')}</div>
        </div>
        ${rightHtml || ''}
        <span class="health-chevron">${ICONS.chevron}</span>
      </div>
    `;
  }

  async function mount(container) {
    const r = await window.API.vault.health();
    const c = color(r.averageStrength);

    const weakSection = r.weak.length ? `
      <div class="section-card">
        <div class="section-title">${ICONS.alert} Password deboli <span class="count-inline">${r.weak.length}</span></div>
        <div class="health-list">
          ${r.weak.map((e) => itemRow(e, `<span class="strength-tag" style="color:${color(e.strength)};border-color:${color(e.strength)}">${e.strength}/100</span>`)).join('')}
        </div>
      </div>` : '';

    const reusedSection = r.reused.length ? `
      <div class="section-card">
        <div class="section-title">${ICONS.repeat} Password riutilizzate <span class="count-inline">${r.reused.length} grupp${r.reused.length === 1 ? 'o' : 'i'}</span></div>
        <div class="health-groups">
          ${r.reused.map((g, gi) => `
            <div class="health-group">
              <div class="health-group-head">Stessa password usata in ${g.count} voci</div>
              <div class="health-list">
                ${g.entries.map((e) => itemRow(e)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : '';

    const oldSection = r.old.length ? `
      <div class="section-card">
        <div class="section-title">${ICONS.clock} Password vecchie <span class="count-inline">${r.old.length}</span></div>
        <div class="health-list">
          ${r.old.map((e) => {
            const d = daysAgo(e.passwordChangedAt);
            const txt = d === null ? 'mai aggiornata' : `${d} giorni fa`;
            return itemRow(e, `<span class="age-tag">${txt}</span>`);
          }).join('')}
        </div>
      </div>` : '';

    const allClear = !r.weak.length && !r.reused.length && !r.old.length;

    container.innerHTML = `
      <div class="page-scroll">
        <div class="page-container page-enter">
          <div class="page-header">
            <button class="back-btn" id="back">${ICONS.back} Vault</button>
            <h1>Salute password</h1>
          </div>

          <div class="section-card health-hero">
            <div class="health-score">
              <div class="health-ring" style="--c:${c}; --p:${r.averageStrength}">
                <div class="health-score-num" style="color:${c}">${r.averageStrength}</div>
              </div>
              <div class="health-score-meta">
                <div class="health-score-label" style="color:${c}">${scoreLabel(r.averageStrength)}</div>
                <div class="text-secondary">Forza media su ${r.total} ${r.total === 1 ? 'voce' : 'voci'}</div>
              </div>
            </div>
            <div class="health-chips">
              <div class="health-chip ${r.weak.length ? 'warn' : 'ok'}"><span class="n">${r.weak.length}</span><span class="l">deboli</span></div>
              <div class="health-chip ${r.reused.length ? 'warn' : 'ok'}"><span class="n">${r.reused.length}</span><span class="l">riutilizzate</span></div>
              <div class="health-chip ${r.old.length ? 'warn' : 'ok'}"><span class="n">${r.old.length}</span><span class="l">vecchie</span></div>
            </div>
          </div>

          ${allClear ? `
            <div class="section-card">
              <div class="empty-state" style="color:#10b981">
                ${ICONS.check}
                <h3 style="color:var(--text-1)">Tutto in ordine!</h3>
                <p>Nessuna password debole, riutilizzata o datata. Ottimo lavoro nel mantenere il vault sicuro.</p>
              </div>
            </div>
          ` : ''}

          ${weakSection}
          ${reusedSection}
          ${oldSection}
        </div>
      </div>
    `;

    container.querySelector('#back').onclick = () => window.Router.route('vault');
    container.querySelectorAll('[data-go]').forEach((el) => {
      el.onclick = () => go(el.dataset.go);
    });

    return { destroy() {} };
  }

  window.PageHealth = { mount };
})();
