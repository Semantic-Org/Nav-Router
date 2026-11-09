---
title: Docs Authoring — A Sibling Docs Site for a New Library
description: How to build the docs site for a library spun out into its own repo so it reads as a sibling of the nav-router docs — the stack, the features that are deliberate requirements, the design conventions, the room to leave for languages, the working agreements, and the mistakes to avoid.
keywords: [docs, documentation site, astro, design system, framework switcher, playground, examples, versions, i18n, translation, rtl, homepage, gotchas]
audience: contributing
skill: docs-authoring
type: skill
---

# Docs Authoring — A Sibling Docs Site for a New Library

> **Skill:** `docs-authoring`
> **Purpose:** When a library gets its own repo and its own docs, build them so they read as a sibling of the nav-router docs: the same family, a brand of their own

---

## The Bar

The reference implementation is **the nav-router docs**. Read its code for the mechanics: tokens, markdown conventions, components, scripts, file layout. None of that is repeated here. If you can't find the nav-router docs, ask where they are before you start.

This file holds what the code can't tell you: which features are deliberate requirements rather than bespoke artifacts, the conventions behind the design, and the mistakes already made once. A feature that exists in the reference is a requirement for a sibling unless this file says otherwise.

This file will be revised when the nav-router docs are finalized. Conventions are still being found, so treat gaps as questions to raise, not license to improvise.

---

## Before You Build

**A curriculum pass.** Before writing anything, tour the running nav-router docs in a browser to see how each design element is executed. The code shows mechanics; the running site shows feel and timing. Go in this order:

1. The homepage at 1440px in dark mode: play the hero's navigation trace, watch the slots graphic loop, scroll to the playground and watch it load, change the install picker's framework and note the width holding, hover the integration cards.
2. The same in light mode: the sheen, bevels and callout tones in both themes.
3. A guide page: the framework picker and its slots in the sidebar, code variants switching with the framework, callouts, steps, one-line code blocks, the on-this-page rail's spacing, the copy page menu.
4. An API page: reference entries, parameter rows, the sidebar marking anchor items from the URL.
5. A framework-only page: switch frameworks and see it follow to the matching page or show its notice.
6. The plugins page: filter, toggle cards and list, pick plugins and watch the sample and sizes update.
7. Examples: the index, then an example: drag the divider, edit and watch it rebuild, use the preview's back, forward and reload.
8. ⌘K search, the version menu, and a page's `.md` version.
9. Phone width (390px): the menu drawer, the on-this-page bar, stacked tables, the homepage menu.
10. Reduced motion: the hero, the slots graphic and the playground's fallbacks.

**A logo spike.** Before the docs, spend a short spike on the library's mark and wordmark, so the site isn't built around a stand-in.

**The accent.** Suggest an accent hue for the library, then settle it case by case for how it sits beside its siblings. The family shares type, material and layout; the accent is what lets each library be its own.

---

## Technical Spec

- **Astro**, turning plain Markdown into pages through the site's own remark and rehype passes. No MDX unless something forces it.
- **Plain JS and CSS.** No UI framework, and no Semantic UI components. The docs don't dogfood the component library.
- **Static output.** Every page ships as HTML. Scripts enhance it.
- **Shiki** for highlighting, through CSS variables so it follows the theme.
- **Pagefind** for search, behind the site's own ⌘K dialog, not Pagefind's default UI.
- **Share cards** generated per page at build.
- **Self-hosted fonts.**
- **`@semantic-ui/playground`** from npm for live examples.
- **Vercel**, deployed from CI (see Hosting).

---

## Features That Are Requirements

These look like one-off flourishes in the reference. They are deliberate, and a sibling has them.

### A framework switcher in the sidebar

The reader picks their framework once and the whole site follows: code blocks show that framework's variant (with fallbacks where one is missing), the install command names its package, and the sidebar shows that framework's own guides and API slot. A page belonging to one framework sets the pick when opened, `?framework=` links do the same, and switching on such a page follows to the matching page or says it isn't written yet.

### An Examples section on the playground

Small apps a reader runs and edits in the browser, each showing one thing the library does. A cold visitor reads these first, so they come before most guides in priority. The playground loads only as it nears the screen, and the homepage carries one too. The example page's layout is not settled yet; it may move toward a larger, more playground-like view, so don't copy it as final.

### The page actions menu

Copy page splits into a button and a menu: copy page, view as Markdown (every docs page is also served at its path plus `.md`), and ask Claude, ChatGPT or Gemini with a shared prompt that has the assistant read the page, summarize it, ask what the reader is building, and answer from the documentation. A library with an MCP server adds a link to its install page.

### Versions

A version menu in the topbar: the changelog, the unreleased docs (staging; on staging it points the other way, at the released docs), and archived majors, a section that appears only once there are any. Majors are frozen, not rebuilt: when the next major ships, the release points `vN.<domain>` at the current production deployment, adds it to `versions.json`, then deploys the new major. Every site reads the latest docs' `versions.json` when its menu opens, so a frozen site still lists the majors after it, and a `vN` site shows a banner once a newer major exists. The release workflow is forked into each repo rather than shared, so each can differ.

