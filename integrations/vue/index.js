import { View } from 'nav-router';
import { ReactiveRouter } from 'nav-router/reactive';
import { createApp, customRef, effect, effectScope, h, inject } from 'vue';

const VIEW_CONTEXT = Symbol('nav-router view context');

// a vue component, mounted as an app of its own in an element that is the view's alone. its
// context is the scaffold's live one, provided to that app, so the view and every component
// under it read it with useViewContext() and each is woken by the key it read
export class VueView extends View {
  static place = 'element';

  create({ view, context, element }) {
    const { context: viewContext, update } = this.router.liveContext(context);
    this.tell = update;
    const app = createApp(view);
    app.provide(VIEW_CONTEXT, viewContext);
    this.router.config.setupApp?.(app);
    app.mount(element);
    // held once it has mounted, so a view that failed has no app to unmount
    this.app = app;
  }

  update(context) {
    this.tell(context);
  }

  destroy() {
    this.app?.unmount();
    super.destroy();
  }
}

// the scaffold on vue's refs and effects
export class VueRouter extends ReactiveRouter {
  static View = VueView;

  // over the router's own, so a plugin's default is a setting here whenever the plugin is imported
  static defaults = {
    __proto__: ReactiveRouter.defaults,
    // called with the app of each view as it is created, before it mounts: where plugins, global
    // components and provides are installed, since no one app holds every view
    setupApp: null,
  };

  // the reactions a batch has held back, each run once when the outermost batch ends
  batchDepth = 0;
  batchedReactions = new Set();

  // a ref that tracks and triggers by hand, so the scaffold's comparator decides what moved
  createSignal(initialValue, { equals }) {
    let value = initialValue;
    const cell = customRef((track, trigger) => ({
      get() {
        track();
        return value;
      },
      set(next) {
        if (!equals(value, next)) {
          value = next;
          trigger();
        }
      },
    }));
    return {
      get: () => cell.value,
      set: (next) => {
        cell.value = next;
      },
      peek: () => value,
    };
  }

  // an effect in a detached scope, so a router started inside a component does not end with it.
  // it runs as soon as what it read moves, the way the scaffold's hooks expect, and not on
  // vue's next tick
  createReaction(fn) {
    let isFirst = true;
    const scope = effectScope(true);
    const run = scope.run(() =>
      effect(() => {
        const first = isFirst;
        isFirst = false;
        fn(first);
      }, { scheduler: () => (this.batchDepth ? this.batchedReactions.add(run) : run()) })
    );
    return () => {
      this.batchedReactions.delete(run);
      scope.stop();
    };
  }

  // vue has no untracked read, so the reads are collected by an effect of their own that ends at once
  untrack(fn) {
    let result;
    const scope = effectScope(true);
    try {
      scope.run(() =>
        effect(() => {
          result = fn();
        })
      );
    }
    finally {
      scope.stop();
    }
    return result;
  }

  batch(fn) {
    this.batchDepth++;
    try {
      return fn();
    }
    finally {
      if (--this.batchDepth === 0) {
        // a reaction ended by one before it has left the set by the time it is reached
        for (const run of this.batchedReactions) {
          this.batchedReactions.delete(run);
          run();
        }
      }
    }
  }
}

// the context of the view this component is in: route, params, query, data, user and page. read
// through it where the value is used, since data and user are read fresh at every access
export const useViewContext = () => inject(VIEW_CONTEXT);

// where a layout's views go. vue's templates keep <slot> for a component's own slots, so a layout
// writes this for the element itself: <RouterSlot /> or <RouterSlot name="sidebar">, its children
// the fallback shown while no view fills it
export const RouterSlot = {
  name: 'RouterSlot',
  props: ['name'],
  render() {
    return h('slot', { name: this.name }, this.$slots.default?.());
  },
};

export * from 'nav-router';
export const vueRouter = (options) => new VueRouter(options);
export { vueRouter as router };
