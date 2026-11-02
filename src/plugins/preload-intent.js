import { each, noop } from '@semantic-ui/utils';

// warms a link's view chunks on hover, focus or touch. data and guards belong to the navigation
export default (options, Router, Navigator) => {
  const proto = Navigator.prototype;
  const { attach, detach } = proto;
  const events = ['pointerover', 'focusin', 'touchstart'];

  proto.onPreloadIntent = function (event) {
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

  proto.attach = function () {
    attach.call(this);
    if ((this.router.preload ?? 'intent') === 'intent' && globalThis.document) {
      this.handlePreload ??= (event) => this.onPreloadIntent(event);
      each(events, (name) => globalThis.document.addEventListener(name, this.handlePreload, { passive: true }));
    }
  };

  proto.detach = function () {
    if (this.handlePreload && globalThis.document) {
      each(events, (name) => globalThis.document.removeEventListener(name, this.handlePreload));
    }
    detach.call(this);
  };
};
