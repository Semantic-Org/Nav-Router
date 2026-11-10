import { each, isFunction, isString } from '@semantic-ui/utils';
import { Router } from 'nav-router';

// the native how for what appears. the router creates, updates and destroys a route's views, and
// this turns each into dom: create finds where the view goes and renders it there, update tells
// it or makes it again, destroy takes it away. what create returned is all that is kept
Router.defaults.mount ??= 'body';

// how a view is handed its place: 'anchor', a target and the node to insert before, with nothing
// of the plugin's around the view, or 'element', an element that is the view's alone
Router.viewPlace = 'anchor';

const proto = Router.prototype;

// markup parses, a node is itself, a fragment its children, an array its own
const toNodes = (result) => {
  if (isString(result)) {
    const template = document.createElement('template');
    template.innerHTML = result.trim();
    return [...template.content.childNodes];
  }
  return result instanceof DocumentFragment ? [...result.childNodes] : [result].flat();
};

// where a view lives: an element, and for an anchored view two empty text nodes inside it that
// bound what the view rendered. a slot's own children, its fallback, wait here while the view
// fills it and go back when it leaves
class Region {
  constructor(target, { parent, anchored }) {
    this.target = target;
    this.parent = parent;
    if (target.localName === 'slot') {
      this.fallback = [...target.childNodes];
      target.replaceChildren();
    }
    if (anchored) {
      this.start = target.insertBefore(document.createTextNode(''), parent ? null : target.firstChild);
      this.end = document.createTextNode('');
      this.start.after(this.end);
    }
  }

  // what the view rendered
  get nodes() {
    if (!this.start) {
      return [...this.target.childNodes];
    }
    const nodes = [];
    for (let node = this.start.nextSibling; node && node !== this.end; node = node.nextSibling) {
      nodes.push(node);
    }
    return nodes;
  }

  remove() {
    each([...this.nodes, this.start, this.end], (node) => node?.remove());
    if (this.fallback) {
      this.target.append(...this.fallback);
    }
  }
}

// the element a view goes in: the mount at the top, otherwise the slot the layout above wrote. a
// named slot is the nearest layout's above that wrote it
const findTarget = (router, { parent, slot }) => {
  if (!parent) {
    const { mount } = router.config;
    return isString(mount) ? document.querySelector(mount) : mount;
  }
  const selector = slot ? `slot[name="${CSS.escape(slot)}"]` : 'slot:not([name])';
  for (let layout = parent; layout; layout = slot ? layout.parent : null) {
    for (const node of layout.nodes) {
      const found = node.matches?.(selector) ? node : node.querySelector?.(selector);
      if (found) {
        return found;
      }
    }
  }
  throw new Error(`dom: no layout above wrote <slot${slot ? ` name="${slot}"` : ''}>`);
};

proto.createView = function({ view, placement, context }) {
  const anchored = this.constructor.viewPlace === 'anchor';
  const region = new Region(findTarget(this, placement), { parent: placement.parent, anchored });
  const { target, end } = region;
  try {
    region.view = this.renderView({ view, context, ...(anchored ? { target, anchor: end } : { element: target }) });
  }
  catch (error) {
    region.remove();
    throw error;
  }
  return region;
};

// a view that can be told is told. one that cannot is destroyed and created again where it stood
proto.updateView = function({ rendered, view, placement, context }) {
  if (rendered.view.update) {
    rendered.view.update(context);
    return rendered;
  }
  this.destroyView({ rendered });
  return this.createView({ view, placement, context });
};

proto.destroyView = function({ rendered }) {
  rendered.view.destroy?.();
  rendered.remove();
};

// what an integration replaces: render the view at its place and return { update, destroy }. the
// native view is a function of its context returning markup or nodes, with neither
proto.renderView = function({ view, context, target, anchor = null }) {
  each(toNodes(isFunction(view) ? view(context) : view), (node) => target.insertBefore(node, anchor));
  return {};
};
