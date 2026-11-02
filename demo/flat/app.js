import { each, escapeHTML, isFunction } from '@semantic-ui/utils';
import { Router, update } from 'nav-router';
import preloadIntent from 'nav-router/plugins/preload-intent';

import { app } from './routes.js';

Router.extend(preloadIntent);

const demoUsers = {
  none: null,
  member: { id: 'bob', name: 'Bob Chen', role: 'member' },
  admin: { id: 'alice', name: 'Alice Rivera', role: 'admin' },
};

let lastRenderedState = null;

function syncSidebarScrollReadout() {
  const sidebarEl = document.querySelector('#sidebar-scroll');
  const readoutEl = document.querySelector('#sidebar-scroll-readout');
  if (sidebarEl && readoutEl) {
    readoutEl.textContent = `scrollTop: ${Math.round(sidebarEl.scrollTop)}px`;
  }
}

function renderFallbackError(state) {
  const message = state.error?.message ?? String(state.error ?? 'Navigation failed');
  return `
    <div class="status-page status-error" data-status-view="ErrorFallback">
      <div class="status-code-pill status-403">status: 'error'</div>
      <h2>Navigation Error</h2>
      <p><code>${escapeHTML(message)}</code></p>
      <div class="card-links">
        <a href="/" class="btn btn-primary">Return Home</a>
      </div>
    </div>
  `;
}

function renderApp(state = app.page) {
  if (!state) {
    return;
  }
  lastRenderedState = state;

  const mountEl = document.querySelector('#app-mount');
  if (!mountEl) {
    return;
  }

  // innerHTML replacement recreates the sidebar and filter input when the section stays mounted
  const prevSidebar = document.querySelector('#sidebar-scroll');
  const prevScrollTop = prevSidebar ? prevSidebar.scrollTop : null;
  const prevScrollLeft = prevSidebar ? prevSidebar.scrollLeft : null;

  const activeEl = document.activeElement;
  const preservedFocus = activeEl?.dataset?.preserveFocus === 'true' && activeEl.id
    ? {
      id: activeEl.id,
      value: activeEl.value,
      selectionStart: activeEl.selectionStart,
      selectionEnd: activeEl.selectionEnd,
    }
    : null;

  const currentRoutes = state.currentRoutes ?? state.route?.ancestors ?? [];
  const layouts = state.layouts?.length
    ? state.layouts
    : currentRoutes.map((route) => route.layout).filter(Boolean);

  const slots = state.slots && Object.keys(state.slots).length
    ? state.slots
    : Object.assign({}, ...currentRoutes.map((route) => route.slots).filter(Boolean));

  const baseContext = {
    state,
    route: state.route,
    params: state.params ?? {},
    query: state.query ?? {},
    data: state.data ?? {},
    status: state.status ?? 'ok',
    router: app,
  };

  const renderedSlots = {};
  each(slots, (slotView, slotName) => {
    renderedSlots[slotName] = isFunction(slotView)
      ? slotView({ ...baseContext, slots: renderedSlots })
      : String(slotView ?? '');
  });

  let outlet;
  if (isFunction(state.view)) {
    outlet = state.view({ ...baseContext, slots: renderedSlots });
  }
  else if (state.status === 'error' && !state.view) {
    outlet = renderFallbackError(state);
  }
  else {
    outlet = String(state.view ?? '');
  }

  each([...layouts].reverse(), (layoutFn) => {
    if (isFunction(layoutFn)) {
      outlet = layoutFn({
        ...baseContext,
        slots: renderedSlots,
        outlet,
      });
    }
  });

  mountEl.innerHTML = outlet;

  const nextSidebar = document.querySelector('#sidebar-scroll');
  if (nextSidebar) {
    if (prevScrollTop !== null) {
      nextSidebar.scrollTop = prevScrollTop;
      nextSidebar.scrollLeft = prevScrollLeft ?? 0;
    }
    nextSidebar.addEventListener('scroll', syncSidebarScrollReadout, { passive: true });
    syncSidebarScrollReadout();
  }

  if (preservedFocus) {
    const nextInput = document.getElementById(preservedFocus.id);
    if (nextInput) {
      nextInput.value = preservedFocus.value;
      nextInput.focus();
      if (typeof preservedFocus.selectionStart === 'number') {
        nextInput.setSelectionRange(preservedFocus.selectionStart, preservedFocus.selectionEnd);
      }
    }
  }
}

