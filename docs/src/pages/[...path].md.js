// every docs page as markdown at its own path plus .md, in every language
// (/guides/routes-and-params.md, /ja/guides/routes-and-params.md): the translation where there is
// one, otherwise the english
import { getCollection } from 'astro:content';

import { ENABLED, inLanguage, localePath } from '../lib/i18n.js';
import { markdownFor } from '../lib/page-markdown.js';

export async function getStaticPaths() {
  const entries = await getCollection('docs');
  return Promise.all(ENABLED.flatMap(({ code }) =>
    entries.map(async (entry) => ({
      params: { path: localePath(`/${entry.id}`, code).slice(1) },
      props: { page: (await inLanguage(entry, code)).page },
    }))
  ));
}

export function GET({ props }) {
  return new Response(markdownFor(props.page), { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
