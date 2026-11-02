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
  const states = new WeakMap();

  const getState = (router) => {
    let state = states.get(router);
    if (!state) {
      state = { element: null, queued: null, lastText: '' };
      states.set(router, state);
    }
    return state;
  };

  // mounted empty ahead of time so screen readers register the live region before its text mutates
  const ensureRegion = (router) => {
    const state = getState(router);
    if (!state.element && globalThis.document?.body) {
      const element = globalThis.document.createElement('div');
      element.setAttribute('aria-live', politeness);
      element.setAttribute('aria-atomic', 'true');
      element.setAttribute('data-router-announcer', '');
      element.style.cssText = LIVE_REGION_STYLE;
      globalThis.document.body.appendChild(element);
      state.element = element;
    }
    return state.element;
  };

  proto.start = function () {
    ensureRegion(this);
    return start.call(this);
  };

  proto.intercepted = function (matched, event) {
    const state = getState(this);
    state.queued = null;
    ensureRegion(this);
    // clearing on departure makes back-to-back routes with identical titles announce again on settle
    if (state.element) {
      state.element.textContent = '';
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
    const state = getState(this);
    const routeMoved = previous.route !== this.page?.route
      || !isEqual(previous.params, this.page?.params)
      || event.navigationType === 'reload';

    if (routeMoved || text !== state.lastText) {
      state.queued = text;
    }
  };

  proto.settled = function (event) {
    const result = settled.call(this, event);
    const state = states.get(this);
    if (state?.queued) {
      const region = ensureRegion(this);
      if (region) {
        region.textContent = state.queued;
        state.lastText = state.queued;
      }
      state.queued = null;
    }
    return result;
  };

  proto.failed = function (error, event) {
    const state = states.get(this);
    if (state) {
      state.queued = null;
    }
    return failed.call(this, error, event);
  };

  proto.stop = function () {
    const state = states.get(this);
    if (state) {
      state.element?.remove();
      states.delete(this);
    }
    return stop.call(this);
  };
};
