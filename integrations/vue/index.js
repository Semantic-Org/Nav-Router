import '@nav-router/plugins/dom';
import { ReactiveRouter } from 'nav-router/reactive';
import { createVNode, customRef, effect, effectScope, h, onErrorCaptured, ReactiveEffect, render } from 'vue';

// vue has no batch of its own to hand the scaffold, so a reaction told inside one waits here
// until the outermost closes
let depth = 0;
const held = new Set();

// the door for vue, on the dom plugin's seams, which the import above brings: the plugin places,
// this renders. a view is a vue component and the scaffold's live context reaches it as the props
// it declares, so a template reads params.id or data.member and is woken by the key it read. the
// scaffold runs on vue's own dependency tracking
export class VueRouter extends ReactiveRouter {
  // a customRef, the one ref that compares with a comparator it is handed and keeps its value raw,
  // so a page or a route is never made deeply reactive
  createSignal(value, { equals }) {
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
    return { get: () => cell.value, set: (next) => (cell.value = next), peek: () => value };
  }

  // a scope of its own, so a reaction made while a component sets up does not end with that component
  createReaction(fn) {
    let first = true;
    const scope = effectScope(true);
    const run = scope.run(() =>
      effect(() => {
        const isFirst = first;
        first = false;
        fn(isFirst);
      }, { scheduler: () => (depth ? held.add(run) : run()) })
    );
    return () => {
      held.delete(run);
      scope.stop();
    };
  }

  // vue exports no untrack, so the reads land on an effect that is stopped as soon as it has run
  untrack(fn) {
    const reader = new ReactiveEffect(fn);
    try {
      return reader.run();
    }
    finally {
      reader.stop();
    }
  }

  batch(fn) {
    depth++;
    try {
      return fn();
    }
    finally {
      if (!--depth) {
        for (const run of held) {
          held.delete(run);
          run();
        }
      }
    }
  }

  // app.use(router) gives every view the app's plugins, global components and provides
  install(app) {
    this.appContext = app._context;
  }

  // the view is rendered into a fragment and the fragment inserted before the region's end, so
  // nothing of the integration's stands around it and a layout's flex or grid reaches the view's
  // root. vue patches a mounted tree through its nodes' own parent, so a root that changes with
  // v-if, a second root and the unmount all happen inside the region. a view is its own render
  // root, and what a layout provides in its setup still reaches the views in its slots: each is
  // rendered with the context of the layout it hangs inside
  createView({ view, placement, context }) {
    const { context: live, update } = this.liveContext(context);
    const { props = [] } = view;
    const keys = (Array.isArray(props) ? props : Object.keys(props)).filter((key) => key in live);
    const mount = (target, anchor) => {
      const container = document.createDocumentFragment();
      let mounted = false;
      let failure = null;
      const vnode = createVNode({
        setup() {
          // vue reports a component's error and renders on, so one thrown while the view mounts
          // is taken here and thrown from the mount, as the seam expects. a later one is vue's
          onErrorCaptured((error) => {
            failure ??= { error };
            return mounted;
          });
          // read inside a render, so the view is handed a new page, user or data when that cell moves
          return () => h(view, Object.fromEntries(keys.map((key) => [key, live[key]])));
        },
      });
      vnode.appContext = placement.parent?.appContext ?? this.appContext;
      render(vnode, container);
      mounted = true;
      if (failure) {
        render(null, container);
        throw failure.error;
      }
      target.insertBefore(container, anchor);
      // a suspense at the view's root resolves into the container it was mounted in, long after
      // its nodes left, so what arrives later is passed on to where they went
      container.insertBefore = (node, before) => target.insertBefore(node, before ?? anchor);
      const { appContext, provides } = vnode.component.subTree.component;
      return { update, dispose: () => render(null, container), appContext: { ...appContext, provides } };
    };
    return super.createView({ view, placement, context, mount });
  }
}

// the router's whole public surface from the one import a Vue app writes, with router as the
// factory for this integration
export * from 'nav-router';
export const vueRouter = (options) => new VueRouter(options);
export { vueRouter as router };
