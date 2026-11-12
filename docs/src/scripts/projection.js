// the projection: a team app's routes, the page they build, and a wire from each piece a route
// declares to the slot it fills. it plays a loop of navigations by itself, only while on screen.
// every step is what the router's dom view does (src/view.js, Router#settleRoutes): kept routes are
// left alone, a region is replaced only when its piece changed, a deeper route takes a slot over
// and gives it back, and a slot nobody fills shows its own default

import { plural, ui } from './strings.js';

const av = (n) => `<i class="pj-av" style="--h: ${n}"></i>`;
const lines = (...widths) => widths.map((w) => `<span class="pj-line" style="width: ${w}%"></span>`).join('');

// what each piece puts on the page. the regions hold one piece each; page lives inside team's layout
const PIECES = {
  'home:view': {
    region: 'main',
    html: `<p class="pj-h">${ui('home.app.greeting')}</p><p class="pj-sub">${ui('home.app.summary')}</p>
      <div class="pj-cards"><div><b>${ui('home.app.project.website')}</b>${lines(80, 55)}</div><div><b>${
      ui('home.app.project.brand')
    }</b>${lines(70, 45)}</div><div><b>${ui('home.app.project.mobile')}</b>${lines(85, 50)}</div></div>
      <div class="pj-rows"><div>${av(30)}<span>${ui('home.app.feed.shipped')}</span><em>${
      ui('home.app.time.2h')
    }</em></div><div>${av(160)}<span>${ui('home.app.feed.reviewed')}</span><em>${
      ui('home.app.time.4h')
    }</em></div></div>`,
  },
  'team:layout': {
    region: 'main',
    html: `<div class="pj-banner"><span class="pj-tile">${ui('home.app.team.initial')}</span><span><b>${
      ui('home.app.team')
    }</b><small>${ui('home.app.team.members')}</small></span>
      <span class="pj-stack">${av(30)}${av(160)}${av(300)}${av(90)}</span></div>
      <div class="pj-r pj-r-page" data-region="page" data-slot="page"><span class="pj-tag" aria-hidden="true">page</span></div>`,
  },
  'team:crumbs': {
    region: 'crumbs',
    html: `<span>${ui('home.app.teams')}</span><i>/</i><b>${ui('home.app.team')}</b>`,
  },
  'team:sidebar': {
    region: 'sidebar',
    html: `<p class="pj-team"><span class="pj-tile">${ui('home.app.team.initial')}</span>${ui('home.app.team')}</p>
      <span class="pj-field">ad<span class="pj-caret"></span></span>
      <span class="pj-tnav"><span class="pj-hl"></span><span>${ui('home.app.overview')}</span><span>${
      ui('home.app.members')
    }</span><span>${ui('home.app.activity')}</span></span>
      <span class="pj-quiet">${ui('home.app.settings')}</span>`,
  },
  'overview:view': {
    region: 'page',
    html: `<p class="pj-h">${ui('home.app.overview')}</p>
      <div class="pj-stats"><div><b>12</b><small>${ui('home.app.stat.members')}</small></div><div><b>8</b><small>${
      ui('home.app.stat.projects')
    }</small></div><div><b>31</b><small>${ui('home.app.stat.reviews')}</small></div></div>
      <svg class="pj-spark" viewBox="0 0 200 40" preserveAspectRatio="none"><path d="M0 32 L20 28 L40 30 L60 22 L80 24 L100 16 L120 19 L140 10 L160 13 L180 6 L200 8"/></svg>`,
  },
  'members:view': {
    region: 'page',
    html: `<p class="pj-h">${ui('home.app.members')}</p>
      <div class="pj-rows"><div class="is-picked">${av(30)}<span>${ui('home.app.name.ada')}</span><em>${
      ui('home.app.role.owner')
    }</em></div><div>${av(160)}<span>${ui('home.app.name.mo')}</span><em>${ui('home.app.role.admin')}</em></div><div>${
      av(300)
    }<span>${ui('home.app.name.lee')}</span><em>${ui('home.app.role.member')}</em></div><div>${av(90)}<span>${
      ui('home.app.name.sam')
    }</span><em>${ui('home.app.role.member')}</em></div></div>`,
  },
  'members:crumbs': {
    region: 'crumbs',
    html: `<span>${ui('home.app.teams')}</span><i>/</i><span>${ui('home.app.team')}</span><i>/</i><b>${
      ui('home.app.members')
    }</b>`,
  },
  'members:aside': {
    region: 'aside',
    html: `<span class="pj-big">${av(30)}</span><p class="pj-h">${ui('home.app.name.ada')}</p><p class="pj-sub">${
      ui('home.app.profile.owner')
    }</p>${lines(90, 70, 60)}`,
  },
  'activity:view': {
    region: 'page',
    html: `<p class="pj-h">${ui('home.app.activity')}</p>
      <div class="pj-rows pj-timeline"><div>${av(160)}<span>${
      ui('home.app.feed.merged')
    }</span><em>09:14</em></div><div>${av(30)}<span>${ui('home.app.feed.published')}</span><em>08:52</em></div><div>${
      av(300)
    }<span>${ui('home.app.feed.opened')}</span><em>${ui('home.app.time.mon')}</em></div></div>`,
  },
};

