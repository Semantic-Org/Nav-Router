// the page's router without holding it: every verb and read. start() registers the instance here,
// setRouter() does the same by hand for a second router or a server request, and window.router
// is the fallback for a page that only attached the global. a read a template imports is
// implemented here, so only the pages that use it carry it; the instance keeps the methods the
// flow itself calls

let current = null;

export const setRouter = (instance) => {
  current = instance;
};

export const getRouter = () => current ?? globalThis.router;

// reads
export const href = (...args) => getRouter().href(...args);
export const urlFor = (...args) => getRouter().href(...args);
export const url = (...args) => getRouter().href(...args);
export const match = (...args) => getRouter().match(...args);
export const sitemap = (...args) => getRouter().sitemap(...args);

// verbs
export const navigate = (...args) => getRouter().navigate(...args);
export const replace = (target, args = {}, options = {}) =>
  getRouter().navigate(target, args, { ...options, history: 'replace' });
export const reload = (...args) => getRouter().reload(...args);
export const back = (...args) => getRouter().back(...args);
export const forward = (...args) => getRouter().forward(...args);
export const traverseTo = (...args) => getRouter().traverseTo(...args);
export const preload = (...args) => getRouter().preload(...args);
export const confirmLeave = (...args) => getRouter().confirmLeave(...args);
