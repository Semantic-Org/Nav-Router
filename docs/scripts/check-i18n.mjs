// checks content/strings.json and content/translations/* against the site's code and content:
//   - unused keys in content/strings.json that nothing in src/ asks for
//   - keys referenced in src/ or lib/plugins.js that content/strings.json lacks
//   - orphaned keys in translations/*/strings.json whose english key was removed or renamed
//   - placeholder ({name}) mismatches between a translation and its english string
//   - orphaned markdown translations whose english twin is gone
//
//   node scripts/check-i18n.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TRANSLATED } from '../src/lib/locales.js';
import { PLUGINS } from '../src/lib/plugins.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcDir = resolve(root, 'src');
const contentDir = resolve(srcDir, 'content');
const translationsDir = resolve(contentDir, 'translations');

const CLDR_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = resolve(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const varsOf = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name))].sort();

const english = JSON.parse(readFileSync(resolve(contentDir, 'strings.json'), 'utf8'));
const englishKeys = new Set(Object.keys(english));

const literalKeys = new Set();
const pluralFamilies = new Set();

// every source file outside src/content/ that asks for interface words
const codeFiles = walk(srcDir).filter((f) => !f.startsWith(`${contentDir}/`) && /\.(js|astro|html)$/.test(f));
for (const file of codeFiles) {
  const code = stripComments(readFileSync(file, 'utf8'));
  // t(…), ui(…), named(…), titled(…) — including ternaries like ui(cond ? 'a' : 'b')
  for (const [, args] of code.matchAll(/\b(?:t|ui|named|titled)\(([^)]*)\)/g)) {
    for (const [, key] of args.matchAll(/['"]([a-z]+\.[\w.-]+)['"]/gi)) {
      literalKeys.add(key);
    }
  }
  // {{t:key}} in raw html templates
  for (const [, key] of code.matchAll(/\{\{t:([\w.-]+)/g)) {
    literalKeys.add(key);
  }
  // plural('family', …) and counted('family', …)
  for (const [, family] of code.matchAll(/\b(?:plural|counted)\(\s*['"]([a-z]+\.[\w.-]+)['"]/gi)) {
    pluralFamilies.add(family);
  }
}

// keys derived from the plugins table (Home.astro and Plugins.astro)
for (const { name, category } of PLUGINS) {
  literalKeys.add(`home.plugin.${name}`);
  literalKeys.add(`plugins.${name}.description`);
  literalKeys.add(`plugins.category.${category}`);
}

const errors = [];

const pluralBaseOf = (key) => {
  const form = CLDR_FORMS.find((f) => key.endsWith(`.${f}`));
  return form ? key.slice(0, -(form.length + 1)) : null;
};

// 1. english keys nothing asks for
for (const key of englishKeys) {
  const base = pluralBaseOf(key);
  if (!literalKeys.has(key) && !(base && pluralFamilies.has(base))) {
    errors.push(`src/content/strings.json: unused key "${key}"`);
  }
}

// 2. keys code asks for that english lacks
for (const key of literalKeys) {
  if (!englishKeys.has(key)) {
    errors.push(`src/content/strings.json: missing key "${key}" referenced in src/`);
  }
}
for (const family of pluralFamilies) {
  if (!englishKeys.has(`${family}.other`)) {
    errors.push(`src/content/strings.json: missing plural key "${family}.other"`);
  }
}

// 3. locale strings.json and twin markdown files
const enabledPaths = new Set(TRANSLATED.map((l) => l.path));
const localeDirs = existsSync(translationsDir)
  ? readdirSync(translationsDir).filter((d) => statSync(resolve(translationsDir, d)).isDirectory())
  : [];

for (const dir of localeDirs) {
  const localeRoot = resolve(translationsDir, dir);
  const stringsFile = resolve(localeRoot, 'strings.json');
  if (existsSync(stringsFile)) {
    const rel = relative(root, stringsFile);
    const strings = JSON.parse(readFileSync(stringsFile, 'utf8'));
    if (enabledPaths.has(dir)) {
      for (const key of [...englishKeys].filter((k) => k.startsWith('language.'))) {
        if (!strings[key]) {
          errors.push(`${rel}: missing required key "${key}"`);
        }
      }
    }
    for (const [key, value] of Object.entries(strings)) {
      if (key === '$reviewed') { continue; }
      const base = pluralBaseOf(key);
      const refKey = englishKeys.has(key)
        ? key
        : base && pluralFamilies.has(base) && englishKeys.has(`${base}.other`)
        ? `${base}.other`
        : null;
      if (!refKey) {
        errors.push(`${rel}: orphaned key "${key}" (not in src/content/strings.json)`);
        continue;
      }
      const expectedVars = varsOf(english[refKey]);
      const actualVars = varsOf(String(value));
      // language.untranslated names its own language (docs-i18n.md), and singular/dual/zero plurals
      // in languages like Arabic spell the count in the noun itself without {count} / {kept}
      const optionalVars = new Set([
        ...(key === 'language.untranslated' ? ['language'] : []),
        ...(base && /\.(?:zero|one|two)$/.test(key) ? ['count', 'kept'] : []),
      ]);
      const missingVars = expectedVars.filter((v) => !actualVars.includes(v) && !optionalVars.has(v));
      const unknownVars = actualVars.filter((v) => !expectedVars.includes(v));
      if (missingVars.length || unknownVars.length) {
        errors.push(
          `${rel}: "${key}" placeholders {${actualVars.join(', ')}} != english {${expectedVars.join(', ')}}`,
        );
      }
    }
  }

  for (const file of walk(localeRoot)) {
    if (file === stringsFile) { continue; }
    const englishTwin = file.replace(`/translations/${dir}/`, '/');
    if (!existsSync(englishTwin)) {
      errors.push(`${relative(root, file)}: orphaned translation (missing ${relative(root, englishTwin)})`);
    }
  }
}

if (errors.length) {
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}
console.log(`i18n  ok (${englishKeys.size} keys, ${localeDirs.length} locales)`);
