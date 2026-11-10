import { View } from '@nav-router/dom';
import { Router } from 'nav-router';
import { createElement, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

// a react component under a root of its own, in an element that is the view's alone. its props
// are its context, and it renders again when it is updated with a new one
export class ReactView extends View {
  static place = 'element';

  create({ context, element }) {
    this.root = createRoot(element);
    this.update(context);
  }

  // flushed, so the views below find their slots in it at once
  update(context) {
    flushSync(() => this.root.render(createElement(this.view, context)));
  }

  destroy() {
    this.root?.unmount();
    super.destroy();
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

import { getRouter } from 'nav-router';
export * from 'nav-router';
export const reactRouter = (options) => new ReactRouter(options);
export { reactRouter as router };
