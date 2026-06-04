'use strict';

/** Indicatore forza password — 4 segmenti + label. */
(() => {
  function levelFor(score) {
    if (score >= 85) return 4;
    if (score >= 65) return 3;
    if (score >= 40) return 2;
    if (score > 0) return 1;
    return 0;
  }

  function labelFor(score) {
    if (score >= 85) return { text: 'Fortissima', cls: 'strong' };
    if (score >= 65) return { text: 'Forte', cls: 'good' };
    if (score >= 40) return { text: 'Media', cls: 'fair' };
    if (score > 0) return { text: 'Debole', cls: 'weak' };
    return { text: '—', cls: '' };
  }

  function colorFor(score) {
    if (score >= 85) return 'var(--str-strong)';
    if (score >= 65) return 'var(--str-good)';
    if (score >= 40) return 'var(--str-fair)';
    return 'var(--str-weak)';
  }

  function render(container, result) {
    const level = levelFor(result.score);
    const lbl = labelFor(result.score);
    const segs = [1, 2, 3, 4].map((i) => {
      const cls = i <= level ? `seg active-${level}` : 'seg';
      return `<div class="${cls}"></div>`;
    }).join('');
    container.innerHTML = `
      <div class="strength-container">
        <div class="strength-bar">${segs}</div>
        <div class="strength-label">
          <span class="lbl ${lbl.cls}">${lbl.text}</span>
          <span class="meta">${result.entropyBits || 0} bit</span>
        </div>
      </div>
    `;
  }

  function attach(inputEl, containerEl) {
    const update = async () => {
      try {
        const r = await window.API.generator.strength(inputEl.value || '');
        render(containerEl, r);
      } catch (_err) { /* swallow */ }
    };
    inputEl.addEventListener('input', update);
    update();
    return update;
  }

  window.Strength = { render, attach, colorFor, levelFor };
})();
