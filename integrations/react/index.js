import { getRouter, Router, View } from 'nav-router';
import { createElement, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// a react component. the top view has a root in the mount. a view inside a react layout has none:
// its layout renders it, as children, or as the prop named for its slot, so a layout is plain react,
// ({ children, sidebar }) => ..., and what a layout provides reaches the views inside it
export class ReactView extends View {
  static place = 'element';

  // what each slot of this layout holds, by name
  fills = {};

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
    }
    else {
      this.root = createRoot(this.target);
    }
    this.render();
  }

  update(context) {
    this.context = context;
    this.render();
  }

  destroy() {
    if (this.layout) {
      delete this.layout.fills[this.slot ?? 'children'];
      this.layout.render();
    }
    else {
      this.root?.unmount();
      super.destroy();
    }
  }

  // this view as an element, with what fills its slots as its props
  element() {
    const props = { ...this.context };
    for (const [name, fill] of Object.entries(this.fills)) {
      props[name] = fill.element();
    }
    return createElement(this.view, props);
  }

  // a view inside a layout is rendered by rendering the layout. the root's render is flushed, so
  // the page is whole when the router's moment ends
  render() {
    if (this.layout) {
      this.layout.render();
    }
    else {
      flushSync(() => this.root.render(this.element()));
    }
  }
}

export class ReactRouter extends Router {
  static View = ReactView;
}

// the router's state, read in a component and kept current: useRouter((router) => router.pending)
export const useRouter = (read) => {
  const router = getRouter();
  return useSyncExternalStore((listener) => router.subscribe(listener), () => read(router));
};

export * from 'nav-router';
export const reactRouter = (options) => new ReactRouter(options);
export { reactRouter as router };
