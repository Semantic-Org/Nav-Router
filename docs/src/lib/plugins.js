// the plugins, one list for the landing page, the sidebar and the homepage table. a plugin's words are
// in content/strings.json: its description (plugins.<name>.description, following its own header
// comment in nav-router/src/plugins) and its category's name (plugins.category.<category>). sizes
// are measured at build.

export const PLUGINS = [
  {
    name: 'head',
    category: 'document',
  },
  {
    name: 'view-transitions',
    category: 'motion',
  },
  {
    name: 'announcer',
    category: 'accessibility',
  },
  {
    name: 'confirm-leave',
    category: 'forms',
  },
  {
    name: 'preload-intent',
    category: 'performance',
  },
  {
    name: 'chunk-reload',
    category: 'resilience',
  },
  {
    name: 'timeline',
    category: 'devtools',
  },
  {
    name: 'sitemap',
    category: 'tooling',
  },
];

// the binding a plugin imports under: view-transitions → viewTransitions
export const bindingFor = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase());

// the setup for a set of plugins, as nav-router's own examples write it: one import per plugin, for
// its effect, beside the router, which renders the dom without one.
// hint is the comment an empty setup carries, in the page's language (plugins.sample.empty)
export function sampleFor(names, hint) {
  const picked = PLUGINS.map((p) => p.name).filter((n) => names.includes(n));
  const lines = [];
  picked.forEach((n) => lines.push(`import '@nav-router/plugins/${n}';`));
  if (!picked.length) { lines.push(`// ${hint}`); }
  lines.push("import { router } from 'nav-router';", '');
  lines.push('const app = router({');
  lines.push("  mount: '#app',");
  lines.push('  // the routes', '});');
  return lines.join('\n');
}
