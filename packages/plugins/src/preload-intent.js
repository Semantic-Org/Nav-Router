import { each, noop } from '@semantic-ui/utils';
import { Navigator } from 'nav-router';
import { Router } from 'nav-router';

// warms a link's view chunks on hover, focus or touch, and adds router.preload() for warming one
// by hand. data and guards belong to the navigation; the module cache is the cache
const proto = Navigator.prototype;
const { attach, detach } = proto;
const events = ['pointerover', 'focusin', 'touchstart'];

Router.prototype.preloadViews = function(matched) {
  return this.resolveRouteViews(matched.routes);
};

// nothing is returned because nothing was decided
Router.prototype.preload = async function(target, args = {}) {
  const matched = this.match(this.href(target, args));
  if (matched) {
    await this.preloadViews(matched);
  }
};

proto.onPreloadIntent = function(event) {
  const link = event?.target?.closest?.('a[href], area[href]');
  if (!link?.href || link.hasAttribute('download') || (link.target && link.target !== '_self')) {
    return;
  }
  if (globalThis.navigator?.connection?.saveData) {
    return;
  }
  const origin = globalThis.location?.origin;
  if (origin && new URL(link.href, origin).origin !== origin) {
    return;
  }
  const matched = this.router.match(link.href);
  if (matched) {
    this.router.preloadViews(matched).catch(noop);
  }
};

// installed is on: the plugin is named for the intent it listens for
proto.attach = function() {
  attach.call(this);
  if (globalThis.document) {
    this.handlePreload ??= (event) => this.onPreloadIntent(event);
    each(events, (name) => globalThis.document.addEventListener(name, this.handlePreload, { passive: true }));
  }
};

proto.detach = function() {
  if (this.handlePreload && globalThis.document) {
    each(events, (name) => globalThis.document.removeEventListener(name, this.handlePreload));
  }
  detach.call(this);
};
