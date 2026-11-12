import { getRouter, Router, View } from 'nav-router';
import { h, render } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

// a preact component under a root of its own, in an element that is the view's alone. its props
// are its context, and it renders again when it is updated with a new one. preact renders a root
// at once, so the views below find their slots in it
export class PreactView extends View {
  static place = 'element';

  create({ context }) {
    this.update(context);
  }

  update(context) {
    render(h(this.view, context), this.target);
  }

  destroy() {
    render(null, this.target);
    super.destroy();
  }
}

export class PreactRouter extends Router {
  static View = PreactView;
}

// the router's state, read in a component and kept current: useRouter((router) => router.pending)
export const useRouter = (read) => {
  const router = getRouter();
  const latestRead = useRef(read);
  latestRead.current = read;
  // preact leaves a component alone when the state it is handed is the one it holds
  const [, setValue] = useState(() => read(router));
  useLayoutEffect(() => router.subscribe(() => setValue(latestRead.current(router))), [router]);
  return read(router);
};

export * from 'nav-router';
export const preactRouter = (options) => new PreactRouter(options);
export { preactRouter as router };
