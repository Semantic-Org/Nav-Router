---
title: Docs i18n — Translating a Docs Site
description: How to take a sibling docs site from English into other languages — the folder a language is, the three states a page can be in, the right-to-left pass, how translators are briefed and checked, and which languages come first.
keywords: [docs, i18n, internationalization, translation, localization, rtl, right-to-left, arabic, plurals, hreflang, machine translation]
audience: contributing
skill: docs-i18n
type: skill
---

# Docs i18n — Translating a Docs Site

> **Skill:** `docs-i18n`
> **Purpose:** Take a docs site built with `docs-authoring` from English into other languages, as its own pass after the site exists

---

## Where This Starts

A site built with the `docs-authoring` skill launches in English with room left for languages: its words are keys, its styles are logical, its links take a language prefix. This skill is the pass that fills that room. It is usually a different agent, later, once the docs are final.

The reference implementation is **the nav-router docs**, which carry the whole mechanism and sample translations in Japanese, Simplified Chinese and Arabic. Read its code for the mechanics. If the site in front of you is missing the scaffolding described in `docs-authoring`, add that first.

---

## The Shape

- **English is the source.** It sits at the root. Every other language is served under a lower-case prefix (`/ja/…`, `/zh-cn/…`) while the page declares the proper tag (`lang="zh-CN"`). Not subdomains; those are taken by archived versions.
- **A language is one folder.** `content/translations/<language>/` mirrors `content/`: a `strings.json` for the interface's words, and a twin file for each Markdown page it has translated. Adding or fixing a translation never touches code, so a translator's whole job is "fill this folder".
- **A twin carries only its words.** Title, lede, body, and `source`: the hash of the English it was made from. Dates, kinds and sizes stay the English page's. When the English moves on, the hashes differ and the page says it may be behind. The build lists every translation that is behind, with the hash to set once it is brought up to date, so whoever changes an English page sees it.
- **Every page exists in every language.** Each kind of page keeps its own route, and that route covers every language (a leading `[...locale]` that is empty for English). A link in a language always takes its prefix, and the language menu never leads to a 404.
- **The languages are a list in one module,** given to Astro's own `i18n` config, so a page reads its language from `Astro.currentLocale` rather than being handed it.

---

## A Page's Three States

1. **Untranslated.** The English shows, left to right, inside the language's own frame, with a notice in the reader's language. A language cannot be enabled without that notice translated; the build fails.
2. **Machine draft.** `reviewed: false` in a twin's frontmatter, or `"$reviewed": false` in a language's `strings.json`. Shown with a notice saying so. Agents write every translation, so every translation starts here.
3. **Reviewed.** The line is deleted. No notice.

Only reviewed pages are offered to search engines: the first two states name the English page as canonical and stay out of `hreflang` and the sitemap.

---

## Right-to-Left

- **Logical properties everywhere,** including the long-hand for a shorthand with uneven sides (`padding-inline`, not `padding: 0 0 0 44px`).
- **Code and diagrams stay left to right;** the sentences and mock interfaces inside them follow the page. Check what each choice does to the diagram's own geometry before mirroring anything in it.
- **A number keeps its unit.** Wrap sizes and the like (`<bdi>`), or they come apart in a right-to-left line.
- **No tracking on joined scripts.** Letter-spacing pulls Arabic words apart. Labels set in the mono face need a real fallback for scripts the mono lacks.
- **Check it rendered,** with a real translation, at desktop and phone widths. Reading the CSS finds half of it.

---

## Translating

Translation is its own job, not the site builder's.

- **One agent per language,** briefed like a contractor: the audience, the voice, what stays in English, where each string appears and how much room it has. Ask it back for its glossary, the strings where order or room forced an awkward result, and anything unclear in the English.
- **What several translators stumble on is unclear in English too.** Fix the source.
- **Give it a checker** for what a build can't see: keys that don't exist, placeholders and inline tags that differ from the English.
- **The same agent takes later rounds,** so the glossary holds.
- **A change to code alone needs no translator.** A twin carries its own copy of the page's code blocks. When only those change in English (an import path, a renamed option), carry the same edit into each twin and update its `source`.
- **Translate only once a library's docs are final.** Until then, a few sample pages in a few languages (one right-to-left) are enough to prove the shape.
- **The reader is offered their language, never moved to it.** A page offers itself in the first language the browser asks for that it is written in, in that language's own words. After a reader switches, it asks once whether to always open the docs in that language; only a yes sends later visits there, and picking another language takes it back.
- **A language names itself.** Don't drop a language's menu name into a sentence template; cases and articles break. Each language writes its own name in its own sentence.
- **Plural forms are the language's own.** English has two, Japanese one, Arabic six; a translator writes the ones its language tells apart.
- **The assistant prompt asks for answers in the reader's language.**

---

## Which Languages

By community size and how much each community relies on translated docs (late 2026):

1. Simplified Chinese (`zh-CN`) and Japanese (`ja`). The highest need, and the translations every major framework did first and finished.
2. Brazilian Portuguese (`pt-BR`) and Spanish (`es`, one Latin-America-leaning locale).
3. Korean (`ko`), then Russian (`ru`) or French (`fr`).

German and Hindi have large communities that read English well, so they come late. Arabic is the one right-to-left candidate, for a second wave. Traditional Chinese can start as a labelled machine conversion of Simplified Chinese.

---

## Gotchas

- **Translating at the wrong level.** A page that is mostly words translates as a file; a page that is mostly markup translates as keys. Copying a hand-tuned template per language, or matching translations to the English text itself, breaks on the first edit. *For example:* a homepage dictionary keyed by its English sentences, when its copy is always a draft.
- **Sentences joined from pieces.** A verb in one element and its object in the next fixes an order only English reads in. *For example:* a caption of "User navigates to" and a page name, which Japanese could only turn into a label.
- **Merging routes to cover languages.** A route file is what Astro bundles by: one catch-all for every page ships the homepage's styles on every docs page and the reverse, and changes which stylesheet loads last. Give each kind of page its route and let the language be a param of it. After any change to routes or shared imports, compare what a page of each kind loads, on the built site, not the dev server. *For example:* one route for all pages took a page's CSS from 70 KB to 105 KB, and a menu button meant only for phones showed everywhere.
- **Judging right-to-left from the code.** Half the problems only show rendered, with a real translation: a period on the wrong side of a caption, a number parted from its unit, a wire crossing a mirrored mock app.
- **Mirroring a diagram wholesale.** A diagram with its own geometry (wires, a time axis) keeps it. Mirror what is inside a region, not where the regions are.
