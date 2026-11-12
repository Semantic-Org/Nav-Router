---
title: Docs Writing — Guides, API Reference, and Plugins
description: How to write guide, API reference, and plugin pages for nav-router so they read like human-authored open-source documentation — prose synthesis, callout budgets, per-framework conditionals, anti-AI rules, and markdown mechanics.
keywords: [docs, writing, guides, api reference, plugins, prose, callout budget, framework switcher, markdown]
audience: contributing
skill: docs-writing
type: skill
---

# Docs Writing — Guides, API Reference, and Plugins

> **Skill:** `docs-writing`
> **Purpose:** Write guide, API reference, and plugin pages that sit beside top open-source documentation (Vue, SvelteKit, Vite, React Router) and read as crisp, human-authored prose rather than narrated source code

---

## Before You Write

1. **Read the calibration pair** in this repo first:
   - Guide bar: `docs/src/content/docs/guides/loading-data.md`
   - API bar: `docs/src/content/docs/api/router.md`
2. **Read the source files** for every feature you touch (`src/`, `integrations/`, `packages/plugins/src/`, and `docs/src/content/examples/`). Never rely on memory, prior rewrites, or assumptions about typical router APIs. Every option name, default value, argument signature, and return value must come directly from `HEAD` (for example, child route `path` strings must include their parent prefix like `'/teams/:org/members/:id'`, and `routes` accepts either `{ [name]: options }` or an array).
3. **Know what is shipped.** On `HEAD`, core (`nav-router`), React (`@nav-router/react`), Solid (`@nav-router/solid`), and the 8 `@nav-router/plugins/*` modules exist. Preact, Vue, Svelte, Semantic UI, and SSR (`guides/server-rendering`) are unshipped sidebar stubs — leave unshipped pages unwritten rather than inventing APIs. Plain DOM rendering (`DomView`) is built into `nav-router` core; never mention a `dom` plugin.

---

## Synthesize, Don't Narrate

The most common failure in technical docs is narrating how the code works internally instead of synthesizing what a developer new to the library wants to understand.

Apply **the one-sentence test**: ask *"What is the single simplest sentence a developer reading this for the first time needs?"* Write that sentence, then stop.

### API prose: Bad vs. Good

**Bad (narrating internals and implementation storage):**
> Creates a `Router` instance from a single options object. Router-wide settings like `mount` and `base` are stored on `router.config`, while route keys like `layout`, `statusViews`, `data`, `index`, and `routes` configure the root route (`router.root`). Also exported under the alias `site`.

**Good (synthesizing what the caller cares about):**
> Creates a router. `options` includes both the root node's [route options](/api/route-options/) and the router [settings](#settings) below.

### Guide ledes & openings: Bad vs. Good

**Bad (fragment list + rule-of-threes capability brochure):**
> Fetch data for routes and layouts before rendering, pass ancestor data down the route tree, and handle missing records.

**Bad (narrating internal execution):**
> Routes accept a `data` function that runs before the view renders. Its return value is passed as `data` to the route's view, layout, and child routes.

**Good (complete sentence stating what the guide teaches, followed by developer-first context):**
> **Lede:** This guide covers how to fetch data before a page renders and share it across nested layouts.
>
> **Opening:** Before rendering a page, you often need to fetch data from an API. Add a `data` function to the route, and the object it returns is passed to your view as `data`:

### Audience-first framing

Make the developer, their page, or their user the subject of sentences — not `"the router"` or internal machinery:

- Prefer *"Navigating from `/teams/acme/members/1` to `/teams/acme/members/2` keeps `team` loaded and only re-runs `member`"* over *"The router diffs `activeRoutes` against `entryCache` and skips ancestor loaders whose keys match."*
- Never expose private state or internal helpers (`#entries`, `entryCache`, `settleRoutes`, comment anchors) in user-facing pages.
- On integration base classes (`View`, `ReactiveRouter`, and `guides/writing-an-integration.md`), document only the public subclass contract (`static place`, `create`, `update`, `destroy`, `findSlot`, `createSignal`, `createReaction`, `untrack`, `batch`, `liveContext`) without over-specifying internal mechanics while integrations are actively settling.

