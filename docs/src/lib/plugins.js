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

// options a plugin needs to do anything, shown in the setup as the router's own: dom renders into a mount
const REQUIRED_OPTIONS = { dom: "mount: '#app'" };

// the setup for a set of plugins, as nav-router's own examples write it: one import per plugin, for
// its effect, dom first, the renderer the others build on, and the plugins' options on the router
export function sampleFor(names) {
  const picked = PLUGINS.map((p) => p.name).filter((n) => names.includes(n))
    .sort((a, b) => (b === 'dom') - (a === 'dom'));
  const lines = [];
  picked.forEach((n) => lines.push(`import '@nav-router/plugins/${n}';`));
  if (!picked.length) { lines.push('// select plugins below to add them here'); }
  lines.push("import { router } from 'nav-router';", '');
  const options = picked.map((n) => REQUIRED_OPTIONS[n]).filter(Boolean);
  lines.push('const app = router({');
  options.forEach((option) => lines.push(`  ${option},`));
  lines.push('  // the routes', '});');
  return lines.join('\n');
}
