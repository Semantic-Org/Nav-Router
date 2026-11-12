import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

// a docs page's fields. an entry's section is the first folder of its path (guides/, api/, plugins/)
const page = {
  title: z.string(),
  lede: z.string(),
  // a symbol page: its title is set as code with a kind pill
  kind: z.enum(['class', 'function', 'plugin']).optional(),
  import: z.string().optional(),
  // 'core' or a plugin file name: measured from the nav-router source at build
  size: z.string().optional(),
  updated: z.coerce.date(),
};
const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object(page),
});

// a page in another language: the english file's twin under translations/<language>/, which mirrors
// this folder (translations/ja/docs/guides/routes-and-params.md). it holds the words it translates
// and source, the hash of the english it was made from (lib/source-hash.js), so a translation that
// has fallen behind can say so. every other field is the english page's
const translations = defineCollection({
  loader: glob({ pattern: '*/**/*.md', base: './src/content/translations' }),
  schema: z.object({
    // quote it in frontmatter: a hash that happens to be all digits would otherwise read as a number
    source: z.coerce.string(),
    // false on a machine translation nobody has reviewed yet; the line goes when someone has
    reviewed: z.boolean().optional(),
    title: z.string(),
    lede: z.string().optional(),
    description: z.string().optional(),
    try: z.array(z.string()).optional(),
  }).strict(),
});

// a live example: a folder of real files (routes.js, app.js, index.html, style.css…) beside an
// example.md that says what it shows and what to try. the folder name is its id
const examples = defineCollection({
  loader: glob({
    pattern: '*/example.md',
    base: './src/content/examples',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // the files shown as editor tabs, in order; every file in the folder still builds
    tabs: z.array(z.string()),
    // what to do in the preview to see the point of the example
    try: z.array(z.string()),
    related: z.array(z.object({ title: z.string(), href: z.string() })).default([]),
  }),
});

export const collections = { docs, examples, translations };
