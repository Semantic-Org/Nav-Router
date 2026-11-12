// the docs' versions: the current one (the package's own) and the majors whose docs were frozen at
// vN.navrouter.dev when the next major shipped. src/data/versions.json lists those archives, newest
// first, as { "version": "1", "url": "https://v1.navrouter.dev" }; the release step adds one.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import VERSIONS from '../data/versions.json';
import { DEFAULT_LOCALE, t } from './i18n.js';
import { PACKAGE_DIR } from './sizes.js';

export const CHANGELOG_URL = 'https://github.com/Semantic-Org/Nav-Router/releases';
export const LATEST_ORIGIN = 'https://navrouter.dev';
export const UNRELEASED_ORIGIN = 'https://staging.navrouter.dev';

export function versions() {
  const { version } = JSON.parse(readFileSync(resolve(PACKAGE_DIR, 'package.json'), 'utf8'));
  return { current: version, archived: VERSIONS.archived ?? [] };
}

const OUT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export const archivedItems = (archived, code = DEFAULT_LOCALE) =>
  archived.map((v) =>
    `<a class="pop-item" role="menuitem" href="${esc(v.url)}"><span>${
      t(code, 'version.archived', { version: esc(v.version) })
    }</span>${OUT}</a>`
  ).join('');

// the version and its menu, as html: the docs topbar and the homepage (an html string) both use it.
// on staging the unreleased item points the other way, at the released docs
export function versionMenu(site, code = DEFAULT_LOCALE) {
  const { current, archived } = versions();
  const onStaging = site?.origin === UNRELEASED_ORIGIN;
  const other = onStaging
    ? { label: t(code, 'version.released'), url: LATEST_ORIGIN }
    : { label: t(code, 'version.unreleased'), url: UNRELEASED_ORIGIN };
  return `<div class="version-menu" data-version-menu data-latest="${LATEST_ORIGIN}">
  <button class="version-button" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${
    t(code, 'version.button', { version: esc(current) })
  }">v${esc(current)}${CHEVRON}</button>
  <div class="pop-menu" role="menu" aria-label="${t(code, 'version.menu')}" hidden>
    <a class="pop-item" role="menuitem" href="${CHANGELOG_URL}" target="_blank" rel="noopener"><span>${
    t(code, 'version.changelog')
  }</span>${OUT}</a>
    <a class="pop-item" role="menuitem" href="${other.url}"><span>${other.label}</span>${OUT}</a>
    <div class="pop-archived" data-archived${archived.length ? '' : ' hidden'}>${archivedItems(archived, code)}</div>
  </div>
</div>`;
}
