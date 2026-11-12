// the x-ray: one app shown in nav-router, and switched over, the same app on the Navigation API
// alone. the panel grows to the native code's height under one scan, so the difference in code is
// something the reader sees as well as counts.

import { plural } from './strings.js';

const lines = (pre) => (pre.dataset.raw ?? pre.textContent).trim().split('\n').length;

export function mountXray(root) {
  const body = root.querySelector('.xr-body');
  const panes = Object.fromEntries([...root.querySelectorAll('[data-xr-pane]')].map((p) => [p.dataset.xrPane, p]));
  const buttons = [...root.querySelectorAll('[data-xr]')];
  const count = root.querySelector('[data-xr-count]');
  const note = root.querySelector('[data-xr-note]');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'router';

  const label = (m) => plural('home.xray.lines', lines(panes[m]), { count: lines(panes[m]) });
  count.textContent = label(mode);

  const set = (next) => {
    if (next === mode) { return; }
    const from = body.offsetHeight;
    mode = next;
    Object.entries(panes).forEach(([m, pane]) => {
      pane.hidden = m !== mode;
    });
    buttons.forEach((b) => b.setAttribute('aria-checked', b.dataset.xr === mode));
    root.classList.toggle('is-native', mode === 'native');
    note.hidden = mode !== 'native';
    count.textContent = label(mode);
    if (still.matches) { return; }
    // the panel grows or shrinks to the code it now shows, under one pass of the scan
    const to = body.offsetHeight;
    body.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 520,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    });
    root.style.setProperty('--scan-to', `${Math.max(from, to)}px`);
    root.classList.remove('is-scanning');
    void root.offsetWidth;
    root.classList.add('is-scanning');
  };

  root.addEventListener('animationend', (e) => {
    if (e.animationName === 'xr-scan') { root.classList.remove('is-scanning'); }
  });
  buttons.forEach((b) => b.addEventListener('click', () => set(b.dataset.xr)));

  // the facts beside the code each point at one highlighted line: pointing at either lights the
  // pair and quiets the other highlights
  const marks = [...panes.router.querySelectorAll('.line-hl')];
  root.closest('.ribbon-split')?.querySelectorAll('[data-line]').forEach((fact) => {
    const mark = marks[Number(fact.dataset.line)];
    if (!mark) { return; }
    // where the code sits below the facts and nothing can be pointed at, a fact carries its own
    // line: the highlighted code, out of its indent, right under the claim it backs
    const line = document.createElement('code');
    line.className = 'fact-line';
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = mark.innerHTML.replace(/^\s+/, '').replace(/\n\s*/g, '\n').trimEnd();
    fact.append(line);
    const light = (on) => {
      fact.classList.toggle('is-lit', on);
      mark.classList.toggle('is-lit', on);
      panes.router.classList.toggle('has-lit', on);
    };
    for (const el of [fact, mark]) {
      el.addEventListener('pointerenter', () => light(true));
      el.addEventListener('pointerleave', () => light(false));
    }
  });
  root.querySelector('.xr-switch').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) { return; }
    e.preventDefault();
    const other = buttons.find((b) => b.dataset.xr !== mode);
    other.focus();
    set(other.dataset.xr);
  });
}
