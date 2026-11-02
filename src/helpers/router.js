// the page's router without holding it: every verb and read. start() registers the instance here,
// setRouter() does the same by hand for a second router or a server request, and window.router
// is the fallback for a page that only attached the global. a read a template imports is
// implemented here, so only the pages that use it carry it; the instance keeps the methods the
// flow itself calls

let current = null;

export const setRouter = (instance) => {
  current = instance;
};

export const router = () => current ?? globalThis.router;

// reads
export const href = (...args) => router().href(...args);
export const urlFor = (...args) => router().href(...args);
export const url = (...args) => router().href(...args);
export const match = (...args) => router().match(...args);
export const sitemap = (...args) => router().sitemap(...args);

// verbs
export const navigate = (...args) => router().navigate(...args);
export const replace = (target, args = {}, options = {}) => router().navigate(target, args, { ...options, history: 'replace' });
export const reload = (...args) => router().reload(...args);
export const back = (...args) => router().back(...args);
export const forward = (...args) => router().forward(...args);
export const traverseTo = (...args) => router().traverseTo(...args);
export const preload = (...args) => router().preload(...args);
export const confirmLeave = (...args) => router().confirmLeave(...args);
