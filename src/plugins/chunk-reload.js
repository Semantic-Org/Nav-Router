import { isObject, isPromise } from '@semantic-ui/utils';

import { isLazy } from '../helpers/lazy.js';

// recovers once per url when a fresh deploy invalidates an old lazy view chunk.
// hover preloads swallow rejections, so only an actual failed navigation triggers a document load
export default ({
  storageKey = 'nav-router:chunk-reload',
  reload = (url) => globalThis.location?.assign?.(url),
} = {}, Router) => {
  const proto = Router.prototype;
  const { resolveView, settled, failed } = proto;
  const chunkErrors = new WeakSet();

  proto.resolveView = async function (target) {
    const tracked = isLazy(target) || isPromise(target);
    try {
      return await resolveView.call(this, target);
    }
    catch (error) {
      if (tracked && isObject(error) && error.name !== 'AbortError') {
        chunkErrors.add(error);
      }
      throw error;
    }
  };

  proto.settled = function (event) {
    try {
      globalThis.sessionStorage?.removeItem(storageKey);
    }
    catch {}
    return settled.call(this, event);
  };

  proto.failed = function (error, event) {
    const url = this.pending?.url ?? globalThis.location?.href ?? null;
    if (isObject(error) && chunkErrors.has(error) && globalThis.navigator?.onLine !== false && url) {
      try {
        if (globalThis.sessionStorage?.getItem(storageKey) !== url) {
          globalThis.sessionStorage?.setItem(storageKey, url);
          this.dropPending();
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
};
