import { PLUGINS } from './plugins.js';

// the docs' order. an item points at a page by slug; a slug with no page yet is listed as a stub,
// so the shape of the docs is visible before every page exists.

export const SECTIONS = [
  {
    key: 'guides',
    label: 'Guides',
    groups: [
      {
        label: 'Start',
        items: [
          { title: 'Introduction', slug: 'guides/introduction' },
          { title: 'Installation', slug: 'guides/installation' },
          { title: 'Your first router', slug: 'guides/first-router' },
        ],
      },
      {
        label: 'Routing',
        items: [
          { title: 'Routes and params', slug: 'guides/routes-and-params' },
          { title: 'Layouts and slots', slug: 'guides/layouts-and-slots' },
          { title: 'Loading data', slug: 'guides/loading-data' },
          { title: 'Guards and redirects', slug: 'guides/guards' },
          { title: 'Loading states', slug: 'guides/loading-states' },
        ],
      },
      {
        label: 'Going further',
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
    label: 'API',
    groups: [
      {
        label: 'Classes',
        items: [
          { title: 'Router', slug: 'api/router', symbol: true },
          { title: 'Route', slug: 'api/route', symbol: true },
          { title: 'Navigator', slug: 'api/navigator', symbol: true },
        ],
      },
      {
        label: 'Functions',
        items: [
          { title: 'router()', slug: 'api/router-fn', symbol: true },
          { title: 'navigate()', slug: 'api/router#navigate', symbol: true },
          { title: 'href()', slug: 'api/router#href', symbol: true },
          { title: 'back()', slug: 'api/router#back', symbol: true },
          { title: 'isActive()', slug: 'api/is-active', symbol: true },
          { title: 'canAccess()', slug: 'api/can-access', symbol: true },
          { title: 'lazy()', slug: 'api/lazy', symbol: true },
        ],
      },
      {
        label: 'Options',
        items: [
          { title: 'Router settings', slug: 'api/router#settings' },
          { title: 'Route options', slug: 'api/route-options' },
        ],
      },
    ],
  },
  {
    key: 'examples',
    label: 'Examples',
    groups: [
      { label: 'Examples', items: [{ title: 'All examples', slug: 'examples' }] },
      {
        label: 'Start',
        items: [
          { title: 'Your first router', slug: 'examples/first-router' },
        ],
      },
      {
        label: 'Data and loading',
        items: [
          { title: 'Loading states', slug: 'examples/loading-states' },
          { title: 'Back and forward', slug: 'examples/back-and-forward' },
          { title: 'Not found', slug: 'examples/not-found' },
        ],
      },
      {
        label: 'Params and guards',
        items: [
          { title: 'Query params', slug: 'examples/query-params' },
          { title: 'Guards and sign-in', slug: 'examples/guards' },
        ],
      },
    ],
  },
  {
    key: 'plugins',
    label: 'Plugins',
    groups: [
      {
        label: 'Plugins',
        items: [
          { title: 'All plugins', slug: 'plugins' },
          { title: 'Writing a plugin', slug: 'guides/writing-a-plugin' },
        ],
      },
      {
        label: 'Reference',
        items: [
          ...PLUGINS.map(({ name }) => ({ title: name, slug: `plugins/${name}`, symbol: true })),
        ],
      },
    ],
  },
];

export const hrefFor = (slug) => {
  const [path, hash] = slug.split('#');
  return `/${path}/${hash ? `#${hash}` : ''}`;
};

// the nav for a page: every item knows whether its page exists and whether it is this page
export function navFor(ids, currentId) {
  const exists = new Set(ids);
  return SECTIONS.map((section) => ({
    ...section,
    href: hrefFor(
      section.groups.flatMap((g) => g.items).find((it) => exists.has(it.slug.split('#')[0]))?.slug ?? section.key,
    ),
    groups: section.groups.map((g) => ({
      ...g,
      items: g.items.map((it) => {
        const page = it.slug.split('#')[0];
        return { ...it, href: exists.has(page) ? hrefFor(it.slug) : null, current: it.slug === currentId };
      }),
    })),
  }));
}

// previous and next among the pages that exist, in nav order, within the section
export function pagerFor(ids, currentId) {
  const exists = new Set(ids);
  const section = SECTIONS.find((s) => s.key === currentId.split('/')[0]);
  const pages = section.groups.flatMap((g) => g.items).filter((it) => !it.slug.includes('#') && exists.has(it.slug));
  const i = pages.findIndex((it) => it.slug === currentId);
  return { prev: pages[i - 1] ?? null, next: pages[i + 1] ?? null };
}
