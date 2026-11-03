import { isObject, isPromise } from '@semantic-ui/utils';

import { isLazy } from '../helpers/lazy.js';

// recovers once per url when a fresh deploy invalidates an old lazy view chunk.
// hover preloads swallow rejections, so only an actual failed navigation triggers a document load
// the reload is the platform's own, a reload event the router declines, since an assign() of the
// same url is a navigation it would intercept and the chunk would only fail again
export default ({
  storageKey = 'nav-router:chunk-reload',
  reload = () => globalThis.location?.reload?.(),
} = {}, Router) => {
  const proto = Router.prototype;
  const { intercepted, resolveView, settled, failed, stop } = proto;

  proto.intercepted = function(matched, event) {
    this.chunkError = null;
    return intercepted.call(this, matched, event);
  };

  proto.resolveView = async function(target) {
    const tracked = isLazy(target) || isPromise(target);
    try {
      return await resolveView.call(this, target);
    }
    catch (error) {
      if (tracked && this.pending && isObject(error) && error.name !== 'AbortError') {
        this.chunkError ??= error;
      }
      throw error;
    }
  };

  proto.settled = function(event) {
    this.chunkError = null;
    try {
      globalThis.sessionStorage?.removeItem(storageKey);
    }
    catch {}
    return settled.call(this, event);
  };

  proto.failed = function(error, event) {
    const isChunkError = Boolean(error && this.chunkError === error);
    this.chunkError = null;
    const url = this.pending?.url ?? globalThis.location?.href ?? null;
    if (isChunkError && globalThis.navigator?.onLine !== false && url) {
      try {
        if (globalThis.sessionStorage?.getItem(storageKey) !== url) {
          globalThis.sessionStorage?.setItem(storageKey, url);
          this.pending = null;
          reload(url);
          return;
        }
        globalThis.sessionStorage?.removeItem(storageKey);
      }
      catch {}
    }
    return failed.call(this, error, event);
  };

  proto.stop = function() {
    this.chunkError = null;
    return stop.call(this);
  };
};
