// shared markup for custom listbox dropdowns, rendered at build so controls like the sidebar
// framework picker paint in their final box on frame 0 and hydrate in place without layout shift.
import { logoFor } from '../scripts/framework-logos.js';
import { FRAMEWORKS } from './frameworks.js';

const CHEVRON =
  '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
const CHEVRONS =
  '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 9 4-4 4 4M8 15l4 4 4-4"/></svg>';
const CHECK =
  '<svg class="dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

export function dropdownInnerHtml({ id, options, label, size = 'md', ssr = false }) {
  const icon = (o) => (o.icon ? `<span class="dd-icon" aria-hidden="true">${o.icon}</span>` : '');
  const lgFace = (o) =>
    `${icon(o)}<span class="dd-text"><span class="dd-name">${o.label}</span>${
      o.hint ? `<span class="dd-sub">${o.hint}</span>` : ''
    }</span>`;
  // when server-rendered, faces stay unhidden so :root[data-framework] css reveals the active face
  // before scripts run; client-created dropdowns hide faces until paint() picks one
  const hiddenAttr = ssr ? '' : ' hidden';
  return `<button type="button" class="dd-button" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}">
      <span class="visually-hidden">${label}: </span>
      <span class="swap dd-current">${
    options.map((o) =>
      `<span class="dd-face" data-v="${o.value}"${hiddenAttr}>${
        size === 'lg' ? lgFace(o) : `${icon(o)}${o.label}`
      }</span>`
    ).join('')
  }</span>
      ${size === 'lg' ? CHEVRONS : CHEVRON}
    </button>
    <ul class="dd-menu" id="${id}" role="listbox" aria-label="${label}" tabindex="-1" hidden>${
    options.map((o, i) =>
      `<li role="option" id="${id}-${i}" data-v="${o.value}" aria-selected="false">${
        size === 'lg'
          ? `${lgFace(o)}${CHECK}`
          : `${CHECK}${icon(o)}<span class="dd-label">${o.label}</span>${
            o.hint ? `<span class="dd-hint">${o.hint}</span>` : ''
          }`
      }</li>`
    ).join('')
  }</ul>`;
}

export const frameworkOptions = (size = 'md') =>
  FRAMEWORKS.map((f) => ({
    value: f.id,
    label: f.label,
    hint: f.pkg ?? 'nav-router',
    icon: size === 'lg' ? logoFor(f.id) : null,
  }));

export function frameworkPickerHtml({ id, label, size = 'md', className = '' }) {
  const cls = [className, 'dropdown', size === 'lg' ? 'dd-lg' : ''].filter(Boolean).join(' ');
  const attr = size === 'lg' ? 'data-framework-picker="lg"' : 'data-framework-picker';
  return `<div class="${cls}" ${attr}>${
    dropdownInnerHtml({ id, options: frameworkOptions(size), label, size, ssr: true })
  }</div>`;
}

export function installCmdsHtml() {
  return FRAMEWORKS.map((f) => `<code data-shell data-fw="${f.id}">npm i nav-router${f.pkg ? ` ${f.pkg}` : ''}</code>`)
    .join('');
}