function renderInspector() {
  const inspectorEl = document.querySelector('#router-inspector');
  if (!inspectorEl) {
    return;
  }

  const current = app.current;
  const route = app.currentRoute ?? current?.route;
  const pending = app.pending;
  const activeRouteIds = [...app.activeRoutes.keys()];
  const entries = globalThis.navigation?.entries?.() ?? app.entries ?? [];
  const currentEntryKey = globalThis.navigation?.currentEntry?.key ?? current?.key;

  const statusValue = pending?.loading
    ? 'loading'
    : (lastRenderedState?.status === 'loading' && pending ? 'loading' : (current?.status ?? 'idle'));

  const pendingLabel = pending
    ? `${pending.navigationType ?? 'nav'} → ${new URL(pending.url, window.location.origin).pathname}${pending.loading ? ' (loading)' : ' (holding)'}`
    : 'null';

  inspectorEl.innerHTML = `
    <div class="inspector-shell">
      <div class="inspector-top-row">
        <div class="inspector-brand">
          <span class="inspector-dot ${pending ? 'is-pending' : 'is-ready'}"></span>
          <strong>Router Inspector</strong>
          <span class="route-mode-pill">flat pattern</span>
        </div>

        <div class="inspector-nav-controls">
          <button
            type="button"
            class="insp-btn"
            data-router-action="back"
            id="btn-router-back"
            title="app.back()"
          >
            ← Back <code id="insp-can-go-back">${String(app.canGoBack)}</code>
          </button>
          <button
            type="button"
            class="insp-btn"
            data-router-action="forward"
            id="btn-router-forward"
            title="app.forward()"
          >
            Forward <code id="insp-can-go-forward">${String(app.canGoForward)}</code> →
          </button>
          <button
            type="button"
            class="insp-btn"
            data-router-action="reload"
            id="btn-router-reload"
            title="app.reload()"
          >
            ↻ Reload
          </button>
        </div>
      </div>

      <div class="inspector-grid">
        <div class="insp-cell">
          <span class="insp-label">currentRoute</span>
          <code id="insp-current-route">${escapeHTML(route ? `${route.id} (${route.path})` : 'null')}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">activeRoutes</span>
          <code id="insp-active-routes">[${escapeHTML(activeRouteIds.join(', '))}]</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">status</span>
          <code id="insp-status" class="status-tag status-tag-${escapeHTML(statusValue)}">${escapeHTML(statusValue)}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">pending</span>
          <code id="insp-pending">${escapeHTML(pendingLabel)}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">params</span>
          <code id="insp-params">${escapeHTML(JSON.stringify(current?.params ?? {}))}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">query</span>
          <code id="insp-query">${escapeHTML(JSON.stringify(current?.query ?? {}))}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">titles</span>
          <code id="insp-titles">${escapeHTML(JSON.stringify(current?.titles ?? []))}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">user</span>
          <code id="insp-user">${escapeHTML(app.user ? `${app.user.id}:${app.user.role}` : 'null')}</code>
        </div>
      </div>

      <div class="inspector-entries-row">
        <span class="insp-label">navigation.entries() (${entries.length}) — click to <code>traverseTo(key)</code>:</span>
        <div class="entries-strip" id="insp-entries-list">
          ${entries.map((entry) => {
            const parsedUrl = entry.url ? new URL(entry.url, window.location.origin) : null;
            const labelPath = parsedUrl ? `${parsedUrl.pathname}${parsedUrl.search}` : '(unrouted)';
            const isCurrent = entry.key === currentEntryKey;
            const isCached = Boolean(entry.key && app.entryCache.has(entry.key));
            const savedScroll = entry.getState?.()?.scroll?.['#sidebar-scroll']?.top;
            return `
              <button
                type="button"
                class="entry-chip ${isCurrent ? 'is-current' : ''}"
                data-traverse-key="${escapeHTML(entry.key)}"
                data-cached="${String(isCached)}"
                title="index: ${entry.index} | key: ${entry.key} | id: ${entry.id} | cached: ${isCached}"
              >
                <span class="entry-idx">#${entry.index}</span>
                <span class="entry-path">${escapeHTML(labelPath)}</span>
                <span class="entry-key">${escapeHTML(String(entry.key ?? '').slice(0, 6))}</span>
                ${isCached ? '<span class="entry-cached" title="Cached in router.entryCache">●</span>' : ''}
                ${savedScroll !== undefined ? `<span class="entry-scroll">⇅${Math.round(savedScroll)}px</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

app.onRender = (state) => {
  renderApp(state);
  renderInspector();
  syncSidebarScrollReadout();
};

app.onChange = () => {
  renderInspector();
  syncSidebarScrollReadout();
};

document.addEventListener('click', (event) => {
  const button = event.target?.closest?.('button');
  if (!button) {
    return;
  }

  if (button.dataset.setUser !== undefined) {
    const roleKey = button.dataset.setUser;
    app.user = demoUsers[roleKey] ? { ...demoUsers[roleKey] } : null;

    if (button.dataset.thenNav) {
      app.navigate(button.dataset.thenNav);
    }
    else if (button.dataset.thenReload) {
      app.reload();
    }
    else {
      renderApp(app.page);
      renderInspector();
    }
    return;
  }

  if (button.dataset.routerAction) {
    const action = button.dataset.routerAction;
    if (action === 'back') {
      app.back();
    }
    else if (action === 'forward') {
      app.forward();
    }
    else if (action === 'reload') {
      app.reload();
    }
    return;
  }

  if (button.dataset.traverseKey) {
    app.traverseTo(button.dataset.traverseKey);
    return;
  }

  if (button.dataset.scrollSidebar) {
    const sidebarEl = document.querySelector('#sidebar-scroll');
    if (sidebarEl) {
      sidebarEl.scrollTop = Number(button.dataset.scrollSidebar);
      syncSidebarScrollReadout();
    }
    return;
  }

  if (button.dataset.toggleCompact) {
    const currentCompact = Boolean(app.current?.query?.compact);
    update({ compact: currentCompact ? undefined : true });
  }
});

window.app = app;
window.router = app;

await app.start();
renderInspector();