### Hosting

CI builds and ships prebuilt to Vercel. A push to `main` deploys staging; a tag deploys production. Staging gets `noindex` and share cards on its own domain. DNS records are DNS-only, not proxied.

### The rest that's easy to forget

- The custom ⌘K search dialog.
- The on-this-page bar on narrow screens, where the rail doesn't fit.
- Sizes measured from the package's own source at build, quoted as min+br and never gzip. A size that can't be measured fails the build.

---

## Design Conventions

- **Whole pixels.** Every size lands on a whole pixel.
- **Controls hold their widest state.** Anything whose label or content swaps keeps the size of its largest version.
- **Material.** Cards carry a sheen lit from the upper left; small raised marks and inline code carry a bevel from the same light. The frame is cool, code is neutral, so the cool tones (the accent, the info callout) stand apart from code.
- **Callouts** follow the Semantic UI Next message style: a neutral frame, a rule and title in the tone, a quiet tone toward the far edge.
- **Layout.** The doc centers on the window, and the on-this-page rail centers in the space beside it.
- **Homepage graphics are bespoke spectacles.** Each is made for its argument, unlike anything else on the page, with one orchestrated motion, heavy assets loaded lazily, and a real reduced-motion version.
- **Voice.** Plain, specific, sentence case. Lead with what a developer building an app gains.
- **Logical CSS properties** (`inline`, `block`) rather than left and right, so right-to-left layouts swap on their own.

---

## Internationalization

Launch in English, and leave room for languages from day one, because retrofitting it touches everything. Translating is a separate pass, usually by a different agent once the docs are final: the `docs-i18n` skill. What the site's builder owes it:

- **No visible words in code.** Labels, headings, sentences, `aria-label`, `title`, placeholders: all keys in one English strings file, read through `t()` at build, `{{t:key}}` in a raw template, `ui()` in a script. Code, API names, product names and file names stay as they are. Markdown pages need nothing; they translate as files.
- **One key per whole passage.** A sentence is one string, with `{placeholders}` for values and its inline tags inside it, so a language can order it as it reads. Never join a sentence from pieces. Counts go through `plural()`.
- **A key names one wording.** Change what the English says and it takes a new key, so no language keeps a translation of the old meaning. A typo fix keeps the key.
- **Links take the reader's language** (`localePath()`), and one route serves every page under every language, English at the root.
- **Logical CSS,** as in Design Conventions. A diagram that must stay left to right is pinned, and its sentences left free to follow the page.
- **A place for the language choice:** in the topbar beside the version menu, and in the menu drawer on narrow screens. It shows itself once a second language is enabled.
- **The list of languages** exists with English alone enabled.

---

## Working Agreements

- **No ceremony until the docs are final.** No tests, no official content (placeholders show the shape), no READMEs and no `ai/` skills. Agents add these by default; here they'd canonize intermediate states.
- **One change at a time.** The owner reviews each change and can revert it before the next.
- **Confirm before creating anything external,** such as hosting projects, domains or DNS.
- **In public repos:** pull requests open with a blank description for the owner to write, titles are plain English (`Chore: Update Vercel Config`), and nothing carries AI attribution. Check whether the repo is public; don't assume.

---

## Gotchas

Mistakes made once while building the nav-router docs, in general form.

- **Judging layout in the abstract.** Values that are right on paper can look wrong on screen: off-center, unevenly spaced, too close to a neighbor. Judge on a rendered page, at the target width, in both themes. Fix what the eye sees, then find the rule that produces it. *For example:* the content was centered in its column but not on the window, and the rail drifted toward the edge between widths.
- **Sizes that jump when content changes.** Work out the longest text each element can show, and reserve that size so nothing moves inline when it changes. *For example:* "Copy page" shrank when it read "Copied".
- **Awkward in-between widths.** Layouts are liquid. Check the widths between breakpoints, not just at them, so no resolution lands awkwardly. Design for 360px and up; at 320px nothing may scroll sideways or stop working, since that is what a zoomed desktop window gets. *For example:* menu tabs overflowed at phone width, tables squeezed prose to two words, and a drawer stayed open over a same-page jump.
- **Repeating forms on the homepage.** Each homepage experience should feel made for its argument. Don't fill it with repeated card grids or rearranged site components. To get fresh ideas, brief a subagent the way you'd brief a design contractor: the claim, the bar, what was rejected and why, and the facts it must stay true to.
- **Explaining mechanisms instead of outcomes.** Lead with what a developer building an app gets, not with how the library works inside. Treat marketing copy as a draft; it will be revised until it reads strongly.
- **Assuming instead of reading the source.** These are new libraries. Nothing you remember about them is reliable, so every claim about the API comes from reading their code. The same goes for house patterns (check how a sibling already does it before overriding) and for bugs (confirm the cause before reporting it).
- **Default agent habits.** Ceremony waits until the docs are final, so intermediate states aren't canonized. Anything external or hard to undo is confirmed first. Some platform defaults bite later: a new Vercel project's first deploy goes to production, and Vercel Authentication can sit in front of staging.
