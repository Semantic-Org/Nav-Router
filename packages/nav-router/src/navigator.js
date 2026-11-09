import { each, isArray, isEqual, isPlainObject, noop } from '@semantic-ui/utils';

import { IS_NAVIGATOR } from './internal-helpers/identity.js';

// the platform seam: window.navigation projected as plain fields, the verbs, the filter, and the
// moments handed to the router by name. nothing here decides a route or holds one
export class Navigator {
  // brand navigator
  get [IS_NAVIGATOR]() {
    return true;
  }
  static [Symbol.hasInstance](value) {
    return !!value?.[IS_NAVIGATOR];
  }

  constructor(router) {
    this.router = router;
    // per instance, so two routers on one page never claim each other's navigations
    this.infoKey = Symbol('nav-router/info');
    this.attached = false;

    this.entry = null;
    this.entries = [];
    this.activation = null;
    this.transition = null;

    this.handleNavigate = (event) => this.onNavigate(event);
    this.handleEntryChange = (event) => this.onEntryChange(event);
    this.handleSuccess = (event) => this.onSuccess(event);
    this.handleError = (event) => this.onError(event);
    this.handlePageShow = (event) => this.onPageShow(event);
  }

  /*******************************
             Lifecycle
  *******************************/

  attach() {
    if (this.attached) {
      return;
    }

    const nav = globalThis.navigation;
    if (nav) {
      nav.addEventListener('navigate', this.handleNavigate);
      nav.addEventListener('currententrychange', this.handleEntryChange);
      nav.addEventListener('navigatesuccess', this.handleSuccess);
      nav.addEventListener('navigateerror', this.handleError);
    }
    if (globalThis.window) {
      globalThis.window.addEventListener('pageshow', this.handlePageShow);
    }
    this.attached = true;
    this.project();

    // a back or forward pressed before this listener existed left activation and currentEntry apart
    if (nav?.activation?.entry?.key && nav.currentEntry?.key && nav.activation.entry.key !== nav.currentEntry.key) {
      this.onEntryChange({ navigationType: 'traverse', from: nav.activation.entry });
    }
  }

  detach() {
    if (!this.attached) {
      return;
    }

    const nav = globalThis.navigation;
    if (nav) {
      nav.removeEventListener('navigate', this.handleNavigate);
      nav.removeEventListener('currententrychange', this.handleEntryChange);
      nav.removeEventListener('navigatesuccess', this.handleSuccess);
      nav.removeEventListener('navigateerror', this.handleError);
    }
    if (globalThis.window) {
      globalThis.window.removeEventListener('pageshow', this.handlePageShow);
    }
    this.attached = false;
  }

  /*******************************
           Platform Reads
  *******************************/

  // the platform's current truth, re-read at every moment that can move it
  project() {
    const nav = globalThis.navigation;
    this.entry = nav?.currentEntry ?? null;
    this.entries = nav?.entries?.() ?? [];
    this.activation = nav?.activation ?? null;
    each(this.entries, (entry) => {
      // the entry's own handler slot, so binding again binds once
      if (entry) {
        entry.ondispose = () => this.onDispose(entry);
      }
    });
  }

  // back inside the app: the previous entry is same-document and one of ours
  get canGoBack() {
    const nav = globalThis.navigation;
    if (!nav?.canGoBack) {
      return false;
    }
    const currentIndex = nav.currentEntry?.index ?? -1;
    if (currentIndex > 0) {
      const previous = (nav.entries?.() ?? [])[currentIndex - 1];
      if (!previous || previous.sameDocument === false) {
        return false;
      }
      if (previous.url && !this.router.match(previous.url)) {
        return false;
      }
    }
    return true;
  }

  get canGoForward() {
    return Boolean(globalThis.navigation?.canGoForward);
  }

  /*******************************
          Platform Writes
  *******************************/

  navigate(url, { state, info, history = 'auto', resetScroll = true, resetFocus = true } = {}) {
    const nav = globalThis.navigation;
    if (!nav) {
      return this.documentLoad(
        () => (history === 'replace' ? globalThis.location.replace(url) : globalThis.location.assign(url)),
      );
    }
    // a replace without state would wipe the entry's memory, and auto becomes a replace on the same url
    const sameUrl = history === 'auto' && globalThis.location
      && new URL(url, globalThis.location.href).href === nav.currentEntry?.url;
    const resolvedState = state === undefined && (history === 'replace' || sameUrl)
      ? nav.currentEntry?.getState?.()
      : state;

    return this.catchNavigation(
      nav.navigate(url, {
        state: resolvedState,
        info: this.tagInfo(info, { resetScroll, resetFocus }),
        history,
      }),
    );
  }

  reload({ state, info } = {}) {
    const nav = globalThis.navigation;
    if (!nav) {
      return this.documentLoad(() => globalThis.location.reload());
    }
    const resolvedState = state === undefined ? nav.currentEntry?.getState?.() : state;
    return this.catchNavigation(
      nav.reload({
        state: resolvedState,
        info: this.tagInfo(info, { reload: true, resetScroll: false, resetFocus: false }),
      }),
    );
  }

  back(fallbackUrl) {
    if (this.canGoBack) {
      return this.catchNavigation(globalThis.navigation.back());
    }
    return this.navigate(fallbackUrl ?? (this.router.config.base || '/'), { history: 'push' });
  }

