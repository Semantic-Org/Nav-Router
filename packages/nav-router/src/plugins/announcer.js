import { isEqual } from '@semantic-ui/utils';
import { Router } from '../router.js';

const LIVE_REGION_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0';
const STATUS_WORDS = { forbidden: 'Access denied', notFound: 'Not found', error: 'Error' };

// announces each page through a live region, covering webkit's silence on intercepted navigations.
// a render during a navigation is announced once it settles, a render of the standing page at once:
// a guard refusing in place, an error page, or a title that moved on a data re-run, on purpose. the
// initial load, hash jumps and same-title query keystrokes stay quiet
const defaults = {
  politeness: 'polite',
  format: (page) =>
    [STATUS_WORDS[page.status], page.title || (page.url ? new URL(page.url, 'http://x').pathname : '')].filter(Boolean)
      .join(', '),
};

// the plugin's own namespace on the router, router({ announcer: { politeness, format } }), merged
// over its defaults here since the router's merge is shallow
Router.defaults.announcer ??= {};
const settingsOf = (router) => ({ ...defaults, ...router.config.announcer });

const proto = Router.prototype;
const { start, intercepted, renderPage, settled, failed, stop } = proto;

// mounted empty ahead of time so screen readers register the live region before its text mutates
proto.ensureAnnouncer = function() {
  this.announcer ??= { element: null, queued: null, lastText: '', lastPage: null };
  if (!this.announcer.element && globalThis.document?.body) {
    const element = globalThis.document.createElement('div');
    element.setAttribute('aria-live', settingsOf(this).politeness);
    element.setAttribute('aria-atomic', 'true');
    element.setAttribute('data-router-announcer', '');
    element.style.cssText = LIVE_REGION_STYLE;
    globalThis.document.body.appendChild(element);
    this.announcer.element = element;
  }
  return this.announcer;
};

const announce = (announcer, text) => {
  if (announcer.element) {
    announcer.element.textContent = text;
  }
  announcer.lastText = text;
};

proto.start = function() {
  this.ensureAnnouncer();
  return start.call(this);
};

proto.intercepted = function(matched, event) {
  const announcer = this.ensureAnnouncer();
  announcer.queued = null;
  // clearing on departure makes back-to-back routes with identical titles announce again on settle
  if (announcer.element) {
    announcer.element.textContent = '';
  }
  return intercepted.call(this, matched, event);
};

proto.renderPage = async function(page, event = null) {
  await renderPage.call(this, page, event);
  if (!page || page.status === 'loading') {
    return;
  }
  const announcer = this.ensureAnnouncer();
  const { lastPage } = announcer;
  const moved = !lastPage || lastPage.route !== page.route || !isEqual(lastPage.params, page.params)
    || event?.navigationType === 'reload';
  announcer.lastPage = { route: page.route, params: page.params };
  const text = String(settingsOf(this).format(page) ?? '');
  if (!lastPage || event?.initial || !text || (!moved && text === announcer.lastText)) {
    return;
  }
  if (this.pending) {
    announcer.queued = text;
  }
  else {
    announce(announcer, text);
  }
};

proto.settled = function(event) {
  const result = settled.call(this, event);
  if (this.announcer?.queued) {
    announce(this.announcer, this.announcer.queued);
    this.announcer.queued = null;
  }
  return result;
};

proto.failed = function(error, event) {
  if (this.announcer) {
    this.announcer.queued = null;
  }
  return failed.call(this, error, event);
};

proto.stop = function() {
  if (this.announcer) {
    this.announcer.element?.remove();
    this.announcer = null;
  }
  return stop.call(this);
};
