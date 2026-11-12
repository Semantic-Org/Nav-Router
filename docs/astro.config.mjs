import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import remarkDirective from 'remark-directive';
import { createCssVariablesTheme } from 'shiki';

import { astroI18n } from './src/lib/locales.js';
import { rehypeDocs } from './src/lib/markdown/rehype-docs.js';
import { remarkDocs } from './src/lib/markdown/remark-docs.js';
import { transformerFenceMeta } from './src/lib/markdown/shiki-meta.js';

// shiki writes css variables; tokens.css maps them onto the site's syntax colors, so code follows
// the theme toggle with no second highlighting pass
const theme = createCssVariablesTheme({ name: 'nav-router', variablePrefix: '--shiki-', fontStyle: true });
// read as the site reads code: object keys as keys, the colon after them as punctuation, comments set back
theme.tokenColors.push(
  {
    scope: ['meta.object-literal.key', 'support.type.property-name'],
    settings: { foreground: 'var(--shiki-token-parameter)' },
  },
  {
    scope: ['punctuation.separator.key-value', 'meta.object-literal.key punctuation'],
    settings: { foreground: 'var(--shiki-token-punctuation)' },
  },
  {
    scope: ['comment', 'punctuation.definition.comment'],
    settings: { foreground: 'var(--shiki-token-comment)', fontStyle: 'italic' },
  },
);

const HOST = 'local.navrouter.dev';
const CERT = { key: `./cert/${HOST}-key.pem`, cert: `./cert/${HOST}.pem` };
const hasCert = existsSync(CERT.key) && existsSync(CERT.cert);
if (!hasCert) { console.warn('[site] no cert in cert/: dev runs over http on :4321. Run `npm run cert`.'); }

export default defineConfig({
  // where the site is served: share cards and canonical links are absolute, so a staging build
  // sets SITE_URL=https://staging.navrouter.dev
  site: process.env.SITE_URL ?? 'https://navrouter.dev',
  trailingSlash: 'always',
  // the languages (lib/locales.js); english at the root, the rest under their path
  i18n: astroI18n,
  // the dev origin: https://local.navrouter.dev on :443, every interface, one site up at a time (the
  // house pattern). without the cert (npm run cert, see cert/README.md), plain http on :4321
  server: { host: true, port: hasCert ? 443 : 4321 },
  devToolbar: { enabled: false },
  vite: {
    server: {
      allowedHosts: [HOST],
      fs: { allow: ['..'] },
      ...(hasCert && {
        https: { key: readFileSync(CERT.key), cert: readFileSync(CERT.cert) },
        hmr: { host: HOST, protocol: 'wss' },
      }),
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkDirective, remarkDocs],
      // ids first, so the docs plugin can anchor headings; astro then skips its own pass
      rehypePlugins: [rehypeHeadingIds, rehypeDocs],
    }),
    shikiConfig: {
      theme,
      transformers: [transformerMetaHighlight(), transformerFenceMeta()],
    },
  },
});
