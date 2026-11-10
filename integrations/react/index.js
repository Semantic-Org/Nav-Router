import { getRouter, Router, View } from 'nav-router';
import { Component, createElement, memo, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// a slot of a layout. it renders whatever view fills the slot now, so one view taking another's place
// in a slot renders the slot and not the layout around it
const Slot = ({ layout, name }) => {
  const fill = useSyncExternalStore(layout.subscribe, () => layout.fills[name]);
  return fill ? createElement(Outlet, { view: fill }) : null;
};

// one view as a react component. it renders when its own view is told, or when a slot of its own
// starts or stops being filled, and not because the layout above it rendered
const Outlet = memo(({ view }) => {
  useSyncExternalStore(view.subscribe, view.getSnapshot);
  const props = { ...view.context };
  for (const name of Object.keys(view.fills)) {
    props[name] = view.slots[name] ??= createElement(Slot, { layout: view, name });
  }
  return createElement(Boundary, { view }, createElement(view.view, props));
});

// a view that throws as it renders is the router's to show, as its route's error. the view that
// failed renders nothing, and the layouts around it stand
class Boundary extends Component {
  state = { failed: null };

  componentDidCatch(error) {
    const { view } = this.props;
    this.setState({ failed: view });
    view.router.renderFailed(error);
  }

  render() {
    return this.state.failed === this.props.view ? null : this.props.children;
  }
}

// a react component. the top view has a root in the mount. a view inside a react layout has none:
// its layout renders it, as children, or as the prop named for its slot, so a layout is plain react,
// ({ children, sidebar }) => ..., and what a layout provides reaches the views inside it
export class ReactView extends View {
  static place = 'element';

  // what each slot of this layout holds, by name, and the element handed to the layout for each
  fills = {};
  slots = {};

  // what this view's component renders from: how many times it was told, and which slots are filled
  version = 0;
  listeners = new Set();
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => `${this.version} ${Object.keys(this.fills).sort()}`;

  changed() {
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
    this.version++;
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

  // a view that threw inside the moment fails the moment, as a native view's throw does
  batch(fn) {
    this.rendering = true;
    try {
      const result = flushSync(fn);
      if (this.thrown) {
        throw this.thrown;
      }
      return result;
    }
    finally {
      this.rendering = false;
      this.thrown = null;
    }
  }

  // inside a moment that is not already the error page the failure is the moment's, thrown as it
  // ends. outside one, a view rendering from its own state, it is the standing page's
  renderFailed(error) {
    if (this.rendering && this.page?.status !== 'error') {
      this.thrown ??= error;
    }
    else {
      this.viewFailed(error);
    }
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
