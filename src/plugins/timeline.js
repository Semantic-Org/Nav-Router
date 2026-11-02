import { isDevelopment, markTimeline, measureTimeline } from '@semantic-ui/utils';

// draws navigation and cascade spans on the devtools performance panel through @semantic-ui/utils.
// every entry point is throw-safe, and tooltip prose folds at the callsite in production builds
export default ({ trackGroup = 'router' } = {}, Router) => {
  const proto = Router.prototype;
  const { start, intercepted, settled, failed, runGuards, runData, renderView, replaceSlice, stop } = proto;
  const active = new WeakMap();

  const routeLabel = (target) => target?.route?.name || target?.pathname || target?.url || 'unknown';

  const detail = (track, color, properties, tooltipText = 0) => ({
    trackGroup,
    track,
    color,
    ...(properties?.length ? { properties } : {}),
    tooltipText,
  });

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
    active.get(this)?.close();
    active.set(this, {
      label,
      close: measureTimeline(`router:navigate ${label}`),
    });
    return intercepted.call(this, matched, event);
  };

  proto.settled = function (event) {
    const entry = active.get(this);
    if (entry) {
      active.delete(this);
      const status = this.page?.status ?? 'ok';
      entry.close({
        detail: () => detail(
          'navigation',
          'primary',
          [['route', entry.label], ['status', status]],
          isDevelopment ? `Settled ${entry.label}` : 0,
        ),
      });
    }
    return settled.call(this, event);
  };

  proto.failed = function (error, event) {
    const entry = active.get(this);
    if (entry) {
      active.delete(this);
      const aborted = error?.name === 'AbortError';
      entry.close({
        detail: () => detail(
          'navigation',
          aborted ? 'tertiary' : 'error',
          [['route', entry.label], ['status', aborted ? 'aborted' : 'error']],
          isDevelopment ? (aborted ? `Aborted ${entry.label}` : (error?.message || String(error))) : 0,
        ),
      });
    }
    return failed.call(this, error, event);
  };

  proto.runGuards = async function (matched, work) {
    const label = routeLabel(matched);
    const close = measureTimeline('router:guards');
    try {
      const outcome = await runGuards.call(this, matched, work);
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

  proto.runData = async function (matched, work) {
    const label = routeLabel(matched);
    const close = measureTimeline('router:data');
    try {
      const outcome = await runData.call(this, matched, work);
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

  proto.replaceSlice = async function (route, value) {
    const label = route?.name || route?.path || 'slice';
    const close = measureTimeline('router:recompute');
    try {
      return await replaceSlice.call(this, route, value);
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
    active.delete(this);
    return stop.call(this);
  };
};
