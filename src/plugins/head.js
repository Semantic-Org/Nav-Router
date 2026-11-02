import { each, extend, isArray, isFunction, isPlainObject } from '@semantic-ui/utils';

const PROPERTY_PREFIX = /^(og|article|profile|book|fb):/;

// cascades route.meta across the active chain into document.head and formats document.title.
// existing static tags are updated in place and restored when a later route clears them
export default ({
  defaults = {},
  formatTitle = null,
} = {}, Router) => {
  const proto = Router.prototype;
  const { renderView, stop } = proto;

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

  proto.syncHead = async function (page) {
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
    for (const ancestor of page.chain ?? []) {
      if (ancestor.meta !== undefined) {
        const context = {
          params: page.params ?? {},
          query: page.query ?? {},
          data: page.data ?? {},
          user: this.user,
          route: ancestor,
          router: this,
        };
        const raw = isFunction(ancestor.meta) ? await ancestor.meta(context) : ancestor.meta;
        if (isPlainObject(raw)) {
          extend(merged, raw);
        }
      }
    }

    // bail if a newer navigation replaced the page while an async meta function was settling
    if (this.page && this.page !== page) {
      return;
    }

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
    await this.syncHead(page);
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
    return stop.call(this);
  };
};
