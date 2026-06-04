'use strict';

/** Pagina Unlock. */
(() => {
  const ICONS = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };

  function fmtDate(iso) {
    if (!iso) return 'mai';
    try { return new Date(iso).toLocaleString('it-IT'); } catch (_e) { return iso; }
  }

  async function mount(container, { navigate }) {
    const lastAccess = await window.API.auth.getLastAccess();
    container.innerHTML = `
      <div class="centered-screen">
        <div class="auth-card page-enter" id="card">
          <div class="auth-logo">${ICONS.lock}</div>
          <div class="auth-title">VaultX</div>
          <div class="auth-subtitle">Inserisci la master password per accedere al vault.</div>

          <div class="field">
            <label>Master password</label>
            <div class="input-group">
              <input id="pwd" class="input input-lg input-mono" type="password" placeholder="••••••••••••" autocomplete="current-password" />
              <div class="input-addon">
                <button class="btn btn-icon btn-ghost" id="togglePwd" title="Mostra/nascondi">${ICONS.eye}</button>
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-lg btn-block" id="unlockBtn">Sblocca vault</button>

          <div class="flex items-center justify-center gap-sm mt-lg" style="color:var(--text-3); font-size:var(--fs-xs)">
            ${ICONS.clock}
            <span>Ultimo accesso: ${fmtDate(lastAccess)}</span>
          </div>
        </div>
      </div>
    `;

    const pwd = container.querySelector('#pwd');
    const card = container.querySelector('#card');
    const btn = container.querySelector('#unlockBtn');
    container.querySelector('#togglePwd').onclick = () => pwd.type = pwd.type === 'password' ? 'text' : 'password';

    const doUnlock = async () => {
      const v = pwd.value;
      if (!v) return;
      btn.disabled = true;
      btn.textContent = 'Verifica…';
      try {
        const res = await window.API.auth.unlock(v);
        if (res.ok) {
          pwd.value = '';
          window.Toast.success('Vault sbloccato');
          navigate('vault');
          return;
        }
        if (res.blocked) {
          const mins = Math.ceil((res.remainingMs || 0) / 60000);
          window.Toast.error(`Troppi tentativi. Riprova tra ${mins} min.`);
        } else {
          window.Toast.error(`Password errata (tentativo ${res.attempts}/5)`);
        }
        pwd.value = '';
        card.classList.remove('animate-shake');
        void card.offsetWidth;
        card.classList.add('animate-shake');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sblocca vault';
        pwd.focus();
      }
    };

    btn.onclick = doUnlock;
    pwd.addEventListener('keydown', (e) => { if (e.key === 'Enter') doUnlock(); });
    pwd.focus();

    return { destroy() {} };
  }

  window.PageUnlock = { mount };
})();
