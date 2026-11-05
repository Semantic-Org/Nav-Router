import { FALLBACK, FRAMEWORKS, fwById } from '../lib/frameworks.js';
import { logoFor } from './framework-logos.js';
import { mountSearch } from './search.js';

// prototype-only helpers: a tiny js highlighter (astro will use shiki), copy buttons, code tabs, theme.

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'const',
  'let',
  'return',
  'async',
  'await',
  'function',
  'new',
  'if',
  'else',
  'default',
  'true',
  'false',
  'null',
  'undefined',
  'class',
  'extends',
]);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlight(src) {
  // order matters: comments, strings, arrows, then jsx tags (a `>` only closes a tag it follows), numbers, calls, keys, words
  const re =
    /(\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(=>)|(<\/?[A-Z][\w.]*\s*\/?>?|\/>)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)(?=\s*:)|([A-Za-z_$][\w$]*)|(\n)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    last = re.lastIndex;
    const [t, c, s, arrow, tag, n, f, p, w] = m;
    if (c) { out += `<span class="tk-c">${esc(c)}</span>`; }
    else if (s) { out += `<span class="tk-s">${esc(s)}</span>`; }
    else if (arrow) { out += `<span class="tk-k">=&gt;</span>`; }
    else if (tag) { out += `<span class="tk-t">${esc(tag)}</span>`; }
    else if (n) { out += `<span class="tk-n">${n}</span>`; }
    else if (f) { out += KEYWORDS.has(f) ? `<span class="tk-k">${f}</span>` : `<span class="tk-f">${f}</span>`; }
    else if (p) { out += KEYWORDS.has(p) ? `<span class="tk-k">${p}</span>` : `<span class="tk-p">${p}</span>`; }
    else if (w) { out += KEYWORDS.has(w) ? `<span class="tk-k">${w}</span>` : w; }
    else { out += esc(t); }
  }
  return out + esc(src.slice(last));
}

// <pre data-hl> blocks; lines starting with "!!" are highlighted
export function highlightAll(root = document) {
  root.querySelectorAll('pre[data-hl]').forEach((pre) => {
    const raw = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    const marked = new Set();
    const src = raw.split('\n').map((line, i) => {
      if (line.startsWith('!!')) {
        marked.add(i);
        return line.slice(2);
      }
      return line;
    }).join('\n');
    pre.dataset.raw = src;
    pre.innerHTML = highlight(src).split('\n')
      .map((l, i) => (marked.has(i) ? `<span class="line-hl">${l || ' '}</span>` : l)).join('\n');
  });
}

