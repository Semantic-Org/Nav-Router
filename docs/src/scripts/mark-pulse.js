// the wordmark's mark answers a navigation: once as each page loads, and again on hover, a pulse runs
// along its line into the ring, which lights as it arrives. the favicon's motion, drawn live in the
// svg so it stays crisp and follows the theme; never on a loop, since the topbar sits beside reading

const EASE = 'cubic-bezier(0.37, 0, 0.63, 1)';
const TRAVEL = 800;
// a bright head and a fading tail behind it, in units of the line's length (pathLength 100)
const LAYERS = [[0, 1], [7, 0.5], [14, 0.22]];
const NS = 'http://www.w3.org/2000/svg';

const players = new WeakMap();

// readies any copy of the mark and returns its play(); the same svg always gets the same player
export function markPulse(svg) {
  if (players.has(svg)) { return players.get(svg); }
  const noop = () => {};
  const line = svg?.querySelector('path');
  const ring = svg?.querySelectorAll('circle')[1];
  if (!line || !ring || matchMedia('(prefers-reduced-motion: reduce)').matches) { return noop; }
  // the pulse: copies of the line, above it and under the nodes, each showing one short length
  const layers = LAYERS.map(([behind, alpha]) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', line.getAttribute('d'));
    path.setAttribute('pathLength', '100');
    path.setAttribute('class', 'mark-pulse');
    return { path, behind, alpha };
  });
  [...layers].reverse().forEach(({ path }) => line.after(path));
  // the ring's light, behind its stroke
  const glow = document.createElementNS(NS, 'circle');
  ['cx', 'cy', 'r'].forEach((a) => glow.setAttribute(a, ring.getAttribute(a)));
  glow.setAttribute('class', 'mark-glow');
  ring.before(glow);

  let running = false;
  const play = () => {
    if (running) { return; }
    running = true;
    // the dash starts wholly before the line and ends wholly past it; it fades in and out at the ends
    const runs = layers.map(({ path, behind, alpha }) =>
      path.animate([
        { strokeDashoffset: 16 + behind, opacity: 0 },
        { opacity: alpha, offset: 0.08 },
        { opacity: alpha, offset: 0.9 },
        { strokeDashoffset: -100 + behind, opacity: 0 },
      ], { duration: TRAVEL, easing: EASE })
    );
    const lit = glow.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], {
      duration: 600,
      delay: TRAVEL * 0.8,
      easing: 'ease-out',
    });
    Promise.all([...runs, lit].map((a) => a.finished)).finally(() => {
      running = false;
    });
  };
  players.set(svg, play);
  return play;
}

// the wordmark: a pulse as each page loads, and again on hover
export function wireMarkPulse() {
  document.querySelectorAll('.wordmark svg').forEach((svg) => {
    const play = markPulse(svg);
    setTimeout(play, 350);
    svg.closest('.wordmark')?.addEventListener('pointerenter', play);
  });
}
