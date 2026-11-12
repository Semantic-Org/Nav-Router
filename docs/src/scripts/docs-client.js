// what the docs do in the browser once the page is built: the toc follows the reader, the drawer
// opens on small screens, copy page hands over the markdown source, the import line is highlighted.

import { highlight } from './site.js';
import { ui } from './strings.js';

// the section the reader is in: the last heading scrolled past the top third, so a long section stays
// lit while read. at the very end of the page a heading can't reach that line, so one the reader
// linked to and can see wins
function currentHeading(heads) {
  const line = innerHeight * 0.3;
  let i = -1;
  heads.forEach((h, j) => {
    if (h.getBoundingClientRect().top <= line) { i = j; }
  });
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  const linked = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const j = heads.indexOf(linked);
  if (atEnd && j > i && linked.getBoundingClientRect().top < innerHeight) { i = j; }
  return i;
}

const idOf = (a) => decodeURIComponent(a.hash.slice(1));

// the toc follows the reader as they scroll
function scrollspy() {
  const heads = [...document.querySelectorAll('main h2[id], main h3[id]')];
  if (!heads.length) { return; }
  // the on-this-page list, once in its column and once behind the bar on narrow screens
  const tocs = [...document.querySelectorAll('.toc-list')].map((ul) => [...ul.querySelectorAll('a')]);
  const barCurrent = document.querySelector('[data-toc-current]');
  const update = () => {
    const i = currentHeading(heads);
    // the last of its headings at or before the reader's, else its first
    const passed = new Set(heads.slice(0, i + 1).map((h) => h.id));
    tocs.forEach((toc) => {
      const lit = toc.findLast((a) => passed.has(idOf(a))) ?? toc[0];
      toc.forEach((a) => a.toggleAttribute('aria-current', a === lit));
    });
    // the bar names the section only once the reader is in one
    if (barCurrent) { barCurrent.textContent = i >= 0 ? heads[i].textContent.trim() : ''; }
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('hashchange', update);
  update();
}

// the sidebar marks what the url points at, not where the reader has scrolled: its items for a
// page's sections (Router's navigate(), href(), settings) aren't in the page's order, so following
// the scroll would jump around. a section's item while the url names it, else the page's
function sidebarCurrent() {
  const here = [...document.querySelectorAll('.docs-sidebar a.nav-link')].filter((a) =>
    a.pathname === location.pathname
  );
  if (!here.length) { return; }
  const update = () => {
    const item = here.find((a) => a.hash && a.hash === location.hash) ?? here.find((a) => !a.hash);
    here.forEach((a) => {
      if (a === item) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    });
  };
  addEventListener('hashchange', update);
  update();
}

function drawer() {
  const btn = document.querySelector('.nav-toggle');
  const side = document.querySelector('.docs-sidebar');
  const scrim = document.querySelector('.drawer-scrim');
  if (!btn || !side) { return; }
  const set = (open) => {
    btn.setAttribute('aria-expanded', open);
    side.classList.toggle('is-open', open);
    document.body.classList.toggle('drawer-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  scrim?.addEventListener('click', () => set(false));
  // a link to a section of this same page only scrolls, so the drawer would stay over it: any link
  // tapped in the drawer closes it
  side.addEventListener('click', (e) => {
    if (e.target.closest('a') && side.classList.contains('is-open')) { set(false); }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && side.classList.contains('is-open')) { set(false); }
  });
}

// the on-this-page bar on narrow screens: opens its list, closes on a pick, a tap outside or Escape
function tocBar() {
  const bar = document.querySelector('[data-toc-bar]');
  if (!bar) { return; }
  const button = bar.querySelector('.toc-bar-button');
  const sheet = bar.querySelector('.toc-sheet');
  const set = (open) => {
    button.setAttribute('aria-expanded', open);
    sheet.hidden = !open;
  };
  button.addEventListener('click', () => set(sheet.hidden));
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('a')) { set(false); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!sheet.hidden && !bar.contains(e.target)) { set(false); }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) {
      set(false);
      button.focus();
    }
  });
}

// the page's own markdown, for an issue, a pull request or an assistant
function copyPage() {
  const source = document.getElementById('page-source');
  const actions = document.querySelector('[data-page-actions]');
  const main = actions?.querySelector('.page-copy') ?? document.querySelector('[data-copy-page]');
  if (!main) { return; }
  // the main button says what happened, whichever item did it. both labels stack in one cell, so
  // the button keeps the wider one's width as they swap
  const idle = main.querySelector('[data-copy-label]');
  const done = main.querySelector('[data-copy-done]');
  let timer;
  const show = (copied) => {
    if (idle && done) {
      idle.hidden = copied;
      done.hidden = !copied;
    }
    else { main.textContent = ui(copied ? 'page.copied' : 'page.copy'); }
  };
  const confirm = () => {
    show(true);
    clearTimeout(timer);
    timer = setTimeout(() => show(false), 1400);
  };
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    }
    catch {}
    confirm();
  };
  const pageText = () => (source ? JSON.parse(source.textContent) : document.querySelector('.doc').innerText);
  document.querySelectorAll('[data-copy-page]').forEach((btn) => btn.addEventListener('click', () => copy(pageText())));
  if (!actions) { return; }

  // the menu: opens below the chevron, arrows move between items, a pick, Escape or a click outside
  // closes it
  const more = actions.querySelector('.page-more');
  const menu = actions.querySelector('.page-menu');
  const items = [...menu.querySelectorAll('[role=menuitem]')];
  const set = (open, focus = 0) => {
    menu.hidden = !open;
    more.setAttribute('aria-expanded', open);
    if (open) { items.at(focus)?.focus(); }
  };
  more.addEventListener('click', () => set(menu.hidden));
  more.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      set(true);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      set(true, -1);
    }
  });
  menu.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      items[(to + items.length) % items.length].focus();
    }
    else if (e.key === 'Escape' || e.key === 'Tab') {
      set(false);
      if (e.key === 'Escape') { more.focus(); }
    }
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[role=menuitem]');
    if (!item) { return; }
    // an assistant that can't take a prompt in its url: the prompt goes on the clipboard as it opens
    if (item.dataset.copyPrompt) { copy(item.dataset.copyPrompt); }
    set(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !actions.contains(e.target)) { set(false); }
  });
}

export function mountDocs() {
  document.querySelectorAll('.import-chip code').forEach((c) => {
    c.dataset.raw = c.textContent;
    c.innerHTML = highlight(c.textContent);
  });
  scrollspy();
  sidebarCurrent();
  drawer();
  tocBar();
  copyPage();
}
