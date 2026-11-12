// an example's files, read at build: every file in its folder but example.md, as text
const RAW = import.meta.glob('../content/examples/*/*', { query: '?raw', import: 'default', eager: true });

// every example runs under the playground's own path, a sandbox detail the example's code shouldn't
// carry: this module, imported first and folded away in app.js, makes that path the router's base
// before routes.js creates the router
const SANDBOX = `import { Router } from 'nav-router';

Router.defaults.base = new URL('.', import.meta.url).pathname.replace(/\\/$/, '');
`;

export function filesFor(slug) {
  const files = { 'sandbox.js': SANDBOX };
  for (const [path, content] of Object.entries(RAW)) {
    const [, folder, name] = path.match(/examples\/([^/]+)\/([^/]+)$/) ?? [];
    if (folder === slug && name !== 'example.md') { files[name] = content; }
  }
  return files;
}
