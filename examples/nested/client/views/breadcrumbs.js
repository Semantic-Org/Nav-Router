import { escapeHTML } from '@semantic-ui/utils';

export function Breadcrumbs({ page }) {
  // the page's titles are nearest first, a trail reads root first
  const titles = (page.titles ?? []).toReversed();
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
