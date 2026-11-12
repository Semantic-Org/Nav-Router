import { frameworkOf, FRAMEWORKS } from './frameworks.js';
import { DEFAULT_LOCALE, localePath, t } from './i18n.js';
import { PLUGINS } from './plugins.js';

// the docs' order. an item points at a page by slug; a slug with no page yet is listed as a stub,
// so the shape of the docs is visible before every page exists.
//
// a group with `framework` is that framework's slot: the sidebar shows it only while the reader has
// picked that framework. its pages live under the framework's folder (guides/solid/…), so the same
// page for another framework is found by swapping the folder.

// what changes from one view layer to the next: how views are written and how they read the route.
// the shape is a sketch until the integrations settle
const FRAMEWORK_GUIDES = {
  core: [['Views and slots', 'dom-views'], ['Web components', 'web-components']],
  react: [['Quickstart', 'quickstart'], ['Components and hooks', 'components']],
  preact: [['Quickstart', 'quickstart'], ['Components and hooks', 'components']],
  solid: [['Quickstart', 'quickstart'], ['Views and props', 'views'], ['Reactive state', 'state']],
  vue: [['Quickstart', 'quickstart'], ['Components and composables', 'components']],
  svelte: [['Quickstart', 'quickstart'], ['Components and runes', 'components']],
  semantic: [['Quickstart', 'quickstart'], ['Templates and signals', 'templates']],
};

// an integration's own exports, listed only where the package exists
const FRAMEWORK_API = {
  react: [['ReactRouter', '#reactrouter', true], ['useRouter()', '#userouter', true], [
    'ReactView',
    '#reactview',
    true,
  ]],
  solid: [['SolidRouter', '#solidrouter', true], ['SolidView', '#solidview', true]],
};

// a section's or group's name is one of the interface's words (nav.… in content/strings.json): name
// is its key, and label is that name in english, for the pages that are only english
const named = (name) => ({ name, label: t(DEFAULT_LOCALE, name) });

// an item that isn't a page of its own (a landing, an anchor) is named the same way
const titled = (name) => ({ name, title: t(DEFAULT_LOCALE, name) });

const joinSlug = (section, fwSlug, page) =>
  page?.startsWith('#')
    ? `${section}/${fwSlug}${page}`
    : [section, fwSlug, page].filter(Boolean).join('/');

const frameworkGroups = (section) =>
  FRAMEWORKS.flatMap((f) => {
    const items = section === 'guides'
      ? FRAMEWORK_GUIDES[f.id] ?? []
      : f.pkg
      ? [['Overview', ''], ...(FRAMEWORK_API[f.id] ?? [])]
      : [];
    if (!items.length) { return []; }
    return [{
      label: section === 'api' ? f.pkg : f.label,
      framework: f.id,
      items: items.map(([title, page, symbol]) => ({
        title,
        slug: joinSlug(section, f.slug, page),
        ...(symbol && { symbol: true }),
      })),
    }];
  });

