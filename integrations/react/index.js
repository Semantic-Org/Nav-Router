import { getRouter, Router, View } from 'nav-router';
import { createElement, memo, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// one view as a react component. it renders when its own view is told, or when what fills its slots
// changes, and not because the layout above it rendered: a view that was not told does not render
const Outlet = memo(({ view }) => {
  useSyncExternalStore(view.subscribe, view.getVersion);
  const props = { ...view.context };
  for (const [name, fill] of Object.entries(view.fills)) {
    props[name] = createElement(Outlet, { view: fill });
  }
  return createElement(view.view, props);
});

// a react component. the top view has a root in the mount. a view inside a react layout has none:
// its layout renders it, as children, or as the prop named for its slot, so a layout is plain react,
// ({ children, sidebar }) => ..., and what a layout provides reaches the views inside it
export class ReactView extends View {
  static place = 'element';

  // what each slot of this layout holds, by name
  fills = {};

  // told once per change, which is what wakes this view's component and no other
  version = 0;
  listeners = new Set();
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getVersion = () => this.version;

  changed() {
    this.version++;
    for (const listener of this.listeners) {
      listener();
    }
  }

  // a slot in react is a prop of the layout that takes the view: the nearest layout above whose
  // route declares the name, or the layout the view hangs in. the top view goes in the mount
  findSlot() {
    const { parent, slot } = this;
    if (!(parent instanceof ReactView)) {
      return super.findSlot();
    }
    return (slot && this.ancestors.find((view) => view instanceof ReactView && slot in view.route.slots)) || parent;
  }

  // the layout this view is rendered by, when it has one
  get layout() {
    return this.target instanceof ReactView ? this.target : null;
  }

  create({ context }) {
    this.context = context;
    if (this.layout) {
      this.layout.fills[this.slot ?? 'children'] = this;
      this.layout.changed();
    }
    else {
      this.root = createRoot(this.target);
      this.root.render(createElement(Outlet, { view: this }));
    }
  }

  update(context) {
    this.context = context;
    this.changed();
  }

  destroy() {
    const { layout } = this;
    const name = this.slot ?? 'children';
    if (!layout) {
      this.root?.unmount();
      super.destroy();
    }
    else if (layout.fills[name] === this) {
      delete layout.fills[name];
      layout.changed();
    }
  }
}

// the page is committed once, as the router's moment ends, whatever number of views it told
export class ReactRouter extends Router {
  static View = ReactView;

  batch(fn) {
    return flushSync(fn);
  }
}

// the router's state, read in a component and kept current: useRouter((router) => router.pending)
export const useRouter = (read) => {
  const router = getRouter();
  return useSyncExternalStore((listener) => router.subscribe(listener), () => read(router));
};

export * from 'nav-router';
export const reactRouter = (options) => new ReactRouter(options);
export { reactRouter as router };
