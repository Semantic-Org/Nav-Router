// an example's files, read at build: every file in its folder but example.md, as text
const RAW = import.meta.glob('../content/examples/*/*', { query: '?raw', import: 'default', eager: true });

export function filesFor(slug) {
  const files = {};
  for (const [path, content] of Object.entries(RAW)) {
    const [, folder, name] = path.match(/examples\/([^/]+)\/([^/]+)$/) ?? [];
    if (folder === slug && name !== 'example.md') { files[name] = content; }
  }
  return files;
}
