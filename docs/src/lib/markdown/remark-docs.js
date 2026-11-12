// the docs' markdown conventions, so pages stay plain .md:
//
//   :::note[Title] … :::        callouts: note, tip, warning, danger
//   :::steps  1. … :::          a numbered sequence
//   :::entry  ### `fn()` :::    a reference entry (method or function)
//   :::truth  | table | :::     a table of answers; true/false cells are tinted
//   :kind[method]               the kind pill beside a symbol heading
//
//   ```js title="app.js"                       one block with a file name
//   ```js for="core vue" label="routes.js"     consecutive fences become one block of variants
//   ```js signature                            a signature, no chrome
//   ```params / ```returns                     yaml, rendered as parameter rows
//
// everything becomes mdast nodes carrying hName/hProperties, except the svg icons and the yaml
// blocks, which are raw html built here from escaped text.

import { parse as parseYaml } from 'yaml';

import { localePath, LOCALES } from '../locales.js';
import { esc, inline } from './inline.js';
import { parseMeta } from './shiki-meta.js';

const ICONS = {
  note:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  tip:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3Z"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01"/></svg>',
  danger:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
};
const CALLOUTS = new Set(Object.keys(ICONS));

const el = (tag, props, children = []) => ({ type: `docs-${tag}`, data: { hName: tag, hProperties: props }, children });
const html = (value) => ({ type: 'html', value });

/* ---------- parameters ---------- */

function paramRow(p) {
  const flag = p.required ? '<span class="param-flag">required</span>' : '';
  const def = p.default !== undefined
    ? `<span class="param-default">default <code>${esc(p.default)}</code></span>`
    : '';
  const nested = p.options?.length
    ? `<details><summary>${p.options.length} options</summary><div class="params">${
      p.options.map(paramRow).join('')
    }</div></details>`
    : '';
  return `<div class="param"><div class="param-head"><span class="param-name">${esc(p.name)}</span>`
    + `<span class="param-type">${esc(p.type ?? '')}</span>${flag}${def}</div>`
    + `${p.description ? `<p>${inline(p.description)}</p>` : ''}${nested}</div>`;
}

const paramsBlock = (yaml) => html(`<div class="params">${(parseYaml(yaml) ?? []).map(paramRow).join('')}</div>`);
const returnsBlock = (yaml) => {
  const r = parseYaml(yaml) ?? {};
  return html(
    `<div class="returns"><span class="param-type">${esc(r.type ?? '')}</span>${
      r.description ? `<p>${inline(r.description)}</p>` : ''
    }</div>`,
  );
};

/* ---------- code ---------- */

const copyButton = () => el('button', { className: ['copy'], type: 'button', dataCopy: '' });

// one fence, optionally titled
function codeBlock(node) {
  const meta = parseMeta(node.meta ?? '');
  if (meta.signature) { return node; }
  const head = meta.title
    ? [
      el('div', { className: ['code-head'] }, [
        el('span', { className: ['code-file'] }, [{ type: 'text', value: meta.title }]),
        copyButton(),
      ]),
    ]
    : [];
  return el('div', { className: ['code'] }, [...head, node]);
}

// consecutive variant fences share one block: tabs, the fallback note, a copy button, and a .swap
// so the block keeps the size of its largest variant
function variantsBlock(nodes) {
  return el('div', { className: ['code'], dataVariants: '' }, [
    el('div', { className: ['code-head'] }, [
      el('div', { role: 'tablist', ariaLabel: 'Code version', dataVariantTabs: '' }),
      el('span', { className: ['code-note'], dataVariantNote: '' }),
      copyButton(),
    ]),
    el('div', { className: ['swap'] }, nodes),
  ]);
}

const isVariant = (n) => n?.type === 'code' && /\bfor="/.test(n.meta ?? '');

function transformChildren(parent) {
  if (!parent.children) { return; }
  const out = [];
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i];
    if (isVariant(node)) {
      const group = [node];
      while (isVariant(parent.children[i + 1])) { group.push(parent.children[++i]); }
      out.push(variantsBlock(group));
      continue;
    }
    if (node.type === 'code') {
      if (node.lang === 'params') { out.push(paramsBlock(node.value)); }
      else if (node.lang === 'returns') { out.push(returnsBlock(node.value)); }
      else { out.push(codeBlock(node)); }
      continue;
    }
    out.push(transformNode(node));
  }
  parent.children = out;
}

/* ---------- directives ---------- */

function transformNode(node) {
  if (node.type === 'containerDirective') {
    const label = node.children[0]?.data?.directiveLabel ? node.children.shift() : null;
    transformChildren(node);
    if (CALLOUTS.has(node.name)) {
      if (label) { label.data = { hName: 'p', hProperties: { className: ['callout-title'] } }; }
      return el('div', { className: ['callout'], dataKind: node.name }, [
        html(ICONS[node.name]),
        el('div', {}, label ? [label, ...node.children] : node.children),
      ]);
    }
    if (node.name === 'steps') {
      const list = node.children.find((c) => c.type === 'list');
      if (list) { list.data = { hProperties: { className: ['steps'] } }; }
      return list ?? el('div', {}, node.children);
    }
    if (node.name === 'entry') { return el('section', { className: ['entry'] }, node.children); }
    if (node.name === 'truth') { return el('div', { className: ['truth'] }, node.children); }
    return el('div', { className: [node.name] }, node.children);
  }
  if (node.type === 'textDirective' && node.name === 'kind') {
    // the pill's text lives in an attribute, so headings collect only the symbol for the toc
    const kind = node.children.map((c) => c.value ?? '').join('');
    return el('span', { className: ['kind'], dataKind: kind });
  }
  // a heading ending in a kind pill: the space before the pill would end up in its id ('navigate-')
  if (node.type === 'heading') {
    transformChildren(node);
    const last = node.children.at(-1);
    const before = node.children.at(-2);
    if (last?.data?.hProperties?.className?.includes('kind') && before?.type === 'text') {
      before.value = before.value.trimEnd();
    }
    if (before?.value === '') { node.children.splice(-2, 1); }
    return node;
  }
  // any other ":word" was prose (og:image, 10:30), not a directive: give it back as text
  if (node.type === 'textDirective' || node.type === 'leafDirective') {
    const text = node.children.map((c) => c.value ?? '').join('');
    const value = `${node.type === 'leafDirective' ? '::' : ':'}${node.name}${text ? `[${text}]` : ''}`;
    return node.type === 'leafDirective'
      ? { type: 'paragraph', children: [{ type: 'text', value }] }
      : { type: 'text', value };
  }
  transformChildren(node);
  return node;
}

// a translation links as english does (/guides/…); in its language those links take its prefix
function localizeLinks(node, code) {
  if (node.type === 'link') { node.url = localePath(node.url, code); }
  node.children?.forEach((child) => localizeLinks(child, code));
}

export function remarkDocs() {
  return (tree, file) => {
    transformChildren(tree);
    const folder = file.path?.match(/content\/translations\/([^/]+)\//)?.[1];
    const locale = LOCALES.find((l) => l.path === folder);
    if (locale) { localizeLinks(tree, locale.code); }
  };
}
