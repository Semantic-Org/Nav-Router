---
title: The Navigation API, Seam by Seam
description: Spec guarantees, Safari divergences, and how a native router should use each member.
date: 2026-10-31
---

# The Navigation API, Seam by Seam

## What This Is

A practical guide for hand-writing a router directly on the Navigation API. The platform already runs navigation as a state machine; your router should be a projection of that machine, not a second one running beside it.

This guide is designed to prevent three common mistakes:
1. Using the wrong hooks for the work.
2. Blurring which layer owns which state.
3. Keying the reactive lifecycle to internal router state instead of the platform's URL and entry state.

Assumptions: No polyfills or History API fallbacks. Where the Navigation API is absent, let the browser do full document loads. Deferred commit (`precommitHandler`) is the primary path, with a first-class fallback branch for Safari (which lacks it).

## How to Read It

Every API member section has four parts:
- **binds**: What the spec guarantees.
- **safari**: Shipped versions, WebKit bugs, and real-world workarounds (plus brief Firefox notes).
- **the router**: How your router should use this member.
- **traps**: Common mistakes and outdated 2024 AI training patterns to avoid.

## The Shape, Before the Members

A navigation follows one strict sequence:

1. **intent (`navigate` event)**: One listener, installed once. Decide to let it leave (document load), cancel it (`preventDefault`), or handle it (`intercept`). The URL has not changed yet.
2. **precommit (`precommitHandler`)**: When supported, runs before the URL changes. Guards refuse and redirects rewrite the destination here with nothing to undo.
3. **commit**: URL, `location`, `history.state`, and `navigation.currentEntry` update synchronously. Then `currententrychange` fires, then `dispose` fires for pruned entries, then `handler` functions start—all with microtasks held back until handlers are invoked.
4. **work (`handler` promise)**: Data loading and rendering. Drives the browser's loading UI and assistive tech announcements.
5. **finish**: Focus resets, scroll restores/resets, `finished` resolves, `navigatesuccess` fires (with `navigation.transition` still set), `transition.finished` resolves, and `transition` becomes `null`.
6. **failure**: Signal aborts, `finished` rejects, `navigateerror` fires, `transition` becomes `null`. If it failed after commit, the new URL and entry stay. If before commit, nothing moved.
7. **abort**: Triggered by a newer navigation, `window.stop()`, `javascript:` URL, download, or `preventDefault`. Takes the failure path with `AbortError`.

**Core Architecture:**
- **Hooks**: Listen for intent in `navigate`. Run route work in `handler`. Update current route state in `currententrychange` (which catches un-intercepted same-document navigations too). Run guards in `precommitHandler`.
- **Layers**: The router is a thin store mirroring the platform: `current` from `currentEntry` + route match, `pending` from `transition`, `error` from `navigateerror`, history from `entries()`, and per-entry memory from `getState()`. Do not store parallel "navigating" flags or previous routes. Expose store moments as reactive signals; the UI layer reads signals and never touches `window.navigation`.
- **Lifecycle**: A route enters at **commit** (URL changes) and settles at **finish** (loading stops). It leaves when the next navigation commits. Cancel ongoing work exclusively via `event.signal`.

## What the Field Converged On

Routers built natively for the API derive state directly from `currentEntry` and `handler`. Routers retrofitted onto legacy pipelines fight constant state synchronization bugs. Four rules from production adopters:

