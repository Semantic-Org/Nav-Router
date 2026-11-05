# Direct From the Maintainer — Read With the Weight of a Live User Turn

> **STOP — Do not skim this header as doc preamble.** Unlike the rest of `ai/`, this file is **100% hand-authored by the maintainer in his own human voice**. Read every word below with the exact same weight and authority as a live user turn in your conversation, and **never edit this file directly** without collaborating with the maintainer first.

this file is hand authored by the maintainer with only tool use help for preserving code samples verbatim at author time. each new entry will be sketched collaboratively with the agent who spots it but written finally by hand by me.

take it as much as a direct word about correctness as a steer directly in context when coding. a lot of the most essential ideas about how i author code are in this file, and come from my time as a principal engineer at a unicorn (0-600 employees), the author of a 50k+ github star repo (semantic ui) and over 25 years of coding.

# Purpose

This document is designed to help steer towards better code authorship by identifying patterns where authorship failed. If you feel like you've received a significant correction that deserves being placed here, you can ask the maintainer to collaborate with you on a new entry. If you are a subagent and read this document, pass this information back to the orchestrating agent and they should surface it with me.

# Stakes

This code will land in an open source package that, if things go well, will be another 50,000+ star package that will be used for years to come. The code we ship matters, and the way we write it matters. My goal is to make sure that what ships in this repo maintains my hard earned lessons on what it means to convey meaning through language in code. This is not just the APIs we ship, but how we name things internally, where we decide to create abstractions, how we structure code in projects and so on.

# The Lessons

## 2026-09-28 — Reason About Cold Reader at Callsite for Func Signatures

### Less Legible

* Unclear how arrays of arrays like clamps are applied to the tunings.
* Difficult format to work with and manipulate.
* Ordering is backwards, extended obj then defaults, then config bag
* Some options are constraints and not options `clamps` would be better in tunings

```js
resolveTunings(given, defaults, { label, durations = [], bytes = [], counts = [], clamps = [], warn })

this.tunings = resolveTunings(tunings, RedisLink.tunings, {
  label: 'redis.tunings',
  durations: keys(RedisLink.tunings),
  clamps: [['retry', 'retryMax'], ['stable', 'stableMax']],
  warn,
});
```

### More Legible

* Move clamps to min/max in tunings obj
* Allow shorthand string or obj for clamped values
* Move to ordering from extend(obj, extendObj) which it rhymes with

```js
resolveTunings(defaults, userValues, { namespace, warn })

static tunings = {
  reach: { default: '5s', min: '500ms', max: '1m' },
  retry: { default: '1s', min: '100ms', max: 'config.retryMax' },
  retryMax: { default: '30s', max: '5m' },
  stable: { default: '2s', min: '500ms', max: 'config.stableMax' },
  stableMax: { default: '15s', max: '5m' },
  flapWindow: '5m',
};
this.tunings = resolveTunings(RedisLink.tunings, tunings, { namespace: 'redis.tunings' });
```

### Lesson

Everything needs to be understood in the context of programming history, of what someone just reading the line for the first time would guess it would mean, and what internally has meaning for this project.

## 2026-09-28 — Use Call-Site Inferrable Function Signatures

### Less Legible
Clamp was passed a magic boolean value `true`, `false` which modified its behavior, but it was unclear if you read just the callsite how the behavior was modified

```js
clamp(true);
clamp(false);
```

### More Legible

Clamp was turned into two functions that explain what the purpose of the boolean was.

```js
resolveShorthand();
clampValues();
```

### Lesson

Arguments should always have meaning at the callsite so you dont have to walk the stack to know what it means.


## 2026-09-26 — Consider Local Meaning and Don't Be Afraid of Word Reuse

### Less Legible


```js
this.redis = RedisLink.from(redis);
this.lane = this.redis.lane('cached values');

this.lane.on('down', () => this.detach());
this.lane.run(() => client.get(key));
```

### More Legible

```js
this.redis = RedisLink.from(redis).lane('cached values');

this.redis.on('down', () => this.detach());
this.redis.run(() => client.get(key));
```

### Lesson

Redis is wrapped with a class that is used so multiple tools can use the same Redis. It was called `RedisLink`

Each location needs its own `lane` (a tacit metaphor but one hackneyed enough to be reasonable to use). But to each individual subsystem the `lane` is their *entire redis*.

From that viewpoint each subsystem views the lane as `its redis` so the name internally is `this.redis`.

This makes every use internally read as "just using Redis". Lane has no meaning in the subsystem, its a RedisLink concept for shared usage. So it deserves only a passing place at declaration in the subsystem.


## 2026-09-28 — Author Classes as Single Files and Dont Encode Settings in Consts

