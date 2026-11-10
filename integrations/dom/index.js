import { Router } from 'nav-router';

// a view on the page, with a three-part life: it is created at its place, updated with its
// context, and destroyed. this base is the native view, a function of its context returning
// markup or nodes; an integration extends it and writes create, update and destroy for its
// framework. where a view goes, a slot's fallback, and taking it away are all here, once
export class View {
  // how a view is handed its place: 'anchor', a target and the node to insert before, with
  // nothing of ours around the view, or 'element', an element that is the view's alone
  static place = 'anchor';

  constructor({ router, view, placement }) {
    this.router = router;
    this.view = view;
    this.placement = placement;
    this.parent = placement.parent;
  }

  // the view's life begins: its place is opened and it is created there. apart from the
  // constructor, so a view that extends this has its own fields in place before create runs
  start(context) {
    this.open();
    try {
      this.create({ view: this.view, context, target: this.target, anchor: this.end, element: this.target });
    }
    catch (error) {
      // a view that failed leaves nothing behind
      this.destroy();
      throw error;
    }
    return this;
  }

  /*******************************
            The Three
  *******************************/

  create({ view, context, target, anchor }) {
    this.fill(view, context, target, anchor);
  }

  // the native view cannot be told, so it is destroyed and a new one begins where it stood. the
  // new view is the answer, which tells its route that what hung inside the old one has gone
  update(context) {
    const { router, view, placement } = this;
    const focused = this.nodes.some((node) => node.contains(document.activeElement)) && document.activeElement;
    this.destroy();
    const next = new this.constructor({ router, view, placement }).start(context);
    if (focused?.id) {
      document.getElementById(focused.id)?.focus();
    }
    return next;
  }

  destroy() {
    for (const node of [...this.nodes, this.start, this.end]) {
      node?.remove();
    }
    if (this.fallback) {
      this.target.append(...this.fallback);
    }
  }

  /*******************************
              Place
  *******************************/

  // the element this view goes in, the mount at the top and otherwise the slot the layout above
  // wrote, and for an anchored view the two empty text nodes that bound what it rendered. a
  // slot's own children, its fallback, wait aside while the view fills it
  open() {
    const target = this.target = this.findTarget();
    if (target.localName === 'slot') {
      this.fallback = [...target.childNodes];
      target.replaceChildren();
    }
    if (this.constructor.place === 'anchor') {
      this.start = target.insertBefore(document.createTextNode(''), this.parent ? null : target.firstChild);
      this.end = document.createTextNode('');
      this.start.after(this.end);
    }
  }

  // a named slot is the nearest layout's above that wrote it
  findTarget() {
    const { parent, slot } = this.placement;
    if (!parent) {
      const { mount } = this.router.config;
      return typeof mount === 'string' ? document.querySelector(mount) : mount;
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
    throw new Error(`view: no layout above wrote <slot${slot ? ` name="${slot}"` : ''}>`);
  }

  // what this view rendered
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

  fill(view, context, target, anchor = null) {
    let result = typeof view === 'function' ? view(context) : view;
    if (typeof result === 'string') {
      const template = document.createElement('template');
      template.innerHTML = result.trim();
      result = template.content;
    }
    for (const node of result instanceof DocumentFragment ? [...result.childNodes] : [result].flat()) {
      target.insertBefore(node, anchor);
    }
  }
}

// where the app goes; a selector or an element
Router.defaults.mount ??= 'body';

export class DomRouter extends Router {
  static View = View;
}

export * from 'nav-router';
export const domRouter = (options) => new DomRouter(options);
export { domRouter as router };
