// the plugins, one list for the landing page, the sidebar and the homepage table. descriptions follow
// each plugin's own header comment in nav-router/src/plugins; sizes are measured at build.

export const PLUGINS = [
  {
    name: 'head',
    short: 'Title, meta and canonical tags per page',
    category: 'Document',
    description: 'Title, meta tags and canonical link for each page, merged down the active routes.',
  },
  {
    name: 'view-transitions',
    short: 'Each page change inside a view transition',
    category: 'Motion',
    description:
      'Crosses each page change inside a view transition, so what leaves animates out and what appears animates in.',
  },
  {
    name: 'announcer',
    short: 'Tells screen readers the page changed',
    category: 'Accessibility',
    description: 'Announces each new page through a live region, where Safari stays silent on intercepted navigations.',
  },
  {
    name: 'confirm-leave',
    short: 'Asks before leaving unsaved work',
    category: 'Forms',
    description: 'Holds unsaved forms and edits across link clicks, back and forward, and closing the tab.',
  },
  {
    name: 'preload-intent',
    short: 'Warms a route’s code on hover or focus',
    category: 'Performance',
    description:
      'Warms a link’s view code on hover, focus or touch, and adds `router.preload()` for warming one by hand.',
  },
  {
    name: 'chunk-reload',
    short: 'Recovers when a deploy removes old chunks',
    category: 'Resilience',
    description: 'Recovers once when a fresh deploy has removed the old code chunk a page needs.',
  },
  {
    name: 'timeline',
    short: 'Navigations in the devtools performance panel',
    category: 'Devtools',
    description: 'Draws each navigation and its steps in the devtools performance panel.',
  },
  {
    name: 'sitemap',
    short: 'Every route, for a crawler or generator',
    category: 'Tooling',
    description: 'Lists every route as a page a crawler or a generator can read, and adds `router.sitemap()`.',
  },
  {
    name: 'dom',
    short: 'String and element views, no framework',
    category: 'Rendering',
    description: 'Renders views as markup or elements into the page’s `<slot>`s, with no framework.',
  },
];

// the binding a plugin imports under: view-transitions → viewTransitions
export const bindingFor = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

// options a plugin needs to do anything, shown in the setup: dom renders into a mount
const REQUIRED_OPTIONS = { dom: "{ mount: '#app' }" };

// the setup for a set of plugins, as nav-router's own examples write it, day.js style: one import
// and one Router.extend() per plugin. dom goes first, the renderer the others build on
export function sampleFor(names) {
  const picked = PLUGINS.map((p) => p.name).filter((n) => names.includes(n))
    .sort((a, b) => (b === 'dom') - (a === 'dom'));
  const lines = ["import { Router } from 'nav-router';"];
  picked.forEach((n) => lines.push(`import ${bindingFor(n)} from 'nav-router/plugins/${n}';`));
  lines.push('');
  if (!picked.length) { lines.push('// select plugins below to add them here'); }
  picked.forEach((n) =>
    lines.push(`Router.extend(${bindingFor(n)}${REQUIRED_OPTIONS[n] ? `, ${REQUIRED_OPTIONS[n]}` : ''});`)
  );
  return lines.join('\n');
}
