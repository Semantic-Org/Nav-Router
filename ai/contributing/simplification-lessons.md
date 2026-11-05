# about this document

this file is a companion to [`legibility-lessons.md`](legibility-lessons.md). where `legibility-lessons.md` is hand-authored by the maintainer to record callsite shapes, naming, and signatures, this file records patterns where an agent built a complex or contorted mechanism and the maintainer replaced it with a simpler primitive, class boundary, or data shape.

simplicity here means **simplicity of the mental model**, never code-golf terseness. a simpler model should always be more legible than a complex one, and it is easy to mistake line-count removal for simplicity if thought of coarsely — shortening variable names, turning readable `if/else` blocks into ternaries, or cramming multiple branches into compound conditions makes code shorter and the mental model harder.

take it as a direct steer when designing classes, registries, and internal mechanisms: before routing a simple feature through a synthetic adapter, monkey-patching across packages, or writing a procedural bag of free functions, check whether the problem disappears by separating the concern or giving the noun its own class. when the maintainer rewrites a mechanism you built into a simpler shape, surface it so the commit pair and lesson can be added here.

# The Lessons

## 2026-10-22 — Component Plugins (`../next` `951ecfdbe` vs `f6f52a4f3`)

### 1. Standalone Mechanism Over Synthetic Adapter (`extendParams`)

#### Over-Engineered

**Smell:** Minting synthetic IDs (`params_${++extendCount}`) to force a standalone feature through another feature's registry, and writing cleanup code to undo a bug's side effects instead of fixing the root bug.

`extendParams` synthesized an anonymous plugin with an auto-incrementing namespace (`params_1`, `params_2`) just to feed one option (`lifecycleParams`) through `addPlugin`:

```js
let extendCount = 0;

export const extendParams = (params) => {
  return addPlugin({
    namespace: `params_${++extendCount}`,
    appliesTo: 'all',
    lifecycleParams: params,
  });
};
```

Because `defineComponent` had a typo setting `createComponent` to `identity` (returning the entire call bag), routing `extendParams` through `pluginCallParams` copied injected keys onto `this.instance`. Instead of changing `identity` to `noop` to fix the root bug, the agent wrote a cleanup loop in `Template.prototype.initialize` to delete injected keys back off `this.instance`.

#### Simplified

`extend-params.js` is a 13-line standalone array passed into `Template` and applied by `initializeParams()`, and `defineComponent` defaults `createComponent` to `noop`:

```js
// packages/component/src/plugins/extend-params.js
export const extendedParams = [];
export const extendParams = (params) => {
  extendedParams.push(params);
};
export const clearExtendedParams = () => {
  extendedParams.length = 0;
};
```

```js
// packages/templating/src/template.js
initializeParams() {
  if (!this.extendedParams?.length) {
    return;
  }
  const baseParams = this.buildCallParams();
  each(this.extendedParams, (params) => {
    const resolved = isFunction(params) ? params(baseParams) : params;
    this.addParams(resolved);
  });
}
```

#### Lesson

**Do not fake a standalone feature as a synthetic plugin/entry.** If `extendParams` is just an array of callbacks/objects merged into `customParams`, give it its own 10-line array and `initializeParams()` step instead of minting anonymous `params_1` plugins.

---

### 2. Local Map Registries Passed as Constructor Data Over Cross-Package Monkey-Patching

#### Over-Engineered

**Smell:** Reaching across package boundaries to mutate static state or monkey-patch a hook (`Template.initializePlugins = ...`) on a lower-level class instead of passing constructor data down.

`@semantic-ui/component` stored plugin state on static `Map`s declared on `Template` in `@semantic-ui/templating` (`Template.registeredPlugins`, `Template.plugins`) and monkey-patched `Template.initializePlugins = initializeTemplatePlugins` from inside `addPlugin`:

