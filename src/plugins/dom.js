import { each, isArray, isFunction, isString } from '@semantic-ui/utils';

// the native how for what appears. every view lives in a region, the house's DynamicRegion: two
// empty text nodes, which serialize to nothing and have no box, a start at the place the plugin
// reads and an end after it, with whatever the view rendered between them, one node or many. a
// view is a function of its context returning markup or nodes, inserted before the region's end;
// a view a framework mounts comes with mount(target, anchor) in the createView bag, the one thing
// the plugin cannot know, and is mounted with the region's end as its insertion reference. a
// layout writes <slot> for the content below it and <slot name="x"> for content by name, the
// platform's element, found among the layout's own nodes or inside them, so a fragment layout
// works as a rooted one does: in light dom the content goes inside the slot and the slot's own
// fallback children wait aside until it empties; under a shadow host the content is light
// children carrying the slot attribute, stamped at mount and when told, and the host projects it.
// an update renders the view again and swaps what stands between the anchors, keeping its id and
// the focus inside it, or tells a mounted view and an element with an update() of its own. the
// root's region leads the mount, the router's own setting with the install's as its default, so
// two routers on a page take two containers. placement, removal and the slot's fallback are the
// plugin's for every view
export default ({ mount: defaultMount = 'body' } = {}, Router) => {
  const proto = Router.prototype;
  Router.defaults.mount ??= defaultMount;

  const mountElement = (router) => {
    const target = router.mount ?? defaultMount;
    return isString(target) ? document.querySelector(target) : target;
  };

  // the nodes a view's result is: markup parses, a node is itself, a fragment its children, an array its own
  const toNodes = (result) => {
    if (isString(result)) {
      const template = document.createElement('template');
      template.innerHTML = result.trim();
      return [...template.content.childNodes];
    }
    if (result instanceof Node) {
      return result.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? [...result.childNodes] : [result];
    }
    if (isArray(result)) {
      return result;
    }
    throw new Error(`dom: a view returned ${typeof result}, not markup or nodes`);
  };

  const renderOf = (view, context) => toNodes(isFunction(view) ? view(context) : view);

  // what stands between a region's anchors, the view's own
  const contents = ({ start, end }) => {
    const nodes = [];
    for (let node = start.nextSibling; node !== end; node = node.nextSibling) {
      nodes.push(node);
    }
    return nodes;
  };

  const elements = (region) => contents(region).filter((node) => node.nodeType === Node.ELEMENT_NODE);

  // the slot element a region's layout wrote for the selector: the host when an element of it
  // projects one, otherwise the match among the layout's own nodes or inside one
  const slotIn = (region, selector) => {
    const roots = elements(region);
    const host = roots.find((element) => element.shadowRoot);
    if (host) {
      return host.shadowRoot.querySelector(selector) ? host : null;
    }
    for (const root of roots) {
      const found = root.matches(selector) ? root : root.querySelector(selector);
      if (found) {
        return found;
      }
    }
    return null;
  };

  // where the placement lands: the mount for the root, otherwise the slot the parent's layout
  // wrote. a named slot is the nearest layout's above that wrote it, across layouts that did not,
  // so a leaf's override of a slot the root declares lands in the root's; content for a slot no
  // layout wrote goes in the parent's first element
  const targetOf = ({ parent, slot }, router) => {
    if (!parent) {
      return mountElement(router);
    }
    const selector = slot ? `slot[name="${slot}"]` : 'slot:not([name])';
    for (let region = parent; region; region = slot ? region.parent : null) {
      const found = slotIn(region, selector);
      if (found) {
        return found;
      }
    }
    return elements(parent)[0] ?? parent.target;
  };

  // a region opened at the target the placement names, before the mount's first child for the root,
  // so the app leads whatever else the mount holds, and at the end otherwise, since a slot holds one
  // occupant. a light-dom slot keeps its own fallback children aside while something fills it
  const openRegion = (placement, router) => {
    const target = targetOf(placement, router);
    if (target.tagName === 'SLOT' && !target.fallback) {
      target.fallback = [...target.childNodes];
      target.replaceChildren();
    }
    const start = document.createTextNode('');
    const end = document.createTextNode('');
    target.insertBefore(start, placement.parent ? null : target.firstChild);
    start.after(end);
    return { target, start, end, parent: placement.parent };
  };

  // the slot's fallback comes back once what filled it has left
  const closeSlot = (target) => {
    if (target?.fallback && !target.childNodes.length) {
      target.append(...target.fallback);
      delete target.fallback;
    }
  };

  const fill = (region, nodes) => each(nodes, (node) => region.end.before(node));

  const empty = (region) => each(contents(region), (node) => node.remove());

  // the region leaves whole, and the slot's fallback comes back once it is empty
  const remove = (region) => {
    empty(region);
    region.start.remove();
    region.end.remove();
    closeSlot(region.target);
  };

  // a shadow host projects by the slot attribute, carried by the region's elements
  const stamp = (region, slot) => {
    if (region.target.shadowRoot) {
      each(
        elements(region),
        (element) => (slot ? element.setAttribute('slot', slot) : element.removeAttribute('slot')),
      );
    }
  };

  // the region is the rendered value, carrying the dispose a mount returned and its update when it
  // has one. a view that throws leaves nothing behind: the region goes and the slot shows its fallback
  proto.createView = function({ view, placement, context, mount }) {
    const region = openRegion(placement, this);
    try {
      if (mount) {
        const mounted = mount(region.target, region.end);
        Object.assign(region, isFunction(mounted) ? { dispose: mounted } : mounted);
      }
      else {
        fill(region, renderOf(view, context));
      }
    }
    catch (error) {
      remove(region);
      throw error;
    }
    stamp(region, placement.slot);
    return region;
  };

  proto.updateView = function({ rendered, view, placement, context }) {
    const held = contents(rendered);
    const told = rendered.dispose ? rendered.update : held.length === 1 ? held[0].update : null;
    // a mounted view is told through its update, or left as it stands; so is an element with one of its own
    if (rendered.dispose || isFunction(told)) {
      told?.(context);
      stamp(rendered, placement.slot);
      return rendered;
    }
    const nodes = renderOf(view, context);
    if (nodes.length === 1 && held.length === 1 && nodes[0] === held[0]) {
      return rendered;
    }
    // one element in for one out keeps its id, so a control the page addresses by id stays addressed
    if (
      held.length === 1 && nodes.length === 1 && held[0].id && nodes[0].nodeType === Node.ELEMENT_NODE && !nodes[0].id
    ) {
      nodes[0].id = held[0].id;
    }
    const focused = held.some((node) => node.contains(document.activeElement)) ? document.activeElement : null;
    empty(rendered);
    fill(rendered, nodes);
    stamp(rendered, placement.slot);
    // the same control by id takes the focus back, with its selection where it was
    const again = focused?.id && elements(rendered)
      .map((
        element,
      ) => (element.matches(`#${CSS.escape(focused.id)}`)
        ? element
        : element.querySelector(`#${CSS.escape(focused.id)}`))
      )
      .find(Boolean);
    if (again) {
      again.focus();
      if (isFunction(again.setSelectionRange) && focused.selectionStart !== null) {
        try {
          again.setSelectionRange(focused.selectionStart, focused.selectionEnd);
        }
        catch {}
      }
    }
    // a layout that came back new remounts what hung inside it: a new record for the same region
    return { ...rendered };
  };

  proto.destroyView = function({ rendered }) {
    rendered.dispose?.();
    remove(rendered);
  };
};