// inline code in prose gets the same tokens. bare identifiers pass through untouched, so `navigate`
// stays plain while href('team', { org }) is colored. opt out with data-no-hl; settings keep their tint
const PUNCT_AFTER = /^[,.;:!?)\]}'"’”]+/;
const PUNCT_BEFORE = /[(\[{'"‘“]+$/;

export function highlightInline(root = document) {
  root.querySelectorAll(':where(p, li, dd, dt, td, th, figcaption, blockquote) code:not(pre code, [data-hl-done])')
    .forEach((code) => {
      if (!code.matches('.setting, .t, [data-no-hl]')) { code.innerHTML = highlight(code.textContent); }
      code.dataset.hlDone = '';
      joinPunctuation(code);
      // a chip that opens its block has nothing to keep apart from on the left
      const prev = code.parentElement.closest('.code-join') ? null : code.previousSibling;
      if (!prev || (prev.nodeType === 3 && !prev.data.trim() && !prev.previousSibling)) {
        code.classList.add('joined-start');
      }
    });
}

// a chip's side margin would push touching punctuation away, and a line could break between them.
// whatever punctuation touches the chip moves into a no-wrap join with it, and that side drops its margin
function joinPunctuation(code) {
  const take = (node, re, fromEnd) => {
    if (node?.nodeType !== 3) { return null; }
    const m = node.data.match(re);
    if (!m) { return null; }
    const run = m[0];
    node.data = fromEnd ? node.data.slice(0, -run.length) : node.data.slice(run.length);
    return document.createTextNode(run);
  };
  const after = take(code.nextSibling, PUNCT_AFTER, false);
  const before = take(code.previousSibling, PUNCT_BEFORE, true);
  if (!after && !before) { return; }
  const join = document.createElement('span');
  join.className = 'code-join';
  code.replaceWith(join);
  if (before) {
    join.append(before);
    code.classList.add('joined-start');
  }
  join.append(code);
  if (after) {
    join.append(after);
    code.classList.add('joined-end');
  }
}

// shell commands: the command, its flags and its package arguments
export function highlightShell(root = document) {
  root.querySelectorAll('code[data-shell]:not([data-hl-done])').forEach((code) => {
    const words = code.textContent.split(/(\s+)/);
    let seenCommand = false;
    let seenSub = false;
    code.innerHTML = words.map((w) => {
      if (!w.trim()) { return w; }
      const e = esc(w);
      if (!seenCommand) {
        seenCommand = true;
        return `<span class="tk-f">${e}</span>`;
      }
      if (w.startsWith('-')) { return `<span class="tk-k">${e}</span>`; }
      if (!seenSub) {
        seenSub = true;
        return e;
      }
      return `<span class="tk-s">${e}</span>`;
    }).join('');
    code.dataset.hlDone = '';
  });
}

const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

export function wireCopy(root = document) {
  root.querySelectorAll('[data-copy]').forEach((btn) => {
    if (!btn.innerHTML.trim()) { btn.innerHTML = COPY_ICON; }
    btn.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Copy');
    btn.addEventListener('click', async () => {
      const target = btn.dataset.copy
        ? document.querySelector(btn.dataset.copy)
        : btn.closest('.code')?.querySelector('pre:not([hidden])');
      const text = target?.dataset.raw ?? target?.textContent ?? '';
      try {
        await navigator.clipboard.writeText(text.trim());
      }
      catch {}
      btn.dataset.copied = '';
      btn.innerHTML = CHECK_ICON;
      setTimeout(() => {
        delete btn.dataset.copied;
        btn.innerHTML = COPY_ICON;
      }, 1400);
    });
  });
}

// tabs: [role=tablist] with buttons aria-controls → panels. data-sync="framework" keeps every group in step
// a tablist that runs its own tabs (variant tabs, the playground's files) opts out with data-own-tabs
export function wireTabs(root = document) {
  const select = (group, value) => {
    group.querySelectorAll('[role=tab]').forEach((tab) => {
      const on = tab.dataset.value === value;
      tab.setAttribute('aria-selected', on);
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) { panel.hidden = !on; }
    });
  };
  root.querySelectorAll('[role=tablist]:not([data-variant-tabs], [data-own-tabs])').forEach((group) => {
    group.addEventListener('click', (e) => {
      const tab = e.target.closest('[role=tab]');
      if (!tab) { return; }
      const sync = group.dataset.sync;
      if (sync) {
        document.querySelectorAll(`[role=tablist][data-sync="${sync}"]`).forEach((g) => select(g, tab.dataset.value));
        try {
          localStorage.setItem(`nr:${sync}`, tab.dataset.value);
        }
        catch {}
      }
      else { select(group, tab.dataset.value); }
    });
    group.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) { return; }
      const tabs = [...group.querySelectorAll('[role=tab]')];
      const i = tabs.indexOf(document.activeElement);
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
    let saved = null;
    try {
      saved = group.dataset.sync && localStorage.getItem(`nr:${group.dataset.sync}`);
    }
    catch {}
    const initial = (saved && group.querySelector(`[data-value="${saved}"]`))
      ? saved
      : group.querySelector('[role=tab]')?.dataset.value;
    select(group, initial);
  });
}

// the theme follows the system until the reader picks one; a pick is remembered. the base layout
// sets it before first paint, so here it only answers the toggle and later system changes
export function wireTheme() {
  const root = document.documentElement;
  const saved = () => {
    try {
      return localStorage.getItem('nr:theme');
    }
    catch {
      return null;
    }
  };
  const label = () =>
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', root.dataset.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    });
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
    btn.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('nr:theme', root.dataset.theme);
      }
      catch {}
      label();
    })
  );
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!saved()) {
      root.dataset.theme = e.matches ? 'light' : 'dark';
      label();
    }
  });
  label();
}

/* ---------- dropdown ----------
   a button and a listbox. the button reserves the width of its widest label (every label shares one
   grid cell, as .swap does). keyboard: arrows/home/end move, typing jumps, enter/space pick,
   escape and tab close; a click outside closes. options: [{ value, label, hint? }] */

const CHEVRON =
  '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
const CHEVRONS =
  '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 9 4-4 4 4M8 15l4 4 4-4"/></svg>';
const CHECK =
  '<svg class="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