```js
// packages/templating/src/template.js
export const Template = class Template {
  static plugins = new Map();
  static registeredPlugins = new Map();
  // ...
  initialize() {
    if (Template.initializePlugins) {
      Template.initializePlugins(this);
    }
  }
};

// packages/component/src/register-plugin.js
export const registerPlugin = (plugin = {}) => {
  // ...
  Template.registeredPlugins.set(namespace, definition);
  return definition;
};

export const addPlugin = (PluginOrNamespace, appSettings = {}) => {
  // ...
  Template.initializePlugins = initializeTemplatePlugins;
  Template.plugins.set(namespace, entry);
  return entry;
};
```

#### Simplified

`@semantic-ui/component` owns simple `Map` registries (`registeredPlugins` in `register-plugin.js`, `availablePlugins` in `add-plugin.js`) and `defineComponent` passes `availablePlugins`, `extendedParams`, and `pluginConfig` into `new Template({...})` as ordinary constructor fields propagated on `clone()`:

```js
// packages/component/src/plugins/register-plugin.js
export const registeredPlugins = new Map();
export const addRegisteredPlugin = (name, plugin) => registeredPlugins.set(name, plugin);
export const getRegisteredPlugin = (name) => registeredPlugins.get(name);
export const clearRegisteredPlugins = () => registeredPlugins.clear();

// packages/component/src/plugins/add-plugin.js
export const availablePlugins = new Map();
export const addAvailablePlugin = (name, plugin) => availablePlugins.set(name, plugin);
export const getAvailablePlugin = (name) => availablePlugins.get(name);
export const clearAvailablePlugins = () => availablePlugins.clear();
```

```js
// packages/component/src/define-component.js
let prototypeTemplate = new Template({
  templateName,
  tagName,
  availablePlugins,
  extendedParams,
  pluginConfig,
  isPrototype: true,
  // ...
});
```

#### Lesson

**Pass registries in as constructor data instead of monkey-patching across packages.** `component` owns `registeredPlugins`, `availablePlugins`, and `extendedParams` and hands them to `new Template({...})`; `Template` does not need static plugin maps or a monkey-patched static hook.

---

### 3. A `Plugin` Class With `applyTo(template, config)` Over a Medley of Freestanding Functions

#### Over-Engineered

**Smell:** A procedural file of freestanding functions passing the same 4–5 context arguments to each other and stashing ad-hoc state (`_activePlugins`, `runPlugins`) on another class's instance.

`register-plugin.js` was a 310-line procedural file of freestanding functions (`matchesAppliesTo`, `resolveInstanceSettings`, `attachElementPlugin`, `detachElementPlugin`, `initializeTemplatePlugins`) that looped over `Template.plugins`, mutated fields directly on `template`, pushed ad-hoc records to `template._activePlugins`, and attached a `template.runPlugins = (hook) => ...` closure:

```js
function initializeTemplatePlugins(template) {
  if (Template.plugins.size === 0) {
    return;
  }
  const baseParams = template.buildCallParams();
  const componentSettings = template.settings || template.element?.settings;

  for (const [namespace, entry] of Template.plugins) {
    const { definition, sharedState } = entry;
    const config = template.pluginOptions?.[namespace];

    if (!isFunction(definition.appliesTo) && !matchesAppliesTo(template, definition.appliesTo, config)) {
      continue;
    }
    const settings = resolveInstanceSettings(baseParams, entry, config, componentSettings);
    if (
      isFunction(definition.appliesTo)
      && !matchesAppliesTo(template, definition.appliesTo, config, settings, componentSettings)
    ) {
      continue;
    }
    // ... 55 lines of procedural setup ...
    (template._activePlugins ??= []).push({ namespace, definition, self, pluginBag });
  }

  if (template._activePlugins?.length) {
    template.runPlugins = (hook) => {
      each(template._activePlugins, ({ namespace, definition, self, pluginBag }) => {
        // ...
      });
    };
  }
}
```

#### Simplified

Each plugin is an instance of `Plugin` (`../next/packages/component/src/plugins/plugin.js`), mirroring `Template`'s own `isPrototype` pattern (`this.isPrototype = template === undefined`). `addPlugin` creates the prototype `Plugin`, and `plugin.applyTo(template, userConfig)` checks applicability, resolves settings, instantiates `new Plugin({ template, ... })`, and calls `template.addPlugin(plugin)`.

