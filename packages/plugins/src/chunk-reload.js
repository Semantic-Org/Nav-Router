import { isObject, isPromise } from '@semantic-ui/utils';

import { isLazy } from 'nav-router';
import { Router } from 'nav-router';

// recovers once per url when a fresh deploy invalidates an old lazy view chunk.
// hover preloads swallow rejections, so only an actual failed navigation triggers a document load.
// the listener comes down before the load, so nothing of the router's intercepts it: a reload where
// the url committed, an assign where a precommit failure left the old url standing. a reload an app
// supplies in its place must leave the document too, or the router is down on a page that stays
const defaults = {
  storageKey: 'nav-router:chunk-reload',
  reload: (url) => (url && globalThis.location && globalThis.location.href !== url
    ? globalThis.location.assign(url)
    : globalThis.location?.reload?.()),
};

// the plugin's own namespace on the router, router({ chunkReload: { storageKey, reload } }), merged
// over its defaults here since the router's merge is shallow
Router.defaults.chunkReload ??= {};
const settingsOf = (router) => ({ ...defaults, ...router.config.chunkReload });

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
    globalThis.sessionStorage?.removeItem(settingsOf(this).storageKey);
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
      if (globalThis.sessionStorage?.getItem(settingsOf(this).storageKey) !== url) {
        globalThis.sessionStorage?.setItem(settingsOf(this).storageKey, url);
        this.pending = null;
        this.navigator.detach();
        settingsOf(this).reload(url);
        return;
      }
      globalThis.sessionStorage?.removeItem(settingsOf(this).storageKey);
    }
    catch {}
  }
  return failed.call(this, error, event);
};

proto.stop = function() {
  this.chunkError = null;
  return stop.call(this);
};
