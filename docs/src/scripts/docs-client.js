// what the docs do in the browser once the page is built: the toc follows the reader, the drawer
// opens on small screens, copy page hands over the markdown source, the import line is highlighted.

import { highlight } from './site.js';

// the toc marks the last heading scrolled past the top third, so a long section stays lit while read
function scrollspy() {
  const links = [...document.querySelectorAll('.toc-list a')];
  if (!links.length) { return; }
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  const update = () => {
    const line = innerHeight * 0.3;
    let current = 0;
    heads.forEach((h, i) => {
      if (h.getBoundingClientRect().top <= line) { current = i; }
    });
    links.forEach((a, i) => a.toggleAttribute('aria-current', i === current));
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

function drawer() {
  const btn = document.querySelector('.nav-toggle');
  const side = document.querySelector('.docs-sidebar');
  const scrim = document.querySelector('.drawer-scrim');
  if (!btn || !side) { return; }
  const set = (open) => {
    btn.setAttribute('aria-expanded', open);
    side.classList.toggle('is-open', open);
    document.body.classList.toggle('drawer-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  scrim?.addEventListener('click', () => set(false));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && side.classList.contains('is-open')) { set(false); }
  });
}

// the page's own markdown, for an issue, a pull request or an assistant
function copyPage() {
  const source = document.getElementById('page-source');
  document.querySelectorAll('[data-copy-page]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const text = source ? JSON.parse(source.textContent) : document.querySelector('.doc').innerText;
      try {
        await navigator.clipboard.writeText(text);
      }
      catch {}
      const label = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => {
        btn.textContent = label;
      }, 1400);
    })
  );
}

export function mountDocs() {
  document.querySelectorAll('.import-chip code').forEach((c) => {
    c.dataset.raw = c.textContent;
    c.innerHTML = highlight(c.textContent);
  });
  scrollspy();
  drawer();
  copyPage();
}
