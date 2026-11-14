import { href } from 'nav-router';

const COLORS = {
  coral: { name: 'Coral', hex: '#ff7b72' },
  amber: { name: 'Amber', hex: '#f0b866' },
  sky: { name: 'Sky', hex: '#79c0ff' },
};

export const routes = {
  name: 'palette',
  index: {
    path: '/',
    view: () => `
      <h1>Palette</h1>
      <p>Pick a swatch to morph it into the detail header.</p>
      <div class="grid">
        ${
      Object.entries(COLORS).map(([id, c]) => `
          <a class="card" href="${href('swatch', { id })}"
             style="background:${c.hex}; view-transition-name:swatch-${id}">${c.name}</a>
        `).join('')
    }
      </div>`,
  },
  routes: {
    swatch: {
      path: '/colors/:id',
      view: ({ params }) => {
        const c = COLORS[params.id];
        return `
          <div class="banner" style="background:${c.hex}; view-transition-name:swatch-${params.id}">
            <h1>${c.name}</h1>
          </div>
          <p>Hex <code>${c.hex}</code> · <a href="${href('palette')}">← All swatches</a></p>`;
      },
    },
  },
};
