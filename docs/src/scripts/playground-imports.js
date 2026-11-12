// nav-router and its one dependency, served by the site until they are on a cdn
export const IMPORT_MAP = {
  imports: {
    'nav-router': '/libs/nav-router/index.js',
    ...Object.fromEntries(
      [
        'announcer',
        'chunk-reload',
        'confirm-leave',
        'head',
        'preload-intent',
        'sitemap',
        'timeline',
        'view-transitions',
      ]
        .map((name) => [`@nav-router/plugins/${name}`, `/libs/plugins/${name}.js`]),
    ),
    '@semantic-ui/utils': '/libs/utils/index.js',
  },
};
