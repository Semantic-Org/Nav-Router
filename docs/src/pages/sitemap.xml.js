// every page that exists, for crawlers: the homepage, the section landings and each doc with the date
// it was last updated, and each doc again in every language it's translated into and reviewed in
import { getCollection } from 'astro:content';

import { inLanguage, localePath, TRANSLATED } from '../lib/i18n.js';

export async function GET({ site }) {
  const entries = await getCollection('docs');
  const pages = [
    { path: '/' },
    { path: '/plugins/' },
    ...entries.map((e) => ({ path: `/${e.id}/`, updated: e.data.updated })),
  ];
  for (const { code } of TRANSLATED) {
    for (const e of entries) {
      const { translated, draft } = await inLanguage(e, code);
      if (translated && !draft) { pages.push({ path: localePath(`/${e.id}/`, code) }); }
    }
  }
  const day = (d) => d.toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${
    pages.map((p) =>
      `  <url><loc>${new URL(p.path, site)}</loc>${p.updated ? `<lastmod>${day(p.updated)}</lastmod>` : ''}</url>`
    ).join('\n')
  }
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
