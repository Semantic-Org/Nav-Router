// paints the page inside a view transition. the handler settles on the promise the option names:
// 'finished' holds the platform's focus reset and scroll through the animation, 'updateCallbackDone'
// runs them as soon as the new dom is in
export default ({ settle = 'finished' } = {}, Router) => {
  const proto = Router.prototype;
  const { renderView } = proto;

  proto.renderView = async function (page, event = null) {
    // the first paint has nothing to cross from, a swipe already animated, and a loading page is
    // a state of the page under way rather than a page to cross to
    if (!globalThis.document?.startViewTransition || !event || event.initial || event.hasUAVisualTransition || page.status === 'loading') {
      return renderView.call(this, page, event);
    }
    const transition = globalThis.document.startViewTransition(() => renderView.call(this, page, event));
    event.signal.addEventListener('abort', () => transition.skipTransition(), { once: true });
    await transition[settle];
  };
};