export const SECTIONS = [
  {
    key: 'guides',
    ...named('nav.guides'),
    groups: [
      {
        ...named('nav.group.start'),
        items: [
          { title: 'Introduction', slug: 'guides/introduction' },
          { title: 'Installation', slug: 'guides/installation' },
          { title: 'Your first router', slug: 'guides/first-router' },
        ],
      },
      ...frameworkGroups('guides'),
      {
        ...named('nav.group.routing'),
        items: [
          { title: 'Routes and params', slug: 'guides/routes-and-params' },
          { title: 'Layouts and slots', slug: 'guides/layouts-and-slots' },
          { title: 'Loading data', slug: 'guides/loading-data' },
          { title: 'Guards and redirects', slug: 'guides/guards' },
          { title: 'Navigation and links', slug: 'guides/navigation' },
          { title: 'Loading states and errors', slug: 'guides/loading-states' },
        ],
      },
      {
        ...named('nav.group.going-further'),
        items: [
          { title: 'Writing a plugin', slug: 'guides/writing-a-plugin' },
          { title: 'Writing an integration', slug: 'guides/writing-an-integration' },
          { title: 'Server rendering', slug: 'guides/server-rendering' },
        ],
      },
    ],
  },
  {
    key: 'api',
    ...named('nav.api'),
    groups: [
      ...frameworkGroups('api'),
      {
        ...named('nav.group.classes'),
        items: [
          { title: 'Router', slug: 'api/router', symbol: true },
          { title: 'Route', slug: 'api/route', symbol: true },
          { title: 'Navigator', slug: 'api/navigator', symbol: true },
          { title: 'View', slug: 'api/view', symbol: true },
          { title: 'ReactiveRouter', slug: 'api/reactive-router', symbol: true },
        ],
      },
      {
        ...named('nav.group.functions'),
        items: [
          { title: 'router()', slug: 'api/router#router', symbol: true },
          { title: 'navigate()', slug: 'api/router#navigate', symbol: true },
          { title: 'replace()', slug: 'api/router#replace', symbol: true },
          { title: 'update()', slug: 'api/update', symbol: true },
          { title: 'href()', slug: 'api/router#href', symbol: true },
          { title: 'back()', slug: 'api/router#back', symbol: true },
          { title: 'isActive()', slug: 'api/is-active', symbol: true },
          { title: 'isCurrent()', slug: 'api/is-active#iscurrent', symbol: true },
          { title: 'canAccess()', slug: 'api/can-access', symbol: true },
          { title: 'lazy()', slug: 'api/lazy', symbol: true },
        ],
      },
      {
        ...named('nav.group.options'),
        items: [
          { ...titled('nav.item.routerSettings'), slug: 'api/router#settings' },
          { title: 'Route options', slug: 'api/route-options' },
        ],
      },
    ],
  },
  {
    key: 'examples',
    ...named('nav.examples'),
    groups: [
      { ...named('nav.examples'), items: [{ ...titled('nav.item.allExamples'), slug: 'examples' }] },
      {
        ...named('nav.group.start'),
        items: [
          { title: 'Your first router', slug: 'examples/first-router' },
        ],
      },
      {
        ...named('nav.group.data-and-loading'),
        items: [
          { title: 'Loading states', slug: 'examples/loading-states' },
          { title: 'Back and forward', slug: 'examples/back-and-forward' },
          { title: 'Not found', slug: 'examples/not-found' },
        ],
      },
      {
        ...named('nav.group.params-and-guards'),
        items: [
          { title: 'Query params', slug: 'examples/query-params' },
          { title: 'Guards and sign-in', slug: 'examples/guards' },
        ],
      },
    ],
  },
  {
    key: 'plugins',
    ...named('nav.plugins'),
    groups: [
      {
        ...named('nav.plugins'),
        items: [
          { ...titled('nav.item.allPlugins'), slug: 'plugins' },
          { title: 'Writing a plugin', slug: 'guides/writing-a-plugin' },
        ],
      },
      {
        ...named('nav.group.reference'),
        items: [
          ...PLUGINS.map(({ name }) => ({ title: name, slug: `plugins/${name}`, symbol: true })),
        ],
      },
    ],
  },
];

// a nav item's href, in a language (english at the root, the rest under their path)
export const hrefFor = (slug, code) => {
  const [path, hash] = slug.split('#');
  return `${localePath(`/${path}/`, code)}${hash ? `#${hash}` : ''}`;
};

// the nav for a page, in a language: every item knows whether its page exists and whether it is
// this page. sections and groups go by their name in the language, and a page translated into it
// (titles, by slug) goes by its translated title
export function navFor(ids, currentId, { code = DEFAULT_LOCALE, titles = new Map() } = {}) {
  const exists = new Set(ids);
  const label = (it) => (it.name ? t(code, it.name) : it.label);
  return SECTIONS.map((section) => ({
    ...section,
    label: label(section),
    href: hrefFor(
      section.groups.flatMap((g) => g.items).find((it) => exists.has(it.slug.split('#')[0]))?.slug ?? section.key,
      code,
    ),
    groups: section.groups.map((g) => ({
      ...g,
      label: label(g),
      items: g.items.map((it) => {
        const page = it.slug.split('#')[0];
        const title = it.name ? t(code, it.name) : it.slug.includes('#') ? it.title : (titles.get(page) ?? it.title);
        return { ...it, title, href: exists.has(page) ? hrefFor(it.slug, code) : null, current: it.slug === currentId };
      }),
    })),
  }));
}

// previous and next among the pages that exist, in nav order, within the section
export function pagerFor(ids, currentId) {
  const exists = new Set(ids);
  const section = SECTIONS.find((s) => s.key === currentId.split('/')[0]);
  // a shared page pages through shared pages; a framework's page through those and its own
  const fw = frameworkOf(currentId);
  const pages = section.groups.flatMap((g) => g.items)
    .filter((it) => !it.slug.includes('#') && exists.has(it.slug))
    .filter((it) => [null, fw].includes(frameworkOf(it.slug)));
  const i = pages.findIndex((it) => it.slug === currentId);
  return { prev: pages[i - 1] ?? null, next: pages[i + 1] ?? null };
}
