import { each, isEqual } from '@semantic-ui/utils';
import { ReactiveRouter } from 'nav-router/reactive';
import { batch, createComputed, createRoot, createSignal, untrack } from 'solid-js';
import { render } from 'solid-js/web';

// the second example of the door, on the dom plugin's seams: the plugin places, this renders. a
// view is a solid component of props, the scaffold's per-key store with a getter per key, so a
// component reads props.params.id or props.data.v and is woken by the key it read and by no other.
// the scaffold runs on solid's signals and computeds
export class SolidRouter extends ReactiveRouter {
  // a thunk to the setter, so a function value is stored and not called
  createSignal(initialValue) {
    const [get, set] = createSignal(initialValue, { equals: isEqual });
    return { get, set: (value) => set(() => value), peek: () => untrack(get) };
  }

  createReaction(fn) {
    let dispose = null;
    createRoot((end) => {
      dispose = end;
      let first = true;
      createComputed(() => {
        const isFirst = first;
        first = false;
        fn(isFirst);
      });
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

  // what a component reads: params, query and user through the store's cells; data read through
  // the slices' own cells, so one key moving wakes its readers alone, the slices themselves a
  // signal since a navigation brings new ones; the page a signal too, new each navigation; the
  // route, the router and the signal as they are
  propsOf(context) {
    const store = this.createStore({ params: context.params, query: context.query, user: context.user });
    // the router builds a view's slices array fresh each time; the same slices in it are the same slices
    const [slices, setSlices] = createSignal(context.slices, {
      equals: (a, b) => a.length === b.length && a.every((slice, index) => slice === b[index]),
    });
    const [page, setPage] = createSignal(context.page);
    const props = { route: context.route, router: context.router, signal: context.signal };
    each(['params', 'query', 'user'], (key) => {
      Object.defineProperty(props, key, { get: () => store.get(key), enumerable: true });
    });
    Object.defineProperty(props, 'data', { get: () => this.dataFor(slices()), enumerable: true });
    Object.defineProperty(props, 'slices', { get: slices, enumerable: true });
    Object.defineProperty(props, 'page', { get: page, enumerable: true });
    props.update = (next) => {
      this.batch(() => {
        each(['params', 'query', 'user'], (key) => store.set(key, next[key]));
        setSlices(next.slices);
        setPage(next.page);
      });
    };
    return props;
  }

  // the rendered view is the element solid renders into, which stays solid's insertion target so
  // a fragment or a root that changes with a condition keeps landing in it. it carries the props'
  // update for the plugin to call and the dispose for destroy, and the plugin places it as it
  // places a view it rendered itself
  createView({ view, placement, context }) {
    const props = this.propsOf(context);
    const element = document.createElement('div');
    element.dispose = render(() => view(props), element);
    element.update = props.update;
    return super.createView({ view: element, placement, context });
  }

  destroyView({ rendered }) {
    rendered.dispose();
    super.destroyView({ rendered });
  }
}

export const solidRouter = (options) => new SolidRouter(options);
