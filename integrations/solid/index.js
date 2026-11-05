import { isEqual } from '@semantic-ui/utils';
import { place, remove } from 'nav-router/plugins/dom';
import { ReactiveRouter } from 'nav-router/reactive';
import { batch, createComputed, createRoot, createSignal, untrack } from 'solid-js';
import { render } from 'solid-js/web';

// the second example of the door. a view is a solid component of a props accessor: it is rendered
// once into its own element, told by a write to the accessor's signal, and disposed with the view.
// the scaffold runs on solid's signals and computeds; placement is the dom plugin's reading of it
export class SolidRouter extends ReactiveRouter {
  static defaults = {
    ...ReactiveRouter.defaults,
    mount: 'body',
  };

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

  // the rendered view is its element, carrying the accessor's setter and the dispose, so a layout's
  // element is what the placement below it names
  createView({ view, placement, context }) {
    const [props, setProps] = createSignal(context);
    const container = document.createElement('div');
    const dispose = render(() => view(props), container);
    const element = container.firstElementChild ?? container;
    element.setProps = setProps;
    element.dispose = dispose;
    place(element, placement, this.mount);
    return element;
  }

  updateView({ rendered, context }) {
    rendered.setProps(context);
    return rendered;
  }

  destroyView({ rendered }) {
    rendered.dispose();
    remove(rendered);
  }
}

export const solidRouter = (options) => new SolidRouter(options);
