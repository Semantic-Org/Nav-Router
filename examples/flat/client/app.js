import { escapeHTML } from '@semantic-ui/utils';
import 'nav-router/plugins/preload-intent';
import { update } from 'nav-router';

import { app } from './routes.js';
import { Breadcrumbs } from './views/breadcrumbs.js';

const demoUsers = {
  none: null,
  member: { id: 'bob', name: 'Bob Chen', role: 'member' },
  admin: { id: 'alice', name: 'Alice Rivera', role: 'admin' },
};

let lastRenderedState = null;

// the header's chrome depends on the page as a whole, so the app renders it: the breadcrumb trail
// from the page's titles, and aria-current on the link to this page and on a link to a section it
// sits under, which keeps a layout's navigation right without rendering the layout again
function renderChrome(page) {
  const crumbs = document.querySelector('#breadcrumbs');
  if (crumbs) {
    crumbs.innerHTML = Breadcrumbs({ page });
  }
  const here = new URL(location.href);
  document.querySelectorAll('#app-mount a[href]').forEach((link) => {
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
}

function syncSidebarScrollReadout() {
  const sidebarEl = document.querySelector('#sidebar-scroll');
  const readoutEl = document.querySelector('#sidebar-scroll-readout');
  if (sidebarEl && readoutEl) {
    readoutEl.textContent = `scrollTop: ${Math.round(sidebarEl.scrollTop)}px`;
  }
}

// scroll does not bubble, so the readout listens once in the capture phase for the sidebar's own
document.addEventListener('scroll', (event) => {
  if (event.target?.id === 'sidebar-scroll') {
    syncSidebarScrollReadout();
  }
}, true);

function renderInspector() {
  const inspectorEl = document.querySelector('#router-inspector');
  if (!inspectorEl) {
    return;
  }

  const current = app.current;
  const page = app.page;
  const route = current?.route;
  const pending = app.pending;
  // the page's chain is the active set
  const activeRouteIds = (page?.chain ?? []).map((item) => item.id);
  const entries = globalThis.navigation?.entries?.() ?? app.entries ?? [];
  const currentEntryKey = globalThis.navigation?.currentEntry?.key ?? current?.key;

  const statusValue = pending?.loading
    ? 'loading'
    : (lastRenderedState?.status === 'loading' && pending ? 'loading' : (page?.status ?? 'idle'));

  const pendingLabel = pending
    ? `${pending.navigationType ?? 'nav'} → ${new URL(pending.url, window.location.origin).pathname}${
      pending.loading ? ' (loading)' : ' (holding)'
    }`
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
          <code id="insp-status" class="status-tag status-tag-${escapeHTML(statusValue)}">${
    escapeHTML(statusValue)
  }</code>
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
          <code id="insp-titles">${escapeHTML(JSON.stringify(page?.titles ?? []))}</code>
        </div>
        <div class="insp-cell">
          <span class="insp-label">user</span>
          <code id="insp-user">${escapeHTML(app.user ? `${app.user.id}:${app.user.role}` : 'null')}</code>
        </div>
      </div>

      <div class="inspector-entries-row">
        <span class="insp-label">navigation.entries() (${entries.length}) — click to <code>traverseTo(key)</code>:</span>
        <div class="entries-strip" id="insp-entries-list">
          ${
    entries.map((entry) => {
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
    }).join('')
  }
        </div>
      </div>
    </div>
  `;
}

app.onRender = (page) => {
  lastRenderedState = page;
  renderChrome(page);
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

    // the user is read by the guards and the data, so a change is a reload of the cascade
    if (button.dataset.thenNav) {
      app.navigate(button.dataset.thenNav);
    }
    else {
      app.reload();
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
