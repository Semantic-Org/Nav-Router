import { isDevelopment, markTimeline, measureTimeline } from '@semantic-ui/utils';

// draws navigation and cascade spans on the devtools performance panel through @semantic-ui/utils.
// every entry point is throw-safe, and tooltip prose folds at the callsite in production builds
export default ({ trackGroup = 'router' } = {}, Router) => {
  const proto = Router.prototype;
  const { start, intercepted, settled, failed, runGuards, runData, renderView, updateData, stop } = proto;

  const routeLabel = (target) => target?.route?.name || target?.pathname || target?.url || 'unknown';

  const detail = (track, color, properties, tooltipText = 0) => ({
    trackGroup,
    track,
    color,
    ...(properties?.length ? { properties } : {}),
    tooltipText,
  });

  proto.closeNavigationSpan = function (status, color, tooltipText = 0) {
    const span = this.navigationSpan;
    if (!span) {
      return;
    }
    this.navigationSpan = null;
    span.close({
      detail: () => detail(
        'navigation',
        color,
        [['route', span.label], ['status', status]],
        tooltipText,
      ),
    });
  };

  proto.start = async function () {
    const close = measureTimeline('router:start');
    try {
      const result = await start.call(this);
      const label = routeLabel(this.page);
      close({
        detail: () => detail(
          'navigation',
          'primary',
          [['route', label], ['status', this.page?.status ?? 'ok']],
          isDevelopment ? `Initial load (${label})` : 0,
        ),
      });
      return result;
    }
    catch (error) {
      close({ detail: () => detail('navigation', 'error') });
      throw error;
    }
  };

  proto.intercepted = function (matched, event) {
    const label = routeLabel(matched);
    const type = event?.navigationType ?? 'push';
    markTimeline('router:intercepted', {
      detail: () => detail(
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

  proto.settled = function (event) {
    if (this.navigationSpan) {
      const status = this.page?.status ?? 'ok';
      this.closeNavigationSpan(status, 'primary', isDevelopment ? `Settled ${this.navigationSpan.label}` : 0);
    }
    return settled.call(this, event);
  };

  proto.failed = function (error, event) {
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

  proto.runGuards = async function (matched, navigation) {
    const label = routeLabel(matched);
    const close = measureTimeline('router:guards');
    try {
      const outcome = await runGuards.call(this, matched, navigation);
      close({
        detail: () => detail(
          'cascade',
          outcome ? 'secondary' : 'primary',
          [['route', label], ['outcome', outcome?.status ?? 'allow']],
          isDevelopment ? `Guards (${label})` : 0,
        ),
      });
      return outcome;
    }
    catch (error) {
      close({ detail: () => detail('cascade', 'error', [['route', label]]) });
      throw error;
    }
  };

  proto.runData = async function (matched, navigation) {
    const label = routeLabel(matched);
    const close = measureTimeline('router:data');
    try {
      const outcome = await runData.call(this, matched, navigation);
      close({
        detail: () => detail(
          'cascade',
          outcome?.status === 'ok' ? 'primary' : 'secondary',
          [['route', label], ['status', outcome?.status ?? 'ok']],
          isDevelopment ? `Data (${label})` : 0,
        ),
      });
      return outcome;
    }
    catch (error) {
      close({ detail: () => detail('cascade', 'error', [['route', label]]) });
      throw error;
    }
  };

  proto.renderView = async function (page, event = null) {
    const status = page?.status ?? 'ok';
    const close = measureTimeline('router:render');
    try {
      return await renderView.call(this, page, event);
    }
    finally {
      close({
        detail: () => detail(
          'cascade',
          'primary',
          [['status', status]],
          isDevelopment ? `Render (${status})` : 0,
        ),
      });
    }
  };

  proto.updateData = async function (route, value) {
    const label = route?.name || route?.path || 'slice';
    const close = measureTimeline('router:recompute');
    try {
      return await updateData.call(this, route, value);
    }
    finally {
      close({
        detail: () => detail(
          'cascade',
          'tertiary',
          [['route', label]],
          isDevelopment ? `Recompute (${label})` : 0,
        ),
      });
    }
  };

  proto.stop = function () {
    if (this.navigationSpan) {
      this.closeNavigationSpan('aborted', 'tertiary', isDevelopment ? `Aborted ${this.navigationSpan.label}` : 0);
    }
    return stop.call(this);
  };
};
