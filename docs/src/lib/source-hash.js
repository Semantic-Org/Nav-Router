// a translation records the hash of the english it was made from (source: in its frontmatter); when
// the english moves on, the hashes differ and the translation says it may be behind. the hash covers
// what a translator translates: the body and the words in the frontmatter, not its dates or sizes.
//
// to print a page's hash for its translation:  node src/lib/source-hash.js src/content/docs/<page>.md
import { createHash } from 'node:crypto';

const WORDS = ['title', 'lede', 'description', 'try'];

export const sourceHash = ({ data, body }) =>
  createHash('sha256')
    .update(JSON.stringify(WORDS.map((field) => data[field] ?? null)))
    .update(body.trim())
    .digest('hex').slice(0, 12);

if (process.argv[1]?.endsWith('source-hash.js')) {
  const { readFileSync } = await import('node:fs');
  const { parse } = await import('yaml');
  for (const file of process.argv.slice(2)) {
    const [, front, body] = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    console.log(`${sourceHash({ data: parse(front), body })}  ${file}`);
  }
}
