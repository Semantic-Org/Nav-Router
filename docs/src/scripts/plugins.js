// the plugins landing: pick plugins to build a ready setup with its size, filter as you type (and from
// a category tag), cards or rows. picks ride the url as ?use=, the filter as ?q=, so either can be
// shared; the view is remembered

import { sampleFor } from '../lib/plugins.js';
import { formatSizeBytes } from './format.js';
import { highlight } from './site.js';
import { ui } from './strings.js';

export function mountPlugins() {
  const list = document.getElementById('plugin-list');
  const input = document.querySelector('[data-plugin-filter]');
  if (!list || !input) { return; }
  const items = [...list.children];
  const all = document.querySelector('[data-count-all]');
  const some = document.querySelector('[data-count-some]');
  const empty = document.querySelector('[data-plugin-empty]');
  const emptyQuery = document.querySelector('[data-empty-query]');
  const toggles = [...document.querySelectorAll('.view-toggle [data-view]')];

  const filter = () => {
    const q = input.value.trim();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach((li) => {
      const hit = terms.every((t) => li.dataset.text.includes(t));
      li.hidden = !hit;
      if (hit) { shown++; }
    });
    all.hidden = !!q;
    some.hidden = !q;
    some.textContent = ui('plugins.count.shown', { shown, total: items.length });
    empty.hidden = shown > 0;
    emptyQuery.textContent = q;
    setParam('q', q);
  };

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      filter();
    }
  });
  list.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-tag]');
    if (!tag) { return; }
    input.value = tag.dataset.tag;
    filter();
    input.focus();
  });
  document.querySelector('[data-clear-filter]')?.addEventListener('click', () => {
    input.value = '';
    filter();
    input.focus();
  });

  const setView = (view) => {
    list.dataset.view = view;
    toggles.forEach((b) => {
      const on = b.dataset.view === view;
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    });
    try {
      localStorage.setItem('nr:plugin-view', view);
    }
    catch {}
  };
  toggles.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  // a radio group moves with the arrow keys
  document.querySelector('.view-toggle')?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { return; }
    e.preventDefault();
    const i = toggles.findIndex((b) => b.dataset.view === list.dataset.view);
    const next = toggles[(i + 1) % toggles.length];
    setView(next.dataset.view);
    next.focus();
  });
  setView(list.dataset.view);

  /* ---------- picks ---------- */

  const sample = document.querySelector('[data-plugin-sample] pre');
  const clear = document.querySelector('[data-clear-picks]');
  const stats = document.querySelector('.plugins-stats');
  const coreBytes = Number(stats.dataset.coreBytes);
  const pickedCount = stats.querySelector('[data-picked-count]');
  const pickedSize = stats.querySelector('[data-picked-size]');
  const totalSize = stats.querySelector('[data-total-size]');
  const picks = items.map((li) => li.querySelector('.plugin-pick'));

  const render = () => {
    const chosen = picks.filter((p) => p.checked);
    const names = chosen.map((p) => p.value);
    const bytes = chosen.reduce((sum, p) => sum + Number(p.closest('.plugin').dataset.bytes), 0);
    const code = sampleFor(names, ui('plugins.sample.empty'));
    sample.dataset.raw = code;
    sample.innerHTML = highlight(code);
    pickedCount.textContent = names.length;
    pickedSize.textContent = formatSizeBytes(bytes);
    totalSize.textContent = formatSizeBytes(coreBytes + bytes);
    clear.hidden = !names.length;
    setParam('use', names.join(','));
  };
  list.addEventListener('change', (e) => {
    if (e.target.matches('.plugin-pick')) { render(); }
  });
  clear.addEventListener('click', () => {
    picks.forEach((p) => {
      p.checked = false;
    });
    render();
  });

  const params = new URL(location.href).searchParams;
  const use = (params.get('use') ?? '').split(',').filter(Boolean);
  picks.forEach((p) => {
    p.checked = use.includes(p.value);
  });
  render();

  const q = params.get('q');
  if (q) {
    input.value = q;
    filter();
  }
}

function setParam(key, value) {
  const url = new URL(location.href);
  if (value) { url.searchParams.set(key, value); }
  else { url.searchParams.delete(key); }
  // commas stay literal, so a shared ?use=head,announcer reads as what it is
  history.replaceState(history.state, '', `${url.pathname}${url.search.replace(/%2C/gi, ',')}${url.hash}`);
}
