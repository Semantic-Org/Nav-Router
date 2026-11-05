// the frameworks a reader can pick, shared by the build (the sidebar's framework slots) and the
// browser (the picker, code variants). `slug` is the framework's folder in a url: a page under
// guides/solid/ or api/solid/ belongs to Solid alone.

export const FRAMEWORKS = [
  { id: 'core', slug: 'vanilla', label: 'Vanilla JS', pkg: null },
  { id: 'react', slug: 'react', label: 'React', pkg: '@nav-router/react' },
  { id: 'preact', slug: 'preact', label: 'Preact', pkg: '@nav-router/preact' },
  { id: 'solid', slug: 'solid', label: 'Solid', pkg: '@nav-router/solid' },
  { id: 'vue', slug: 'vue', label: 'Vue', pkg: '@nav-router/vue' },
  { id: 'svelte', slug: 'svelte', label: 'Svelte', pkg: '@nav-router/svelte' },
  { id: 'semantic', slug: 'semantic', label: 'Semantic UI', pkg: '@nav-router/semantic' },
];

// a code block with no variant for the reader's framework borrows one: preact's is react's, then
// every framework falls back to the core version
export const FALLBACK = { preact: ['react'] };

export const fwById = (id) => FRAMEWORKS.find((f) => f.id === id) ?? FRAMEWORKS[0];

// the framework a page belongs to, from its id (guides/solid/quickstart → solid), or null for a
// page every framework shares
export function frameworkOf(id) {
  const segment = id.split('#')[0].split('/')[1];
  return FRAMEWORKS.find((f) => f.slug === segment)?.id ?? null;
}

// the same page for another framework: guides/solid/quickstart → guides/react/quickstart
export function swapFramework(id, fw) {
  const [section, , ...rest] = id.split('/');
  return [section, fwById(fw).slug, ...rest].join('/');
}
