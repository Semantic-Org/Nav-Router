// checks docs pages for what the dev server and a read of the page both miss. the dev server keeps
// serving a page's last good render when its markdown breaks, a yaml value that isn't text renders
// as [object Object], and a name imported in a sample that the package doesn't export looks as
// plausible as one it does. the page goes through the site's own markdown pass, and its samples'
// imports are held against the nav-router checkout beside these docs.
//
//   node scripts/check-page.mjs src/content/docs/api/lazy.md src/content/docs/plugins/*.md
//
// exits 1 on an error. a link to a page or a heading that isn't written yet is a warning, since
// pages are written side by side: once they are all in, a run over every page should print none.
// it does not run the samples.
import GithubSlugger from 'github-slugger';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { parse as parseYaml } from 'yaml';

import { FRAMEWORKS } from '../src/lib/frameworks.js';
import { remarkDocs } from '../src/lib/markdown/remark-docs.js';
import { parseMeta } from '../src/lib/markdown/shiki-meta.js';

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, '../src/content');
// the repo root above these docs in the monorepo, else the sibling nav-router checkout
const NAV_ROUTER = [resolve(here, '../..'), resolve(here, '../../../nav-router')]
  .find((dir) => existsSync(resolve(dir, 'src/index.js')));

const DIRECTIVES = ['note', 'tip', 'warning', 'danger', 'for', 'steps', 'entry', 'truth'];
const KINDS = ['class', 'function', 'plugin'];
const parser = unified().use(remarkParse).use(remarkDirective);

// what each package a sample may import from exports. the core and the reactive scaffold are
// loaded, so their names are the real ones; an integration needs its framework to load, so its
// names are read from its source, with the core's, which it re-exports
const exportsOf = async (file) => Object.keys(await import(pathToFileURL(resolve(NAV_ROUTER, file)).href));
const core = await exportsOf('src/index.js');
const declared = (file) => {
  const source = readFileSync(file, 'utf8');
  const named = [...source.matchAll(/export\s+(?:const|class|function)\s+(\w+)/g)].map((m) => m[1]);
  const listed = [...source.matchAll(/export\s*\{([^}]*)\}/g)]
    .flatMap((m) => m[1].split(',').map((name) => name.trim().split(/\s+as\s+/).pop()));
  return [...named, ...listed].filter(Boolean);
};
async function packageExports(source) {
  if (source === 'nav-router' || source === '@nav-router/core') { return core; }
  if (source === 'nav-router/reactive') { return exportsOf('src/reactive-router.js'); }
  const [, scoped, plugin] = source.match(/^@nav-router\/([\w-]+)(?:\/([\w-]+))?$/) ?? [];
  if (scoped === 'plugins') {
    return existsSync(resolve(NAV_ROUTER, 'packages/plugins/src', `${plugin}.js`)) ? [] : null;
  }
  const integration = scoped && resolve(NAV_ROUTER, 'integrations', scoped, 'index.js');
  return integration && existsSync(integration) ? [...declared(integration), ...core] : null;
}

// a heading's id as the site makes it: its text without the kind pill
const headingText = (node) =>
  node.children.map((c) => (c.type === 'textDirective' ? '' : c.value ?? headingText(c))).join('').trim();
function anchorsOf(body) {
  const slugger = new GithubSlugger();
  const anchors = new Set();
  visit(parser.parse(body), 'heading', (node) => anchors.add(slugger.slug(headingText(node))));
  return anchors;
}
const split = (source) => {
  const [, front = '', body = source] = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [];
  return { front, body, offset: front ? front.split('\n').length + 2 : 0 };
};

// where a site link lands: a docs page by its file, an example by its folder, or a landing page
function linkTarget(path) {
  if (['/', '/plugins/', '/examples/'].includes(path)) { return { exists: true }; }
  const example = path.match(/^\/examples\/([\w-]+)\/$/)?.[1];
  if (example) { return { exists: existsSync(resolve(content, 'examples', example, 'example.md')) }; }
  const file = resolve(content, 'docs', `${path.slice(1, -1)}.md`);
  return existsSync(file) ? { exists: true, file } : { exists: false };
}

const isText = (value) => ['string', 'number', 'boolean'].includes(typeof value);
function checkParam(param, say) {
  if (typeof param?.name !== 'string') { return say('a parameter row needs a name'); }
  for (const key of ['type', 'description', 'default']) {
    if (param[key] != null && !isText(param[key])) {
      say(`${param.name}: ${key} is read as yaml, not text. Quote it: ${key}: '…'`);
    }
  }
  (param.options ?? []).forEach((option) => checkParam(option, say));
}

