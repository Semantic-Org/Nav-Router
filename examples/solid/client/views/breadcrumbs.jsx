// the page is the router's own cell under the scaffold, so a slot the root declares stays current
export const Breadcrumbs = (props) => (
  <nav class='crumbs' aria-label='Breadcrumb'>{(props.page.titles ?? []).join(' / ')}</nav>
);
