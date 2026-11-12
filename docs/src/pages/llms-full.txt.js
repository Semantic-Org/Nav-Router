// /llms-full.txt: every docs page's markdown in one file, in the sidebar's order
import { getCollection } from 'astro:content';

import { SECTIONS } from '../lib/nav.js';
import { markdownFor } from '../lib/page-markdown.js';

export async function GET({ site }) {
  const docs = new Map((await getCollection('docs')).map((e) => [e.id, e]));
  const order = [
    ...new Set(SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items.map((it) => it.slug.split('#')[0])))),
  ];
  const pages = order.filter((id) => docs.has(id)).map((id) =>
    `<!-- ${new URL(`/${id}/`, site).href} -->\n\n${markdownFor(docs.get(id))}`
  );
  return new Response(pages.join('\n---\n\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
