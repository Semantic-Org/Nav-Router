// the docs' languages. english is the source and sits at the root; every other language is served
// under its path (/ja/…, /zh-cn/…) from its folder, src/content/translations/<path>/, which mirrors
// src/content/: strings.json for the interface's words, and a file for each page it has translated.
// a page it hasn't is shown in english with a notice. a language appears on the site once enabled.
//
// the planned order is by community size and how much each relies on translated docs (late 2026):
// zh-CN and ja first, then pt-BR and es, then ko, then ru or fr; ar is the first right-to-left one.
//
// this module is plain js with no imports, so the astro config and the markdown passes can read it

export const DEFAULT_LOCALE = 'en';

// code is the language tag a page declares (lang="zh-CN"); path is the code in lower case, which
// is its url prefix and its folder
export const LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr', enabled: true },
  { code: 'zh-CN', name: '简体中文', dir: 'ltr', enabled: true },
  { code: 'ja', name: '日本語', dir: 'ltr', enabled: true },
  { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr', enabled: true },
  { code: 'es', name: 'Español', dir: 'ltr', enabled: true },
  { code: 'ko', name: '한국어', dir: 'ltr', enabled: true },
  { code: 'ru', name: 'Русский', dir: 'ltr', enabled: true },
  { code: 'fr', name: 'Français', dir: 'ltr', enabled: true },
  { code: 'ar', name: 'العربية', dir: 'rtl', enabled: true },
].map((l) => ({ ...l, path: l.code.toLowerCase() }));

export const ENABLED = LOCALES.filter((l) => l.enabled);
export const TRANSLATED = ENABLED.filter((l) => l.code !== DEFAULT_LOCALE);
export const localeOf = (code) => LOCALES.find((l) => l.code === code) ?? LOCALES[0];

// a site path in a language: english stays at the root, the rest take their path as a prefix
export const localePath = (path, code = DEFAULT_LOCALE) =>
  code === DEFAULT_LOCALE || !path.startsWith('/') ? path : `/${localeOf(code).path}${path}`;

// a path without its language: /ja/guides/x/ is /guides/x/
export function unlocalized(pathname) {
  const first = pathname.split('/')[1];
  return TRANSLATED.some((l) => l.path === first) ? pathname.slice(first.length + 1) || '/' : pathname;
}

// what astro's i18n config takes: it gives every page Astro.currentLocale, the code from its url
export const astroI18n = {
  defaultLocale: DEFAULT_LOCALE,
  locales: ENABLED.map((l) => (l.path === l.code ? l.code : { path: l.path, codes: [l.code] })),
};
