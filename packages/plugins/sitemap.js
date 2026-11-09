import { each, isString } from '@semantic-ui/utils';
import { Router } from 'nav-router';

// every route in the tree as a page a crawler or a generator can read. paths keep their patterns,
// so a generator expands the params it knows. adds router.sitemap()
Router.prototype.sitemap = function() {
  const pages = [];
  const walk = (route) => {
    pages.push({
      name: route.name ?? null,
      path: this.prependBase(route.path),
      type: route.isIndex ? 'index' : (route.isSection ? 'section' : 'route'),
      title: isString(route.title) ? route.title : null,
      permission: route.permission !== undefined,
      redirect: route.redirect ?? null,
    });
    each(route.children, walk);
  };
  walk(this.root);
  return pages;
};
