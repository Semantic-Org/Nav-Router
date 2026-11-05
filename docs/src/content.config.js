import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

// one collection; an entry's section is the first folder of its path (guides/, api/, plugins/)
const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    lede: z.string(),
    // a symbol page: its title is set as code with a kind pill
    kind: z.enum(['class', 'function', 'plugin']).optional(),
    import: z.string().optional(),
    // 'core' or a plugin file name: measured from the nav-router source at build
    size: z.string().optional(),
    updated: z.coerce.date(),
  }),
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

export const collections = { docs, examples };
