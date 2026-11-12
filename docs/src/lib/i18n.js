// the docs in a language: the interface's words, a page's translation, and the language menu. the
// languages themselves are in lib/locales.js. a page learns its language from its url
// (Astro.currentLocale) and passes that code to the functions here.
import { getCollection } from 'astro:content';

import english from '../content/strings.json';
import { DEFAULT_LOCALE, ENABLED, localeOf, localePath, TRANSLATED, unlocalized } from './locales.js';
import { sourceHash } from './source-hash.js';

export * from './locales.js';

/* ---------- the interface's words ---------- */

// by key, from src/content/strings.json; a language's own are translations/<path>/strings.json with
// the keys it covers, and a key it lacks reads in english. a key names one wording: when the english
// changes what it says, it takes a new key, so no language keeps a translation of the old one
const STRINGS = Object.fromEntries(
  Object.entries(import.meta.glob('../content/translations/*/strings.json', { eager: true, import: 'default' }))
    .map(([file, strings]) => [file.split('/').at(-2), strings]),
);
const stringsOf = (code) => STRINGS[localeOf(code).path] ?? {};

// the words that tell a reader a page isn't in their language yet must be in their language, so a
// language can't be enabled without them
for (const { code, path } of TRANSLATED) {
  const missing = Object.keys(english).filter((key) => key.startsWith('language.') && !stringsOf(code)[key]);
  if (missing.length) { throw new Error(`translations/${path}/strings.json is missing ${missing.join(', ')}`); }
}

// whether a language has words of its own under a prefix ('home.'): how a page made of keys knows
// it's translated
export const hasStrings = (code, prefix) => Object.keys(stringsOf(code)).some((key) => key.startsWith(prefix));

// a language's words are a machine translation until someone has reviewed them: its strings.json
// says "$reviewed": false, and the line goes when someone has
export const draftStrings = (code) => stringsOf(code).$reviewed === false;

// the languages a page made of keys is written in: english, and each that has its words. a search
// engine is told only of the ones that have been reviewed
export const languagesWith = (prefix, { reviewed = false } = {}) => [
  DEFAULT_LOCALE,
  ...TRANSLATED
    .filter((l) => hasStrings(l.code, prefix) && !(reviewed && draftStrings(l.code))).map((l) => l.code),
];

// what a page's main takes when it shows english inside another language's frame: it says so, and
// reads left to right even where the frame reads right to left
export const englishIn = (code) => ({ lang: DEFAULT_LOCALE, dir: localeOf(code).dir === 'rtl' ? 'ltr' : undefined });

