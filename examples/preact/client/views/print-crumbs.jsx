// the print page's own trail, an override of a slot the root declares, across the team layout
export const PrintCrumbs = (props) => (
  <nav class='crumbs print-crumbs' aria-label='Breadcrumb'>Print view of {props.params.org}</nav>
);
