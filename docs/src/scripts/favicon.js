// the favicon carries a pulse along its line, as the slots graphic's wires do: from the solid node,
// up the curve, into the ring, which lights as it arrives, then a rest. frames are drawn once from
// the mark's own geometry (public/favicon.svg, a 24 unit box) and cached as png, so a tick only
// swaps the icon's href. a timer at 30fps, which a busy tab may not keep (a skipped frame is fine); the
// browser slows it in a background tab on its own. the pulse eases and trails a fading tail, so the
// step between frames reads as motion rather than a jump

const SIZE = 64;
const UNIT = SIZE / 24;
const FPS = 30;
const TRAVEL = 27; // frames the pulse takes along the line
const ARRIVE = 9; // frames the ring stays lit
const REST = 45; // frames of stillness before the next pulse
const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;

// the mark's line, as in favicon.svg: up from the node, a quarter turn, across to the ring
const line = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(6.5, 17.5);
  ctx.lineTo(6.5, 12);
  ctx.arc(10.5, 12, 4, Math.PI, Math.PI * 1.5);
  ctx.lineTo(17.5, 8);
};
const LENGTH = 5.5 + Math.PI * 2 + 7; // the line's length in units: the run, the quarter turn, the run

function frame(pulse, ring) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.scale(UNIT, UNIT);
  ctx.lineCap = 'round';

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.roundRect(0, 0, 24, 24, 6);
  ctx.fill();

  ctx.strokeStyle = '#6fb3ff';
  ctx.lineWidth = 2;
  line(ctx);
  ctx.stroke();

  // the pulse: a short bright length of the same line, glowing, at its place along it, with a tail
  // of fainter lengths behind it that bridges the distance it moved since the last frame
  if (pulse !== null) {
    const length = 3;
    const head = ease(pulse) * (LENGTH + length) - length;
    ctx.save();
    ctx.shadowColor = '#6fb3ff';
    ctx.shadowBlur = 3 * UNIT;
    [[0, 1], [1.6, 0.55], [3.2, 0.28], [4.8, 0.12]].forEach(([behind, alpha]) => {
      ctx.strokeStyle = `rgba(230, 242, 255, ${alpha})`;
      ctx.setLineDash([length, LENGTH * 2]);
      ctx.lineDashOffset = -(head - behind);
      line(ctx);
      ctx.stroke();
    });
    ctx.restore();
  }

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6.5, 17.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // the ring, lit while the pulse arrives
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.arc(17.5, 8, 2.2, 0, Math.PI * 2);
  if (ring > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(111, 179, 255, ${ring})`;
    ctx.shadowColor = '#6fb3ff';
    ctx.shadowBlur = 4 * UNIT * ring;
    ctx.fill();
    ctx.restore();
  }
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

export function animateFavicon() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
  const link = document.querySelector('link[rel="icon"]');
  if (!link || !document.createElement('canvas').getContext('2d')?.roundRect) { return; }

  // one cycle: travel, arrive, rest. resting frames are the still mark, drawn once
  const still = frame(null, 0);
  const frames = [
    ...Array.from({ length: TRAVEL }, (_, i) => frame((i + 1) / TRAVEL, 0)),
    ...Array.from({ length: ARRIVE }, (_, i) => frame(null, 1 - i / ARRIVE)),
    ...Array.from({ length: REST }, () => still),
  ];
  link.type = 'image/png';

  let i = 0;
  let shown = null;
  const tick = () => {
    const next = frames[i];
    if (next !== shown) {
      link.href = next;
      shown = next;
    }
    i = (i + 1) % frames.length;
    setTimeout(tick, 1000 / FPS);
  };
  tick();
}
