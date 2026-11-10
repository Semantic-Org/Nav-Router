// the print page's own trail, an override of a slot the root declares, across the team layout
export const PrintCrumbs = ({ params }) => (
  <nav className='crumbs print-crumbs' aria-label='Breadcrumb'>Print view of {params.org}</nav>
);
