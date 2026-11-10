import { useRouter } from '@nav-router/preact';

// a slot the root declares is kept across navigations, so it reads the page from the router
export const Breadcrumbs = () => {
  const titles = useRouter((router) => router.page?.titles);
  return <nav class='crumbs' aria-label='Breadcrumb'>{(titles ?? []).toReversed().join(' / ')}</nav>;
};
