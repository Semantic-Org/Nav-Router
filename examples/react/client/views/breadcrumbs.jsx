import { useRouter } from '@nav-router/react';

// a slot the root declares is rendered again only when the root is, so the trail reads the page
// from the router, which tells it at every navigation
export const Breadcrumbs = () => {
  const page = useRouter((router) => router.page);
  return <nav className='crumbs' aria-label='Breadcrumb'>{(page?.titles ?? []).toReversed().join(' / ')}</nav>;
};