// a slot's own children, shown while no route fills it
const FALLBACK = {
  crumbs: `<b>${ui('home.app.home')}</b>`,
  sidebar: `<span class="pj-wnav"><span class="is-here">${ui('home.app.home')}</span><span>${
    ui('home.app.teams')
  }</span><span>${ui('home.app.projects')}</span><span>${ui('home.app.settings')}</span></span>`,
  aside: `<p class="pj-h">${ui('home.app.news')}</p>${lines(90, 75, 80, 50)}`,
};

// the loop. fill names the piece in each region; a region left out shows its default. the team
// nav's highlight follows the page through the app's own active-link state, not a re-render
const STEPS = [
  {
    page: ui('home.app.overview'),
    path: '/teams/design',
    chain: ['app', 'team', 'overview'],
    fill: { main: 'team:layout', page: 'overview:view', crumbs: 'team:crumbs', sidebar: 'team:sidebar' },
  },
  {
    page: ui('home.app.activity'),
    path: '/teams/design/activity',
    chain: ['app', 'team', 'activity'],
    fill: { main: 'team:layout', page: 'activity:view', crumbs: 'team:crumbs', sidebar: 'team:sidebar' },
  },
  {
    page: ui('home.app.members'),
    path: '/teams/design/members',
    chain: ['app', 'team', 'members'],
    fill: {
      main: 'team:layout',
      page: 'members:view',
      crumbs: 'members:crumbs',
      sidebar: 'team:sidebar',
      aside: 'members:aside',
    },
  },
  {
    page: ui('home.app.overview'),
    path: '/teams/design',
    chain: ['app', 'team', 'overview'],
    fill: { main: 'team:layout', page: 'overview:view', crumbs: 'team:crumbs', sidebar: 'team:sidebar' },
  },
  {
    page: ui('home.app.home'),
    path: '/',
    chain: ['app', 'home'],
    fill: { main: 'home:view' },
  },
];
const HOME = STEPS.length - 1;
const PAGES = ['overview', 'members', 'activity'];

// the order regions are drawn in: main first, since page lives inside what fills it
const REGIONS = ['header', 'main', 'page', 'crumbs', 'sidebar', 'aside'];
const occupants = (step) => ({ header: 'app:layout', ...step.fill });

const SVG = 'http://www.w3.org/2000/svg';
const R = 6; // a wire's corner radius

