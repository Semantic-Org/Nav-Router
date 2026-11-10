import '@nav-router/plugins/dom';
import { ReactiveRouter } from 'nav-router/reactive';
import { createElement, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// react has no signals of its own, so the scaffold's primitives are written here: a signal keeps
// the readers that read it, and a reader keeps the signals it read so it can leave them. a reader
// is a reaction, which runs again when woken, or a component, which renders again
let reading = null;
let woken = null;

const leave = (reader) => {
  reader.signals.forEach((readers) => readers.delete(reader));
  reader.signals.clear();
};

// runs fn as the reader, whose reads are the ones this run makes and no earlier one's
const read = (reader, fn) => {
  const outer = reading;
  if (reader) {
    leave(reader);
  }
  reading = reader;
  try {
    return fn();
  }
  finally {
    reading = outer;
  }
};

export const untrack = (fn) => read(null, fn);

// readers woken inside the outermost batch run once at its end, one woken by another's run included
export const batch = (fn) => {
  if (woken) {
    return fn();
  }
  woken = new Set();
  try {
    return fn();
  }
  finally {
    try {
      for (const reader of woken) {
        woken.delete(reader);
        reader.wake();
      }
    }
    finally {
      woken = null;
    }
  }
};

// the app's own state for a route's data() and guards to read, and the cell the scaffold is built on
export const createSignal = (value, { equals = Object.is } = {}) => {
  const readers = new Set();
  return {
    peek: () => value,
    get() {
      if (reading) {
        readers.add(reading);
        reading.signals.add(readers);
      }
      return value;
    },
    set(next) {
      if (!equals(value, next)) {
        value = next;
        batch(() => readers.forEach((reader) => woken.add(reader)));
      }
    },
  };
};

export const createReaction = (fn) => {
  let isFirst = true;
  const reader = {
    signals: new Set(),
    wake: () =>
      read(reader, () => {
        const first = isFirst;
        isFirst = false;
        fn(first);
      }),
  };
  const stop = () => {
    leave(reader);
    reader.wake = () => {};
  };
  try {
    reader.wake();
  }
  catch (error) {
    // a first run that threw has no caller holding its stop
    stop();
    throw error;
  }
  return stop;
};

// what fn returns, kept current: the component is the reader of whatever fn read during this
// render, and renders again when one of them moves. a component reads the router's state or the
// app's signals through it, useLive(() => isActive('team')). a subscription that ends counts as a
// move, so one react ends and starts again reads again
export const useLive = (fn) => {
  const [reader] = useState(() => {
    const reader = {
      signals: new Set(),
      version: 0,
      wake() {
        leave(reader);
        reader.version++;
        reader.notify?.();
      },
      subscribe(notify) {
        reader.notify = notify;
        return () => {
          reader.notify = null;
          reader.wake();
        };
      },
      getVersion: () => reader.version,
    };
    return reader;
  });
  useSyncExternalStore(reader.subscribe, reader.getVersion);
  return read(reader, fn);
};

// a view's props are a plain snapshot of its live context, every key of it read, so the view
// renders again when the page, the user, a param, a query key or a key of its data moves, and
// react's own diff keeps the dom that did not
const View = ({ view, live }) =>
  createElement(
    view,
    useLive(() => ({ ...live, params: { ...live.params }, query: { ...live.query }, data: { ...live.data } })),
  );

// the dom plugin places, this renders: a view is a react component under a root of its own
export class ReactRouter extends ReactiveRouter {
  createSignal(initialValue, options) {
    return createSignal(initialValue, options);
  }

  createReaction(fn) {
    return createReaction(fn);
  }

  untrack(fn) {
    return untrack(fn);
  }

  // react renders what a moment woke before the moment ends, so a kept layout moves with the page
  // inside the one view transition
  batch(fn) {
    return flushSync(() => batch(fn));
  }

  // a root needs an element of its own, which the region holds as it holds any view's nodes. the
  // element has no box, so a layout's flex or grid reaches the view's root as it does through a
  // slot. the first render is flushed, since the views below look for their slots in it at once,
  // and a view that threw in it throws here, as react reports the error and does not throw it
  createView({ view, placement, context }) {
    const { context: live, update } = this.liveContext(context);
    const mount = (target, anchor) => {
      const container = document.createElement('div');
      container.style.display = 'contents';
      target.insertBefore(container, anchor);
      let mounted = false;
      let failure = null;
      const root = createRoot(container, {
        onUncaughtError: (error) => (mounted ? this.logError(error) : (failure = { error })),
      });
      flushSync(() => root.render(createElement(View, { view, live })));
      mounted = true;
      if (failure) {
        root.unmount();
        throw failure.error;
      }
      return { update, dispose: () => root.unmount() };
    };
    return super.createView({ view, placement, context, mount });
  }
}

// the router's whole public surface from the one import a React app writes, with router as the
// factory for this integration
export * from 'nav-router';
export const reactRouter = (options) => new ReactRouter(options);
export { reactRouter as router };
