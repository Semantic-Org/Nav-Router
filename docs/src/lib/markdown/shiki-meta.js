// carries a fence's meta onto its <pre>: for="core vue" and label="routes.js" mark a framework
// variant, `signature` marks a signature block. the remark pass has already grouped the fences
// (see remark-docs.js); this only labels the highlighted output.

export function parseMeta(raw = '') {
  const meta = {};
  raw.replace(/(\w+)="([^"]*)"|(\w+)(?![\w="])/g, (_, key, value, flag) => {
    if (key) { meta[key] = value; }
    else if (flag) { meta[flag] = true; }
    return '';
  });
  return meta;
}

export function transformerFenceMeta() {
  return {
    name: 'nav-router:fence-meta',
    pre(node) {
      const meta = parseMeta(this.options.meta?.__raw);
      if (meta.for) { node.properties['data-for'] = meta.for; }
      if (meta.label) { node.properties['data-label'] = meta.label; }
      if (meta.signature) { this.addClassToHast(node, 'signature'); }
      // a single line sits tighter: the padding that lets a long block breathe swamps one line
      if (!this.source.trim().includes('\n')) { this.addClassToHast(node, 'is-line'); }
      // the theme sets colors through variables; the inline style would pin the dark background
      delete node.properties.style;
      // the raw source, for the copy button
      node.properties['data-raw'] = this.source;
      return node;
    },
  };
}