export function mountProjection(root) {
  const stage = root.querySelector('.pj-stage');
  const svg = root.querySelector('.pj-wires');
  const tally = root.querySelector('[data-pj-tally]');
  const action = root.querySelector('[data-pj-action]');
  const path = root.querySelector('[data-pj-path]');
  const figure = root.querySelector('.pj');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP_MS = reduced ? 6500 : 4800;

  const regionEl = (name) => root.querySelector(`[data-region="${name}"]`);
  const wires = new Map(); // piece -> { g, line, packet, socket }
  let at = HOME;

  /* ---------- the page ---------- */

  // the region's content goes in a fill of its own, so the old one can leave while the new one waits
  function place(name, piece, { animate, delay }) {
    const el = regionEl(name);
    if (!el) { return; }
    const old = el.querySelector(':scope > .pj-fill');
    const fresh = document.createElement('div');
    fresh.className = 'pj-fill';
    fresh.innerHTML = piece ? PIECES[piece].html : FALLBACK[name] ?? '';
    el.classList.toggle('is-fallback', !piece);
    el.dataset.from = piece ? piece.split(':')[0] : 'default';
    old?.remove();
    el.append(fresh);
    if (!animate) { return; }
    if (old) {
      old.classList.add('is-out');
      el.append(old);
      setTimeout(() => old.remove(), 240);
    }
    fresh.classList.add('is-pending');
    setTimeout(() => {
      fresh.classList.replace('is-pending', 'is-in');
      el.classList.remove('is-swapped');
      void el.offsetWidth;
      el.classList.add('is-swapped');
    }, delay);
  }

  // the team nav is never rebuilt on the team's pages: its highlight slides to the page shown
  function markNav(step) {
    const nav = root.querySelector('.pj-tnav');
    const here = Math.max(0, PAGES.indexOf(step.chain.at(-1)));
    nav?.style.setProperty('--i', String(here));
    // the current item's label brightens as the highlight arrives under it
    nav?.querySelectorAll(':scope > span:not(.pj-hl)').forEach((item, i) =>
      item.classList.toggle('is-here', i === here)
    );
  }

  function markTree(step) {
    const live = new Set(Object.values(occupants(step)));
    root.querySelectorAll('.pj-node').forEach((node) =>
      node.classList.toggle('is-on', step.chain.includes(node.dataset.route))
    );
    root.querySelectorAll('.pj-port').forEach((port) => {
      const key = port.dataset.port;
      const route = key.split(':')[0];
      // a named piece on the page's chain that isn't showing: a deeper route took its slot
      const taken = step.chain.includes(route) && !live.has(key) && !/:(view|layout)$/.test(key);
      port.classList.toggle('is-live', live.has(key));
      port.classList.toggle('is-taken', taken);
    });
  }

  /* ---------- the wires ---------- */

  const box = (el, s) => {
    const r = el.getBoundingClientRect();
    return {
      l: Math.round(r.left - s.left),
      t: Math.round(r.top - s.top),
      r: Math.round(r.right - s.left),
      b: Math.round(r.bottom - s.top),
    };
  };

  // from a route's port, a curve across the gap to the window's edge, then along the gutters
  // between the regions to the one it fills
  function geometry(piece) {
    const s = stage.getBoundingClientRect();
    const port = box(root.querySelector(`[data-port="${piece}"]`), s);
    const win = box(root.querySelector('.pj-window'), s);
    const name = PIECES[piece]?.region ?? 'header';
    const at = (n) => regionEl(n) && box(regionEl(n), s);
    const crumbs = at('crumbs'), side = at('sidebar'), main = at('main'), aside = at('aside');
    const gutter = Math.round((crumbs.b + side.t) / 2);
    const start = [port.r + 5, Math.round((port.t + port.b) / 2)];
    let run;
    // narrow screens stack the routes above the page: every wire runs out to one shared lane beside
    // the page, down it as a single bus, and in to its region's right edge
    const tree = box(root.querySelector('.pj-tree'), s);
    if (tree.b <= win.t) {
      const target = name === 'header' ? box(root.querySelector('.pj-app'), s) : at(name);
      const y = name === 'header' ? target.t + 12 : Math.round((target.t + target.b) / 2);
      const x = win.r + 14;
      run = [[x, start[1]], [x, y], [target.r, y]];
      return { d: draw(start, run), end: run.at(-1) };
    }
    if (name === 'header') {
      // the app layout is the whole page, not its header: its wire meets the app's own edge, at the top
      const app = box(root.querySelector('.pj-app'), s);
      run = [[app.l, app.t + 12]];
    }
    else if (name === 'crumbs') {
      const r = at(name), y = Math.round((r.t + r.b) / 2);
      run = [[win.l, y], [r.l, y]];
    }
    else if (name === 'sidebar') {
      run = [[win.l, side.t + 22], [side.l, side.t + 22]];
    }
    else if (name === 'main') {
      // main's and aside's wires share one run along the gutter, so they read as one wire with
      // aside's reaching further
      run = [[win.l, gutter], [main.l + 22, gutter], [main.l + 22, main.t]];
    }
    else if (name === 'aside') {
      run = [[win.l, gutter], [aside.l + 22, gutter], [aside.l + 22, aside.t]];
    }
    else {
      // the page sits inside team's layout: its wire comes in under the regions, then up the gutter
      const page = at('page');
      const x = Math.round((side.r + main.l) / 2);
      const under = Math.round((side.b + win.b) / 2);
      run = [[win.l, under], [x, under], [x, page.b - 20], [page.l, page.b - 20]];
    }
    return { d: draw(start, run), end: run.at(-1) };
  }

  // a cubic into the first point, then straight runs with rounded corners
  function draw([x0, y0], run) {
    const [x1, y1] = run[0];
    const k = Math.round((x1 - x0) / 2);
    let d = `M${x0} ${y0} C${x0 + k} ${y0} ${x1 - k} ${y1} ${x1} ${y1}`;
    for (let i = 1; i < run.length; i++) {
      const [px, py] = run[i - 1], [cx, cy] = run[i], next = run[i + 1];
      if (!next) {
        d += ` L${cx} ${cy}`;
        break;
      }
      const into = Math.sign(cx - px) || 0, intoY = Math.sign(cy - py) || 0;
      const out = Math.sign(next[0] - cx) || 0, outY = Math.sign(next[1] - cy) || 0;
      d += ` L${cx - into * R} ${cy - intoY * R} Q${cx} ${cy} ${cx + out * R} ${cy + outY * R}`;
    }
    return d;
  }

  const drawn = () => getComputedStyle(svg).display !== 'none';

  function shape(wire, piece) {
    const { d, end } = geometry(piece);
    wire.line.setAttribute('d', d);
    wire.packet.setAttribute('d', d);
    wire.socket.setAttribute('cx', end[0]);
    wire.socket.setAttribute('cy', end[1]);
    wire.length = Math.ceil(wire.line.getTotalLength());
  }

  function connect(piece, animate, delay) {
    const g = document.createElementNS(SVG, 'g');
    g.classList.add('pj-wire');
    // the wire wears its slot's color, as the port and the region it joins do
    const region = PIECES[piece]?.region ?? 'header';
    g.dataset.slot = region === 'header' ? 'layout' : region;
    const [line, packet, socket] = ['path', 'path', 'circle'].map((tag) =>
      g.appendChild(document.createElementNS(SVG, tag))
    );
    line.classList.add('pj-line-w');
    packet.classList.add('pj-packet');
    socket.classList.add('pj-socket');
    socket.setAttribute('r', '3');
    svg.append(g);
    const wire = { g, line, packet, socket };
    wires.set(piece, wire);
    shape(wire, piece);
    if (!animate) { return; }
    const L = wire.length;
    g.classList.add('is-fresh');
    line.style.strokeDasharray = `${L} ${L}`;
    line.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], {
      duration: 520,
      delay,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'backwards',
    })
      .finished.then(() => {
        line.style.strokeDasharray = '';
      }, () => {});
    packet.style.strokeDasharray = `22 ${L + 22}`;
    packet.animate([{ strokeDashoffset: 22 }, { strokeDashoffset: -L }], {
      duration: 760,
      delay: delay + 40,
      easing: 'cubic-bezier(0.5, 0, 0.3, 1)',
      fill: 'both',
    });
    socket.animate([{ opacity: 0, r: 0 }, { opacity: 1, r: 5 }, { opacity: 1, r: 3 }], {
      duration: 420,
      delay: delay + 480,
      fill: 'backwards',
    });
    setTimeout(() => g.classList.remove('is-fresh'), delay + 1500);
  }

  function disconnect(piece, animate) {
    const wire = wires.get(piece);
    wires.delete(piece);
    if (!animate) {
      wire.g.remove();
      return;
    }
    const L = wire.length;
    wire.g.classList.add('is-leaving');
    wire.line.style.strokeDasharray = `${L} ${L}`;
    wire.socket.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    wire.line.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: L }], {
      duration: 420,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      fill: 'forwards',
    })
      .finished.then(() => wire.g.remove(), () => wire.g.remove());
  }

  function reshape() {
    if (!drawn()) { return; }
    wires.forEach((wire, piece) => shape(wire, piece));
  }

  /* ---------- a navigation ---------- */

  function go(next, animate) {
    const before = occupants(STEPS[at]);
    const after = occupants(STEPS[next]);
    const step = STEPS[next];
    at = next;

    // a region is replaced when its piece changed; everything inside a replaced region is new too
    const changed = new Set();
    REGIONS.forEach((name) => {
      if (name === 'page' && changed.has('main')) {
        if (after.page) { changed.add('page'); }
        return;
      }
      if (before[name] !== after[name]) { changed.add(name); }
    });
    const present = REGIONS.filter((name) => name !== 'page' || after.page);
    const replaced = present.filter((name) => changed.has(name)).length;

    root.querySelectorAll('.pj-r.is-swapped, .pj-r.is-changed').forEach((el) =>
      el.classList.remove('is-swapped', 'is-changed')
    );
    REGIONS.forEach((name) => {
      if (!changed.has(name)) { return; }
      // a piece arrives with its wire; a default comes back as soon as the piece has left
      place(name, after[name], { animate: animate && !reduced, delay: after[name] ? 640 : 300 });
      regionEl(name)?.classList.add('is-changed');
    });
    markNav(step);
    markTree(step);
    path.textContent = step.path;
    action.innerHTML = ui('home.slots.navigates', { page: step.page });
    const kept = present.length - replaced;
    tally.textContent = plural('home.slots.kept', kept, { kept, replaced });

    if (!drawn()) {
      wires.forEach((w) => w.g.remove());
      wires.clear();
      return;
    }
    const keep = new Set(Object.values(after));
    // a piece whose region was rebuilt around it, like a page whose layout arrived, is wired anew
    const rewired = (piece) => changed.has(PIECES[piece]?.region ?? 'header');
    [...wires.keys()].forEach((piece) => {
      if (!keep.has(piece) || rewired(piece)) { disconnect(piece, animate && !reduced); }
    });
    keep.forEach((piece) => {
      if (wires.has(piece)) { shape(wires.get(piece), piece); }
      else { connect(piece, animate && !reduced, 160); }
    });
  }

  /* ---------- the loop: runs only while on screen ---------- */

  // the first paint: home, every region as it stands, no wires drawn in
  const first = occupants(STEPS[HOME]);
  ['main', 'crumbs', 'sidebar', 'aside'].forEach((name) => place(name, first[name], { animate: false }));
  markTree(STEPS[HOME]);
  if (drawn()) { Object.values(first).forEach((piece) => connect(piece, false, 0)); }
  tally.textContent = '';

  let elapsed = STEP_MS - 1400; // the first navigation comes soon after it scrolls in
  let last = 0, frame = 0, seen = false, held = false;

  const tick = (now) => {
    elapsed += Math.min(now - (last || now), 100);
    last = now;
    if (elapsed >= STEP_MS) {
      elapsed = 0;
      go((at + 1) % STEPS.length, true);
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    const run = seen && !held;
    figure.classList.toggle('is-still', !run);
    if (run && !frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
    if (!run && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting;
    // scrolled away, a hold ends: it plays again when it comes back
    if (!seen) { held = false; }
    sync();
  }, { threshold: 0.25 }).observe(figure);
  // a step chosen by hand holds the loop until the reader leaves: the pointer moving out of the
  // graphic and its controls, a tap elsewhere on touch (a lifted finger always "leaves"), or focus
  // moving out. it then plays on from that step, a full step later
  const jump = (next) => {
    held = true;
    elapsed = 0;
    sync();
    if (next !== at) { go(next, true); }
  };
  const release = () => {
    if (!held) { return; }
    held = false;
    elapsed = 0;
    sync();
  };
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch') { release(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!root.contains(e.target)) { release(); }
  });
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) { release(); }
  });
  const wrap = (i) => (i + STEPS.length) % STEPS.length;
  root.querySelector('[data-pj-back]').addEventListener('click', () => jump(wrap(at - 1)));
  root.querySelector('[data-pj-forward]').addEventListener('click', () => jump(wrap(at + 1)));
  // a route in the tree jumps to the view it shows: a layout to its index page
  const VIEW_OF = {
    app: 'home',
    home: 'home',
    team: 'overview',
    overview: 'overview',
    members: 'members',
    activity: 'activity',
  };
  root.querySelectorAll('[data-go]').forEach((button) =>
    button.addEventListener('click', () => {
      const view = VIEW_OF[button.dataset.go];
      jump(STEPS.findIndex((st) => st.chain.at(-1) === view));
    })
  );

  // the wires follow the page as it reflows; at widths with no room for them they go
  let wasDrawn = drawn();
  new ResizeObserver(() => {
    const now = drawn();
    if (now && !wasDrawn) {
      Object.values(occupants(STEPS[at])).forEach((piece) => {
        if (!wires.has(piece)) { connect(piece, false, 0); }
      });
    }
    wasDrawn = now;
    reshape();
  }).observe(stage);
  document.fonts?.ready.then(reshape);
}
