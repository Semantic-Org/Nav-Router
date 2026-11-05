import { each, isArray, isFunction, isString } from '@semantic-ui/utils';

// the native how for what appears. a view is a function of its context returning markup or nodes,
// rendered as one node and inserted into the slot its placement names, among siblings, never
// written over a container and never beside a node the plugin made: nothing of the plugin's enters
// the tree. a layout writes <slot> for the content below it and <slot name="x"> for content by
// name, the platform's element: in light dom the node goes inside the slot and the slot's own
// fallback children wait aside until it empties; under a shadow host the element is a light child
// carrying the slot attribute and the host projects it. an update renders the view again and swaps
// the node where it stood, keeping its id and the focus inside it, or tells a rendered value that
// has an update() of its own. the root's parent is the mount, the router's own setting with the
// install's as its default, so two routers on a page take two containers. a view a framework
// mounts comes with mount(target, anchor) in the createView bag, the one thing the plugin cannot
// know; placement, removal and the slot's fallback stay the plugin's
export default ({ mount: defaultMount = 'body' } = {}, Router) => {
  const proto = Router.prototype;
  Router.defaults.mount ??= defaultMount;

  const mountElement = (router) => {
    const target = router.mount ?? defaultMount;
    return isString(target) ? document.querySelector(target) : target;
  };

  const renderOf = (view, context) => toNode(isFunction(view) ? view(context) : view);

  // one node: markup parses, a single node of any kind passes as itself, several wrap in a div
  const toNode = (result) => {
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
    if (nodes.length === 1) {
      return nodes[0];
    }
    const wrapper = document.createElement('div');
    wrapper.append(...nodes);
    return wrapper;
  };

  // where the placement lands: the mount for the root, otherwise inside the parent's layout, the
  // element the plugin rendered or the target a mounted layout occupies: the host itself when it
  // projects, the slot of that name in it, the layout itself when it wrote none
  const targetOf = ({ parent, slot }, router) => {
    if (!parent) {
      return mountElement(router);
    }
    const layout = parent instanceof Node ? parent : parent.target;
    if (layout.shadowRoot) {
      return layout;
    }
    return layout.querySelector(slot ? `slot[name="${slot}"]` : 'slot:not([name])') ?? layout;
  };

  // the target the placement names and the node to insert before there, as insertBefore reads it:
  // the mount's first child for the root, so the app leads whatever else the mount holds, and null
  // otherwise, the end, since a slot holds one occupant. a light-dom slot keeps its own fallback
  // children aside while something fills it
  const openSlot = (placement, router) => {
    const target = targetOf(placement, router);
    if (target.tagName === 'SLOT' && !target.fallback) {
      target.fallback = [...target.childNodes];
      target.replaceChildren();
    }
    return { target, anchor: placement.parent ? null : target.firstChild };
  };

  // the slot's fallback comes back once what filled it has left
  const closeSlot = (target) => {
    if (target?.fallback && !target.childNodes.length) {
      target.append(...target.fallback);
      delete target.fallback;
    }
  };

  // the plugin's own node, an element carrying the slot attribute a shadow host projects by
  const place = (node, placement, { target, anchor }) => {
    if (placement.parent?.shadowRoot) {
      if (placement.slot) {
        node.setAttribute?.('slot', placement.slot);
      }
      else {
        node.removeAttribute?.('slot');
      }
    }
    target.insertBefore(node, anchor);
  };

  // a view the plugin renders is one node. a view a framework mounts is mounted at the place the
  // plugin read, and the rendered value is a record of the target, what it held before, the dispose
  // the mount returned and its update when it has one, so the nodes the mount put in are known at
  // destroy, a root that changed with a condition included
  proto.createView = function({ view, placement, context, mount }) {
    const slot = openSlot(placement, this);
    if (!mount) {
      const node = renderOf(view, context);
      place(node, placement, slot);
      return node;
    }
    const { target, anchor } = slot;
    const held = new Set(target.childNodes);
    const mounted = mount(target, anchor);
    const { dispose, update } = isFunction(mounted) ? { dispose: mounted } : mounted;
    return { target, held, dispose, update };
  };

  proto.updateView = function({ rendered, view, placement, context }) {
    // a mounted view is told through its update, or left as it stands; so is an element with one of its own
    if (rendered.dispose || isFunction(rendered.update)) {
      rendered.update?.(context);
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
        next.setAttribute?.('slot', placement.slot);
      }
      rendered.replaceWith(next);
    }
    else {
      place(next, placement, openSlot(placement, this));
    }
    // the same control by id takes the focus back, with its selection where it was
    const again = focused?.id && next.querySelector?.(`#${CSS.escape(focused.id)}`);
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
    const target = rendered.dispose ? rendered.target : rendered.parentNode;
    if (rendered.dispose) {
      rendered.dispose();
      each([...target.childNodes], (node) => {
        if (!rendered.held.has(node)) {
          node.remove();
        }
      });
    }
    else {
      rendered.remove();
    }
    closeSlot(target);
  };
};
