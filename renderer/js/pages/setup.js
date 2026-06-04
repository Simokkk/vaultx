'use strict';

/** Pagina Setup: primo avvio — scegli master password. */
(() => {
  const ICONS = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'
  };

  async function mount(container, { navigate }) {
    container.innerHTML = `
      <div class="centered-screen">
        <div class="auth-card page-enter">
          <div class="auth-logo">${ICONS.lock}</div>
          <div class="auth-title">Benvenuto in VaultX</div>
          <div class="auth-subtitle">Crea la tua master password. <strong style="color:var(--warning)">Non è recuperabile</strong> se la dimentichi.</div>

          <div class="stepper">
            <div class="step-dot active" id="d1"></div>
            <div class="step-dot" id="d2"></div>
            <div class="step-dot" id="d3"></div>
          </div>

          <div id="step1">
            <div class="field">
              <label>Master password</label>
              <div class="input-group">
                <input id="pwd1" class="input input-lg input-mono" type="password" placeholder="Minimo 12 caratteri" autocomplete="new-password" />
                <div class="input-addon">
                  <button class="btn btn-icon btn-ghost" id="togglePwd1" title="Mostra/nascondi">${ICONS.eye}</button>
                </div>
              </div>
              <div id="strength1" style="margin-top:10px"></div>
              <div class="req-list">
                <div class="req-item" id="reqLen"><span class="dot"></span>Almeno 12 caratteri</div>
                <div class="req-item" id="reqUp"><span class="dot"></span>Una lettera maiuscola</div>
                <div class="req-item" id="reqNum"><span class="dot"></span>Un numero</div>
                <div class="req-item" id="reqSym"><span class="dot"></span>Un simbolo speciale</div>
              </div>
            </div>
            <button class="btn btn-primary btn-lg btn-block mt-md" id="next1">Continua</button>
          </div>

          <div id="step2" class="hidden">
            <div class="field">
              <label>Conferma password</label>
              <div class="input-group">
                <input id="pwd2" class="input input-lg input-mono" type="password" placeholder="Ridigita la master password" autocomplete="new-password" />
                <div class="input-addon">
                  <button class="btn btn-icon btn-ghost" id="togglePwd2" title="Mostra/nascondi">${ICONS.eye}</button>
                </div>
              </div>
              <div class="hint mt-sm" id="matchHint"></div>
            </div>
            <div class="flex gap-md mt-md">
              <button class="btn btn-lg grow" id="back2">Indietro</button>
              <button class="btn btn-primary btn-lg grow" id="next2">Continua</button>
            </div>
          </div>

          <div id="step3" class="hidden">
            <div style="text-align:center; margin-bottom:var(--sp-5)">
              <div style="display:inline-flex; width:56px; height:56px; border-radius:var(--r-lg); background:var(--success-soft); color:var(--success); align-items:center; justify-content:center; margin-bottom:var(--sp-3)">
                ${ICONS.shield}
              </div>
              <h3 style="margin-bottom:var(--sp-2)">Pronto per la creazione</h3>
              <p class="text-secondary">Il tuo vault verrà creato con i seguenti parametri di sicurezza:</p>
            </div>
            <div class="req-list">
              <div class="req-item ok"><span class="dot"></span>Argon2id — 64 MB, 3 iterazioni, parallelism 4</div>
              <div class="req-item ok"><span class="dot"></span>Cifratura per campo AES-256-GCM</div>
              <div class="req-item ok"><span class="dot"></span>Nessun dato lascia mai il tuo computer</div>
              <div class="req-item ok"><span class="dot"></span>Master password mai salvata (solo hash di verifica)</div>
            </div>
            <div class="flex gap-md mt-lg">
              <button class="btn btn-lg grow" id="back3">Indietro</button>
              <button class="btn btn-primary btn-lg grow" id="create">Crea vault</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const pwd1 = container.querySelector('#pwd1');
    const pwd2 = container.querySelector('#pwd2');
    const strengthEl = container.querySelector('#strength1');
    window.Strength.attach(pwd1, strengthEl);

    const updateReqs = () => {
      const v = pwd1.value || '';
      const set = (id, ok) => container.querySelector('#' + id).classList.toggle('ok', ok);
      set('reqLen', v.length >= 12);
      set('reqUp', /[A-Z]/.test(v));
      set('reqNum', /[0-9]/.test(v));
      set('reqSym', /[^A-Za-z0-9]/.test(v));
    };
    pwd1.addEventListener('input', updateReqs);
    updateReqs();

    const updateMatch = () => {
      const hint = container.querySelector('#matchHint');
      if (!pwd2.value) { hint.textContent = ''; hint.style.color = ''; return; }
      if (pwd1.value === pwd2.value) {
        hint.textContent = '✓ Le password corrispondono';
        hint.style.color = 'var(--success)';
      } else {
        hint.textContent = 'Le password non corrispondono';
        hint.style.color = 'var(--danger)';
      }
    };
    pwd2.addEventListener('input', updateMatch);

    const toggle = (btn, inp) => btn.onclick = () => inp.type = inp.type === 'password' ? 'text' : 'password';
    toggle(container.querySelector('#togglePwd1'), pwd1);
    toggle(container.querySelector('#togglePwd2'), pwd2);

    const show = (i) => {
      ['step1', 'step2', 'step3'].forEach((s, idx) => {
        container.querySelector('#' + s).classList.toggle('hidden', idx !== i - 1);
      });
      ['d1', 'd2', 'd3'].forEach((d, idx) => {
        const el = container.querySelector('#' + d);
        el.classList.remove('active', 'done');
        if (idx < i - 1) el.classList.add('done');
        else if (idx === i - 1) el.classList.add('active');
      });
    };

    container.querySelector('#next1').onclick = () => {
      const v = pwd1.value;
      if (v.length < 12) return window.Toast.error('Almeno 12 caratteri richiesti');
      if (!/[A-Z]/.test(v) || !/[0-9]/.test(v) || !/[^A-Za-z0-9]/.test(v)) {
        return window.Toast.error('La password deve contenere maiuscole, numeri e simboli');
      }
      show(2);
      pwd2.focus();
    };
    container.querySelector('#back2').onclick = () => show(1);
    container.querySelector('#next2').onclick = () => {
      if (pwd1.value !== pwd2.value) return window.Toast.error('Le password non coincidono');
      show(3);
    };
    container.querySelector('#back3').onclick = () => show(2);
    container.querySelector('#create').onclick = async () => {
      const btn = container.querySelector('#create');
      btn.disabled = true;
      btn.textContent = 'Creazione in corso…';
      try {
        await window.API.auth.setup(pwd1.value);
        window.Toast.success('Vault creato con successo');
        pwd1.value = ''; pwd2.value = '';
        navigate('vault');
      } catch (_e) {
        btn.disabled = false;
        btn.textContent = 'Crea vault';
      }
    };

    pwd1.focus();
    return { destroy() {} };
  }

  window.PageSetup = { mount };
})();
