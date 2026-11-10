import { isFunction, isString } from '@semantic-ui/utils';

// a view on the page, with a three-part life: it is created at its place, updated with its
// context, and destroyed. this is the place and the life, the same for every kind of view, and it
// renders nothing: a kind extends it and writes create, update and destroy. where a view goes, a
// slot's fallback, a shadow host's projection and taking the view away are all here, once
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
      this.create({ view: this.view, context, target: this.target, anchor: this.endAnchor, element: this.target });
      this.project();
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

  create({ view, context, target, anchor, element }) {}

  update(context) {}

  // a kind ends what it made, then calls this, which takes the view's nodes and place away
  destroy() {
    for (const node of [...this.nodes, this.startAnchor, this.endAnchor, this.wrapper]) {
      node?.remove();
    }
    if (this.fallback) {
      this.target.append(...this.fallback);
    }
  }

  /*******************************
              Place
  *******************************/

  // the element this view goes in, and for an anchored view the two empty text nodes that bound
  // what it rendered. a slot's own children, its fallback, wait aside while the view fills it.
  // an element view is handed its target as it is: a slot is the view's alone, and the mount is
  // the router's, where the app said it goes, so a framework mounts in it its own way. only a
  // shadow host is shared, its children the views of all its slots, so there an element view is
  // given an element of its own, with no box
  open() {
    let target = this.findTarget();
    const anchored = this.constructor.place === 'anchor';
    if (this.host && !anchored) {
      this.wrapper = target = target.appendChild(document.createElement('div'));
      target.style.display = 'contents';
    }
    this.target = target;
    if (target.localName === 'slot') {
      this.fallback = [...target.childNodes];
      target.replaceChildren();
    }
    if (anchored) {
      this.startAnchor = target.insertBefore(document.createTextNode(''), this.parent ? null : target.firstChild);
      this.endAnchor = document.createTextNode('');
      this.startAnchor.after(this.endAnchor);
    }
  }

  // the mount at the top, otherwise the slot the layout above wrote: in its own nodes, or in the
  // shadow root of one of them, which projects the host's children by their slot attribute. a
  // named slot is the nearest layout's above that wrote it
  findTarget() {
    const { parent, slot } = this.placement;
    if (!parent) {
      const { mount } = this.router.config;
      return isString(mount) ? document.querySelector(mount) : mount;
    }
    const selector = slot ? `slot[name="${CSS.escape(slot)}"]` : 'slot:not([name])';
    for (let layout = parent; layout; layout = slot ? layout.parent : null) {
      for (const node of layout.nodes) {
        if (node.shadowRoot?.querySelector(selector)) {
          this.host = node;
          return node;
        }
        const found = node.matches?.(selector) ? node : node.querySelector?.(selector);
        if (found) {
          return found;
        }
      }
    }
    throw new Error(`view: no layout above wrote <slot${slot ? ` name="${slot}"` : ''}>`);
  }

  // a shadow host projects its children by their slot attribute, so the view's elements carry it
  project() {
    if (this.host) {
      const { slot } = this.placement;
      for (const node of this.wrapper ? [this.wrapper] : this.nodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          slot ? node.setAttribute('slot', slot) : node.removeAttribute('slot');
        }
      }
    }
  }

  // what this view rendered
  get nodes() {
    if (!this.startAnchor) {
      return this.target ? [...this.target.childNodes] : [];
    }
    const nodes = [];
    for (let node = this.startAnchor.nextSibling; node && node !== this.endAnchor; node = node.nextSibling) {
      nodes.push(node);
    }
    return nodes;
  }
}

// the view for an app with no framework: a function of its context returning markup or nodes. it
// cannot be told, so an update makes it again, with the focus put back where it was
export class DomView extends View {
  create({ view, context, target, anchor }) {
    let result = isFunction(view) ? view(context) : view;
    if (isString(result)) {
      const template = document.createElement('template');
      template.innerHTML = result.trim();
      result = template.content;
    }
    for (const node of result instanceof DocumentFragment ? [...result.childNodes] : [result].flat()) {
      target.insertBefore(node, anchor);
    }
  }

  // destroyed, and a new view begins where it stood. the new view is the answer, which tells its
  // route that what hung inside the old one has gone. the control that had the focus, found
  // again by its id, takes it back with its selection
  update(context) {
    const { router, view, placement } = this;
    const active = document.activeElement;
    const focused = this.nodes.some((node) => node.contains(active)) ? active : null;
    const selection = focused?.selectionStart != null && [focused.selectionStart, focused.selectionEnd];
    this.destroy();
    const next = new this.constructor({ router, view, placement }).start(context);
    const again = focused?.id && document.getElementById(focused.id);
    if (again) {
      again.focus();
      if (selection) {
        again.setSelectionRange(...selection);
      }
    }
    return next;
  }
}
