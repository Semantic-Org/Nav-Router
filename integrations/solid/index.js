import { Router } from 'nav-router';
import dom from 'nav-router/plugins/dom';
import { ReactiveRouter } from 'nav-router/reactive';
import { batch, createComputed, createRoot, createSignal, untrack } from 'solid-js';
import { render } from 'solid-js/web';

// the second example of the door, on the dom plugin's seams: the plugin places, this renders. a
// view is a solid component whose props are the scaffold's live context, so a component reads
// props.params.id or props.data.v and is woken by the key it read and by no other. the scaffold
// runs on solid's signals and computeds
export class SolidRouter extends ReactiveRouter {
  // the dom plugin places what this renders, so the integration brings it; an install made earlier
  // with its own mount stands, and the router's mount option names the container either way
  constructor(options) {
    Router.extend(dom);
    super(options);
  }

  // a thunk to the setter, so a function value is stored and not called; the comparator is the
  // scaffold's, from its equality table
  createSignal(initialValue, { equals }) {
    const [get, set] = createSignal(initialValue, { equals });
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

  // the rendered view is the element solid renders into, which stays solid's insertion target so
  // a fragment or a root that changes with a condition keeps landing in it. it carries the live
  // context's update for the plugin to call and the dispose for destroy, and the plugin places it
  // as it places a view it rendered itself
  createView({ view, placement, context }) {
    const { context: props, update } = this.liveContext(context);
    const element = document.createElement('div');
    element.dispose = render(() => view(props), element);
    element.update = update;
    return super.createView({ view: element, placement, context });
  }

  destroyView({ rendered }) {
    rendered.dispose();
    super.destroyView({ rendered });
  }
}

export const solidRouter = (options) => new SolidRouter(options);