async function check(file) {
  const problems = [];
  const { front, body, offset } = split(readFileSync(file, 'utf8'));
  const report = (level, node, message) =>
    problems.push({ level, line: (node?.position?.start.line ?? 1) + offset, message });
  const error = (node, message) => report('error', node, message);

  let data = {};
  try {
    data = parseYaml(front) ?? {};
  }
  catch (e) {
    error(null, `frontmatter: ${e.message.split('\n')[0]}`);
  }
  for (const key of ['title', 'lede']) {
    if (typeof data[key] !== 'string') { error(null, `frontmatter: ${key} is missing or not text`); }
  }
  if (Number.isNaN(new Date(data.updated).getTime())) { error(null, 'frontmatter: updated needs a date'); }
  if (data.kind && !KINDS.includes(data.kind)) { error(null, `frontmatter: kind is one of ${KINDS.join(', ')}`); }
  if (
    data.size && data.size !== 'core' && !existsSync(resolve(NAV_ROUTER, 'packages/plugins/src', `${data.size}.js`))
  ) {
    error(null, `frontmatter: size "${data.size}" is neither core nor a plugin file`);
  }

  const tree = parser.parse(body);
  const own = anchorsOf(body);
  const imports = [];
  visit(tree, (node) => {
    if (node.type === 'containerDirective' && !DIRECTIVES.includes(node.name)) {
      error(node, `:::${node.name} is not a block the site knows (${DIRECTIVES.join(', ')})`);
    }
    if (node.type === 'text' && /(^|\n):::/.test(node.value)) {
      error(node, 'a stray ::: — a block holding another block needs a longer fence (::::entry around :::note)');
    }
    if (node.type === 'code' && ['params', 'returns'].includes(node.lang)) {
      try {
        const rows = parseYaml(node.value);
        if (node.lang === 'params') {
          Array.isArray(rows)
            ? rows.forEach((row) => checkParam(row, (message) => error(node, message)))
            : error(node, 'a params block is a yaml list, one "- name:" per parameter');
        }
        else {
          checkParam({ name: 'returns', ...rows }, (message) => error(node, message));
        }
      }
      catch (e) {
        error(node, `yaml: ${e.message.split('\n')[0]}`);
      }
    }
    else if (node.type === 'code') {
      const meta = parseMeta(node.meta ?? '');
      if (meta.for) {
        const unknown = meta.for.split(/\s+/).filter((id) => !FRAMEWORKS.some((f) => f.id === id));
        if (unknown.length) { error(node, `for="${unknown.join(' ')}" is not a framework id`); }
        if (!meta.label) { error(node, 'a fence with for= needs label=, the name on its tab'); }
      }
      for (
        const [, names = '', source] of node.value.matchAll(/import\s+(?:\{([^}]*)\}\s*from\s+)?['"]([^'"]+)['"]/g)
      ) {
        imports.push({
          node,
          source,
          names: names.split(',').map((name) => name.trim().split(/\s+as\s+/)[0]).filter(Boolean),
        });
      }
    }
    if (node.type === 'link' && node.url.startsWith('#') && !own.has(node.url.slice(1))) {
      error(node, `${node.url} is not a heading on this page`);
    }
    if (node.type === 'link' && node.url.startsWith('/')) {
      const [path, hash] = node.url.split('#');
      const target = linkTarget(path);
      if (!path.endsWith('/')) { error(node, `${node.url}: site links end in a slash before any #anchor`); }
      else if (!target.exists) { report('warning', node, `${node.url} is not written yet`); }
      // another writer may still be adding that heading, so it is a warning until every page is in
      else if (hash && target.file && !anchorsOf(split(readFileSync(target.file, 'utf8')).body).has(hash)) {
        report('warning', node, `${node.url}: that page has no heading with the id "${hash}" yet`);
      }
    }
  });

  for (const { node, source, names } of imports) {
    if (!/^@?nav-router/.test(source)) { continue; }
    const known = await packageExports(source);
    if (!known) { error(node, `"${source}" is not in the nav-router checkout`); }
    names.filter((name) => !known?.includes(name)).forEach((name) =>
      known && error(node, `${source} does not export ${name}`)
    );
  }

  // anything else the site's own pass refuses
  try {
    remarkDocs()(tree, {});
  }
  catch (e) {
    if (!problems.length) { error(null, `the markdown pass threw: ${e.message.split('\n')[0]}`); }
  }
  return problems;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/check-page.mjs <page.md> …');
  process.exit(2);
}
let failed = false;
for (const file of files) {
  const problems = await check(file);
  const name = relative(process.cwd(), resolve(file));
  problems.forEach(({ level, line, message }) => console.log(`${name}:${line}  ${level}: ${message}`));
  if (!problems.length) { console.log(`${name}  ok`); }
  failed ||= problems.some((p) => p.level === 'error');
}
process.exit(failed ? 1 : 0);
