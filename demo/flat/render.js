import { each, isFunction } from '@semantic-ui/utils';

// a live render of the page. each route's layout keeps its element while the route stays and is
// rendered again only when the route itself moved, so a scroll container in a layout keeps its
// place; slot content and the view are strings replaced on every render, inside those layouts.
// a layout writes <slot> for the content below it and <slot name="sidebar"> for content by name,
// the platform's own element, whose fallback shows until something fills it. the first draft of
// what a dom plugin would carry
export function createRenderer({ mount, router }) {
  const elements = new Map();
  const renderedFrom = new Map();

  const contextOf = (page) => ({
    page,
    url: page.url ? new URL(page.url, location.origin) : null,
    route: page.route,
    params: page.params ?? {},
    query: page.query ?? {},
    data: page.data ?? {},
    status: page.status ?? 'ok',
    router,
  });

  const html = (view, context) => (isFunction(view) ? view(context) : String(view ?? ''));

  const sliceDataOf = (page, route) => page.slices?.find((slice) => slice.route === route)?.data ?? null;

  // the nearest slot of that name at or above a route, the layouts searched from the route up
  const slotAbove = (records, index, name) => {
    for (let at = index; at >= 0; at--) {
      const slot = elements.get(records[at].route)?.querySelector(name ? `slot[name="${name}"]` : 'slot:not([name])');
      if (slot) {
        return slot;
      }
    }
    return null;
  };

  // aria-current, the platform's word: "page" on the link to this page, "true" on a link to a
  // section the page sits under
  const markCurrentLinks = () => {
    const here = new URL(location.href);
    mount.querySelectorAll('a[href]').forEach((link) => {
      const target = new URL(link.getAttribute('href'), location.origin);
      const samePath = target.pathname === here.pathname && (!target.search || target.search === here.search);
      const under = target.pathname !== '/' && here.pathname.startsWith(`${target.pathname}/`);
      const current = target.origin !== here.origin ? null : (samePath ? 'page' : (under ? 'true' : null));
      if (current) {
        link.setAttribute('aria-current', current);
      }
      else {
        link.removeAttribute('aria-current');
      }
    });
  };

  // a focused element with an id keeps focus and selection across a re-render, and its value
  // when it says so
  const keepingFocus = (render) => {
    const active = document.activeElement;
    const kept = active?.id && mount.contains(active)
      ? {
        id: active.id,
        value: active.value,
        start: active.selectionStart,
        end: active.selectionEnd,
        keepValue: active.dataset.preserveFocus === 'true',
      }
      : null;
    render();
    const next = kept && document.getElementById(kept.id);
    if (next && next !== active) {
      if (kept.keepValue && 'value' in next) {
        next.value = kept.value;
      }
      next.focus();
      if (typeof kept.start === 'number' && next.setSelectionRange) {
        next.setSelectionRange(kept.start, kept.end);
      }
    }
  };

  const render = (page) => {
    if (!page) {
      return;
    }
    const context = contextOf(page);

    if (page.status === 'loading') {
      // the loading view takes the place of the content on screen, inside the layouts that stand
      const slots = mount.querySelectorAll('slot:not([name])');
      (slots[slots.length - 1] ?? mount).innerHTML = html(page.view, context);
      return;
    }

    const records = page.views ?? [];
    const chain = records.map((record) => record.route);
    keepingFocus(() => {
      for (const [route, element] of elements) {
        if (!chain.includes(route)) {
          element.remove();
          elements.delete(route);
          renderedFrom.delete(route);
        }
      }
      let changedAbove = false;
      records.forEach(({ route, layout, slots }, index) => {
        if (layout) {
          const from = sliceDataOf(page, route);
          let element = elements.get(route);
          if (!element) {
            element = document.createElement('div');
            element.dataset.route = route.id;
            elements.set(route, element);
          }
          // rendered again when its route moved, or when a layout above it did and recreated it
          if (changedAbove || renderedFrom.get(route) !== from) {
            element.innerHTML = html(layout, context);
            renderedFrom.set(route, from);
            changedAbove = true;
          }
          const host = slotAbove(records, index - 1, null) ?? mount;
          if (element.parentNode !== host) {
            host.replaceChildren(element);
          }
        }
        each(slots, (view, name) => {
          const slot = slotAbove(records, index, name);
          if (slot) {
            slot.innerHTML = html(view, context);
          }
        });
      });
      (slotAbove(records, records.length - 1, null) ?? mount).innerHTML = html(page.view, context);
    });
    markCurrentLinks();
  };

  return render;
}