// text that isn't a key comes back as it is, so a name (a framework's) can pass through
const text = (code, key) => stringsOf(code)[key] ?? english[key] ?? key;
export function t(code, key, vars = {}) {
  return text(code, key).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

// the keys the site's scripts ask for (ui('…') and plural('…') in src/scripts and in a component's own script), found by reading
// them, so a page hands its scripts those words and no others. a plural is a family, key.one,
// key.other and the rest, and a language may have forms english doesn't. the homepage's (home.…)
// go to the homepage alone
const SCRIPTS = Object.values(import.meta.glob(
  ['../scripts/*.js', '../components/*.astro', '../views/*.astro', '../layouts/*.astro'],
  { eager: true, query: '?raw', import: 'default' },
));
const keysIn = (call) => [
  ...new Set(
    SCRIPTS.flatMap((source) => [...source.matchAll(new RegExp(`\\b${call}\\(([^)]*)`, 'g'))])
      .flatMap(([, args]) => [...args.matchAll(/'([a-z]+\.[\w.-]+)'/gi)].map(([, key]) => key)),
  ),
];
const SCRIPT_KEYS = keysIn('ui');
const SCRIPT_PLURALS = keysIn('plural');
export function scriptStrings(code, { home = false } = {}) {
  // a family comes whole from the language once it has written any of it, so an english form is
  // never mixed in among its own
  const own = stringsOf(code);
  const forms = SCRIPT_PLURALS.flatMap((family) => {
    const of = (strings) => Object.keys(strings).filter((key) => key.startsWith(`${family}.`));
    return of(own).length ? of(own) : of(english);
  });
  return Object.fromEntries(
    [...SCRIPT_KEYS, ...forms]
      .filter((key) => home || !key.startsWith('home.'))
      .map((key) => [key, text(code, key)]),
  );
}

// a date as the language writes it
export const formatDate = (code, date) =>
  date.toLocaleDateString(code, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/* ---------- a page in a language ---------- */

// a translation is the english file's twin under the language's folder:
// content/docs/guides/x.md → content/translations/ja/docs/guides/x.md. it holds the words (title,
// lede, body) and source, the hash of the english it was made from; everything else is the english
// page's. with no twin the page is the english one. a twin that says reviewed: false is a draft: a
// machine translation shown with a notice, and kept from search engines until someone has reviewed it
let twins;
export async function inLanguage(entry, code) {
  if (code === DEFAULT_LOCALE) { return { page: entry, translated: true, stale: false, draft: false }; }
  twins ??= new Map((await getCollection('translations')).map((e) => [e.filePath, e]));
  const twin = twins.get(entry.filePath.replace('/content/', `/content/translations/${localeOf(code).path}/`));
  if (!twin) { return { page: entry, translated: false, stale: false, draft: false }; }
  const { source, reviewed, ...words } = twin.data;
  const own = Object.fromEntries(Object.entries(words).filter(([, value]) => value !== undefined));
  return {
    page: { ...twin, id: entry.id, data: { ...entry.data, ...own } },
    translated: true,
    stale: source !== sourceHash(entry),
    draft: reviewed === false,
  };
}

// the title of every page translated into a language, by its slug in the nav (a doc's is its id,
// an example's is examples/<id>), so the nav and the pagers name a page as its translation does
export async function titlesIn(code) {
  if (code === DEFAULT_LOCALE) { return new Map(); }
  const titled = async (collection, slug) =>
    (await Promise.all((await getCollection(collection)).map((entry) => inLanguage(entry, code))))
      .filter((p) => p.translated).map((p) => [slug(p.page.id), p.page.data.title]);
  return new Map([...await titled('docs', (id) => id), ...await titled('examples', (id) => `examples/${id}`)]);
}

/* ---------- the language menu ---------- */

const CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';

// as html for either topbar: the same page in each enabled language. absent while english is the
// only one
export function languageMenu(pathname, code) {
  if (ENABLED.length < 2) { return ''; }
  const path = unlocalized(pathname);
  const items = ENABLED.map((l) => {
    const on = l.code === code;
    return `<a class="pop-item" role="menuitemradio" data-language-pick="${l.code}" aria-checked="${on}" href="${
      localePath(path, l.code)
    }" hreflang="${l.code}" lang="${l.code}"><span>${l.name}</span>${on ? CHECK : ''}</a>`;
  }).join('');
  return `<div class="version-menu language-menu" data-menu>
  <button class="version-button" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${
    t(code, 'language.label')
  }: ${localeOf(code).name}">${code}${CHEVRON}</button>
  <div class="pop-menu" role="menu" aria-label="${t(code, 'language.label')}" hidden>${items}</div>
</div>`;
}

// the same choice for narrow screens, where the topbar has no room for the menu: a native select,
// in the menu drawer. picking a language goes to the page in it (scripts/site.js)
export function languageSelect(pathname, code) {
  if (ENABLED.length < 2) { return ''; }
  const path = unlocalized(pathname);
  const options = ENABLED.map((l) =>
    `<option value="${localePath(path, l.code)}" data-code="${l.code}" lang="${l.code}"${
      l.code === code ? ' selected' : ''
    }>${l.name}</option>`
  ).join('');
  return `<label class="language-select"><span>${
    t(code, 'language.label')
  }</span><select data-language-select>${options}</select></label>`;
}

// the languages a page is written in, and of those the ones it's reviewed in: readers are offered
// the first, search engines told of the second
export async function languagesOf(entry) {
  const states = await Promise.all(ENABLED.map(async (l) => ({ code: l.code, ...await inLanguage(entry, l.code) })));
  const written = states.filter((s) => s.translated);
  return { writtenIn: written.map((s) => s.code), translatedIn: written.filter((s) => !s.draft).map((s) => s.code) };
}

// what a page hands the script that offers a reader their language (layouts/Base.astro): the page in
// each other language it's written in, with the offer in that language's own words, and the question
// asked after a switch, in the page's
export function languageOffer(pathname, code, writtenIn) {
  const path = unlocalized(pathname);
  return {
    page: code,
    english: DEFAULT_LOCALE,
    // the page under every language, written in it or not: where a reader who always reads in one goes
    paths: Object.fromEntries(ENABLED.map((l) => [l.code, localePath(path, l.code)])),
    others: writtenIn.filter((other) => other !== code).map((other) => ({
      code: other,
      dir: localeOf(other).dir,
      href: localePath(path, other),
      offer: t(other, 'language.offer'),
      go: t(other, 'language.go'),
      dismiss: t(other, 'language.dismiss'),
    })),
    remember: {
      ask: t(code, 'language.remember'),
      yes: t(code, 'language.remember.yes'),
      no: t(code, 'language.remember.no'),
    },
  };
}

// every translation its english has moved past, with the hash to give its source: once it says what
// the english now says. a change to a page's code alone is carried over by hand, with no translator
export async function behind() {
  const english = new Map(
    (await Promise.all(['docs', 'examples'].map((collection) => getCollection(collection)))).flat()
      .map((entry) => [entry.filePath, entry]),
  );
  return (await getCollection('translations')).flatMap((twin) => {
    const entry = english.get(twin.filePath.replace(/\/translations\/[^/]+\//, '/'));
    if (!entry) { return [{ file: twin.filePath, orphan: true }]; }
    const source = sourceHash(entry);
    return twin.data.source === source ? [] : [{ file: twin.filePath, english: entry.filePath, source }];
  });
}