  forward() {
    if (this.canGoForward) {
      return this.catchNavigation(globalThis.navigation.forward());
    }
    return this.catchNavigation();
  }

  traverseTo(key, { info } = {}) {
    return this.catchNavigation(
      globalThis.navigation?.traverseTo?.(key, {
        info: this.tagInfo(info, { traverse: true }),
      }),
    );
  }

  tagInfo(info, meta) {
    return {
      ...(isPlainObject(info) ? info : (info !== undefined ? { value: info } : {})),
      [this.infoKey]: meta,
    };
  }

  // the platform marks finished as handled and committed not, so both are caught here
  catchNavigation(result) {
    if (!result) {
      return { committed: Promise.resolve(), finished: Promise.resolve() };
    }
    result.committed?.catch(noop);
    result.finished?.catch(noop);
    return result;
  }

  // the platform's own shape for a navigation that leaves the document: promises that never settle
  documentLoad(load) {
    load();
    return { committed: new Promise(noop), finished: new Promise(noop) };
  }

  deferNavigate(url, options) {
    const timer = setTimeout(() => {
      this.router.timers.delete(timer);
      this.navigate(url, options);
    }, 0);
    this.router.timers.add(timer);
  }

  /*******************************
           Scroll Memory
  *******************************/

  // the platform restores the viewport and nothing else. the containers router.config.restoreScroll
  // names ride the entry's state, saved on the way out and put back on a traverse

  saveScroll() {
    const selectors = this.router.config.restoreScroll;
    const nav = globalThis.navigation;
    if (!selectors || !globalThis.document || !nav?.currentEntry) {
      return;
    }
    const offsets = {};
    each(isArray(selectors) ? selectors : [selectors], (selector) => {
      const element = globalThis.document.querySelector(selector);
      if (element) {
        offsets[selector] = { top: element.scrollTop, left: element.scrollLeft };
      }
    });
    nav.updateCurrentEntry({ state: { ...(nav.currentEntry.getState?.() ?? {}), scroll: offsets } });
  }

  restoreScroll(entry) {
    const saved = entry?.getState?.()?.scroll;
    if (!saved || !globalThis.document) {
      return;
    }
    each(saved, (offset, selector) => {
      const element = globalThis.document.querySelector(selector);
      if (element && offset) {
        element.scrollTop = offset.top ?? 0;
        element.scrollLeft = offset.left ?? 0;
      }
    });
  }

  /*******************************
            Interception
  *******************************/

  onNavigate(event) {
    if (!this.shouldIntercept(event)) {
      return;
    }

    const matched = this.router.match(event.destination.url);
    if (!matched) {
      return;
    }

    const { current } = this.router;
    const isSameRoute = current?.route === matched.route && isEqual(current?.params, matched.params);
    if (event.hashChange && isSameRoute && isEqual(current?.query, matched.query)) {
      return;
    }

    // the entry being left is still currentEntry here and not after commit
    this.saveScroll();

    const meta = event.info?.[this.infoKey];
    const isQueryOnlyChange = isSameRoute && !isEqual(current?.query, matched.query);
    const resetScroll = isQueryOnlyChange ? false : (meta?.resetScroll ?? true);
    const resetFocus = isQueryOnlyChange ? false : (meta?.resetFocus ?? true);

    this.transition = {
      navigationType: event.navigationType,
      from: this.entry,
      destination: event.destination,
      url: matched.url,
    };
    this.router.intercepted(matched, event);

    let work = null;
    let precommitRan = false;
    const getWork = () => (work ??= this.router.begin(matched, event));

    const interceptOptions = {
      scroll: resetScroll ? 'after-transition' : 'manual',
      focusReset: resetFocus ? 'after-transition' : 'manual',
      handler: () => this.router.afterCommit(getWork(), event, precommitRan),
    };

    if (event.cancelable) {
      interceptOptions.precommitHandler = (controller) => {
        precommitRan = true;
        return this.router.beforeCommit(getWork(), event, controller);
      };
    }

    // intercept before any route code runs, so a throwing cascade can never leave the navigation to the browser
    event.intercept(interceptOptions);
    getWork();
  }

  shouldIntercept(event) {
    if (!event?.canIntercept || event.downloadRequest != null || event.formData != null) {
      return false;
    }

    const origin = globalThis.location?.origin;
    if (origin) {
      try {
        if (new URL(event.destination.url, origin).origin !== origin) {
          return false;
        }
      }
      catch {
        return false;
      }
    }

    const meta = event.info?.[this.infoKey];
    if (event.navigationType === 'reload' && !meta?.reload) {
      return false;
    }
    // a same-url write tagged by someone else is theirs to intercept, React's transition indicator among them
    const isForeign = event.info !== undefined && event.info !== null && !meta;
    if (isForeign && event.destination.url === globalThis.location?.href) {
      return false;
    }

    return true;
  }

  /*******************************
             Moments
  *******************************/

  onEntryChange(event) {
    this.project();
    this.router.entryChanged(this.entry, event);
  }

  onSuccess(event) {
    this.transition = null;
    this.router.settled(event);
  }

  onError(event) {
    this.transition = null;
    this.router.failed(event?.error ?? event, event);
  }

  onPageShow(event) {
    if (!event?.persisted) {
      return;
    }
    // the document came back intact: re-read the platform, re-run nothing
    this.project();
    this.router.restored();
  }

  onDispose(entry) {
    this.router.disposed(entry);
  }
}

export const createNavigator = (router) => new Navigator(router);
