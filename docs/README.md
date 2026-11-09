# navrouter.dev

The docs for nav-router, in `docs/` of the monorepo. Run the commands below from here (`docs/`), or
from the root with `npm -w docs run <script>`.

The nav-router site: a homepage and docs, built with Astro from plain Markdown. Astro only turns
Markdown into pages through the layouts. Styles and the few scripts are plain CSS and JS, and every
page ships as static HTML.

```sh
npm install       # from the repo root: the docs are a workspace
npm run sandbox   # once: the playground's workers and the example libraries into public/
npm run cert      # once: a local.navrouter.dev cert from the trusted dev CA (see cert/README.md)
npm run dev       # https://local.navrouter.dev on :443; search uses /search-index.json
npm run build     # the sandbox, then the static site in dist/, then a Pagefind index
npm run preview   # serve dist/, search uses Pagefind
```

Plugin and core sizes are measured at build from the repo root (`src/lib/sizes.js`),
so they are always the package's own. A size that can't be measured fails the build.

Live examples (`/examples/`) run on `@semantic-ui/playground` from npm. `npm run sandbox` copies its
workers into `public/sandbox/`, and the libraries the examples import into `public/libs/` (nav-router's
source, and the one-file build of `@semantic-ui/utils`). Run it once after install; the copies are
git-ignored.

## Deploys

CI builds and ships prebuilt to Vercel (project `navrouter`, Root Directory `docs`). Vercel's own
Git deploys are off.

| Trigger | Environment |
|---|---|
| Push to `main` touching `docs/` or `packages/` | staging, `staging.navrouter.dev` (`.github/workflows/staging-deploy.yml`) |
| A `v*` tag, or Run workflow by hand | production, `navrouter.dev` (`.github/workflows/release-deploy.yml`) |

## Writing a page

A page is a Markdown file in `src/content/docs/<section>/`, where section is `guides`, `api` or
`plugins`. Its place in the sidebar comes from `src/lib/nav.js`. A nav item whose page doesn't exist
yet shows as a dimmed stub.

```yaml
---
title: isActive()                        # set as code when the page has a kind
kind: function                           # class | function | plugin, optional
lede: One or two sentences. `code` is allowed.
import: import { isActive } from 'nav-router'   # optional, shown with a copy button
size: core                               # optional: 'core' or a plugin file name, measured at build
updated: 2026-11-05
---
```

### Framework pages

A page under a framework's folder belongs to that framework alone: `guides/solid/quickstart.md`,
`api/solid.md`. Folders come from `slug` in `src/lib/frameworks.js` (Vanilla JS is `vanilla`).

- **Sidebar:** each framework has its own group in Guides and in API (`FRAMEWORK_GUIDES` and
  `FRAMEWORK_API` in `src/lib/nav.js`). The sidebar shows only the reader's framework's groups.
- **Opening one** sets the reader's framework to the page's, as a `?framework=solid` link does.
- **Switching** the picker on one goes to the same page for the new framework
  (`guides/solid/quickstart` → `guides/react/quickstart`) when it's written, and otherwise says so
  on the page.
- **The pager** on a shared page skips framework pages, and on a framework's page stays with that
  framework.

### Conventions

| Write | Get |
|---|---|
| `:::note[Title]` … `:::` | A callout. Also `tip`, `warning`, `danger`. |
| `:::steps` around an ordered list | Numbered steps. Start each item with **bold** text for its title. |
| `:::entry` … `:::` | A reference entry. Open it with ``### `navigate()` :kind[method]``. |
| `:::truth` around a table | `true` and `false` cells become tinted words. |
| ` ```js title="app.js" ` | A code block with a file name. |
| ` ```js for="core vue svelte semantic" label="routes.js" ` | Consecutive fences like this become one block with a tab per version. The reader's framework picks the tab. |
| ` ```js {3,5} ` | Highlighted lines. |
| ` ```js signature ` | A signature block. |
| ` ```params ` / ` ```returns ` | YAML rendered as parameter rows (`name`, `type`, `required`, `default`, `description`, nested `options`). |
| A table with a `Type` column | Code in that column is read as types. |
| A paragraph of only **bold** text inside an entry | An entry label such as "Parameters". |

A block that holds another block needs a longer fence: `::::entry` around a `:::warning`.

Framework ids for `for=` are in `FRAMEWORKS` in `src/scripts/site.js`. Preact falls back to the React
version, and every other framework falls back to `core`.

## Layout

| Path | Holds |
|---|---|
| `src/content/docs/` | the pages |
| `src/lib/nav.js` | sections, groups and their order |
| `src/lib/markdown/` | the remark and rehype passes and the Shiki meta transformer behind the conventions above |
| `src/layouts/` | `Base` (document, theme) and `Docs` (topbar, sidebar, on this page, pager) |
| `src/styles/` | `tokens.css` (shared), `docs.css`, `home.css` |
| `src/scripts/` | `site.js` (framework picker, code tabs, copy, inline code, theme), `search.js`, `docs-client.js`, `hero.js` |
| `src/lib/home-body.html` | the homepage markup, kept as HTML because its code samples are full of braces |

`npm run build` runs `astro sync --force` first. Astro caches rendered Markdown and doesn't notice
changes to the Markdown plugins.