The seam on `Template` shrinks to iterating `this.availablePlugins` and calling `plugin.applyTo`, plus calling `plugin.onCreated()` / `onRendered()` / `onDestroyed()` on `this.plugins`:

```js
// packages/templating/src/template.js
initializePlugins() {
  if (!this.availablePlugins?.size) {
    return;
  }
  const pluginConfig = this.pluginConfig || {};
  this.availablePlugins.forEach((plugin, namespace) => {
    plugin.applyTo(this, pluginConfig[namespace]);
  });
}

// in Template lifecycles:
each(this.plugins, (plugin) => plugin.onCreated());
each(this.plugins, (plugin) => plugin.onRendered());
each(this.plugins, (plugin) => plugin.onDestroyed());
```

#### Lesson

**Give a stateful domain noun its own class with a single `applyTo` entry point.** Turning procedural helper functions into `Plugin` (mirroring `Template`'s `isPrototype` lifecycle) reduced the `Template` seam to a 4-line loop (`plugin.applyTo(this, pluginConfig[namespace])`) and three 1-line lifecycle calls (`each(this.plugins, (plugin) => plugin.onCreated())`).

---

### 4. Single-Purpose `createReactiveProxy(target)` With Inheritance on the Data

#### Over-Engineered

**Smell:** Adding `fallback*` arguments and branching inside every trap/method of a generic primitive instead of shaping the data before handing it to a single-purpose primitive.

`createSettingsProxy(target, settingsVars = new Map(), fallbackProxy, fallbackBase)` took four arguments and branched inside both `get` and `set` traps to delegate unowned keys to `fallbackProxy`:

```js
function createSettingsProxy(target, settingsVars = new Map(), fallbackProxy, fallbackBase) {
  return new Proxy(target, {
    get(obj, prop) {
      if (!isString(prop)) {
        return obj[prop];
      }
      if (fallbackProxy && !Object.hasOwn(obj, prop) && Object.hasOwn(fallbackBase, prop)) {
        return fallbackProxy[prop];
      }
      // ...
    },
    set(obj, prop, value) {
      if (fallbackProxy && !Object.hasOwn(obj, prop) && Object.hasOwn(fallbackBase, prop)) {
        fallbackProxy[prop] = value;
        return true;
      }
      // ...
    },
  });
}
```

#### Simplified

`Plugin.createReactiveProxy(target)` takes one argument and knows nothing about inheritance. `resolveSettings` installs forwarding getters and setters on `ownSettings` for any key in `this.baseSettings` not overridden locally:

```js
// packages/component/src/plugins/plugin.js
each(this.baseSettings, (_, key) => {
  if (!Object.hasOwn(ownSettings, key)) {
    Object.defineProperty(ownSettings, key, {
      get: () => this.settings[key],
      set: (value) => {
        this.settings[key] = value;
      },
      enumerable: true,
      configurable: true,
    });
  }
});

return Plugin.createReactiveProxy(ownSettings);
```

#### Lesson

**Keep generic primitives single-purpose.** Put fallback/inheritance on the data (`Object.defineProperty` getters/setters on `ownSettings`) instead of adding fallback arguments and branches to `createReactiveProxy`.

---

### 5. Plain Function Over Defensive `get` Property Getter in Reactive Contexts (`templateData`)

#### Over-Engineered

**Smell:** Writing `get foo()` property getters out of fear that a value won't be reactive, without tracing how the consumer actually evaluates it.

When adding `templateData` (`../next` `#393`, `e95894fcd` vs `3b2a34eab`), the agent wrote `get locale()` in the docs, tests, and example plugin because `settings.locale` reads from a reactive Proxy:

```js
templateData: ({ settings }) => ({
  get locale() {
    return settings.locale;
  },
}),
```

#### Simplified

Every template expression (`{locale}`, `{#if is locale 'en'}`) already runs inside its own `Reaction` in the renderer, and `ExpressionEvaluator` automatically invokes zero-argument functions found in the data context. Calling `locale()` inside that reaction reads `settings.locale` and registers `settingSignal.depend()` directly:

```js
templateData: ({ settings }) => ({
  locale: () => settings.locale,
}),
```

#### Lesson

**Don't reach for a `get` getter out of fear that something isn't reactive.** Trace the reactive context where the value is consumed first — when the caller already evaluates functions inside a `Reaction`, a plain `() => settings.locale` is simpler and reads like ordinary data.

---

## 2026-10-23 — Writing Without a Server (row 121, `#369` at `ecde29e7` vs `#370` at `2213ed6a`)

A script that reads or writes collections without booting a server only needs three things from `createSyncServer`'s closure: an open storage adapter for the environment's store, the schema write path, and lazy table provisioning. External Writers (row 111) already treats any write from a non-serving process as an external write captured by database triggers.

### 1. Leave Handle Registrations Unflushed in Script Mode Instead of Recording and Replaying Them

#### Over-Engineered

**Smell:** Having a background script writer consume handle registrations (publications, actions, live values, search windows), wrap every registrar to record those calls, and replay the recording when a real server starts later in the same process.

In `#369`, the ambient engine flushed every handle's pending registration queue into itself, wrapped each registrar to record the calls, and also mounted and tore down every server plane so the real server could remount them:

```js
// packages/sync/src/server/server.js at ecde29e7
const recordedRegistrations = new Map();

function replayRecorded(registrars, recorded) {
  for (const { kind, name, definition, options } of recorded ?? []) { registrars[kind](name, definition, options); }
}

function flushRegistrations(handle, recorded) {
  const registrars = handleRegistrars(handle);
  if (ambient) {
    const recording = [];
    recordedRegistrations.set(handle, recording);
    for (const kind of keys(registrars)) {
      const registrar = registrars[kind];
      registrars[kind] = (registrationName, definition, options) => {
        const result = registrar(registrationName, definition, options);
        recording.push({ kind, name: registrationName, definition, options });
        return result;
      };
    }
  }
  replayRecorded(registrars, recorded);
  handle._flushRegistrations(registrars);
}

if (ambient) {
  api[HANDOVER_KEY] = {
    handles: () => [...ruleSources.values()],
    recordedRegistrations,
    takeNotifications: () => ({ events: preListenNotifications.splice(0, preListenNotifications.length), overflowed: [...preListenOverflowCollections] }),
  };
}
```

#### Simplified

In `#370`, the ambient engine is a database writer only. It never mounts planes and skips `flushRegistrations`, leaving each handle's pending registration queue untouched. When `createSyncServer` later adopts the engine in the same process, it takes three things (the open storage adapter, the `provisioned` map, and any pending remote-dep notifications) and calls `api.registerCollection(handle)`, which flushes each handle's buffered registrations once through the normal boot path:

```js
// packages/sync/src/server/server.js at 2213ed6a
function flushRegistrations(handle, { live, search }) {
  if (isAmbientEngine) { return; }
  handle._flushRegistrations({ /* the server's own registrars */ });
}

if (adopted !== null) {
  const { stopBinding, handles, provisioned: engineProvisioned, hasMatchingFlushEvents: engineHasFlushEvents, drainFlushes: drainEngine, takeNotifications } = adopted[ENGINE_KEY];
  stopBinding();
  provisioned = engineProvisioned;
  for (const handle of handles()) { api.registerCollection(handle); }
  // ...drain pending remote-dep flushes, transfer remaining notifications, and close the engine
}
```

#### Lesson

**Before building a recording-and-replay bridge between two instances, ask whether the first instance needed to consume that state at all.** Because a script writer never serves subscriptions, actions, or routes, leaving registrations queued on the collection handles eliminates the entire recording, replay, and plane-remount machinery.

---

### 2. Require an Explicit `createAccounts()` / `createFiles()` Instance Before Server Boot Instead of Silently Using Defaults

#### Over-Engineered

**Smell:** Lazily constructing a default plane instance when a plane helper (`setPassword`, `storeFile`) runs before `createSyncServer`, silently operating under default settings that disagree with the server's configuration.

An early iteration of `#370` constructed an unattached plane with default settings whenever a plane verb ran before a server mounted:

```js
// packages/accounts/src/server/index.js at b28f7482
let ambientPlane = null;
function currentPlane(verb) {
  if (mounted.length === 0) {
    if (bindAmbient(`accounts.${verb}`)) { return (ambientPlane ??= new Accounts()); }
    throwError('notMounted', verb, { /* ... */ });
  }
  return mounted[mounted.length - 1];
}

// packages/files/src/server/plane.js at b28f7482
if (verb !== undefined && mounted.length === 0 && bindAmbient(`files.${verb}`)) {
  return (ambientPlane ??= new FilesPlane({ provider: 'local', path: './files' }));
}
```

If an app configured custom Argon2 parameters or a different files directory in `createSyncServer`, a seed script calling `setPassword` or `storeFile` before server boot hashed passwords with the wrong parameters or wrote files to `./files`.

#### Simplified

A plane verb called before a server mounts requires an instance the app explicitly constructed with `createAccounts(config)` or `createFiles(config)` in a shared module imported by both the script and `serve.js`:

```js
// packages/accounts/src/server/index.js at 2213ed6a
let configured = null;

export function createAccounts(config) {
  if (configured !== null) { throwError('conflictingConfig', 'createAccounts', { /* ... */ }); }
  configured = new Accounts(config);
  return configured;
}

function currentPlane(verb) {
  if (mounted.length > 0) { return mounted[mounted.length - 1]; }
  if (configured !== null && bindAmbient(`accounts.${verb}`)) { return configured; }
  throwError('missingConfig', `accounts.${verb}`, { /* ... */ });
}
```

```js
// examples/demos/shopping/server/accounts.js
export const accounts = createAccounts({ guests: true });
```

#### Lesson

**Never silently fall back to default settings when a call runs before configuration is loaded.** If an operation depends on app-level settings (hashing cost, storage driver/path), refuse when unconfigured and let the app construct the configured instance once in a shared module.

---

### 3. Read Mutators From a Map on the Handle Instead of Draining the Registration Queue

#### Over-Engineered

**Smell:** Draining a one-shot registration queue just to look up a mutator attached via `handle.mutator(name, fn)`.

Previously, `handle.mutator(name, fn)` only pushed into the handle's `pending` registration stream:

```js
// packages/db/src/collection.js at ecde29e7
mutator(mutatorName, definition) {
  // ...
  declaredMutators.add(mutatorName);
  addRowVerb(mutatorName);
  register('mutator', mutatorName, definition);
  return handle;
},
```

Because `pending` is drained once when a server registers the handle, looking up a late-attached mutator in script mode required either draining `pending` early (forcing `#369`'s registration recording) or partially draining the queue.

#### Simplified

`collection()` copies `const mutators = { ...options.mutators }` at creation (without mutating the caller's options object), and `handle.mutator(name, definition)` writes to `mutators[mutatorName]` in addition to queuing the registration. While unsealed, `resolveMutator` reads `handle.mutatorDefinitions` directly:

```js
// packages/db/src/collection.js at 2213ed6a
const mutators = { ...options.mutators };
// ...
mutator(mutatorName, definition) {
  // ...
  declaredMutators.add(mutatorName);
  mutators[mutatorName] = definition;
  addRowVerb(mutatorName);
  register('mutator', mutatorName, definition);
  return handle;
},

// packages/sync/src/server/server.js at 2213ed6a
function resolveMutator(collectionName, mutatorName) {
  const key = `${collectionName}.${mutatorName}`;
  let entry = mutatorRegistry.get(key);
  if (!entry && !sealed) {
    const definition = ruleSources.get(collectionName)?.mutatorDefinitions?.[mutatorName];
    if (definition !== undefined) {
      registerMutators(collectionName, { [mutatorName]: definition });
      entry = mutatorRegistry.get(key);
    }
  }
  return entry;
}
```

#### Lesson

**Expose declared definitions on a plain map for direct lookup instead of forcing readers to consume a lifecycle event queue.**

---

### 4. Compute the Transitive Closure of Remote Dependencies Instead of Walking One Hop

#### Over-Engineered

**Smell:** Filtering a dependency graph by checking only direct edges from the initial write set, when recomputing an intermediate node produces writes that trigger further hops.

To avoid creating tables for unrelated collections during an ambient drain, `fedRemoteSchemas` initially selected only schemas with a direct remote dependency on a written collection:

```js
// packages/sync/src/server/server.js at 142dca9c
function* fedRemoteSchemas() {
  if (preListenNotifications.length === 0 && preListenOverflowCollections.size === 0) { return; }
  for (const [collectionName, collectionSchema] of collectionSchemas) {
    if (!collectionSchema.hasRemotes) { continue; }
    const fed = collectionSchema.remotes().some((descriptor) => (
      preListenOverflowCollections.has(descriptor.collection) || preListenNotifications.some((event) => event.collection === descriptor.collection)
    ));
    if (fed) { yield [collectionName, collectionSchema]; }
  }
}
```

In a two-hop chain (`Lines -> Hauls -> Trips`), writing only to `Lines` provisioned `Hauls` and `Lines`, but when recomputing `Hauls` queued a notification for `Trips`, `Trips` had not been provisioned or registered in `flushRegistry`, failing with `table layout mismatch` and leaving `Trips` stale.

#### Simplified

`fedRemoteSchemas()` computes the transitive closure over `collectionSchemas` until fixed point so every reachable hop is provisioned before the drain runs:

```js
// packages/sync/src/server/server.js at 2213ed6a
function fedRemoteSchemas() {
  const written = new Set(preListenOverflowCollections);
  for (const event of preListenNotifications) { written.add(event.collection); }
  if (written.size === 0) { return []; }
  const reached = [];
  const unreached = new Map([...collectionSchemas].filter(([, collectionSchema]) => collectionSchema.hasRemotes));
  for (let grew = true; grew;) {
    grew = false;
    for (const [collectionName, collectionSchema] of unreached) {
      if (!collectionSchema.remotes().some((descriptor) => written.has(descriptor.collection))) { continue; }
      unreached.delete(collectionName);
      written.add(collectionName);
      reached.push([collectionName, collectionSchema]);
      grew = true;
    }
  }
  return reached;
}
```

#### Lesson

**When evaluating a reactive or computed dependency graph, any node reached by a write can itself emit writes, so always compute the transitive closure rather than a single hop.**

---

### 5. Keep Constructor Validation Eager Instead of Deferring It for Unconfigured Callers

#### Over-Engineered

**Smell:** Making a constructor's validation/timing probe lazy to save ~30 ms when an unattached default instance is constructed, breaking the fail-fast boot guarantee the probe provided.

When scripts constructed an unattached default `new Accounts()` on first verb (Lesson 2), `Hasher` was changed to defer its Argon2id timing probe until `probeMs` or `verifyMiss` was read:

```js
// packages/accounts/src/server/password.js at b28f7482
#ensureProbe() {
  if (this.#dummy === undefined) {
    const started = performance.now();
    this.#dummy = this.#hashSync(encode(randomBytes(saltBytes)));
    this.#probeMs = performance.now() - started;
  }
}
```

Because that probe also verified that the runtime supports `crypto.argon2Sync` at server boot, making it lazy caused a server under default `security: 'standard'` to boot cleanly without Argon2 support and fail only on the first sign-in request.

#### Simplified

Once scripts require an explicit `createAccounts(config)` instance that the server also mounts (Lesson 2), the probe runs once with the app's real settings at construction, and `password.js` stays identical to `main`:

```js
// packages/accounts/src/server/password.js at 2213ed6a, as on main
constructor({ algorithm, memory, passes, parallelism, concurrency, queue }) {
  // ...
  this.#governor = new Governor({ concurrency, queue });
  // the probe at mount and the miss path's fixed hash in one: a build without argon2 refuses here, and the hidden posture's floor reads the time it took
  const started = performance.now();
  this.#dummy = this.#hashSync(encode(randomBytes(saltBytes)));
  this.probeMs = performance.now() - started;
}
```

#### Lesson

**If you have to weaken a constructor invariant to make an internal caller cheap, the caller's lifecycle is wrong.** Fixing the plane lifecycle (one `createAccounts()` instance shared by script and server) removed the duplicate probe without weakening boot-time validation.
