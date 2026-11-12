import { batch, effect, signal, untracked } from '@preact/signals';
import { ReactiveRouter } from 'nav-router/reactive';

import { PreactView } from './index.js';

// a preact component of the scaffold's live context. preact copies a component's props as it
// makes one, so the context is read inside an effect and the view rendered with what it read:
// told, or with the page or the user moved, it renders again at once
export class SignalsView extends PreactView {
  create({ context }) {
    const { context: props, update } = this.router.liveContext(context);
    this.tell = update;
    this.dispose = effect(() => super.update({ ...props }));
  }

  update(context) {
    this.tell(context);
  }

  destroy() {
    this.dispose?.();
    super.destroy();
  }
}

// the scaffold on preact's signals and effects
export class SignalsRouter extends ReactiveRouter {
  static View = SignalsView;

  // a preact signal compares by identity alone, so the cell's comparator decides before the write
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

  // an effect takes what its function returns as its cleanup, so the reaction returns nothing
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

  batch(fn) {
    return batch(fn);
  }
}

export * from './index.js';
export const signalsRouter = (options) => new SignalsRouter(options);
export { signalsRouter as router };