---

## Rhythm, Lists, and Scannability

Developers scan documentation before reading top-to-bottom. Structure every section so a scanner sees the shape immediately:

- **Complete-sentence ledes.** Every `lede` in frontmatter is one complete English sentence (`Subject + verb`, `12–22` words).
  - **Guides:** State what the guide covers (`This guide covers how to...` or `Protect routes with permissions, redirect signed-out users, and handle sign-in returns.` -> avoid imperative fragment lists; use a full declarative sentence).
  - **API & Plugins:** State what the symbol or plugin does (`Matches URLs against your routes and renders the active page.`).
- **Short paragraphs.** Keep paragraphs to `1–3` sentences (`20–50` words). Never stack three dense paragraphs in a row.
- **Short, punchy bullet lists.** Break up prose with `2–5` item bullet lists whenever enumerating arguments, conditions, behaviors, or rules. Lead each bullet with a bolded key or crisp verb phrase so scanners can read down the left edge.
- **Code every ~100 words on guides.** Show a realistic domain (`blog/:slug`, `teams/:org`, `projects/:id/issues`) rather than `foo`/`bar`. Introduce the problem in 1–2 sentences, show the code, then note any nuance in 1–2 sentences or a short list below it.
- **Skip redundant boilerplate on API entries.** If a 0-argument or 1-argument method (`start()`, `stop()`, `forward()`, `replace()`) is completely explained by its signature and one sentence, omit `**Parameters**` and `**Returns**` blocks. Reserve `params` blocks for multi-argument signatures or options objects.

---

## Callout Budget

Across our open-source reference cohort (Vue, Vite, SvelteKit, React Router), callouts appear at **`0–1` per `400–800` words** — Vue's `computed` guide (`1,500` words) and React Router's `data-loading` guide (`840` words) use `0`, and Vue's `reactivity-core` API page (`2,200` words) uses `1`. When everything is highlighted, nothing stands out.

Each page has a strict budget for **unconditionally visible** callouts (`:::note`, `:::tip`, `:::warning`, `:::danger`):

| Page kind | Budget per page | Spend only on |
| --- | --- | --- |
| **Guide** | **0–2** | Non-obvious execution order, subtle gotchas, or sharp edges a scanner must not miss |
| **API / Plugin** | **0–1** | A critical behavioral constraint not obvious from the signature or parameter rows |

Rules for spending the budget:

- **Zero is normal.** Do not add a callout just to vary layout or summarize what the prose already said.
- **Keep callouts to 1–2 sentences.** State the rule and what to do instead.
- **Framework-gated callouts** (`:::tip[Title]{for="solid"}`) are hidden unless that framework is selected. Including them is encouraged when a framework differs (such as Solid's reactive prop getters), provided any single framework view of the page stays within `0–2` visible callouts total.

---

## Per-Framework Content and Conditionals

The sidebar's **Your framework** picker (`data-framework` on `<html>`) controls code tabs, sidebar slots, and framework-conditional copy across the site. Framework IDs (`docs/src/lib/frameworks.js`):

| Framework ID (`for="..."`) | URL folder (`slug`) | Package | Status |
| --- | --- | --- | --- |
| `core` | `vanilla` | `nav-router` | Shipped |
| `react` | `react` | `@nav-router/react` | Shipped |
| `solid` | `solid` | `@nav-router/solid` | Shipped |
| `preact`, `vue`, `svelte`, `semantic` | matching name | `@nav-router/<id>` | Unshipped (stubs only) |

### 1. Shared pages (`guides/*.md`, `api/*.md`, `plugins/*.md`)

Shared pages are read by users of every framework:

- **Use consecutive `for="..."` code fences** whenever an example defines `view` or `layout`, or imports `router`:
  ````markdown
  ```js for="core" label="routes.js"
  import { router } from 'nav-router';
  // ...
  ```

  ```jsx for="react" label="routes.jsx"
  import { router } from '@nav-router/react';
  // ...
  ```

  ```tsx for="solid" label="routes.tsx"
  import { router } from '@nav-router/solid';
  // ...
  ```
  ````
  Consecutive `for="..."` fences merge automatically into a single tabbed block that follows the reader's framework pick (and falls back cleanly for unshipped picks).
- **Use a single `js` fence** (` ```js title="routes.js" ` or plain ` ```js `) when the snippet only shows route options (`path`, `params`, `query`, `data`, `permission`, `redirect`), plugin imports, or standalone helpers (`navigate()`, `href()`, `update()`, `reload()`). Never repeat three identical code tabs.
- **Gate every framework-specific aside.** Never show a Solid note to a React or Vanilla JS reader, or vice versa:
  - Conditional callout:
    ```markdown
    :::tip[Reading props in Solid]{for="solid"}
    `props` properties are reactive getters in `@nav-router/solid`. Read `props.data` inside JSX rather than destructuring `props`.
    :::
    ```
  - Conditional prose or blocks without callout chrome:
    ```markdown
    :::for[solid]
    In `@nav-router/solid`, `data` runs inside a reactive computation — any Solid signal read inside `data` re-runs it automatically when updated.
    :::
    ```
  - Space-separated IDs work on both (`{for="react solid"}` or `:::for[react solid]`).
  - When nesting `:::for[...]` or a callout inside an outer container directive such as `steps` or `entry`, give the outer directive four colons (`::::steps` … `::::`) so the inner `:::` does not close it early.

### 2. Framework-specific pages (`guides/{vanilla,react,solid}/*.md`, `api/{react,solid}.md`)

Pages inside a framework folder (`guides/vanilla/`, `guides/react/`, `guides/solid/`) or named for an integration (`api/react.md`, `api/solid.md`) belong exclusively to that framework. Opening one sets the picker to that framework, and switching frameworks navigates to the equivalent page (or displays an unwritten-page notice).

- Write prose and code directly for that single framework (`js` for Vanilla, `jsx` for React, `tsx` for Solid).
- Do **not** use `for="..."` variant tabs or `:::for[...]` wrappers on framework-owned pages.

---

## Anti-AI Prose Rules

Eliminate patterns that make documentation read as machine-generated:

1. **No rule-of-threes (`X, Y, and Z`).** Do not reflexively group clauses, adjectives, or examples in threes, especially in ledes and section openings.
2. **No code-tracing trivia in user docs.** When reading source code, agents often spot defensive guards or obscure edge cases and report them in public prose. Do not document edge cases a normal user would never write, and do not describe standard dynamic JS behavior (such as extra keys on an options object being ignored or preserved) as a quirk. If you find genuinely broken or surprising behavior in `src/`, report it back to the maintainer instead of enshrining it in docs.
3. **No tautological headings or openings.** Never follow `` ### `reload()` `` with *"`reload()` reloads the current route"* — state what actually happens (*"Re-runs guards and `data` for the current URL without a full browser reload, keeping scroll and focus in place."*).
4. **No filler transitions or marketing adjectives.** Cut *"seamlessly"*, *"effortlessly"*, *"powerful"*, *"first-class"*, *"under the hood"*, *"out of the box"* (unless contrasting zero-plugin setup once), *"it is worth noting that"*, and *"let's take a look at"*.
5. **Do not parrot source-comment literary voice.** Source comments in `src/` are terse maintainer notes; translate facts into plain documentation English.

---

## Page Shapes and Markdown Mechanics

### Frontmatter (`docs/src/content.config.js`)

All `.md` pages live under `docs/src/content/docs/` and require `title`, `lede`, and `updated: 2026-11-12`.

- **Guide (`guides/**/*.md`):**
  ```yaml
  ---
  title: Loading data
  lede: This guide covers how to fetch data before a page renders and share it across nested layouts.
  updated: 2026-11-12
  ---
  ```
- **Class or Function API (`api/*.md`):**
  ```yaml
  ---
  title: update()
  kind: function
  lede: Updates parameters or query values on the current route in place.
  import: import { update } from 'nav-router'
  updated: 2026-11-12
  ---
  ```
  `kind` (`class` | `function` | `plugin`) formats `title` as `<code>` with a kind pill and omits the reading-time badge. Set `size: core` only on core class pages where total bundle weight is relevant (`api/router.md`). Omit `kind` on overview/options pages (`api/route-options.md`, `api/react.md`, `api/solid.md`).
- **Plugin (`plugins/*.md`):**
  ```yaml
  ---
  title: head
  kind: plugin
  lede: Updates `document.title`, meta tags, and canonical links from active routes on each navigation.
  import: import '@nav-router/plugins/head'
  size: head
  updated: 2026-11-12
  ---
  ```
  `size` must match the exact filename in `packages/plugins/src/<name>.js` (`head`, `view-transitions`, `announcer`, `confirm-leave`, `preload-intent`, `chunk-reload`, `timeline`, `sitemap`); `sizeOf()` bundles and brotli-compresses the file at build time and fails the build on unknown names.

### Custom Markdown Directives (`docs/src/lib/markdown/remark-docs.js`)

- **Reference entries (`:::entry`):** Wrap each documented method, function, or class on an API page:
  ````markdown
  :::entry
  ### `navigate()` :kind[method]

  ```js signature
  router.navigate(target, args?, options?)
  navigate(target, args?, options?)
  ```

  Navigates to a route name, `Route`, or path.

  **Parameters**

  ```params
  - name: target
    type: "string | Route"
    required: true
    description: Route name, `Route` instance, or path.
  ```
  :::
  ````
  Inside `:::entry`, a standalone bold line (`**Parameters**`, `**Returns**`, `**Example**`) becomes `.entry-label`. Supported `:kind[...]` pills: `function`, `method`, `class`, `property`.
- **Heading anchor slugs:** Astro's `rehypeHeadingIds` (`github-slugger`) lowercases headings and strips punctuation without splitting camelCase:
  - `` ### `router()` :kind[function] `` -> `#router`
  - `` ### `ReactRouter` :kind[class] `` -> `#reactrouter`
  - `` ### `useRouter()` :kind[function] `` -> `#userouter`
  Verify any heading targeted by `#hash` in `docs/src/lib/nav.js` produces the exact expected `id`.
- **Numbered steps (`:::steps`):** Wrap an ordered list (`1. **Step title.** ...`) for installation or sequential walkthroughs.
- **Comparison truth tables (`:::truth`):** Wrap a Markdown table whose `true` / `false` cells should render as tinted badges (for example, `isActive()` vs `isCurrent()`).

### Formatting Constraints That Break Layout or Builds

1. **`inline.js` subset in `lede`, `params`, and `returns`:** Only `` `code` ``, `**bold**`, and `[text](href)` are parsed in frontmatter `lede` and YAML `description` strings. **Never use `*italic*` there** — literal asterisks will render on the page.
2. **YAML quoting in frontmatter, `params`, and `returns`:** Always double-quote strings containing `: ` (colon + space) or starting with `{`, `[`, `'`, `` ` ``, or `!`.
3. **Inline `<code>` width and suffixes:** Inline `<code>` uses `white-space: nowrap` and pill padding:
   - Keep every inline `<code>` span **under ~35 characters** so `390px` mobile viewports never scroll horizontally. List properties as separate chips (`` `url`, `params`, `query` ``) rather than one long object literal.
   - **Never attach word suffixes directly to backticks** — write `awaiting` or `` `Route` instances ``, never `` `await`ing `` or `` `Route`s `` (pill margins leave an awkward visual gap before the suffix).
4. **`params` blocks vs. Markdown tables:** In Markdown tables, `<code>` cells outside the last column do not wrap. Whenever a `Type` column has union types or function signatures, use a ```` ```params ```` block instead of a 4-column Markdown table.
5. **Format and verify before committing:**
   - Run `node docs/scripts/check-page.mjs` across edited pages to validate frontmatter, directives, YAML rows, package exports, and `#hash` links.
   - Run `npm run format` (`dprint`) and `npm -w docs run build`.
   - Verify rendered pages at desktop (`1440px`, dark and light) and phone (`390px`, `scrollWidth === clientWidth`) and test framework switching (`core`, `react`, `solid`).
