import { each, inArray, isEqual, isFunction, isPromise, isString } from '@semantic-ui/utils';

// holds dirty forms and in-flight edits on the page across link clicks, traverses and tab close.
// sync guards refuse inside navigate before intercept runs, async modals hold precommit or roll back
export default ({
  confirm = (message) => (globalThis.confirm ? globalThis.confirm(message) : false),
} = {}, Router, Navigator) => {
  const routerProto = Router.prototype;
  const navProto = Navigator.prototype;
  const { runGuards, beforeCommit, afterCommit, applyCascade, stop } = routerProto;
  const { onNavigate } = navProto;

  const bypassKey = Symbol('nav-router/bypass-confirm');
  const states = new WeakMap();
  const pendingDecisions = new WeakMap();

  const getState = (router) => {
    let state = states.get(router);
    if (!state) {
      state = { guards: new Set(), unloadHandler: null };
      states.set(router, state);
    }
    return state;
  };

  const hasBlockers = (router) => Boolean(
    states.get(router)?.guards.size
    || router.page?.chain?.some((route) => route.canLeave !== undefined),
  );

  const syncUnloadListener = (router) => {
    if (!globalThis.window) {
      return;
    }
    const state = getState(router);
    const needed = hasBlockers(router);
    if (needed && !state.unloadHandler) {
      // attached only while a blocker is live so idle pages stay eligible for bfcache
      state.unloadHandler = (event) => {
        const context = { router, from: router.page, destination: null, navigationType: 'unload', event };
        let blocked = false;
        each([...(router.page?.chain ?? [])].reverse(), (route) => {
          if (!blocked && route.canLeave !== undefined) {
            const result = isFunction(route.canLeave) ? route.canLeave({ ...context, route }) : route.canLeave;
            blocked = result === false || (isString(result) && result.length > 0);
          }
        });
        each(state.guards, (guard) => {
          if (!blocked) {
            const result = guard(context);
            blocked = result === false || (isString(result) && result.length > 0);
          }
        });
        if (blocked) {
          event.preventDefault();
          event.returnValue = '';
        }
      };
      globalThis.window.addEventListener('beforeunload', state.unloadHandler);
    }
    else if (!needed && state.unloadHandler) {
      globalThis.window.removeEventListener('beforeunload', state.unloadHandler);
      state.unloadHandler = null;
    }
  };

  const resolveDecision = (raw, context) => {
    if (isPromise(raw)) {
      return raw.then((value) => resolveDecision(value, context));
    }
    if (isString(raw) && raw.length > 0) {
      return resolveDecision(confirm(raw, context), context);
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

  routerProto.confirmLeave = function (guard, { signal } = {}) {
    if (!isFunction(guard)) {
      throw new TypeError('Router.confirmLeave: expected a guard function');
    }
    const state = getState(this);
    state.guards.add(guard);
    syncUnloadListener(this);

    const dispose = () => {
      state.guards.delete(guard);
      syncUnloadListener(this);
    };
    signal?.addEventListener('abort', dispose, { once: true });
    return dispose;
  };

  navProto.onNavigate = function (event) {
    if (!event?.cancelable || event.info?.[bypassKey]) {
      return onNavigate.call(this, event);
    }

    const router = this.router;
    const matched = router.match(event.destination?.url);
    const { current } = router;
    if (event.hashChange && current?.route === matched?.route && isEqual(current?.params, matched?.params) && isEqual(current?.query, matched?.query)) {
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

    each([...(router.page?.chain ?? [])].reverse(), (route) => {
      if (route.canLeave === undefined) {
        return;
      }
      const leaving = !matched || !inArray(route, matched.chain) || !router.ownKeysUnchanged(route, router.page, matched);
      if (leaving) {
        checks.push(() => (isFunction(route.canLeave) ? route.canLeave({ ...context, route }) : route.canLeave));
      }
    });
    each(states.get(router)?.guards ?? [], (guard) => {
      checks.push(() => guard(context));
    });

    if (!checks.length) {
      return onNavigate.call(this, event);
    }

    const fromKey = this.entry?.key ?? null;
    const decision = runChecks(checks, context);

    if (!isPromise(decision)) {
      if (!decision) {
        event.preventDefault();
        return;
      }
      return onNavigate.call(this, event);
    }

    // external or unrouted links never enter intercept, so async confirmation resumes them explicitly
    if (!this.shouldIntercept(event) || !matched) {
      event.preventDefault();
      decision.then((allowed) => {
        if (allowed && event.destination?.url && globalThis.location) {
          globalThis.location.assign(event.destination.url);
        }
      });
      return;
    }

    if (event.signal) {
      pendingDecisions.set(event.signal, { decision, fromKey });
    }
    return onNavigate.call(this, event);
  };

  // hold destination guards and data until an open async leave prompt answers
  routerProto.runGuards = async function (matched, work) {
    const pending = work?.signal ? pendingDecisions.get(work.signal) : null;
    if (pending && !(await pending.decision)) {
      return { status: 'cancelled' };
    }
    return runGuards.call(this, matched, work);
  };

  routerProto.beforeCommit = async function (work, event, controller) {
    const pending = event?.signal ? pendingDecisions.get(event.signal) : null;
    if (pending) {
      pendingDecisions.delete(event.signal);
      if (!(await pending.decision)) {
        throw new DOMException('Navigation cancelled', 'AbortError');
      }
    }
    return beforeCommit.call(this, work, event, controller);
  };

  routerProto.afterCommit = async function (work, event, precommitRan) {
    const pending = !precommitRan && event?.signal ? pendingDecisions.get(event.signal) : null;
    if (pending) {
      pendingDecisions.delete(event.signal);
      if (!(await pending.decision)) {
        if (pending.fromKey) {
          const timer = setTimeout(() => {
            this.timers.delete(timer);
            this.navigator.traverseTo(pending.fromKey, { info: { [bypassKey]: true } });
          }, 0);
          this.timers.add(timer);
        }
        throw new DOMException('Navigation cancelled', 'AbortError');
      }
    }
    return afterCommit.call(this, work, event, precommitRan);
  };

  routerProto.applyCascade = async function (matched, resolved, event = null) {
    await applyCascade.call(this, matched, resolved, event);
    syncUnloadListener(this);
  };

  routerProto.stop = function () {
    const state = states.get(this);
    if (state) {
      if (state.unloadHandler && globalThis.window) {
        globalThis.window.removeEventListener('beforeunload', state.unloadHandler);
      }
      state.guards.clear();
      states.delete(this);
    }
    return stop.call(this);
  };
};
