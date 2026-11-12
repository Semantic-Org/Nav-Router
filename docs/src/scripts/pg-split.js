// the divider between a playground's editor and its preview. side by side it sets the editor's
// share of the width; stacked (narrow windows) it sets the editor's height. drag it, or focus it
// and use the arrow keys; double-click or Enter puts it back. the reader's split is remembered for
// every example, as a share of the width (side by side) or a height in px (stacked).

import { ui } from './strings.js';

const KEY = 'nr:pg-split';
const STACKED = matchMedia('(max-width: 900px)');
const SIDE = { min: 280, fallback: 7 / 12 }; // each side keeps at least this many px
const STACK = { min: 160, max: 800, fallback: 340 };
const STEP = 16;

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  }
  catch {
    return {};
  }
};
const save = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  }
  catch {}
};
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);

export function mountSplit(root) {
  const handle = root.querySelector('[data-pg-split]');
  const editor = root.querySelector('.pg-editor-pane');
  if (!handle || !editor) { return; }
  const saved = load();
  let share = saved.share ?? SIDE.fallback; // side by side: editor's share of the width
  let height = saved.height ?? STACK.fallback; // stacked: editor's height

  // side by side, the split is applied in whole px from the share, so it follows the window
  function apply() {
    if (STACKED.matches) {
      root.style.gridTemplateColumns = '';
      height = Math.round(clamp(height, STACK.min, STACK.max));
      root.style.setProperty('--pg-editor-h', `${height}px`);
      root.style.setProperty('--pg-at', `${height}px`);
      handle.setAttribute('aria-orientation', 'horizontal');
      handle.setAttribute('aria-valuemin', STACK.min);
      handle.setAttribute('aria-valuemax', STACK.max);
      handle.setAttribute('aria-valuenow', height);
      handle.setAttribute('aria-valuetext', ui('playground.split.tall', { height }));
      return;
    }
    const width = root.clientWidth;
    if (!width) { return; }
    const max = Math.max(SIDE.min, width - SIDE.min);
    const left = Math.round(clamp(share * width, SIDE.min, max));
    root.style.gridTemplateColumns = `${left}px minmax(0, 1fr)`;
    root.style.setProperty('--pg-at', `${left}px`);
    const pct = Math.round((left / width) * 100);
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', Math.round((SIDE.min / width) * 100));
    handle.setAttribute('aria-valuemax', Math.round((max / width) * 100));
    handle.setAttribute('aria-valuenow', pct);
    handle.setAttribute('aria-valuetext', ui('playground.split.wide', { percent: pct }));
  }

  function setFrom(px) {
    if (STACKED.matches) { height = px; }
    else { share = clamp(px, SIDE.min, root.clientWidth - SIDE.min) / root.clientWidth; }
    apply();
  }
  const current = () => (STACKED.matches ? height : share * root.clientWidth);
  const commit = () => save({ ...load(), share, height });
  const reset = () => {
    if (STACKED.matches) { height = STACK.fallback; }
    else { share = SIDE.fallback; }
    apply();
    commit();
  };

  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) { return; }
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    // the preview is a document of its own: without this it swallows the drag as it passes over
    root.classList.add('is-resizing');
    const box = root.getBoundingClientRect();
    const move = (ev) => setFrom(STACKED.matches ? ev.clientY - box.top : ev.clientX - box.left);
    const end = () => {
      root.classList.remove('is-resizing');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      commit();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
  handle.addEventListener('dblclick', reset);
  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? STEP * 4 : STEP;
    const less = STACKED.matches ? 'ArrowUp' : 'ArrowLeft';
    const more = STACKED.matches ? 'ArrowDown' : 'ArrowRight';
    if (e.key === less) { setFrom(current() - step); }
    else if (e.key === more) { setFrom(current() + step); }
    else if (e.key === 'Home') { setFrom(0); }
    else if (e.key === 'End') { setFrom(Infinity); }
    else if (e.key === 'Enter') {
      reset();
      e.preventDefault();
      return;
    }
    else { return; }
    e.preventDefault();
    commit();
  });

  new ResizeObserver(apply).observe(root);
  STACKED.addEventListener('change', apply);
  apply();
}