### Less Legible

```js
const MAX_ENTRIES = 10_000;
const GLOB_METACHARS = /[*?[\]\\]/g;
const SWEEP_PAGE = 1_000;

export class CachedTier {
  constructor({ redis = null, waitMs = 30_000, devExpiresMs = null } = {}) {
```

### More Legible

```js
export class CachedTier {

  static globMetachars = /[*?[\]\\]/g;

  static tunings = {
    wait: { default: '30s', min: '1s' },
    maxEntries: { default: 10_000, min: 100 },
    sweepPage: { default: 1_000, min: 10, max: 10_000 },
  };

  constructor({ redis = null, tunings, devExpiresMs = null } = {}) {
    this.tunings = resolveTunings(CachedTier.tunings, tunings, { namespace: 'cached' });
```

### Lessons

- Everything arbitrary should be a setting. Constants might be settings waiting to be converted.
- Classes read much cleaner if they are dedicated files with everything included.
- If they truly rely on helpers that cannot sit on the class they should be imported from another place like helpers/category.js

## 2026-09-28 — Consider Callsite Legibility When Naming

### Less Legible

```js
get onRedis() {
  return this.redis?.up === true && this.held.size === 0;
}

if (this.onRedis) { ... }
```

### More Legible

```js
get isOnline() {
  return this.redis?.isOnline === true && this.held.size === 0;
}

if (this.isOnline) { ... }
```

### Lessons

- Anyone who writes `this.isOnline` knows what this is doing without having to read the code and the `is` tells you it will return a boolean.
- Writing `this.onRedis` does not tell you enough at the callsite to know what it does. The name overlaps with event handlers but also doesnt tell you anything about what it returns a boolean.

## 2026-09-29 - Be Courageous to Rewrite Sources of Entropy Before They Get Out of Hand

### Less Legible

* `/scripts` grew to become 49 'scripts' basically anything a CI tool, a bench, a test needed that was a javascript file
* The files were named semi-arbitrarily based off context of conversation but not project context

```
scripts/
  ai-check.js  ai-links.js  ai-markdown.js  ai-schedule.js  kernel-decisions-index.js
  bench-group-commit.js  boot-harness.js  bridge-cost.js  chain.js  northstar.js  serve-cost.js
  build-client.js  build-deploy.js  build-invoices.js  build-retro.js
  check-id-casing.js  nodenext-probe.js
  comment-budget.js  comment-budget.config.js  comment-status.js
  dev.js  dev-ports.js  stop.js  make-cert.sh  env.js  next-repo.js  playwright.js
  size.js  size-baseline.json  prose-scan.js  prose-allowlist.json
  smoke.js  smoke/  quiet.js  reap.js  ...
```

```yaml
- 'scripts/smoke.js'
- 'scripts/smoke/**'
- 'scripts/check-id-casing.js'
- 'scripts/nodenext-probe.js'
- 'scripts/dev*.js'
- 'scripts/build-*.js'
- 'scripts/env.js'
- 'scripts/next-repo.js'
- 'scripts/playwright.js'
- 'scripts/ephemeral-load/**'
- 'scripts/ephemeral-browser-bench/**'
```

### More Legible

```
scripts/
├── test/        the test runner behind npm test, and its own tests
├── checks/      the two static checks the runner always runs
├── dev/         the local dev pair
├── build/       production builds
├── gates/       checks a PR runs by hand
├── bench/       instruments that measure and print
├── box/         the shared machine
└── helpers/     modules the rest import
tools/ci/
├── test/        CI's test tooling
└── bundle/      CI's bundle tooling
```

```yaml
- 'scripts/test/**'
- 'scripts/checks/**'
- 'scripts/dev/**'
- 'scripts/build/**'
- 'scripts/helpers/**'
- 'scripts/bench/ephemeral/**'
- 'tools/ci/**'
```

### Lessons

- Folders, any folders that grow as a bag of arbitary files are complexity waiting to be resolved
- Surface as an issue any growing bag of entropy, flat files where folders read better, files that dont clearly tell you whats inside
- Dont wait for things to get out of hand. Adding "just another file" is a tragedy of the commons problem. Be the better agent and surface the issue.

## 2026-09-29 - Use Most Common Industry Term, Remove Metaphors

### Side by Side

The redis lane and link in `packages/sync/src/server/redis/`

