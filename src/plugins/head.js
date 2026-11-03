import { each, extend, isArray, isFunction, isPlainObject, isPromise } from '@semantic-ui/utils';

const PROPERTY_PREFIX = /^(og|article|profile|book|fb):/;

// cascades route.meta across the active chain into document.head and formats document.title.
// meta is a hook on the router's door: evaluated when its route is created or updated, and on a
// reactive router again when what it read moves, so the tags follow live data. the merge and the
// writes are synchronous at render, off the swap path, and an async answer lands when it resolves.
// existing static tags are updated in place and restored when a later route clears them
export default ({
  defaults = {},
  formatTitle = null,
} = {}, Router) => {
  const proto = Router.prototype;
  const { renderView, onRouteCreated, onRouteUpdated, onRouteDestroyed, stop } = proto;

  const findExistingTag = (head, key) => {
    if (key === 'canonical') {
      return head.querySelector('link[rel="canonical"]');
    }
    const attr = PROPERTY_PREFIX.test(key) ? 'property' : 'name';
    const escaped = globalThis.CSS?.escape ? globalThis.CSS.escape(key) : key;
    return head.querySelector(`meta[${attr}="${escaped}"]`);
  };

  const writeTagValue = (element, key, value) => {
    element.setAttribute(key === 'canonical' ? 'href' : 'content', String(value));
  };

  const readTagValue = (element, key) => (
    element.getAttribute(key === 'canonical' ? 'href' : 'content')
  );

  const createTag = (doc, key) => {
    if (key === 'canonical') {
      const link = doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('data-router-head', '');
      return link;
    }
    const meta = doc.createElement('meta');
    meta.setAttribute(PROPERTY_PREFIX.test(key) ? 'property' : 'name', key);
    meta.setAttribute('data-router-head', '');
    return meta;
  };

  const restoreEntry = (key, record) => {
    if (record.created) {
      record.element.remove();
    }
    else if (record.initial === null) {
      record.element.removeAttribute(key === 'canonical' ? 'href' : 'content');
    }
    else {
      writeTagValue(record.element, key, record.initial);
    }
  };

  // the hook sees what the other hooks see, with the page's data and slices, so a reactive router
  // tracks what it reads. a sync answer waits for the render's write, an async one lands on its own
  proto.evaluateMeta = function (route) {
    const context = this.contextFor(route, this.page, { data: this.page.data, slices: this.page.slices });
    const value = this.evaluateHook(route, route.meta, context, { kind: 'slice', changed: (answer) => this.metaChanged(route, answer) });
    if (isPromise(value)) {
      this.metaChanged(route, value);
    }
    else {
      this.storeMeta(route, value);
    }
  };

  proto.storeMeta = function (route, value) {
    (this.headMeta ??= new Map()).set(route, isPlainObject(value) ? value : {});
  };

  proto.metaChanged = async function (route, value) {
    this.storeMeta(route, await value);
    if (route.active && this.page) {
      this.writeHead(this.page);
    }
  };

  proto.onRouteCreated = function (route, context) {
    if (route.meta !== undefined) {
      this.evaluateMeta(route);
    }
    return onRouteCreated.call(this, route, context);
  };

  proto.onRouteUpdated = function (route, context) {
    if (route.meta !== undefined) {
      this.evaluateMeta(route);
    }
    return onRouteUpdated.call(this, route, context);
  };

  proto.onRouteDestroyed = function (route, context) {
    this.headMeta?.delete(route);
    return onRouteDestroyed.call(this, route, context);
  };

  proto.writeHead = function (page) {
    const doc = globalThis.document;
    if (!page || page.status === 'loading') {
      return;
    }

    if (isFunction(formatTitle)) {
      const baseTitle = isArray(page.titles) ? (page.titles.at(-1) ?? '') : (page.title ?? '');
      const formatted = formatTitle(baseTitle, page.titles ?? [], page);
      if (formatted != null) {
        page.title = String(formatted);
        if (doc) {
          doc.title = page.title;
        }
      }
    }

    if (!doc?.head) {
      return;
    }

    const merged = extend({}, defaults);
    each(page.chain ?? [], (route) => {
      const meta = this.headMeta?.get(route);
      if (meta) {
        extend(merged, meta);
      }
    });

    const records = (this.headTags ??= new Map());
    const activeKeys = new Set();

    each(merged, (value, key) => {
      if (value === undefined || value === null || value === false) {
        return;
      }
      activeKeys.add(key);
      let record = records.get(key);
      if (!record) {
        const existing = findExistingTag(doc.head, key);
        if (existing) {
          record = { element: existing, created: false, initial: readTagValue(existing, key) };
        }
        else {
          const element = createTag(doc, key);
          doc.head.appendChild(element);
          record = { element, created: true, initial: null };
        }
        records.set(key, record);
      }
      writeTagValue(record.element, key, value);
    });

    for (const [key, record] of records.entries()) {
      if (!activeKeys.has(key)) {
        restoreEntry(key, record);
        records.delete(key);
      }
    }
  };

  proto.renderView = async function (page, event = null) {
    this.writeHead(page);
    return renderView.call(this, page, event);
  };

  proto.stop = function () {
    if (this.headTags) {
      for (const [key, record] of this.headTags.entries()) {
        restoreEntry(key, record);
      }
      this.headTags.clear();
      this.headTags = null;
    }
    this.headMeta = null;
    return stop.call(this);
  };
};
