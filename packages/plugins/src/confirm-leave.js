import { each, inArray, isEqual, isFunction, isPromise, isString } from '@semantic-ui/utils';
import { Navigator } from 'nav-router';
import { Router } from 'nav-router';

// holds dirty forms and in-flight edits on the page across link clicks, traverses and tab close.
// sync guards refuse inside navigate before intercept runs, async modals hold precommit or roll back
Router.defaults.confirm ??= (message) => (globalThis.confirm ? globalThis.confirm(message) : false);

const routerProto = Router.prototype;
const navProto = Navigator.prototype;
const { runGuards, beforeCommit, afterCommit, applyCascade, stop } = routerProto;
const { onNavigate } = navProto;

const bypassKey = Symbol('nav-router/bypass-confirm');

const resolveDecision = (raw, context) => {
  if (isPromise(raw)) {
    return raw.then((value) => resolveDecision(value, context));
  }
  if (isString(raw) && raw.length > 0) {
    return resolveDecision(context.router.config.confirm(raw, context), context);
  }
  return raw !== false;
};

const runChecks = (checks, context, index = 0) => {
  for (let i = index; i < checks.length; i++) {
    const decision = resolveDecision(checks[i](), context);
    if (isPromise(decision)) {
      return decision.then((allowed) => (allowed ? runChecks(checks, context, i + 1) : false));
    }
    if (!decision) {
      return false;
    }
  }
  return true;
};

routerProto.hasLeaveBlockers = function() {
  return Boolean(
    this.leaveGuards?.size
      || this.page?.activeRoutes?.some((route) => route.canLeave !== undefined),
  );
};

routerProto.onBeforeUnload = function(event) {
  const context = { router: this, from: this.page, destination: null, navigationType: 'unload', event };
  const blocks = (result) => result === false || (isString(result) && result.length > 0);
  const blocked = [...(this.page?.activeRoutes ?? [])].reverse().some((route) =>
    route.canLeave !== undefined
    && blocks(isFunction(route.canLeave) ? route.canLeave({ ...context, route }) : route.canLeave)
  ) || [...(this.leaveGuards ?? [])].some((guard) => blocks(guard(context)));
  if (blocked) {
    event.preventDefault();
    event.returnValue = '';
  }
};

// attached only while a blocker is live so idle pages stay eligible for bfcache
routerProto.syncBeforeUnload = function() {
  if (!globalThis.window) {
    return;
  }
  const needed = this.hasLeaveBlockers();
  if (needed && !this.handleBeforeUnload) {
    this.handleBeforeUnload = (event) => this.onBeforeUnload(event);
    globalThis.window.addEventListener('beforeunload', this.handleBeforeUnload);
  }
  else if (!needed) {
    this.disarmBeforeUnload();
  }
};

routerProto.disarmBeforeUnload = function() {
  if (this.handleBeforeUnload && globalThis.window) {
    globalThis.window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.handleBeforeUnload = null;
  }
};

routerProto.confirmLeave = function(guard, { signal } = {}) {
  if (!isFunction(guard)) {
    throw new TypeError('Router.confirmLeave: expected a guard function');
  }
  this.leaveGuards ??= new Set();
  this.leaveGuards.add(guard);
  this.syncBeforeUnload();

  const dispose = () => {
    this.leaveGuards?.delete(guard);
    this.syncBeforeUnload();
  };
  signal?.addEventListener('abort', dispose, { once: true });
  return dispose;
};

