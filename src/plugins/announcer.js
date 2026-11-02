import { isEqual } from '@semantic-ui/utils';

const LIVE_REGION_STYLE = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0';

// announces settled navigations through a live region, covering webkit's silence on intercepted
// navigations while staying quiet on initial load, hash jumps and same-title query keystrokes
export default ({
  politeness = 'polite',
  format = (page) => page?.title || page?.url || '',
} = {}, Router) => {
  const proto = Router.prototype;
  const { start, intercepted, applyCascade, settled, failed, stop } = proto;

  // mounted empty ahead of time so screen readers register the live region before its text mutates
  proto.ensureAnnouncer = function () {
    this.announcer ??= { element: null, queued: null, lastText: '' };
    if (!this.announcer.element && globalThis.document?.body) {
      const element = globalThis.document.createElement('div');
      element.setAttribute('aria-live', politeness);
      element.setAttribute('aria-atomic', 'true');
      element.setAttribute('data-router-announcer', '');
      element.style.cssText = LIVE_REGION_STYLE;
      globalThis.document.body.appendChild(element);
      this.announcer.element = element;
    }
    return this.announcer;
  };

  proto.start = function () {
    this.ensureAnnouncer();
    return start.call(this);
  };

  proto.intercepted = function (matched, event) {
    const announcer = this.ensureAnnouncer();
    announcer.queued = null;
    // clearing on departure makes back-to-back routes with identical titles announce again on settle
    if (announcer.element) {
      announcer.element.textContent = '';
    }
    return intercepted.call(this, matched, event);
  };

  proto.applyCascade = async function (matched, resolved, event = null) {
    const previous = this.page;
    await applyCascade.call(this, matched, resolved, event);

    if (!previous || !event || event.initial || event.signal?.aborted) {
      return;
    }
    const text = String(format(this.page) ?? '');
    if (!text) {
      return;
    }
    const announcer = this.ensureAnnouncer();
    const routeMoved = previous.route !== this.page?.route
      || !isEqual(previous.params, this.page?.params)
      || event.navigationType === 'reload';

    if (routeMoved || text !== announcer.lastText) {
      announcer.queued = text;
    }
  };

  proto.settled = function (event) {
    const result = settled.call(this, event);
    if (this.announcer?.queued) {
      const announcer = this.ensureAnnouncer();
      if (announcer.element) {
        announcer.element.textContent = announcer.queued;
        announcer.lastText = announcer.queued;
      }
      announcer.queued = null;
    }
    return result;
  };

  proto.failed = function (error, event) {
    if (this.announcer) {
      this.announcer.queued = null;
    }
    return failed.call(this, error, event);
  };

  proto.stop = function () {
    if (this.announcer) {
      this.announcer.element?.remove();
      this.announcer = null;
    }
    return stop.call(this);
  };
};