// the button is named by its own text, a hidden "label: " before the visible value, so what is heard
// is what is seen. size 'lg' is the chunky form (the docs sidebar): icon, label and hint in the button as in the menu
export function createDropdown(host, { options, value, label, onChange, size = 'md' }) {
  const id = `dd-${++uid}`;
  host.classList.add('dropdown');
  if (size === 'lg') { host.classList.add('dd-lg'); }
  const icon = (o) => (o.icon ? `<span class="dd-icon" aria-hidden="true">${o.icon}</span>` : '');
  const lgFace = (o) =>
    `${icon(o)}<span class="dd-text"><span class="dd-name">${o.label}</span>${
      o.hint ? `<span class="dd-sub">${o.hint}</span>` : ''
    }</span>`;
  host.innerHTML = `
    <button type="button" class="dd-button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}">
      <span class="visually-hidden">${label}: </span>
      <span class="swap dd-current">${
    options.map((o) =>
      `<span class="dd-face" data-v="${o.value}" hidden>${size === 'lg' ? lgFace(o) : `${icon(o)}${o.label}`}</span>`
    ).join('')
  }</span>
      ${size === 'lg' ? CHEVRONS : CHEVRON}
    </button>
    <ul class="dd-menu" id="${id}" role="listbox" aria-label="${label}" tabindex="-1" hidden>
      ${
    options.map((o, i) =>
      `<li role="option" id="${id}-${i}" data-v="${o.value}" aria-selected="false">
        ${
        size === 'lg'
          ? `${lgFace(o)}${CHECK}`
          : `${CHECK}${icon(o)}<span class="dd-label">${o.label}</span>${
            o.hint ? `<span class="dd-hint">${o.hint}</span>` : ''
          }`
      }</li>`
    ).join('')
  }
    </ul>`;
  const button = host.querySelector('.dd-button');
  const menu = host.querySelector('.dd-menu');
  const items = [...menu.children];
  let current = value ?? options[0].value;
  let active = 0;
  let typed = '';
  let typedAt = 0;

  const paint = () => {
    host.querySelectorAll('.dd-current [data-v]').forEach((s) => {
      s.hidden = s.dataset.v !== current;
    });
    items.forEach((li) => li.setAttribute('aria-selected', li.dataset.v === current));
  };
  const focusItem = (i) => {
    active = (i + items.length) % items.length;
    items.forEach((li, j) => li.classList.toggle('is-active', j === active));
    menu.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    if (!menu.hidden) { return; }
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    focusItem(Math.max(0, items.findIndex((li) => li.dataset.v === current)));
    menu.focus();
    document.addEventListener('pointerdown', outside, true);
  };
  const close = (refocus = true) => {
    if (menu.hidden) { return; }
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (refocus) { button.focus(); }
  };
  const outside = (e) => {
    if (!host.contains(e.target)) { close(false); }
  };
  const pick = (i) => {
    const v = items[i].dataset.v;
    close();
    if (v !== current) {
      current = v;
      paint();
      onChange?.(v);
    }
  };

  button.addEventListener('click', () => (menu.hidden ? open() : close()));
  button.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });
  menu.addEventListener('keydown', (e) => {
    const keys = {
      ArrowDown: () => focusItem(active + 1),
      ArrowUp: () => focusItem(active - 1),
      Home: () => focusItem(0),
      End: () => focusItem(items.length - 1),
      Enter: () => pick(active),
      ' ': () => pick(active),
      Escape: () => close(),
      Tab: () => close(false),
    };
    if (keys[e.key]) {
      if (e.key !== 'Tab') { e.preventDefault(); }
      keys[e.key]();
      return;
    }
    // typeahead: letters typed in quick succession match a label's start
    if (e.key.length === 1) {
      const now = Date.now();
      typed = now - typedAt > 600 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
      typedAt = now;
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed));
      if (hit >= 0) { focusItem(hit); }
    }
  });
  menu.addEventListener('pointermove', (e) => {
    const li = e.target.closest('[role=option]');
    if (li) { focusItem(items.indexOf(li)); }
  });
  menu.addEventListener('click', (e) => {
    const li = e.target.closest('[role=option]');
    if (li) { pick(items.indexOf(li)); }
  });

  paint();
  return {
    get value() {
      return current;
    },
    set value(v) {
      current = v;
      paint();
    },
  };
}

/* ---------- frameworks ----------
   two separate things: the reader's framework (one, site-wide, many options) and a block's code
   variants (few). a block shows the variant tagged with the reader's framework, else the first
   variant reached through FALLBACK, else its first. its tabs list only its own variants and switch
   that block alone; the picker is the one control that changes the framework everywhere */

export { FRAMEWORKS };

export function getFramework() {
  try {
    return fwById(localStorage.getItem('nr:framework')).id;
  }
  catch {
    return 'core';
  }
}
export function setFramework(id) {
  try {
    localStorage.setItem('nr:framework', id);
  }
  catch {}
  // the sidebar's framework slots follow this attribute in css
  document.documentElement.dataset.framework = fwById(id).id;
  document.dispatchEvent(new CustomEvent('nr:framework', { detail: fwById(id).id }));
}

