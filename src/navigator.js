import { IS_NAVIGATOR } from './helpers/identity.js';

export class Navigator {

  // brand navigator
  get [IS_NAVIGATOR]() { return true; }
  static [Symbol.hasInstance](value) { return !!value?.[IS_NAVIGATOR]; }

  constructor(router) {
    // store router reference, internal info identity symbol, and precommit support flag
  }

  /*******************************
             Lifecycle
  *******************************/

  attach() {
    // add single listeners for navigate, currententrychange, navigatesuccess, navigateerror, pageshow
    // detect pre-hydration traversal mismatch between activation.entry.key and currentEntry.key
  }

  detach() {
    // remove all window.navigation and window event listeners
  }

  /*******************************
           Platform Reads
  *******************************/

  get canGoBack() {
    // return true if navigation.canGoBack and previous entry is same-document
  }

  get canGoForward() {
    // return navigation.canGoForward
  }

  /*******************************
          Platform Writes
  *******************************/

  navigate(url, { state, info, history = 'auto', resetScroll = true, resetFocus = true } = {}) {
    // tag info with navigator identity and per-navigation resetScroll/resetFocus booleans
    // call navigation.navigate(url, { state, info, history }) and attach catch to committed/finished
  }

  reload({ state, info } = {}) {
    // tag info with navigator identity so onNavigate intercepts the reload
    // call navigation.reload({ state, info }) and catch promises
  }

  back(fallbackUrl) {
    // call navigation.back() if canGoBack, otherwise navigate(fallbackUrl, { history: 'replace' })
  }

  forward() {
    // call navigation.forward() if canGoForward and catch promises
  }

  traverseTo(key, { info } = {}) {
    // call navigation.traverseTo(key, { info }) and catch promises
  }

  saveScroll() {
    // read scroll offsets for router.restoreScroll selectors
    // merge into currentEntry.getState() via navigation.updateCurrentEntry
  }

  /*******************************
            Interception
  *******************************/

  onNavigate(event) {
    // return if !shouldIntercept(event) or if same-route hashChange
    // resolve router.match(event.destination.url) and start router.runCascade(matched, event.signal)
    // disable resetScroll/resetFocus when only query changes on same route, then call event.intercept
  }

  shouldIntercept(event) {
    // reject if !canIntercept, downloadRequest, cross-origin, or unflagged reload / third-party info
    // return true if destination matches router or carries navigator's noop-sync info tag
  }

  async onPrecommit(controller, event, matched, work) {
    // mark precommit supported; if cascade resolved to a redirect, call controller.redirect(targetUrl)
    // race work.ready against router.holdCommit timer so fast loads settle before URL commits
  }

  async onHandle(event, matched, work, precommitRan) {
    // if !precommitRan (Safari), handle redirect/signInRoute check now via replace or back()
    // if work still pending after holdCommit, schedule views.loading after loadingDelay and enforce loadingMin
    // await work completion (or views.notFound / views.forbidden swap), render view + title, and restoreScroll
  }

  /*******************************
             Moments
  *******************************/

  onEntryChange(event) {
    // sole writer of current: match navigation.currentEntry.url and call router.commitRoute(matched)
    // project navigation.entries() snapshot and bind onDispose to new entries
  }

  onSuccess(event) {
    // clear pending transition state and record lastSuccessfulEntry
    // restore custom container scroll from entry state if navigationType === 'traverse'
  }

  onError(event) {
    // clear pending state and ignore if event.error.name === 'AbortError'
    // set router error state and schedule replace navigation to error view on next task
  }

  onPageShow(event) {
    // if event.persisted (bfcache restore), re-sync activation, currentEntry, and entries()
  }

  onDispose(entry) {
    // evict router's cached cascade data and scroll state for entry.key
  }
}

export const createNavigator = (router) => new Navigator(router);
