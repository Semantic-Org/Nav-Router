// crawl everything but the dev search index. /og/ stays open: link-preview crawlers honor robots.txt
// and would otherwise drop the share cards
export function GET({ site }) {
  return new Response(
    `User-agent: *
Disallow: /search-index.json

Sitemap: ${new URL('/sitemap.xml', site)}
`,
    { headers: { 'content-type': 'text/plain' } },
  );
}
