import { View } from 'nav-router';
import { ReactiveRouter } from 'nav-router/reactive';
import { batch, createComputed, createRoot, createSignal, untrack } from 'solid-js';
import { createComponent, insert } from 'solid-js/web';

// a solid component, created as compiled jsx creates one, inserted before the anchor under a
// root of its own. its props are the scaffold's live context, so it is woken by the key it read
export class SolidView extends View {
  create({ view, context, target, anchor }) {
    const { context: props, update } = this.router.liveContext(context);
    this.tell = update;
    createRoot((end) => {
      this.dispose = end;
      insert(target, createComponent(view, props), anchor);
    });
  }

  update(context) {
    this.tell(context);
  }

  destroy() {
    this.dispose?.();
    super.destroy();
  }
}

// the scaffold on solid's signals and computeds
export class SolidRouter extends ReactiveRouter {
  static View = SolidView;

  // a thunk to the setter, so a function value is stored and not called
  createSignal(initialValue, { equals }) {
    const [get, set] = createSignal(initialValue, { equals });
    return { get, set: (value) => set(() => value), peek: () => untrack(get) };
  }

  createReaction(fn) {
    let first = true;
    return createRoot((end) => {
      createComputed(() => {
        const isFirst = first;
        first = false;
        fn(isFirst);
      });
      return end;
    });
  }

  untrack(fn) {
    return untrack(fn);
  }

  batch(fn) {
    return batch(fn);
  }
}

export * from 'nav-router';
export const solidRouter = (options) => new SolidRouter(options);
export { solidRouter as router };
