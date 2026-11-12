import { View } from 'nav-router';
import { ReactiveRouter } from 'nav-router/reactive';
import { flushSync, mount, unmount, untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

// a svelte component, mounted before the anchor as a root of its own. its props are the
// scaffold's live context, so it is woken by the key it read
export class SvelteView extends View {
  // svelte lands a change at its next flush, and a layout above may be about to write the slot
  // this view goes in, so what is pending lands before the view looks for its place
  start(context) {
    flushSync();
    return super.start(context);
  }

  create({ view, context, target, anchor }) {
    const { context: props, update } = this.router.liveContext(context);
    this.tell = update;
    this.component = mount(view, { target, anchor, props });
  }

  update(context) {
    this.tell(context);
  }

  destroy() {
    if (this.component) {
      unmount(this.component);
    }
    super.destroy();
  }
}

// the scaffold on svelte's runes
export class SvelteRouter extends ReactiveRouter {
  static View = SvelteView;

  // raw, so a value is held as it was given and never wrapped in a proxy. the cell's comparator
  // decides the write, read untracked so a reaction that writes a cell does not come to depend on it
  createSignal(initialValue, { equals }) {
    let value = $state.raw(initialValue);
    return {
      get: () => value,
      set: (next) => {
        if (!untrack(() => equals(value, next))) {
          value = next;
        }
      },
      peek: () => untrack(() => value),
    };
  }

  // a pre effect runs at once where it is made, which is the first run the scaffold reads its
  // answer from. a later run waits for svelte's next flush
  createReaction(fn) {
    let first = true;
    return $effect.root(() => {
      $effect.pre(() => {
        const isFirst = first;
        first = false;
        fn(isFirst);
      });
    });
  }

  untrack(fn) {
    return untrack(fn);
  }

  // svelte's own map as the per-key store. the scaffold's makes a cell at a key's first read, and
  // svelte leaves state made inside a reaction out of that reaction's dependencies, so a view that
  // was first to read a key would never hear of it
  createStore(initialValue = {}) {
    const cells = new SvelteMap(Object.entries(initialValue));
    const peek = (key) => untrack(() => cells.get(key));
    return {
      get: (key) => cells.get(key),
      set: (key, value) => {
        if (this.config.dataChanged(peek(key), value)) {
          cells.set(key, value);
        }
      },
      peek,
    };
  }
}

export * from 'nav-router';
export { default as Slot } from './slot.svelte';
export const svelteRouter = (options) => new SvelteRouter(options);
export { svelteRouter as router };
