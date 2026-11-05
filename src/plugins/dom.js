import { isArray, isFunction, isString } from '@semantic-ui/utils';

// the native how for what appears. a view is a function of its context returning markup or nodes,
// rendered as one element and inserted into the slot its placement names, among siblings, never
// written over a container. a layout writes <slot> for the content below it and <slot name="x">
// for content by name, the platform's element: in light dom the element goes inside the slot and
// the slot's own fallback children wait aside until it empties; under a shadow host the element is
// a light child carrying the slot attribute and the host projects it. an update renders the view
// again and swaps the element where it stood, keeping its id and the focus inside it, or tells an
// element that has an update() of its own. the root's parent is the mount, the router's own setting
// with the install's as its default, so two routers on a page take two containers
export default ({ mount = 'body' } = {}, Router) => {
  const proto = Router.prototype;
  Router.defaults.mount ??= mount;

  const mountElement = (router) => {
    const target = router.mount ?? mount;
    return isString(target) ? document.querySelector(target) : target;
  };

  const renderOf = (view, context) => toElement(isFunction(view) ? view(context) : view);

  // one element: markup parses, a fragment's children or several nodes wrap in a div
  const toElement = (result) => {
    let nodes;
    if (isString(result)) {
      const template = document.createElement('template');
      template.innerHTML = result.trim();
      nodes = [...template.content.childNodes];
    }
    else if (result instanceof Node) {
      nodes = result.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? [...result.childNodes] : [result];
    }
    else if (isArray(result)) {
      nodes = result;
    }
    else {
      throw new Error(`dom: a view returned ${typeof result}, not markup or nodes`);
    }
    if (nodes.length === 1 && nodes[0].nodeType === Node.ELEMENT_NODE) {
      return nodes[0];
    }
    const wrapper = document.createElement('div');
    wrapper.append(...nodes);
    return wrapper;
  };

  // where the placement lands: the mount for the root, the host itself when it projects, otherwise
  // the slot of that name inside the parent's rendered layout, the layout itself when it wrote none
  const targetOf = ({ parent, slot }, router) => {
    if (!parent) {
      return mountElement(router);
    }
    if (parent.shadowRoot) {
      return parent;
    }
    return parent.querySelector(slot ? `slot[name="${slot}"]` : 'slot:not([name])') ?? parent;
  };

  const place = (element, placement, router) => {
    const target = targetOf(placement, router);
    if (placement.parent?.shadowRoot) {
      if (placement.slot) {
        element.setAttribute('slot', placement.slot);
      }
      else {
        element.removeAttribute('slot');
      }
    }
    // a light-dom slot keeps its own fallback children aside while something fills it
    if (target.tagName === 'SLOT' && !target.fallback) {
      target.fallback = [...target.childNodes];
      target.replaceChildren();
    }
    target.appendChild(element);
  };

  const remove = (element) => {
    const target = element.parentNode;
    element.remove();
    if (target?.fallback && !target.childElementCount) {
      target.append(...target.fallback);
      delete target.fallback;
    }
  };

  proto.createView = function({ view, placement, context }) {
    const element = renderOf(view, context);
    place(element, placement, this);
    return element;
  };

  proto.updateView = function({ rendered, view, placement, context }) {
    if (isFunction(rendered.update)) {
      rendered.update(context);
      return rendered;
    }
    const next = renderOf(view, context);
    if (next === rendered) {
      return rendered;
    }
    if (rendered.id && !next.id) {
      next.id = rendered.id;
    }
    const focused = rendered.contains(document.activeElement) ? document.activeElement : null;
    if (rendered.parentNode) {
      if (placement.parent?.shadowRoot && placement.slot) {
        next.setAttribute('slot', placement.slot);
      }
      rendered.replaceWith(next);
    }
    else {
      place(next, placement, this);
    }
    // the same control by id takes the focus back, with its selection where it was
    const again = focused?.id && next.querySelector(`#${CSS.escape(focused.id)}`);
    if (again) {
      again.focus();
      if (isFunction(again.setSelectionRange) && focused.selectionStart !== null) {
        try {
          again.setSelectionRange(focused.selectionStart, focused.selectionEnd);
        }
        catch {}
      }
    }
    return next;
  };

  proto.destroyView = function({ rendered }) {
    remove(rendered);
  };
};