- **`canIntercept` does not mean "mine"**: It is `true` for downloads, POSTs, reloads, and unrouted same-origin links. Filter out `downloadRequest`, `formData` (unless handling POSTs), `navigationType === 'reload'`, unrouted URLs, and foreign `info` tags (like React 19.2's `'react-transition'`).
- **Un-intercepted navigations cause full page reloads**: If your router writes a URL (e.g., a rollback or canonical URL fix) and ignores the resulting `navigate` event, the browser reloads the document. Intercept your own writes with a no-op handler and `manual` scroll/focus.
- **Identify your own navigations via `info` object identity, not sync flags**: Traversals and Safari 26.2 WKWebView events fire asynchronously in a later task, breaking synchronous boolean flags.
- **Put ephemeral intent in `info`, persistent memory in `state`**: Putting per-navigation scroll/focus options in `state` breaks Back button restoration. Also note: `replace` without `state`—or a third-party `history.replaceState`—wipes existing entry state.

---

## The Members

### 1. The `navigate` Event

#### binds
Fires for API methods (`navigate`, `reload`, `traverseTo`, `back`, `forward`), `location` changes, link clicks, form submits, `pushState`/`replaceState`, hash changes, `<a download>`, and browser Back/Forward. Does *not* fire for browser-UI cross-document loads (URL bar, reload button), cross-origin-initiated navigations, or `javascript:` URLs.

Key event properties:
- `navigationType`: `'push'`, `'replace'`, `'reload'`, or `'traverse'`.
- `destination`: Contains `.url`, `.sameDocument` (false for path pushes and `reload()` until intercepted), `.key`/`.id`/`.index` (populated on known traverses, else empty/`-1`), and `.getState()`.
- `canIntercept`: True if URL is rewritable and isn't a cross-document traverse.
- `cancelable`: True for non-traverses. For traverses, true only if top-level, same-document, and (if via browser UI) has user activation.
- `userInitiated`: True for trusted link clicks, form submits, or browser UI.
- `hashChange`: True for fragment-only navigations when classic history state is null (`pushState(..., "#x")` is false).
- `downloadRequest`: String from `<a download>`, else null.
- `formData`: `FormData` object on POST submits, else null.
- `info`: Value passed to API methods, passed by reference.
- `signal`: `AbortSignal` that fires on newer navigations, `window.stop()`, or handler rejection.
- `sourceElement`: The `<a>` or form submitter element.
- `hasUAVisualTransition`: True if the browser already animated the transition (e.g., iOS swipe-back).

Dispatch is synchronous for `navigate()`, `location` changes, `pushState`, and link clicks. It is asynchronous (queued task) for `back()`, `forward()`, `traverseTo()`, and form submits. Starting a new navigation aborts any ongoing one (`navigateerror` fires on the old one before `navigate` fires for the new one)—this includes calling `pushState` inside a handler. Calling `preventDefault()` aborts the navigation, fires `navigateerror` with `AbortError`, and rejects method promises.

#### safari
Shipped in 26.2.
- `event.signal` only aborts reliably starting in **26.4** (WebKit 301883).
- Below 27.0, `canIntercept` was falsely `true` for cross-origin URLs on different ports (306050)—manually check `destination.url` origin.
- `sourceElement` can be a child element (like `<span>`) instead of the `<a>` (321490)—use `sourceElement?.closest('a, area')`.
- Cross-document form POSTs fail to fire `navigate` (308803).
- Below 27.0, `navigate(location.href)` reported `push` instead of `replace` (306802).
- `<a download>` clicks do not abort ongoing navigations (303984).
- VoiceOver does not announce intercepted navigations (322426).
- Gate custom View Transitions on `!event.hasUAVisualTransition` so they don't double-play over Safari's swipe-back animation.
- *Firefox*: Shipped in 147; fragment navigations crashed tabs prior to 159 (Bugzilla 2077448).

#### the router
Attach one `navigate` listener for the lifetime of the app:
1. Ignore if `!canIntercept`, `downloadRequest !== null`, or cross-origin.
2. Ignore if `hashChange` is true and the matched route doesn't change (browser handles fragment scroll and fires `currententrychange`).
3. Check `formData` if your router handles POSTs; otherwise ignore.
4. Match `event.destination.url`. If matched, call `event.intercept()` and pass the match result directly into the handler via closure (never via router state, as another navigation could overwrite it). Do not read `location` or `currentEntry` here; they still hold the old URL.

#### traps
- Reading `location.href` instead of `event.destination.url`.
- Checking `destination.sameDocument` instead of `canIntercept` to see if you can handle a route.
- Treating `preventDefault()` as silent (it triggers `navigateerror` with `AbortError`).
- `await`ing before calling `intercept()` (must be called synchronously).
- Attaching multiple `navigate` listeners per component/view instead of one root listener.
- Using a synchronous boolean flag to detect self-initiated navigations (use `event.info` reference equality instead).
- Calling `preventDefault()` on a traverse without checking `event.cancelable`.

---

### 2. `intercept({ handler })`

#### binds
Turns an interceptable navigation into a same-document navigation. Must be called synchronously during `navigate` dispatch.

Execution order at commit (with microtasks held back):
1. URL, `location`, `history.state`, and `currentEntry` update.
2. `currententrychange` fires.
3. `dispose` fires on pruned entries.
4. `handler()` functions run synchronously up to their first `await`.
5. Microtask checkpoint runs (`committed` promise reactions fire).

When all handlers resolve: ongoing event clears, focus resets, scroll runs, `finished` resolves, `navigatesuccess` fires, `transition.finished` resolves, and `transition` becomes `null`.

If a handler rejects after commit: focus still resets, scroll does *not* run, `signal` aborts, `finished` rejects, `navigateerror` fires, and `transition` clears. **The committed URL and history entry remain—nothing rolls back.**

Note: `finished` rejections are marked handled by the browser; `committed` rejections are *not* and will trigger `unhandledrejection` if uncaught.

#### safari
- **iOS swipe freeze (319414)**: Intercepting a swipe-back while a top-level `wheel` listener is active freezes the viewport for 3 seconds. Workaround: avoid top-level `wheel` listeners, or skip intercepting traversals unless blocking or running a custom transition.
- **Private Browsing stale entry (314976)**: In Safari 26.x Private Browsing, `location` updates on intercept, but `currentEntry` stays stale and `currententrychange` doesn't fire. Workaround: capture `destination.url` at intercept.
- **Promise ordering**: Safari 27.2 resolves `committed` reactions before firing `navigatesuccess` on synchronous handlers (fixed in TP 255).
- **Scroll reset missing (304593)**: Intercepted pushes/replaces may not auto-scroll to top on iOS.

#### the router
Put all async route work (code splitting, data fetching, rendering) inside `handler`. Set your store's `pending` state when intercepting, and clear it in `navigatesuccess` / `navigateerror`—not when the handler returns—so focus and scroll finish first.

Check `event.signal.aborted` (or listen to `abort`) after every async step to stop stale renders. Only resolve the handler promise *after* the new DOM is rendered so browser focus reset, scroll restoration, and loading indicators time out accurately.

#### traps
- Calling `history.pushState`/`replaceState` inside `handler` (aborts the active navigation).
- Starting route work in `currententrychange` (no promise tracking, no `signal`, microtasks are blocked).
- Expecting a rejected `handler` to roll back the URL.
- Setting state after calling `navigate()` and expecting the synchronous start of `handler` to see it (`handler` starts *before* `navigate()` returns).
- Letting a router rollback URL write go un-intercepted (causes a full document reload).

---

### 3. `intercept({ precommitHandler })` and the Controller

#### binds
Runs synchronously after `navigate` dispatch, *before* commit. While pending, the URL and `currentEntry` remain unchanged, and `navigation.transition` is active. Requires `event.cancelable === true` (throws `InvalidStateError` otherwise).

Once all `precommitHandler` promises resolve, the commit steps (Section 2) run. If a `precommitHandler` rejects or is aborted, the navigation fails cleanly: URL and entries never change, `currententrychange` and `handler` never run, and `committed` + `finished` both reject.

The callback receives `controller` (`NavigationPrecommitController`):
- `controller.redirect(url, { state, info, history })`: Rewrites `destination.url` (and optionally `push`/`replace`, `state`, `info`) before commit. Valid only on `push` or `replace` (throws `InvalidStateError` on `reload` or `traverse`). Note: on non-API navigations (like link clicks), `state` passed to `redirect()` is dropped; set it via `updateCurrentEntry` in `handler` instead.
- `controller.addHandler(fn)`: Dynamically registers a post-commit `handler`.

Support: Chrome 141+, Firefox 147+.

#### safari
**Unsupported in shipping Safari (as of 27.2).** Enabled in WebKit trunk / Safari TP 251. On shipping Safari, the URL commits immediately upon `intercept()`.

#### the router
Run route guards, redirects, and pre-URL-change data checks here:
- Reject the promise to block navigation without URL flicker.
- Call `controller.redirect()` to redirect without creating extra history entries or aborting.

**The Safari Fallback Branch**: Write a single guard/redirect function. If `precommitHandler` is supported and `event.cancelable` is true, run it in `precommitHandler`. If unsupported (Safari), run it at the top of `handler` (post-commit): if a guard refuses there, trigger a rollback (`navigation.back()` or `replace`); if it redirects, call `navigate(url, { history: 'replace' })`.

Detect support by checking if `precommitHandler` actually gets invoked (do not trust `'NavigationPrecommitController' in window`).

#### traps
- Using the dead 2024 spec draft syntax `intercept({ commit: 'after-transition' })` and `event.commit()`.
- Reading `location` or `currentEntry` inside `precommitHandler` (they still hold the old URL; read `event.destination.url` or `navigation.transition.to.url`).
- Calling `event.scroll()` inside `precommitHandler` (throws `InvalidStateError` before commit).
- Passing `precommitHandler` when `event.cancelable` is false (e.g., browser Back after a reload), which throws `InvalidStateError`.
- Calling `controller.redirect()` during a `traverse` or `reload` (throws).

---

### 4. `intercept({ scroll })` and `event.scroll()`

#### binds
Options: `'after-transition'` (default) or `'manual'`.
With `'after-transition'`, once all handlers resolve and focus resets, the browser restores scroll position on `traverse`, or scrolls to the hash fragment / top of page on `push`, `replace`, and `reload`. If a handler rejects, no scroll happens.

Intercepting a `traverse` disables normal browser scroll restoration—it only restores via `'after-transition'` or `event.scroll()`.

`event.scroll()` triggers this scroll behavior early. It can only be called **once**, **after commit**, and **before `handler` finishes** (throws `InvalidStateError` during precommit, after finish, or if called twice).

#### safari
- **iOS undo bug**: On iOS Safari 26.6, calling `event.scroll()` to reset scroll to `0` can be overwritten 1ms later by Safari restoring the previous page's scroll position. Workaround: watch `scroll` events briefly after reset or let `'after-transition'` handle it after DOM layout settles.
- **Iframe stale layout (327109)**: In iframes, traversal scroll restoration calculates against old page height unless layout is forced (e.g., reading `document.body.scrollHeight`) inside `handler`.
- Setting `history.scrollRestoration = 'manual'` breaks iOS swipe-back visual snapshots.
- *Firefox*: Auto-restores scroll *before* `intercept()` runs on traversals.

#### the router
Keep `'after-transition'` by default and ensure your `handler` only resolves after the DOM is updated in height. Use `'manual'` and call `event.scroll()` inside `handler` only when you need to scroll before secondary async work finishes (e.g., streaming content).

For custom scrollable containers (not the window viewport), the API does nothing: save scroll offsets via `updateCurrentEntry({ state })` and restore them manually in `handler` on `traverse`.

#### traps
- Calling `event.scroll()` in `navigatesuccess`, after `finished`, or in `precommitHandler` (all throw).
- Manually calling `window.scrollTo()` inside `handler` while leaving `scroll: 'after-transition'` (the browser will overwrite your scroll when `handler` finishes).
- Storing `{ scroll: 'manual' }` in entry `state` and re-applying it on Back traversals (breaks Back scroll restoration).

---

### 5. `intercept({ focusReset })`

#### binds
Options: `'after-transition'` (default) or `'manual'`.
At finish (both resolve and post-commit reject), resets focus to the `[autofocus]` element, `<body>`, or `<html>`—*unless* focus was manually moved during the `handler`. Does not run on abort or precommit rejection.

#### safari
Shipped in 26.2. Some iOS WPT failures exist around `[autofocus]` delegates (fixed in TP 255). VoiceOver remains silent on intercepted navigations (322426).

#### the router
Leave on `'after-transition'` for page changes. If a route wants custom focus (e.g., an `<h1>`), call `.focus()` inside `handler` before resolving, which automatically cancels the default reset. Use `'manual'` per-navigation when updating URL query params from an active text input (like a search filter) so you don't steal focus while the user types.

#### traps
- Setting `focusReset: 'manual'` globally (breaks keyboard and screen reader navigation).
- Calling `.focus()` inside `navigatesuccess` instead of `handler` (runs too late, after the browser already reset focus to `<body>`).

---

### 6. `navigate()` and `reload()`

#### binds
`navigation.navigate(url, { state, info, history })` returns `{ committed, finished }`.
- Never throws synchronously on errors (even invalid URLs or `javascript:`); instead, both returned promises reject.
- `history: 'auto'` defaults to `'replace'` if the URL matches the current document URL, else `'push'`.
- If un-intercepted cross-document (or 204/download), `committed` and `finished` never settle.
- `navigation.reload({ state, info })` fires a `reload` event. When intercepted, it keeps the current entry's `key` and `id`, updates `state`, and fires `currententrychange` with `navigationType: 'reload'` and `from === currentEntry`.

#### safari
- Calling `navigate()` while a `traverseTo()` is still pending in the task queue rejects `committed` with an unhandled `AbortError` and can leave extra history entries (real-router #2877).
- Intercepted `reload()` with a hash fragment can be aborted by WebKit's frame loader (297435).

#### the router
Export thin wrappers around `navigate()` and `reload()`. Always attach `.catch(() => {})` to `committed` and `finished` when firing-and-forgetting (especially on rapid input-driven `replace` calls), because `committed` is not marked handled by the platform and will throw `unhandledrejection` on abort.

Use `reload()` to refresh route data in place; do not use `navigate(currentUrl)`, which performs a `replace` (generating a new `id` and firing `dispose` on the current entry).

#### traps
- Wrapping `navigate()` in `try/catch` expecting synchronous throws.
- `await`ing `finished` on a cross-document navigation (hangs forever).
- Intercepting every `reload` event blindly (breaks dev-server live reload and user Cmd+R unless gated by an `info` flag).

---

### 7. `traverseTo()`, `back()`, `forward()`, `canGoBack`, `canGoForward`

#### binds
Traverses the navigable's contiguous same-origin entry list by `key`.
- Queues a task: the `navigate` event fires **asynchronously**, never synchronously inside the call.
- Traversing to the current `key` resolves immediately with no event.
- Invalid keys or out-of-bounds `back()`/`forward()` return early-rejected promises (`InvalidStateError`).
- `navigation.back()` only steps through entries for *this* navigable (skipping iframe-only joint history steps that `history.back()` would hit).

#### safari
- **Safari 27 Back button skips entries (323364)**: Browser Back button can skip valid entries that `entries()` and `traverseTo()` still see (fixed in WebKit trunk 2026-10-31).
- **Gesture requirement**: iOS skips history entries pushed via script without a recent user gesture (by design since iOS 17.5).
- **Cross-origin return bug (298683)**: Returning from a cross-origin page via Back can wipe `entries()` to length 1 or leave `currentEntry` null.

#### the router
Use `navigation.back()` when `canGoBack` is true, falling back to `navigate(fallbackUrl, { history: 'replace' })` for deep links. When storing a return point (e.g., opening a modal or multi-step wizard), store `currentEntry.key` and return via `traverseTo(key)`—never store `entry.index`, which shifts when forward history is pruned.

#### traps
- Reading router state on the line immediately after `navigation.back()` (the `navigate` event hasn't fired yet).
- Calling `back()` synchronously inside a `navigate` listener (causes a double-jump race condition in Chromium).
- Using `history.back()` instead of `navigation.back()`.

---

### 8. `entries()` and `NavigationHistoryEntry`

#### binds
`navigation.entries()` returns a fresh snapshot array of same-origin contiguous entries.
Each entry has:
- `key`: Stable slot identifier. **Survives `replace` navigations.**
- `id`: Specific content/visit identifier. **Changes on `replace`.**
- `index`: Current array index (or `-1` if disposed).
- `url`: String URL (or `null` if hidden by referrer policy).
- `getState()`: Returns a fresh structured-clone deserialization of the entry's state on every call (separate from `history.state`).
- `dispose` event: Fires when an entry is overwritten by `replace` or pruned from forward history by a `push` (fires after `currententrychange`, before `handler`). Note: entries dropped from the back of history due to browser cap limits do *not* fire `dispose`.

#### safari
- **Below 27.0, `key` was unstable**: `history.replaceState` on a traversed entry mutated its `key` (310321), and Private Browsing failed to update `key`/`id` on `pushState`/`replaceState` (308115). Safari 27.0+ is the floor for stable keys.

#### the router
Refresh your entry list snapshot on `currententrychange` and `pageshow` (bfcache).
Key all per-slot caches (scroll positions, form drafts, UI state) by `entry.key`, **not** `entry.id` or `entry.url`. Listen to `entry.addEventListener('dispose', ...)` to evict cache entries when forward history is pruned.

#### traps
- Mutating the object returned by `entry.getState()` expecting it to save (it's a clone; use `updateCurrentEntry`).
- Keying route/scroll caches by `entry.id` (a canonical trailing-slash `replace` changes `id` and invalidates your cache) or by `url` (collides when visiting the same URL twice in history).
- Doing a `replace` navigation without passing `{ state: currentEntry.getState() }` if you want existing entry state to survive.

---

### 9. `currentEntry` and `currententrychange`

#### binds
`currententrychange` fires synchronously at commit for **every** same-document entry change, whether intercepted or not: intercepted navigations, `pushState`/`replaceState`, hash jumps, un-intercepted traversals, and `updateCurrentEntry()`.
Event properties:
- `from`: The previous `NavigationHistoryEntry` (equals `currentEntry` on `reload` and `updateCurrentEntry`).
- `navigationType`: `'push'`, `'replace'`, `'reload'`, `'traverse'`, or `null` (when triggered by `updateCurrentEntry`).

#### safari
Passes 26/26 WPTs. Watch out for the Private Browsing stale `currentEntry` bug (314976, see Section 2).

#### the router
**`currententrychange` is the sole writer of your router's `current` route state.**
Do not update `current` inside `handler` or `navigatesuccess`. Why? Because third-party `pushState` calls, hash links, and un-intercepted traversals bypass `handler` completely, but *always* fire `currententrychange`.
Keep the listener synchronous and fast: read `navigation.currentEntry`, match its URL, and update your reactive store. Do not start async route work here.

#### traps
- Updating `current` route state inside `handler` or `navigatesuccess`.
- Ignoring `currententrychange` when `event.from === navigation.currentEntry` (misses `reload` and `updateCurrentEntry` state updates).
- Storing a separate `lastSuccessfulEntry` variable (derive it if needed: `navigation.transition ? navigation.transition.from : navigation.currentEntry`).

---

### 10. `updateCurrentEntry({ state })`

#### binds
Synchronously overwrites `currentEntry`'s state and fires `currententrychange` with `navigationType: null` and `from === currentEntry`. Does not fire `navigate`, does not change the URL, and does not touch `history.state`. Throws `InvalidStateError` if `currentEntry` is null.

#### safari
100% compliant since 26.2.

#### the router
Use this to save state that happens *after* a page loads (e.g., debounced scroll container offsets, form drafts, accordion states). Read it back on `traverse` via `currentEntry.getState()`. Do not mirror this state into `history.replaceState`.

#### traps
- Calling `updateCurrentEntry` on every raw `scroll` or `mousemove` event (it runs structured cloning and dispatches a synchronous event every time—debounce it or write right before navigation).

---

### 11. `navigation.transition`

#### binds
Active only during an **intercepted** navigation. Created right after `navigate` dispatch finishes (so it is `null` inside `navigate` listeners), stays non-null through `precommitHandler`, `commit`, `handler`, `navigatesuccess`, and `navigateerror`, and becomes `null` right after.
Properties: `{ navigationType, from, to, committed, finished }`. (`to` is `event.destination`, updating live if `controller.redirect()` is called).

#### safari
`navigationType`, `from`, and `finished` shipped in 26.2. **`to` and `committed` are missing in Safari 27.2** (shipped in TP 255) and `to` is missing in Firefox 148.

#### the router
Use `navigation.transition` (plus the destination captured from `event.destination` for Safari/Firefox compatibility) as your router's `pending` state. Clear `pending` in `navigatesuccess`/`navigateerror`.

#### traps
- Reading `navigation.transition` inside the `navigate` event listener (it is still `null`).
- Reading `navigation.transition` inside `navigate().finished.then(...)` (it is already `null`; read it inside `navigatesuccess` instead).
- Relying on `transition.to` without a fallback to `event.destination` (breaks in shipping Safari and Firefox).

---

### 12. `navigatesuccess` and `navigateerror`

#### binds
- `navigatesuccess`: Fires after focus reset, scroll, and `finished` resolution. Also fires for un-intercepted same-document navigations (`pushState`, hash changes).
- `navigateerror`: Fires (`ErrorEvent`) when a `precommitHandler` or `handler` rejects, or when aborted (`preventDefault()`, `window.stop()`, or superseded by a newer navigation). When a new navigation aborts an old one, `navigateerror` fires synchronously *before* the new `navigate` event dispatches.

#### safari
- Safari 27.2 resolves `committed` promise reactions before firing `navigatesuccess` on sync handlers (fixed in TP 255).
- Starting a third navigation inside `navigateerror` fails to fire `navigateerror` on the second (318925, fixed in TP 251).

#### the router
Use `navigatesuccess` to clear `pending` state.
In `navigateerror`, clear `pending` state and check `event.error?.name === 'AbortError'`. Ignore `AbortError` for UI error boundaries (it just means the user clicked another link or cancelled). For real errors, store the error; if redirecting to an error route or rolling back, defer the `navigate()` call by a microtask/task so you don't collide with an active abort loop.

#### traps
- Showing an error page/toast when `event.error.name === 'AbortError'`.
- Calling `navigation.navigate()` synchronously inside `navigateerror`.

---

### 13. `navigation.activation`, bfcache, and Prerender

#### binds
`navigation.activation` (`{ from, entry, navigationType }`) records how the document was initially loaded. Constant across same-document navigations.
On a **bfcache restore**, the browser mutates `activation` in place (`navigationType` becomes `'traverse'`), updates `entries()` and `currentEntry`, fires `pageshow` (`event.persisted === true`), and queues `dispose` events for pruned forward entries.

#### safari
Calling `navigate()` immediately inside a bfcache restore can fail with `AbortError` across engines, and `pushState` after bfcache Back can trigger `navigateerror` on WebKit (310261).

#### the router
1. **Initial Startup**: No `navigate` event fires on initial page load. Match `navigation.currentEntry.url` on boot. Compare `navigation.activation?.entry?.key !== navigation.currentEntry?.key` at hydration—if they differ, the user clicked Back/Forward before your JS hydrated, so reconcile immediately.
2. **bfcache Restore**: Listen for `window.addEventListener('pageshow', (e) => { if (e.persisted) ... })`. Re-read `currentEntry` and `entries()` to sync your store. Do *not* re-run your route's `handler`—the DOM is already restored.

#### traps
- Expecting `navigate` or `currententrychange` to fire on initial document load.
- Re-running data loaders/renders on bfcache `pageshow`.
- Caching `navigation.activation` values at boot instead of reading it fresh after `pageshow`.

---

### 14. The Platform Beside It & View Transitions

#### binds & interplay
- **`pushState` / `replaceState`**: Fires `navigate` synchronously (`sameDocument: true`, `hashChange: false`). Aborts any ongoing intercepted navigation.
- **`location.hash`**: Fires `navigate` (`hashChange: true`), updates entry (carrying over previous `state`), fires `currententrychange`, `popstate`, `navigatesuccess`, and finally `hashchange`.
- **Iframes**: Have independent `window.navigation` and `entries()`. Calling `parentWindow.navigation.back()` skips iframe history steps; `history.back()` does not.
- **View Transitions (`document.startViewTransition`)**: Not coupled to Navigation API by spec, but interacts via `handler` timing:
  - Skip calling `startViewTransition` if `event.hasUAVisualTransition` is true (prevents double-animating on iOS swipe-back).
  - Resolving `handler` on `vt.updateCallbackDone` runs focus reset and scroll as soon as the new DOM is inserted. Resolving on `vt.finished` delays focus and scroll until the animation ends.

#### the router
Never attach `click` listeners to `document`, `popstate` listeners, or `hashchange` listeners, and never call `history.pushState`. The `navigate` and `currententrychange` events cover 100% of these cases with full context.

---

## End-to-End Execution Ordering

### A. Intercepted Push (Async Handler, No Precommit)
1. `navigate()` called $\rightarrow$ any ongoing navigation aborts (`signal` aborts, `finished` rejects, `navigateerror` fires).
2. `navigate` event dispatches synchronously (`location` & `currentEntry` are still old; `transition` is `null`). Listener calls `intercept({ handler })`.
3. `navigation.transition` is created.
4. **Commit starts (microtasks blocked)**:
   - URL, `location`, `history.state`, `currentEntry`, and `entries()` update.
   - `committed` promise resolves (reactions queued).
   - `currententrychange` fires synchronously.
   - `dispose` fires synchronously on pruned forward entries.
   - `handler()` starts synchronously up to its first `await`.
   - `transition.committed` resolves.
5. **Microtasks unblocked**: `navigate()` returns; `committed` and `transition.committed` `.then()` callbacks run.
6. **`handler` resolves**:
   - Focus resets $\rightarrow$ Scroll runs $\rightarrow$ `finished` resolves $\rightarrow$ `navigatesuccess` fires (`transition` still set) $\rightarrow$ `transition.finished` resolves $\rightarrow$ `transition` becomes `null`.

### B. Handler Rejects (Post-Commit)
Steps 1–5 run as above. When `handler` rejects:
- Focus resets $\rightarrow$ **Scroll is skipped** $\rightarrow$ `signal` aborts $\rightarrow$ `finished` rejects $\rightarrow$ `navigateerror` fires $\rightarrow$ `transition.finished` rejects $\rightarrow$ `transition` becomes `null`.
- **URL and `currentEntry` stay at the new destination.**

### C. Newer Navigation Aborts Ongoing Navigation
Nav 1 is paused at Step 5. Nav 2 starts:
- Nav 1 focus/scroll are cancelled $\rightarrow$ Nav 1 `signal` aborts (`AbortError`) $\rightarrow$ Nav 1 `finished` rejects $\rightarrow$ `navigateerror` fires for Nav 1 $\rightarrow$ Nav 2 dispatches `navigate` and commits (`currententrychange.from` is Nav 1's entry).

### D. With `precommitHandler`
1. `navigate` dispatches $\rightarrow$ listener calls `intercept({ precommitHandler, handler })`.
2. `transition` is created. **URL and `currentEntry` do not move.**
3. `precommitHandler(controller)` runs synchronously. `navigate()` returns while URL is still old.
4. `controller.redirect()` may mutate destination URL/type/state.
5. When `precommitHandler` resolves $\rightarrow$ Steps A.4 to A.6 run.
6. If `precommitHandler` rejects or aborts $\rightarrow$ No commit, no focus, no scroll, `committed` & `finished` reject, `navigateerror` fires. URL and entries never changed.

---

## Safari Checklist (In Order of Impact)

1. **No `precommitHandler` in shipping Safari (up to 27.2)**: URL moves immediately on `intercept()`. You must support post-commit guard rollbacks and redirects in `handler`.
2. **iOS Swipe-Back 3s Freeze (319414)**: Top-level `wheel` listeners + `intercept()` on traverse freezes iOS Safari for 3s.
3. **Safari 27 Back Button Skips Entries (323364)**: Native Back button can skip valid entries (fixed in trunk, pending release); script pushes without user gestures are intentionally skipped on iOS.
4. **AbortSignal Floor is 26.4 (301883)**: `event.signal` does not fire on 26.2/26.3.
5. **Entry `key` Floor is 27.0 (310321)**: `replaceState` mutated `key` prior to 27.0.
6. **Private Browsing Stale Entry (314976)**: `currentEntry` fails to update and `currententrychange` fails to fire in 26.x Private Browsing.
7. **`canIntercept` Port Bug (<27.0, 306050)**: Verify `new URL(event.destination.url).origin === location.origin`.
8. **`sourceElement` Target Bug (321490)**: Use `event.sourceElement?.closest('a, area')`.
9. **Cross-URL Form POSTs (308803)**: Do not fire `navigate` on Safari; use a `submit` listener if intercepting POSTs.
10. **iOS Scroll Reset Undo & Missing Auto-Scroll (304593)**: iOS may fail to scroll to top on push, or overwrite `event.scroll()` 1ms later.
11. **Missing `transition.to` and `transition.committed`**: Only in TP 255; read `event.destination` instead of `transition.to`.
12. **Double Transitions on Swipe**: Always skip `startViewTransition` when `event.hasUAVisualTransition === true`.

---

## 30 Antipatterns to Avoid

1. Using `commit: 'after-transition'` and `event.commit()` (dead 2024 draft; use `precommitHandler`).
2. Adding document `click` listeners for links (`navigate` handles all links natively).
3. Adding `popstate` or `hashchange` listeners (`navigate` and `currententrychange` replace them).
4. Calling `history.pushState` / `replaceState` inside `handler` (aborts the active navigation).
5. Reading `location.href` inside `navigate` or `precommitHandler` (still holds the old URL; read `event.destination.url`).
6. Updating router `current` state in `handler` or `navigatesuccess` (update only in `currententrychange`).
7. Maintaining a custom `isNavigating` boolean (use `navigation.transition !== null`).
8. Assuming `event.preventDefault()` is silent (it fires `navigateerror` with `AbortError`).
9. Triggering error UI on every `navigateerror` (ignore `error.name === 'AbortError'`).
10. Calling `event.scroll()` in `precommitHandler`, `navigatesuccess`, or after `finished` (throws `InvalidStateError`).
11. Expecting a rejected `handler` to roll back the URL (post-commit rejections stay on the new URL).
12. `await`ing `finished` on an un-intercepted cross-document navigation (never settles).
13. Saving `entry.index` to return to a route later (indexes shift; save `entry.key` and use `traverseTo(key)`).
14. Keying caches by `entry.id` or `url` (key by `entry.key` so caches survive `replace` and support duplicate URLs).
15. Waiting for a `navigate` event on initial page load or bfcache restore (match at startup and on `pageshow`).
16. Feature-detecting `precommitHandler` via `'NavigationPrecommitController' in window` (detect whether the callback runs).
17. Calling `navigation.back()` synchronously inside a `navigate` listener (causes Chromium history jump bugs).
18. Using `history.back()` instead of `navigation.back()` (steps into child iframe history).
19. Setting `focusReset: 'manual'` globally (breaks accessibility; set only per-navigation for filter inputs).
20. Calling `navigate(currentUrl)` to refresh data (creates a new `id` and disposes the entry; use `reload()`).
21. Assuming `canIntercept === true` means the navigation belongs to the router (filter out downloads, POSTs, reloads, and unrouted links).
22. Performing a router URL rollback without intercepting it (triggers a full document reload).
23. Using synchronous boolean flags to identify router-initiated navigations (traversals are async; check `event.info` identity).
24. Storing per-navigation intent (like `{ scroll: 'manual' }`) in `entry.getState()` (replays on Back button; use `info`).
25. Storing a separate `lastSuccessfulEntry` state (derive from `transition.from` or `currentEntry`).
26. Calling `navigate(url, { history: 'replace' })` post-commit to canonicalize URLs (aborts active navigation; use `controller.redirect()` in precommit).
27. Intercepting all `reload` events (breaks Cmd+R and dev server reloads unless gated by `info`).
28. Passing `precommitHandler` without checking `event.cancelable` (throws on uncancelable traverses).
29. Rolling back immediately on `AbortError` (wait a microtask to see if a newer navigation superseded it).
30. Assuming no navigation happened before hydration (compare `activation.entry.key` with `currentEntry.key` at boot).