navProto.onNavigate = function(event) {
  const router = this.router;
  // a leave the modal already approved comes back as a plain document load of the same url
  if (
    event?.info?.[bypassKey] || event?.downloadRequest != null
    || (router.leaveApproved && router.leaveApproved === event?.destination?.url)
  ) {
    router.leaveApproved = null;
    return onNavigate.call(this, event);
  }

  const matched = router.match(event.destination?.url);
  const { current } = router;
  if (
    event.hashChange && current?.route === matched?.route && isEqual(current?.params, matched?.params)
    && isEqual(current?.query, matched?.query)
  ) {
    return onNavigate.call(this, event);
  }

  const checks = [];
  const context = {
    router,
    from: router.page,
    destination: matched ?? { url: event.destination?.url ?? null },
    navigationType: event.navigationType,
    event,
  };

  each([...(router.page?.activeRoutes ?? [])].reverse(), (route) => {
    if (route.canLeave === undefined) {
      return;
    }
    const leaving = !matched || !inArray(route, matched.routes) || router.keysMoved(route, router.page, matched);
    if (leaving) {
      checks.push(() => (isFunction(route.canLeave) ? route.canLeave({ ...context, route }) : route.canLeave));
    }
  });
  each(router.leaveGuards ?? [], (guard) => {
    checks.push(() => guard(context));
  });

  if (!checks.length) {
    return onNavigate.call(this, event);
  }

  const fromKey = this.entry?.key ?? null;
  const fromUrl = this.entry?.url ?? router.page?.url ?? null;
  const decision = runChecks(checks, context);

  if (!isPromise(decision)) {
    if (!decision && event.cancelable) {
      event.preventDefault();
      return;
    }
    if (decision) {
      if (!this.shouldIntercept(event) || !matched) {
        router.disarmBeforeUnload();
      }
      return onNavigate.call(this, event);
    }
  }
  // a refusal the event cannot cancel, a traverse after a reload, rolls back after commit instead
  const decisionPromise = isPromise(decision) ? decision : Promise.resolve(false);

  // external or unrouted links never enter intercept, so async confirmation resumes them explicitly.
  // the approved url is let through once, with beforeunload disarmed, so the modal does not reopen
  if (!this.shouldIntercept(event) || !matched) {
    if (event.cancelable) {
      event.preventDefault();
    }
    decisionPromise.then((allowed) => {
      if (allowed && event.destination?.url && globalThis.location) {
        router.leaveApproved = event.destination.url;
        router.disarmBeforeUnload();
        globalThis.location.assign(event.destination.url);
      }
    });
    return;
  }

  const pending = { signal: event.signal ?? null, decision: decisionPromise, fromKey, fromUrl };
  router.pendingLeave = pending;
  event.signal?.addEventListener('abort', () => {
    if (router.pendingLeave === pending) {
      router.pendingLeave = null;
    }
  }, { once: true });
  return onNavigate.call(this, event);
};

// hold destination guards and data until an open async leave prompt answers
routerProto.runGuards = async function(matched, navigation) {
  const pending = this.pendingLeave;
  if (pending && (!navigation?.signal || pending.signal === navigation.signal)) {
    if (!(await pending.decision)) {
      return { status: 'cancelled' };
    }
  }
  return runGuards.call(this, matched, navigation);
};

routerProto.beforeCommit = async function(work, event, controller) {
  const pending = this.pendingLeave;
  if (pending && (!event?.signal || pending.signal === event.signal)) {
    this.pendingLeave = null;
    if (!(await pending.decision)) {
      throw new DOMException('Navigation cancelled', 'AbortError');
    }
  }
  return beforeCommit.call(this, work, event, controller);
};

routerProto.afterCommit = async function(work, event, { precommitRan = false } = {}) {
  const pending = !precommitRan ? this.pendingLeave : null;
  if (pending && (!event?.signal || pending.signal === event.signal)) {
    this.pendingLeave = null;
    if (!(await pending.decision)) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (pending.fromKey && pending.fromKey !== this.entry?.key) {
          this.navigator.traverseTo(pending.fromKey, { info: { [bypassKey]: true } });
        }
        else if (pending.fromUrl) {
          this.navigator.navigate(pending.fromUrl, { history: 'replace', info: { [bypassKey]: true } });
        }
      }, 0);
      this.timers.add(timer);
      throw new DOMException('Navigation cancelled', 'AbortError');
    }
  }
  return afterCommit.call(this, work, event, { precommitRan });
};

routerProto.applyCascade = async function(matched, resolved, event = null) {
  await applyCascade.call(this, matched, resolved, event);
  this.syncBeforeUnload();
};

routerProto.stop = function() {
  this.disarmBeforeUnload();
  this.leaveGuards?.clear();
  this.leaveGuards = null;
  this.pendingLeave = null;
  return stop.call(this);
};
