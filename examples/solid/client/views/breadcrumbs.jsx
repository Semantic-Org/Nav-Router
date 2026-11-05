import { page } from '../store.js';

export const Breadcrumbs = () => <nav class='crumbs' aria-label='Breadcrumb'>{(page()?.titles ?? []).join(' / ')}</nav>;
