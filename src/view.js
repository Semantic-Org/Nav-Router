import { isFunction, isString } from '@semantic-ui/utils';

// a view on the page, with a three-part life: it is created in its slot, updated with its context,
// and destroyed. it renders nothing: a kind extends it and writes create, update and destroy.
// findSlot says what the view goes in, and the views above it are in reach for that. as written
// here it is the dom's answer, the <slot> element a layout above wrote, with the place, the slot's
// fallback and the taking away that go with an element. a kind whose framework has slots of its
// own says what a slot is by writing its own findSlot
export class View {
  // how a view is handed its place: 'anchor', a target and the node to insert before, with
  // nothing of ours around the view, or 'element', an element that is the view's alone
  static place = 'anchor';

  constructor({ router, view, placement }) {
    this.router = router;
    this.view = view;
    this.placement = placement;
    this.parent = placement.parent;
    this.slot = placement.slot;
  }

  // the views this one hangs inside, nearest first, each a layout with its route
  get ancestors() {
    const views = [];
    for (let view = this.parent; view; view = view.parent) {
      views.push(view);
    }
    return views;
  }

  // the view's life begins: its slot is found, its place opened there, and it is created. apart
  // from the constructor, so a view that extends this has its own fields in place before create runs.
  // a view that fails to render goes to onError and stands empty, with nothing of it left behind,
  // and the page stands. what goes inside a layout that failed has no slot, which is not a failure of its own
  start(context) {
    this.route = context.route;
    this.failed = this.parent?.failed;
    if (!this.failed) {
      try {
        this.target = this.findSlot();
        this.open();
        this.create({ view: this.view, context, target: this.target, anchor: this.endAnchor, element: this.target });
        this.project();
      }
      catch (error) {
        this.destroy();
        this.failed = true;
        this.router.onError(error, context);
      }
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
    let { target } = this;
    // a slot that is not an element is its kind's own, and has no place in the dom to open
    if (!(target instanceof Node)) {
      return;
    }
    const anchored = this.constructor.place === 'anchor';
    if (this.host && !anchored) {
      this.wrapper = this.target = target = target.appendChild(document.createElement('div'));
      target.style.display = 'contents';
    }
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

  // what this view goes in. the mount at the top, otherwise the slot a layout above wrote: among
  // its own nodes, or in the shadow root of one of them, which projects the host's children by
  // their slot attribute. a named slot is the nearest layout's above that wrote it
  findSlot() {
    const { ancestors, slot } = this;
    if (!ancestors.length) {
      const { mount } = this.router.config;
      return isString(mount) ? document.querySelector(mount) : mount;
    }
    const selector = slot ? `slot[name="${CSS.escape(slot)}"]` : 'slot:not([name])';
    for (const layout of slot ? ancestors : ancestors.slice(0, 1)) {
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
      const { slot } = this;
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
      return this.target instanceof Node ? [...this.target.childNodes] : [];
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