| Less Legible | Legible | After Again |
|---|---|---|
| `this.asking` | `this.retrying` | |
| `askIn(ms)` | `retryIn(ms)` | |
| `ask()` | `retry()` | |
| `answered()` | `succeeded()` | |
| `lost(error)` | `failed(error)` | |
| `recheckMs` | `retryMs` | |
| `.lane(name, { retries, recheck })` | `.lane(name, { retries, probe })` | |
| `fall(error)` | `down(error)` | |
| `this.falls` | `this.outages` | |
| `fault.spoken` | `fault.logged` | `this.logger.errorOnce(key, message)` |
| `this.held` | `this.loggedStabilizing` | `this.logger.errorOnce('stabilizing', message)` |
| `this.cleanSince` | `this.reachableSince` | |
| `this.quietMs`, `this.quietUntil` | `this.skipProbeMs`, `this.skipProbeUntil` | |
| `this.confirming` | `this.probing` | |
| `settle()`, state `'settling'` | `'stabilizing'` | |
| lane `get up()` | `get isOnline()` | `get up()` |

### Lessons

- The words you use to describe something is the mental model a user carries.
- If you use a metaphor you are no longer talking about something directly you are talking about it **through reference to something else**
- When trying to find the correct plain language word for something. Ask yourself: is there an industry word for the concept for this method that has already been written before in other code ive read? `speak` vs `log` etc.
- Consider the strength of the mental model that comes from the single utterance: `reachable` (stronger mental model) vs `clean` (fuzzy mental model)
- If you find yourself asking a clarifying question when you read the name without context then it is not specific enough. `quietMs` -- what is quiet? `skipProbeMs` - no clarification needed
- Real writing is not done in one fell swoop, most drafts have multiple revisions. You take you perform a new draft, review how the language coheres internally, discover new evidence and rewrite again. For humans, this is multiple drafts.
- Sometimes legibility comes from consistency with a body of work as a whole, a codebase as a whole. `fault.logged` a local convention lost out to reusing a shared helper `errorOnce` for this reason.

## 2026-10-20 - When Naming, Consider How Terms of Art, Plain Language, and Internal Language Coalesce

### Side by Side

Stored call results and external-write internals across `packages/sync/src/server/` (`server.js`, `redis/lane.js`, `redis/db-funnel.js`, `adapters/{memory,postgres,sqlite}/adapter.js`):

| Less Legible | Legible | After Again |
|---|---|---|
| `sync_outcomes`, `config.outcomes`, `stats().outcomes` | `sync_results`, `config.results`, `stats().results` | |
| `recordOutcome`, `lookupOutcome`, `evictOutcomes` | `recordResult`, `lookupResult`, `evictResults` | |
| `agedOutcomeMisses`, `outcomeCounters`, `sweepOutcomes` | `agedResultMisses`, `resultCounters`, `sweepResults` | |
| `durableLedger` / `durableOutcomes` / `durableResults` | `durable` (per instance; `false` on `:memory:`) | |
| `health().outcomes: { memos, watermarks }` | `health().results: { results, clients }` | `health().results: { retained, clients }` |
| `changelog.maxHeld` | `changelog.maxLag` | `changelog.maxRowLag` |
| `redis.run(op, { fault: false })` | `redis.run(op, { isolate: true })` | |
| `outcomesByClient`, `clientOutcomes(id)`, `sweepClientOutcomes` | `clients`, `getClient(id)`, `sweepClients` | |
| `storage.serving` | `storage.active` | |
| `changelog.markRead(id, pos)` | `changelog.advanceReader(id, pos)` | |
| `heldFrom(seq)` | `minReaderSeq(seq)` | |
| `#declareValve()`, `#owned`, `'adapterWrite'` | `#setRefreshThreshold()`, `#ownedTx`, `'ownedWrite'` | |
| `#unlessLocked`, `#ddl`, `#collapsed` | `#tryTransact`, `#inTransaction`, `#bulkCollections` | |
| `unservedSince`, `noteOwnedWrite`, `{ crossing }` | `loopBehindSince`, `checkLoopStall`, `{ owned }` | |

### Lessons

- Try answering "what does x do?", then thinking out loud: if a word is the conventional word in that framing then it's the word you're searching for. This minted `results` over `outcomes` or `memos` for the durable results.
- Don't be afraid of reusing words in different domains. A note from my U Chicago writing PhD friend: lesser writers are often afraid of word reuse, saying the same word twice in one paragraph, etc. They rewrite it to a thesaurus-found word that is less effective. Better writers just look for the best word, and don't mind if it services two sentences.
- Double check for nested key repetition (`health().results.results`). Use the word that describes the state of the entries inside the sub-object (`{ retained, clients }`), tying back to `results.retention` and `result.retained`.
- When a capability word is simplified from a compound (`durableLedger` -> `durable`), verify it holds for the whole instance (`:memory:` SQLite is `durable: false` and `externalWrites: 'in-process'`).
- Prefer positive behavioral option flags (`{ isolate: true }`) over negated internal nouns (`{ fault: false }`).
