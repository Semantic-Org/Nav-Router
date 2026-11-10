import '@nav-router/plugins/dom';
import { batch, effect, signal, untracked } from '@preact/signals';
import { ReactiveRouter } from 'nav-router/reactive';
import { h, options, render } from 'preact';

// preact renders into a parent it owns from its first child on, and a region is a range inside a
// parent the plugin owns. this is the parent preact is given instead, the few members it reads of
// one: every insert lands before the region's end and nothing already in the target is preact's
// to reuse or remove, so the view stands between the anchors with no element of the
// integration's around it
const rangeRoot = (target, anchor) => ({
  nodeType: 1,
  namespaceURI: target.namespaceURI,
  contains: (node) => target.contains(node),
  insertBefore: (node, before) => target.insertBefore(node, before ?? anchor),
});

// on the dom plugin's seams, which the import above brings: the plugin places, this renders. a
// view is a preact component whose props are the scaffold's live context, so a component that
// reads props.params.id or props.data.v while it renders is rendered again when that key moves
// and for no other. the scaffold runs on preact's signals, which is also what tells a component
// what it read
export class PreactRouter extends ReactiveRouter {
  // a preact signal compares by identity alone, so the scaffold's comparator guards the write
  createSignal(initialValue, { equals }) {
    const cell = signal(initialValue);
    return {
      get: () => cell.value,
      set: (value) => {
        if (!equals(cell.peek(), value)) {
          cell.value = value;
        }
      },
      peek: () => cell.peek(),
    };
  }

  // an effect would take a returned function as its cleanup, so the run returns nothing
  createReaction(fn) {
    let first = true;
    return effect(() => {
      const isFirst = first;
      first = false;
      fn(isFirst);
    });
  }

  untrack(fn) {
    return untracked(fn);
  }

  // preact renders a component its signals woke in a later microtask, after the router's moment
  // has ended and its scroll restore has run against the page before. the renders a batch queues
  // are held and run as it ends, so a view that was told has rendered inside the moment
  batch(fn) {
    const { debounceRendering } = options;
    let renderQueued = null;
    options.debounceRendering = (process) => {
      renderQueued = process;
    };
    try {
      return batch(fn);
    }
    finally {
      options.debounceRendering = debounceRendering;
      renderQueued?.();
    }
  }

  // the live context is the component's props as it stands, its getters intact: h() copies the
  // props it is given, which would read every cell once, outside any render, and hand the view a
  // snapshot. placement, removal and the slot's fallback are the plugin's
  createView({ view, placement, context }) {
    const { context: props, update } = this.liveContext(context);
    const mount = (target, anchor) => {
      const root = rangeRoot(target, anchor);
      const dispose = () => render(null, root);
      try {
        render(Object.assign(h(view), { props }), root);
      }
      catch (error) {
        // a view that threw leaves what rendered before it mounted until the root is emptied
        dispose();
        throw error;
      }
      return { update, dispose };
    };
    return super.createView({ view, placement, context, mount });
  }
}

// the router's whole public surface from the one import a Preact app writes, with router as the
// factory for this integration
export * from 'nav-router';
export const preactRouter = (options) => new PreactRouter(options);
export { preactRouter as router };
