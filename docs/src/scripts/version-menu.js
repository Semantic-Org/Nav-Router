// the version menu, in either topbar. its list of archived majors is built in, and when the menu
// first opens it reads the latest docs' /versions.json, so a frozen vN site still lists the majors
// that shipped after it. a vN site also says so in a banner once a newer major exists.

import { ui } from './strings.js';
const OUT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

let live;
const latestVersions = (
  origin,
) => (live ??= fetch(`${origin}/versions.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));

// a topbar menu (the version, the language): opens under its button, arrows move between items, and a
// pick, Escape or a click outside closes it. onFirstOpen runs once, the first time it opens
export function wireMenu(host, onFirstOpen) {
  const button = host.querySelector('.version-button');
  const menu = host.querySelector('.pop-menu');
  const items = () => [...menu.querySelectorAll('[role^=menuitem]')];
  let opened = false;
  const set = (open, focus = 0) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', open);
    if (!open) { return; }
    items().at(focus)?.focus();
    if (!opened) {
      opened = true;
      onFirstOpen?.();
    }
  };
  button.addEventListener('click', () => set(menu.hidden));
  button.addEventListener('keydown', (e) => {
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
    const all = items();
    const i = all.indexOf(document.activeElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      all[(to + all.length) % all.length].focus();
    }
    else if (e.key === 'Escape' || e.key === 'Tab') {
      set(false);
      if (e.key === 'Escape') { button.focus(); }
    }
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[role^=menuitem]')) { set(false); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !host.contains(e.target)) { set(false); }
  });
}

// a frozen major lives at vN.<domain>: once the latest docs are a newer major, say so above everything
async function archiveBanner(origin) {
  const major = location.hostname.match(/^v(\d+)\./)?.[1];
  if (!major) { return; }
  const v = await latestVersions(origin);
  const latest = v?.current?.split('.')[0];
  if (!latest || Number(latest) <= Number(major)) { return; }
  const banner = document.createElement('div');
  banner.className = 'archive-banner';
  banner.setAttribute('role', 'note');
  banner.innerHTML = `<span>${esc(ui('version.banner', { version: major }))}</span><a href="${esc(origin)}${
    esc(location.pathname)
  }">${esc(ui('version.latest', { version: latest }))}</a>`;
  document.body.prepend(banner);
}

// the version menu: the first open reads the latest docs' versions and lists any archived majors
function wireVersions(host) {
  const archived = host.querySelector('[data-archived]');
  wireMenu(host, () =>
    latestVersions(host.dataset.latest).then((v) => {
      if (!v?.archived?.length) { return; }
      archived.innerHTML = v.archived.map((a) =>
        `<a class="pop-item" role="menuitem" href="${esc(a.url)}"><span>${
          esc(ui('version.archived', { version: a.version }))
        }</span>${OUT}</a>`
      ).join('');
      archived.hidden = false;
    }));
}

export function wireVersionMenus(root = document) {
  const hosts = [...root.querySelectorAll('[data-version-menu]')];
  hosts.forEach(wireVersions);
  if (hosts[0]) { archiveBanner(hosts[0].dataset.latest); }
  // the language menu shares the behavior, with nothing to fetch
  root.querySelectorAll('[data-menu]').forEach((host) => wireMenu(host));
}
