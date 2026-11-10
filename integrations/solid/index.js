import '@nav-router/plugins/dom';
import { ReactiveRouter } from 'nav-router/reactive';
import { batch, createComputed, createRoot, createSignal, untrack } from 'solid-js';
import { createComponent, insert } from 'solid-js/web';

// the second example of the door, on the dom plugin's seams, which the import above brings: the
// plugin places, this renders. a
// view is a solid component whose props are the scaffold's live context, so a component reads
// props.params.id or props.data.v and is woken by the key it read and by no other. the scaffold
// runs on solid's signals and computeds
export class SolidRouter extends ReactiveRouter {
  // a thunk to the setter, so a function value is stored and not called; the comparator is the
  // scaffold's, from its equality table
  createSignal(initialValue, { equals }) {
    const [get, set] = createSignal(initialValue, { equals });
    return { get, set: (value) => set(() => value), peek: () => untrack(get) };
  }

  createReaction(fn) {
    let dispose = null;
    createRoot((end) => {
      dispose = end;
      let first = true;
      try {
        createComputed(() => {
          const isFirst = first;
          first = false;
          fn(isFirst);
        });
      }
      catch (error) {
        // a first run that threw leaves the root by the throw, its cleanups unrun until it is ended
        end();
        throw error;
      }
    });
    return () => {
      dispose?.();
      dispose = null;
    };
  }

  untrack(fn) {
    return untrack(fn);
  }

  batch(fn) {
    return batch(fn);
  }

  // the view is mounted where the plugin places it, under a root of its own, the component created
  // as compiled jsx creates one. what it returns is told through the live context's update and
  // ended by its root
  renderView({ view, context, target, anchor }) {
    const { context: props, update } = this.liveContext(context);
    const destroy = createRoot((end) => {
      try {
        insert(target, createComponent(view, props), anchor);
      }
      catch (error) {
        end();
        throw error;
      }
      return end;
    });
    return { update, destroy };
  }
}

// the router's whole public surface from the one import a Solid app writes, with router as the
// factory for this integration
export * from 'nav-router';
export const solidRouter = (options) => new SolidRouter(options);
export { solidRouter as router };
