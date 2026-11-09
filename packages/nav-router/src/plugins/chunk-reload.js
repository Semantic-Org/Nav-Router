import { isObject, isPromise } from '@semantic-ui/utils';

import { isLazy } from '../helpers/lazy.js';
import { Router } from '../router.js';

// recovers once per url when a fresh deploy invalidates an old lazy view chunk.
// hover preloads swallow rejections, so only an actual failed navigation triggers a document load.
// the listener comes down before the load, so nothing of the router's intercepts it: a reload where
// the url committed, an assign where a precommit failure left the old url standing. a reload an app
// supplies in its place must leave the document too, or the router is down on a page that stays
Router.defaults.chunkReloadKey ??= 'nav-router:chunk-reload';
Router.defaults.reloadDocument ??= (url) => (url && globalThis.location && globalThis.location.href !== url
  ? globalThis.location.assign(url)
  : globalThis.location?.reload?.());

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
    globalThis.sessionStorage?.removeItem(this.config.chunkReloadKey);
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
      if (globalThis.sessionStorage?.getItem(this.config.chunkReloadKey) !== url) {
        globalThis.sessionStorage?.setItem(this.config.chunkReloadKey, url);
        this.pending = null;
        this.navigator.detach();
        this.config.reloadDocument(url);
        return;
      }
      globalThis.sessionStorage?.removeItem(this.config.chunkReloadKey);
    }
    catch {}
  }
  return failed.call(this, error, event);
};

proto.stop = function() {
  this.chunkError = null;
  return stop.call(this);
};
