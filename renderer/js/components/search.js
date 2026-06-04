'use strict';

/** Factory input ricerca con debounce. */
(() => {
  function create({ placeholder = 'Cerca…', onChange, initial = '' } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'search-box';
    wrap.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input class="input" type="text" placeholder="${placeholder.replace(/"/g, '&quot;')}" />
      <span class="kbd">Ctrl+F</span>
    `;
    const input = wrap.querySelector('input');
    input.value = initial;
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => onChange && onChange(input.value), 120);
    });
    return { el: wrap, input };
  }

  window.SearchBox = { create };
})();
