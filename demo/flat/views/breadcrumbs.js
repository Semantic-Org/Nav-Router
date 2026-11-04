import { escapeHTML } from '@semantic-ui/utils';

export function Breadcrumbs({ page }) {
  const titles = page.titles ?? [];
  if (!titles.length) {
    return '';
  }
  return `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      ${
    titles.map((title, index) => `
        <span class="crumb ${index === titles.length - 1 ? 'crumb-current' : ''}">${escapeHTML(title)}</span>
      `).join('<span class="crumb-sep">/</span>')
  }
    </nav>
  `;
}

export default Breadcrumbs;
