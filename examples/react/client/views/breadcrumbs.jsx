// the page is among a view's props, so a slot the root declares renders again with every page
export const Breadcrumbs = ({ page }) => (
  <nav className='crumbs' aria-label='Breadcrumb'>{(page.titles ?? []).join(' / ')}</nav>
);
