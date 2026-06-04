'use strict';

/** Pagina generatore password. */
(() => {
  const ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
  };

  let historyInMem = [];

  async function mount(container, { navigate }) {
    container.innerHTML = `
      <div class="page-scroll">
        <div class="page-container-narrow page-enter">
          <div class="page-header">
            <button class="back-btn" id="back">${ICONS.back} Indietro</button>
            <h1>Generatore password</h1>
          </div>

          <div class="mode-switcher mb-md">
            <button class="active" data-mode="password" id="mPwd">Password</button>
            <button data-mode="passphrase" id="mPhrase">Passphrase</button>
          </div>

          <div class="gen-output mb-md" id="output">—</div>
          <div id="strength" class="mb-md"></div>

          <div class="flex gap-sm mb-lg">
            <button class="btn btn-primary grow" id="regen">${ICONS.refresh} Rigenera</button>
            <button class="btn grow" id="copy">${ICONS.copy} Copia (auto-clear 30s)</button>
          </div>

          <div id="opts-password" class="section-card">
            <div class="section-title">Opzioni password</div>
            <div style="padding:var(--sp-5)">
              <div class="field">
                <label>Lunghezza: <span id="lenVal">20</span> caratteri</label>
                <input type="range" id="len" min="8" max="128" value="20" />
              </div>
              <div class="flex gap-lg wrap mt-md">
                <label class="checkbox"><input type="checkbox" id="optUp" checked><span>Maiuscole (A–Z)</span></label>
                <label class="checkbox"><input type="checkbox" id="optLow" checked><span>Minuscole (a–z)</span></label>
                <label class="checkbox"><input type="checkbox" id="optNum" checked><span>Numeri (0–9)</span></label>
                <label class="checkbox"><input type="checkbox" id="optSym" checked><span>Simboli (!@#…)</span></label>
                <label class="checkbox"><input type="checkbox" id="optAmb"><span>Escludi ambigui (0 O l 1 I)</span></label>
              </div>
              <div class="field mt-md">
                <label>Caratteri esclusi (custom)</label>
                <input class="input input-mono" id="optExc" placeholder="Es: {}[]" />
              </div>
            </div>
          </div>

          <div id="opts-passphrase" class="section-card hidden">
            <div class="section-title">Opzioni passphrase</div>
            <div style="padding:var(--sp-5)">
              <div class="field">
                <label>Numero parole: <span id="wVal">5</span></label>
                <input type="range" id="words" min="3" max="12" value="5" />
              </div>
              <div class="field">
                <label>Separatore</label>
                <input class="input" id="sep" value="-" maxlength="3" />
              </div>
              <div class="flex gap-lg wrap">
                <label class="checkbox"><input type="checkbox" id="optCap" checked><span>Capitalizza</span></label>
                <label class="checkbox"><input type="checkbox" id="optNumP" checked><span>Includi numero</span></label>
              </div>
            </div>
          </div>

          <div class="section-card">
            <div class="section-title">Storico (solo sessione)</div>
            <div id="history" style="padding:var(--sp-3)"></div>
          </div>
        </div>
      </div>
    `;

    let mode = 'password';
    const output = container.querySelector('#output');
    const strengthEl = container.querySelector('#strength');
    const lenInp = container.querySelector('#len');
    const wInp = container.querySelector('#words');

    const setMode = (m) => {
      mode = m;
      container.querySelector('#mPwd').classList.toggle('active', m === 'password');
      container.querySelector('#mPhrase').classList.toggle('active', m === 'passphrase');
      container.querySelector('#opts-password').classList.toggle('hidden', m !== 'password');
      container.querySelector('#opts-passphrase').classList.toggle('hidden', m !== 'passphrase');
      regen();
    };

    const regen = async () => {
      try {
        let out;
        if (mode === 'password') {
          out = await window.API.generator.generate({
            length: parseInt(lenInp.value, 10),
            upper: container.querySelector('#optUp').checked,
            lower: container.querySelector('#optLow').checked,
            digits: container.querySelector('#optNum').checked,
            symbols: container.querySelector('#optSym').checked,
            excludeAmbiguous: container.querySelector('#optAmb').checked,
            customExclude: container.querySelector('#optExc').value
          });
        } else {
          out = await window.API.generator.passphrase({
            words: parseInt(wInp.value, 10),
            separator: container.querySelector('#sep').value,
            capitalize: container.querySelector('#optCap').checked,
            includeNumber: container.querySelector('#optNumP').checked
          });
        }
        output.textContent = out;
        const s = await window.API.generator.strength(out);
        window.Strength.render(strengthEl, s);
        historyInMem.unshift({ out, at: Date.now() });
        historyInMem = historyInMem.slice(0, 10);
        renderHistory();
      } catch (_e) { /* toast mostrato */ }
    };

    const renderHistory = () => {
      const h = container.querySelector('#history');
      if (!historyInMem.length) {
        h.innerHTML = '<div class="text-muted" style="padding:var(--sp-3); text-align:center">Nessuna password generata in questa sessione.</div>';
        return;
      }
      h.innerHTML = historyInMem.map((x, i) => `
        <div class="history-item">
          <span class="hist-pwd">${x.out}</span>
          <button class="btn btn-sm" data-h="${i}">${ICONS.copy} Copia</button>
        </div>
      `).join('');
      h.querySelectorAll('[data-h]').forEach((b) => {
        b.onclick = async () => {
          const idx = parseInt(b.dataset.h, 10);
          await window.API.clipboard.copy(historyInMem[idx].out);
          window.Toast.info('Copiata (auto-clear 30s)');
        };
      });
    };

    container.querySelector('#back').onclick = () => window.Router.route('vault');
    container.querySelector('#mPwd').onclick = () => setMode('password');
    container.querySelector('#mPhrase').onclick = () => setMode('passphrase');
    container.querySelector('#regen').onclick = regen;
    container.querySelector('#copy').onclick = async () => {
      await window.API.clipboard.copy(output.textContent);
      window.Toast.info('Password copiata (auto-clear 30s)');
    };

    lenInp.addEventListener('input', () => {
      container.querySelector('#lenVal').textContent = lenInp.value;
      regen();
    });
    wInp.addEventListener('input', () => {
      container.querySelector('#wVal').textContent = wInp.value;
      regen();
    });
    ['optUp', 'optLow', 'optNum', 'optSym', 'optAmb'].forEach((id) => {
      container.querySelector('#' + id).addEventListener('change', regen);
    });
    container.querySelector('#optExc').addEventListener('input', () => regen());
    ['optCap', 'optNumP'].forEach((id) => container.querySelector('#' + id).addEventListener('change', regen));
    container.querySelector('#sep').addEventListener('input', regen);

    regen();
    return { destroy() {} };
  }

  window.PageGenerator = { mount };
})();