function variantFor(pres, fw) {
  const tagged = (id) => pres.find((p) => p.dataset.for.split(/\s+/).includes(id));
  for (const id of [fw, ...(FALLBACK[fw] ?? []), 'core']) {
    const hit = tagged(id);
    if (hit) { return hit; }
  }
  return pres[0];
}

let uid = 0;
export function wireVariants(root = document) {
  root.querySelectorAll('[data-variants]').forEach((block) => {
    const pres = [...block.querySelectorAll('pre[data-for]')];
    const tablist = block.querySelector('[data-variant-tabs]');
    const note = block.querySelector('[data-variant-note]');
    tablist.innerHTML = pres.map((pre) => {
      pre.id ||= `variant-${++uid}`;
      return `<button class="code-tab" role="tab" aria-controls="${pre.id}">${pre.dataset.label}</button>`;
    }).join('');
    const tabs = [...tablist.children];

    const show = (pre) => {
      pres.forEach((p, i) => {
        const on = p === pre;
        p.hidden = !on;
        tabs[i].setAttribute('aria-selected', on);
        tabs[i].tabIndex = on ? 0 : -1;
      });
    };
    // the variant the reader's framework resolves to, with a note when it is shared or borrowed
    const resolve = (fw) => {
      const pre = variantFor(pres, fw);
      show(pre);
      const primary = pre.dataset.for.split(/\s+/)[0];
      const f = fwById(fw);
      note.title = fw === primary || !f.pkg ? '' : `Same code in ${f.label}, imported from ${f.pkg}`;
      note.innerHTML = fw === primary || !f.pkg ? '' : `${f.label}: <code>${f.pkg}</code>`;
    };

    tablist.addEventListener('click', (e) => {
      const i = tabs.indexOf(e.target.closest('[role=tab]'));
      if (i < 0) { return; }
      show(pres[i]);
      note.innerHTML = '';
    });
    tablist.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) { return; }
      const i = tabs.indexOf(document.activeElement);
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
    document.addEventListener('nr:framework', (e) => resolve(e.detail));
    resolve(getFramework());
  });
}

// the picker, and every install command built from the framework's package
export function wireFramework(root = document) {
  root.querySelectorAll('[data-install-cmds]').forEach((swap) => {
    swap.innerHTML = FRAMEWORKS.map((f) =>
      `<code data-shell data-fw="${f.id}" hidden>npm i nav-router${f.pkg ? ` ${f.pkg}` : ''}</code>`
    ).join('');
  });
  const pickers = [...root.querySelectorAll('[data-framework-picker]')].map((host) =>
    createDropdown(host, {
      label: 'Framework',
      size: host.dataset.frameworkPicker || 'md',
      options: FRAMEWORKS.map((f) => ({
        value: f.id,
        label: f.label,
        hint: f.pkg ?? 'nav-router',
        icon: host.dataset.frameworkPicker === 'lg' ? logoFor(f.id) : null,
      })),
      value: getFramework(),
      onChange: setFramework,
    })
  );
  const apply = (fw) => {
    pickers.forEach((dd) => {
      dd.value = fw;
    });
    root.querySelectorAll('[data-install-cmds] code').forEach((c) => {
      c.hidden = c.dataset.fw !== fw;
    });
  };
  document.addEventListener('nr:framework', (e) => apply(e.detail));
  apply(getFramework());
}

// on a framework's own page (guides/solid/…), picking another framework goes to that framework's
// version of the page when one is written, else says so in place, with the way back
export function wireFrameworkPage(root = document) {
  const notice = root.querySelector('[data-fw-notice]');
  if (!notice) { return; }
  const { pageFramework, pageLabel } = notice.dataset;
  const equivalents = JSON.parse(notice.querySelector('[data-fw-equivalents]').textContent);
  const text = notice.querySelector('[data-fw-notice-text]');
  const back = notice.querySelector('[data-fw-back]');
  back.textContent = `Back to ${pageLabel}`;
  back.addEventListener('click', () => setFramework(pageFramework));
  document.addEventListener('nr:framework', ({ detail: fw }) => {
    if (fw !== pageFramework && equivalents[fw]) {
      location.assign(equivalents[fw]);
      return;
    }
    notice.hidden = fw === pageFramework;
    text.textContent = `This page is for ${pageLabel}. It isn’t written for ${fwById(fw).label} yet.`;
  });
}

export function init() {
  mountSearch();
  wireFramework();
  wireFrameworkPage();
  wireVariants();
  highlightAll();
  highlightInline();
  highlightShell();
  wireCopy();
  wireTabs();
  wireTheme();
}
