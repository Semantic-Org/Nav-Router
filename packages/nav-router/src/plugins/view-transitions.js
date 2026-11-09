import { Router } from '../router.js';

// crosses to the page inside a view transition: settle and render are the one moment it snapshots
// around, so what leaves animates out and what appears animates in. the handler settles on the
// promise the option names: 'finished' holds the platform's focus reset and scroll through the
// animation, 'updateCallbackDone' runs them as soon as the new dom is in
Router.defaults.viewTransitionSettle ??= 'finished';

const proto = Router.prototype;
const { applyCascade } = proto;

proto.applyCascade = async function(matched, resolved, event = null) {
  // the first paint has nothing to cross from, and a swipe the browser animated is not animated twice
  if (!globalThis.document?.startViewTransition || !event || event.initial || event.hasUAVisualTransition) {
    return applyCascade.call(this, matched, resolved, event);
  }
  const transition = globalThis.document.startViewTransition(() => applyCascade.call(this, matched, resolved, event));
  event.signal.addEventListener('abort', () => transition.skipTransition(), { once: true });
  await transition[this.config.viewTransitionSettle];
};
