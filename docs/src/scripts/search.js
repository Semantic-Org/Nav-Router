// ⌘K search. the built site queries pagefind; `astro dev` has no pagefind index, so it falls back to
// /search-index.json, generated from the same pages. both are normalized to one result shape:
//   { section, title, url, crumb, symbol, subs: [{ heading, url, excerpt (html), symbol }] }

import { ui } from './strings.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const terms = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const looksLikeSymbol = (t) => /^[\w.-]+\(\)$|^[a-z]+(-[a-z]+)+$/.test(t);

/* ---------- engines ---------- */

// pagefind ships with the built site; the import is hidden from the bundler, which must not resolve it
const importAtRuntime = new Function('path', 'return import(path)');

function pagefindEngine(pf) {
  return async (q) => {
    const search = await pf.debouncedSearch?.(q, {}, 120) ?? await pf.search(q);
    if (!search) { return undefined; // superseded by a newer query
     }
    const pages = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
    return pages.map((p) => ({
      section: p.meta.section ?? 'Docs',
      title: p.meta.title,
      url: p.url,
      crumb: p.meta.crumb ?? '',
      symbol: p.meta.symbol === 'true',
      subs: (p.sub_results ?? []).filter((s) => s.url !== p.url).slice(0, 3)
        .map((s) => ({ heading: s.title, url: s.url, excerpt: s.excerpt, symbol: looksLikeSymbol(s.title) })),
    }));
  };
}

function excerpt(text, ts, size = 96) {
  const lower = text.toLowerCase();
  const found = ts.map((t) => lower.indexOf(t)).filter((i) => i >= 0);
  const at = found.length ? Math.min(...found) : 0;
  const start = Math.max(0, at - 32);
  let out = text.slice(start, start + size);
  if (start > 0) { out = `…${out}`; }
  if (start + size < text.length) { out += '…'; }
  let html = esc(out);
  ts.forEach((t) => {
    html = html.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  });
  return html;
}

function jsonEngine(index) {
  const hits = (text, ts) => ts.every((t) => text.toLowerCase().includes(t));
  return async (q) => {
    const ts = terms(q);
    return index.map((page) => {
      const titleHit = hits(page.title, ts);
      const subs = page.sections.filter((s) => hits(`${s.heading} ${s.text}`, ts));
      if (!titleHit && !subs.length) { return null; }
      return {
        ...page,
        score: (titleHit ? 10 : 0) + subs.length,
        subs: subs.slice(0, 3).map((s) => ({
          heading: s.heading,
          url: `${page.url}#${s.anchor}`,
          excerpt: excerpt(s.text, ts),
          symbol: looksLikeSymbol(s.heading),
        })),
      };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  };
}

let enginePromise = null;
function engine() {
  enginePromise ??= importAtRuntime('/pagefind/pagefind.js')
    .then(async (pf) => {
      await pf.init?.();
      return pagefindEngine(pf);
    })
    .catch(async () => jsonEngine(await (await fetch('/search-index.json')).json()));
  return enginePromise;
}

/* ---------- view ---------- */

const SUGGESTED = [
  { section: 'Guides', title: 'Routes and params', url: '/guides/routes-and-params/' },
  { section: 'API', title: 'navigate()', url: '/api/router/#navigate', symbol: true },
  { section: 'API', title: 'Router settings', url: '/api/router/#settings' },
  { section: 'Plugins', title: 'head', url: '/plugins/head/', symbol: true },
];

const ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  page:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  hash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/></svg>',
};

export function mountSearch() {
  const dialog = document.createElement('dialog');
  dialog.className = 'search';
  dialog.setAttribute('aria-label', ui('search.label'));
  dialog.innerHTML = `
    <div class="search-panel">
      <div class="search-field">
        ${ICONS.search}
        <input type="search" placeholder="${ui('search.label')}" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list">
        <kbd>esc</kbd>
      </div>
      <div class="search-results" id="search-results" role="listbox" aria-label="${ui('search.results')}"></div>
      <div class="search-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> ${ui('search.move')}</span>
        <span><kbd>↵</kbd> ${ui('search.open')}</span>
        <span class="search-by">${ui('search.by')}</span>
      </div>
    </div>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const list = dialog.querySelector('.search-results');
  let options = [];
  let active = 0;
  let seq = 0;

  const label = (t, symbol) => (symbol ? `<code>${esc(t)}</code>` : esc(t));
  const paint = (q, results) => {
    let html = '';
    let n = 0;
    const opt = (cls, href, inner) =>
      `<a class="search-opt ${cls}" id="so-${n}" data-i="${n++}" href="${href}" role="option">${inner}</a>`;
    if (!q) {
      html = `<p class="search-group">${ui('search.suggested')}</p>${
        SUGGESTED.map((s) =>
          opt(
            'is-page',
            s.url,
            `${ICONS.page}<span class="so-title">${
              label(s.title, s.symbol)
            }</span><span class="so-crumb">${s.section}</span>`,
          )
        ).join('')
      }`;
    }
    else if (!results.length) {
      html = `<div class="search-empty"><p class="search-empty-title">${esc(ui('search.none', { query: q }))}</p><p>${
        ui('search.hint', { function: '<code>navigate</code>', setting: '<code>holdCommit</code>' })
      }</p></div>`;
    }
    else {
      let section = null;
      results.forEach((page) => {
        if (page.section !== section) {
          section = page.section;
          html += `<p class="search-group">${esc(section)}</p>`;
        }
        html += opt(
          'is-page',
          page.url,
          `${ICONS.page}<span class="so-title">${label(page.title, page.symbol)}</span><span class="so-crumb">${
            esc(page.crumb)
          }</span>`,
        );
        page.subs.forEach((s) => {
          html += opt(
            'is-sub',
            s.url,
            `${ICONS.hash}<span class="so-body"><span class="so-title">${
              label(s.heading, s.symbol)
            }</span><span class="so-excerpt">${s.excerpt}</span></span>`,
          );
        });
      });
    }
    list.innerHTML = html;
    options = [...list.querySelectorAll('.search-opt')];
    focus(0);
  };
  const run = async () => {
    const q = input.value.trim();
    const mine = ++seq;
    if (!q) {
      paint('', []);
      return;
    }
    const results = await (await engine())(q);
    if (mine === seq && results !== undefined) { paint(q, results); }
  };
  const focus = (i) => {
    if (!options.length) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    active = (i + options.length) % options.length;
    options.forEach((o, j) => o.setAttribute('aria-selected', j === active));
    input.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    if (dialog.open) { return; }
    dialog.showModal();
    input.value = '';
    run();
    input.focus();
    engine(); // warm the index while the reader types
  };

  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focus(active + 1);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focus(active - 1);
    }
    else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      options[active].click();
    }
  });
  list.addEventListener('pointermove', (e) => {
    const o = e.target.closest('.search-opt');
    if (o) { focus(+o.dataset.i); }
  });
  list.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) { dialog.close(); }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.search-trigger')) { open(); }
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName)
      || document.activeElement?.isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      open();
    }
  });
  return { open };
}
