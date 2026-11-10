import '@nav-router/plugins/dom';
import { ReactiveRouter } from 'nav-router/reactive';
import { mount, unmount, untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

// the door on the dom plugin's seams, which the import above brings: the plugin places, this
// mounts. a view is a svelte component whose props are the scaffold's live context, so a
// component reads params.id or data.v from $props() and is woken by the key it read and by no
// other. the scaffold runs on svelte's runes, which is why this module is .svelte.js: it ships as
// source and the app's own svelte compiler builds it, as it does any svelte library
export class SvelteRouter extends ReactiveRouter {
  // raw state, so a value is held as it was given and never proxied; the comparator is the
  // scaffold's, from its equality table
  createSignal(initialValue, { equals }) {
    let value = $state.raw(initialValue);
    const peek = () => untrack(() => value);
    return {
      get: () => value,
      peek,
      set: (next) => {
        if (!equals(peek(), next)) {
          value = next;
        }
      },
    };
  }

  // a root of its own, so a run lives until it is disposed whatever effect it was made under. the
  // first run is synchronous and a later one comes with svelte's own flush, a microtask after the
  // write, which is the batch: every write of one moment has landed before anything runs again
  createReaction(fn) {
    let isFirst = true;
    return $effect.root(() => {
      $effect.pre(() => {
        const first = isFirst;
        isFirst = false;
        fn(first);
      });
    });
  }

  untrack(fn) {
    return untrack(fn);
  }

  // svelte's own per-key store. a cell made on first touch is made inside the effect reading it,
  // and svelte does not subscribe an effect to state it created itself, which the map accounts
  // for and a signal per key cannot
  createStore(initialValue = {}) {
    const cells = new SvelteMap(Object.entries(initialValue));
    const peek = (key) => untrack(() => cells.get(key));
    return {
      get: (key) => cells.get(key),
      peek,
      set: (key, value) => {
        if (this.config.dataChanged(peek(key), value)) {
          cells.set(key, value);
        }
      },
    };
  }

  // the component is mounted in the region the plugin opens, before the region's end and with
  // nothing of the integration's around it, so a layout's flex or grid reaches the view's root
  // and a root that changes with a condition is svelte's to swap. placement, removal and the
  // slot's fallback are the plugin's
  createView({ view, placement, context }) {
    const { context: props, update } = this.liveContext(context);
    const mountView = (target, anchor) => {
      const component = mount(view, { target, anchor, props });
      return { update, dispose: () => unmount(component) };
    };
    return super.createView({ view, placement, context, mount: mountView });
  }
}

// the router's whole public surface from the one import a Svelte app writes, with router as the
// factory for this integration
export * from 'nav-router';
export const svelteRouter = (options) => new SvelteRouter(options);
export { svelteRouter as router };
