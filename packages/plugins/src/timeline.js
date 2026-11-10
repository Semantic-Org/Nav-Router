import { isDevelopment, markTimeline, measureTimeline } from '@semantic-ui/utils';
import { BaseRouter } from 'nav-router';

// draws navigation and cascade spans on the devtools performance panel through @semantic-ui/utils.
// every entry point is throw-safe, and tooltip prose folds at the callsite in production builds
BaseRouter.defaults.timelineGroup ??= 'router';
const proto = BaseRouter.prototype;
const { start, intercepted, settled, failed, runGuards, runData, renderPage, updateData, stop } = proto;

const routeLabel = (target) => target?.route?.name || target?.pathname || target?.url || 'unknown';

const detail = (router, track, color, properties, tooltipText = 0) => ({
  trackGroup: router.config.timelineGroup,
  track,
  color,
  ...(properties?.length ? { properties } : {}),
  tooltipText,
});

proto.closeNavigationSpan = function(status, color, tooltipText = 0) {
  const span = this.navigationSpan;
  if (!span) {
    return;
  }
  this.navigationSpan = null;
  span.close({
    detail: () => detail(this, 'navigation', color, [['route', span.label], ['status', status]], tooltipText),
  });
};

proto.start = async function() {
  const close = measureTimeline('router:start');
  try {
    const result = await start.call(this);
    const label = routeLabel(this.page);
    close({
      detail: () =>
        detail(
          this,
          'navigation',
          'primary',
          [['route', label], ['status', this.page?.status ?? 'ok']],
          isDevelopment ? `Initial load (${label})` : 0,
        ),
    });
    return result;
  }
  catch (error) {
    close({ detail: () => detail(this, 'navigation', 'error') });
    throw error;
  }
};

proto.intercepted = function(matched, event) {
  const label = routeLabel(matched);
  const type = event?.navigationType ?? 'push';
  markTimeline('router:intercepted', {
    detail: () =>
      detail(
        this,
        'navigation',
        'primary',
        [['route', label], ['type', type]],
        isDevelopment ? `Intercepted ${label}` : 0,
      ),
  });
  if (this.navigationSpan) {
    this.closeNavigationSpan('aborted', 'tertiary', isDevelopment ? `Aborted ${this.navigationSpan.label}` : 0);
  }
  this.navigationSpan = {
    label,
    signal: event?.signal ?? null,
    close: measureTimeline(`router:navigate ${label}`),
  };
  return intercepted.call(this, matched, event);
};

proto.settled = function(event) {
  if (this.navigationSpan) {
    const status = this.page?.status ?? 'ok';
    this.closeNavigationSpan(status, 'primary', isDevelopment ? `Settled ${this.navigationSpan.label}` : 0);
  }
  return settled.call(this, event);
};

proto.failed = function(error, event) {
  const span = this.navigationSpan;
  if (span && (!event?.signal || !span.signal || span.signal === event.signal)) {
    const aborted = error?.name === 'AbortError';
    this.closeNavigationSpan(
      aborted ? 'aborted' : 'error',
      aborted ? 'tertiary' : 'error',
      isDevelopment ? (aborted ? `Aborted ${span.label}` : (error?.message || String(error))) : 0,
    );
  }
  return failed.call(this, error, event);
};

proto.runGuards = async function(matched, navigation) {
  const label = routeLabel(matched);
  const close = measureTimeline('router:guards');
  try {
    const outcome = await runGuards.call(this, matched, navigation);
    close({
      detail: () =>
        detail(this, 'cascade', outcome ? 'secondary' : 'primary', [['route', label], [
          'outcome',
          outcome?.status ?? 'allow',
        ]], isDevelopment ? `Guards (${label})` : 0),
    });
    return outcome;
  }
  catch (error) {
    close({ detail: () => detail(this, 'cascade', 'error', [['route', label]]) });
    throw error;
  }
};

proto.runData = async function(matched, navigation) {
  const label = routeLabel(matched);
  const close = measureTimeline('router:data');
  try {
    const outcome = await runData.call(this, matched, navigation);
    close({
      detail: () =>
        detail(this, 'cascade', outcome?.status === 'ok' ? 'primary' : 'secondary', [['route', label], [
          'status',
          outcome?.status ?? 'ok',
        ]], isDevelopment ? `Data (${label})` : 0),
    });
    return outcome;
  }
  catch (error) {
    close({ detail: () => detail(this, 'cascade', 'error', [['route', label]]) });
    throw error;
  }
};

proto.renderPage = async function(page, event = null) {
  const status = page?.status ?? 'ok';
  const close = measureTimeline('router:render');
  try {
    return await renderPage.call(this, page, event);
  }
  finally {
    close({
      detail: () => detail(this, 'cascade', 'primary', [['status', status]], isDevelopment ? `Render (${status})` : 0),
    });
  }
};

proto.updateData = async function(route, value) {
  const label = route?.name || route?.path || 'activeRoute';
  const close = measureTimeline('router:recompute');
  try {
    return await updateData.call(this, route, value);
  }
  finally {
    close({
      detail: () => detail(this, 'cascade', 'tertiary', [['route', label]], isDevelopment ? `Recompute (${label})` : 0),
    });
  }
};

proto.stop = function() {
  if (this.navigationSpan) {
    this.closeNavigationSpan('aborted', 'tertiary', isDevelopment ? `Aborted ${this.navigationSpan.label}` : 0);
  }
  return stop.call(this);
};
