import { highlightInline } from './site.js';
import { ui } from './strings.js';

// the hero instrument: one navigation, traced against the router's own timing defaults.
// semantics follow Router#beforeCommit / #afterCommit: holdCommit 300ms, loadingDelay 200ms after commit,
// loadingMin 500ms once a loading view shows. a prototype simulation; the real site can drive it with the library.

const SPEED = 0.4; // playback rate against real milliseconds
const SPAN = 1100; // ms shown on the axis
const HOLD = 300, DELAY = 200, MIN = 500;

const LANES = [
  { key: 'guards', label: ui('home.trace.lane.guards'), color: 'var(--c-violet)' },
  { key: 'data', label: ui('home.trace.lane.data'), color: 'var(--c-cyan)' },
  { key: 'commit', label: ui('home.trace.lane.commit'), color: 'var(--c-blue)' },
  { key: 'loading', label: ui('home.trace.lane.loading'), color: 'var(--c-amber)' },
  { key: 'render', label: ui('home.trace.lane.render'), color: 'var(--c-green)' },
];

const PAGES = {
  overview: {
    path: '/team/acme',
    html: `<p class="app-title">Acme</p><p class="sub">${ui('home.app.overview.sub')}</p>
      <div class="stat"><div><b>24</b><span>${ui('home.app.stat.members')}</span></div><div><b>8</b><span>${
      ui('home.app.stat.projects')
    }</span></div><div><b>99.9%</b><span>${ui('home.app.stat.uptime')}</span></div></div>
      <div class="rows"><div class="row"><i></i>${ui('home.app.row.deploy')}<em>${
      ui('home.app.time.2m')
    }</em></div><div class="row"><i></i>${ui('home.app.row.billing')}<em>${ui('home.app.time.1h')}</em></div></div>`,
  },
  members: {
    path: '/team/acme/members',
    html: `<p class="app-title">${ui('home.app.members')}</p><p class="sub">${ui('home.app.members.people')}</p>
      <div class="rows"><div class="row"><i></i>${ui('home.app.name.ada')}<em>${
      ui('home.app.role.owner')
    }</em></div><div class="row"><i></i>${ui('home.app.name.mo')}<em>${
      ui('home.app.role.admin')
    }</em></div><div class="row"><i></i>${ui('home.app.name.lee')}<em>${
      ui('home.app.role.member')
    }</em></div><div class="row"><i></i>${ui('home.app.name.sam')}<em>${ui('home.app.role.member')}</em></div></div>`,
  },
  activity: {
    path: '/team/acme/activity',
    html: `<p class="app-title">${ui('home.app.activity')}</p><p class="sub">${ui('home.app.activity.sub')}</p>
      <div class="rows"><div class="row"><i></i>${
      ui('home.app.log.merged')
    }<em>09:14</em></div><div class="row"><i></i>${
      ui('home.app.log.deployed')
    }<em>08:52</em></div><div class="row"><i></i>${ui('home.app.log.opened')}<em>${
      ui('home.app.time.yesterday')
    }</em></div><div class="row"><i></i>${ui('home.app.log.joined')}<em>${ui('home.app.time.mon')}</em></div></div>`,
  },
  signIn: {
    path: '/sign-in?next=/team/acme/settings',
    html: `<p class="app-title">${ui('home.app.signin')}</p><p class="sub">${ui('home.app.signin.note')}</p>
      <div class="field"><label>${ui('home.app.email')}</label><span></span></div><div class="field"><label>${
      ui('home.app.password')
    }</label><span></span></div><span class="fake-btn">${ui('home.app.signin')}</span>`,
  },
};

const LOADING_HTML = `<div class="skeleton"><span></span><span></span><span></span><span></span></div>`;

// each scenario: bars [start, end] in ms, commit ms, optional loading [start, end], render [start, end]
const SCENARIOS = {
  overview: {
    page: 'overview',
    guards: [0, 6],
    data: [6, 72],
    commit: 72,
    render: [72, 84],
    labels: { data: '66ms' },
    caption: ui('home.trace.caption.overview'),
  },
  members: {
    page: 'members',
    guards: [0, 8],
    data: [8, 430],
    commit: HOLD,
    render: [430, 442],
    labels: { data: '422ms' },
    caption: ui('home.trace.caption.members'),
  },
  activity: {
    page: 'activity',
    guards: [0, 8],
    data: [8, 880],
    commit: HOLD,
    loading: [HOLD + DELAY, 1000],
    render: [1000, 1012],
    labels: { data: '872ms' },
    caption: ui('home.trace.caption.activity'),
  },
  settings: {
    page: 'signIn',
    redirect: true,
    guards: [0, 40],
    data: [40, 62],
    commit: 62,
    render: [62, 74],
    labels: { guards: ui('home.trace.label.redirect'), data: 'signIn' },
    caption: ui('home.trace.caption.settings'),
  },
  back: {
    guards: [0, 4],
    data: [4, 6],
    commit: 6,
    render: [6, 14],
    labels: { data: ui('home.trace.label.entry') },
    caption: ui('home.trace.caption.back'),
  },
};

// positions snap to whole pixels against the measured track, and re-snap on resize
let trackW = 0;
const placed = new Map(); // el -> { left, width }
const px = (ms) => Math.round((Math.min(Math.max(ms, 0), SPAN) / SPAN) * trackW);
function place(el, left, width) {
  placed.set(el, { left, width });
  el.style.left = `${px(left)}px`;
  if (width !== undefined) { el.style.width = `${Math.max(2, px(left + width) - px(left))}px`; }
}
function relayout() {
  placed.forEach(({ left, width }, el) => place(el, left, width));
}

export function mountTrace(root) {
  if (!root) { return; }
  const $ = (s) => root.querySelector(s);
  const plot = $('[data-plot]');
  const page = $('[data-page]');
  const url = $('.url');
  const urlPath = $('[data-url]');
  const pendingBar = $('[data-pending]');
  const caption = $('[data-caption]');
  const title = $('[data-trace-title]');
  const backBtn = $('[data-trace-back]');
  const tabs = [...root.querySelectorAll('[data-scenario]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // build lanes
  plot.innerHTML = `
    <div class="lanes">
      ${
    LANES.map((l) => `
        <div class="lane" data-lane="${l.key}" style="--lane:${l.color}">
          <span class="lane-label">${l.label}</span>
          <div class="lane-track">
            ${
      l.key === 'commit'
        ? '<span class="tick-mark"></span>'
        : '<span class="bar"></span><span class="bar-label"></span>'
    }
          </div>
        </div>`).join('')
  }
    </div>
    <div class="guides">
      <div class="guide" data-guide="hold"><span>holdCommit</span></div>
      <div class="guide is-off" data-guide="delay"><span>loadingDelay</span></div>
      <div class="guide is-off" data-guide="min"><span>loadingMin</span></div>
      <div class="playhead"></div>
    </div>
    <div class="ruler">${
    [0, 200, 400, 600, 800, 1000].map((t) => `<span data-ms="${t}">${t}ms</span>`).join('')
  }</div>`;

  const track = plot.querySelector('.lane-track');
  const measure = () => {
    trackW = Math.round(track.getBoundingClientRect().width);
    relayout();
  };
  measure();
  new ResizeObserver(measure).observe(track);
  plot.querySelectorAll('.ruler [data-ms]').forEach((el) => place(el, +el.dataset.ms));

  const lane = (k) => plot.querySelector(`[data-lane="${k}"]`);
  const guide = (k) => plot.querySelector(`[data-guide="${k}"]`);
  const playhead = plot.querySelector('.playhead');
  place(guide('hold'), HOLD);

  let current = 'overview';
  const history = [];
  let raf = 0;

  const setPage = (key, html) => {
    page.innerHTML = html ?? PAGES[key].html;
  };
  const setUrl = (path) => {
    urlPath.textContent = path;
    url.classList.remove('is-moved');
    void url.offsetWidth;
    url.classList.add('is-moved');
  };
  const setTabs = (key) =>
    tabs.forEach((t) =>
      t.setAttribute(
        'aria-pressed',
        t.dataset.scenario === key || (key === 'signIn' && t.dataset.scenario === 'settings'),
      )
    );

  setPage('overview');
  backBtn.disabled = true;

  // captions share one cell so the panel never changes height between navigations
  const CAPTIONS = {
    intro: caption.innerHTML.trim(),
    pending: `<span style="color:var(--text-4)">${ui('home.trace.pending')}</span>`,
  };
  Object.entries(SCENARIOS).forEach(([k, sc]) => {
    CAPTIONS[k] = sc.caption;
  });
  caption.classList.add('swap');
  caption.innerHTML = Object.entries(CAPTIONS)
    .map(([k, html]) => `<span data-cap="${k}"${k === 'intro' ? '' : ' hidden'}>${html}</span>`).join('');
  highlightInline(caption);
  const showCaption = (key) =>
    caption.querySelectorAll('[data-cap]').forEach((el) => {
      el.hidden = el.dataset.cap !== key;
    });

  function reset(sc) {
    LANES.forEach(({ key }) => {
      const el = lane(key);
      el.classList.remove('is-live');
      const bar = el.querySelector('.bar');
      if (bar) {
        placed.delete(bar);
        bar.style.width = '0';
        bar.style.left = '0';
        bar.hidden = true;
        bar.classList.toggle('is-error', key === 'guards' && !!sc.redirect);
      }
      const lbl = el.querySelector('.bar-label');
      if (lbl) {
        lbl.classList.remove('on');
        lbl.textContent = sc.labels?.[key] ?? '';
      }
      el.querySelector('.tick-mark')?.classList.remove('on');
    });
    const held = sc.commit === HOLD;
    guide('hold').classList.toggle('is-hit', false);
    guide('hold').classList.toggle('is-off', sc === SCENARIOS.back);
    place(guide('delay'), sc.commit + DELAY);
    guide('delay').classList.toggle('is-off', !held);
    guide('delay').classList.remove('is-hit');
    guide('min').classList.toggle('is-off', !sc.loading);
    if (sc.loading) { place(guide('min'), sc.loading[0] + MIN); }
    guide('min').classList.remove('is-hit');
  }

  function drawBar(key, range, t) {
    if (!range) { return; }
    const el = lane(key);
    const bar = el.querySelector('.bar');
    const [a, b] = range;
    if (t < a) { return; }
    bar.hidden = false;
    const end = Math.min(t, b);
    place(bar, a, end - a);
    el.classList.toggle('is-live', t < b);
    const lbl = el.querySelector('.bar-label');
    if (t >= b && lbl) {
      place(lbl, b);
      lbl.classList.add('on');
    }
  }

  function play(key, { from } = {}) {
    cancelAnimationFrame(raf);
    const sc = SCENARIOS[key];
    const target = key === 'back' ? from : sc.page;
    const targetPath = PAGES[target].path;
    reset(sc);
    title.textContent = key === 'back'
      ? ui('home.trace.title.traverse', { path: targetPath.split('?')[0] })
      : ui('home.trace.title.navigate', { path: key === 'settings' ? '/team/acme/settings' : targetPath });
    showCaption('pending');
    setTabs(target);

    const state = { committed: false, loadingShown: false, rendered: false };
    const finish = () => {
      pendingBar.classList.remove('on');
      pendingBar.style.width = '0';
      playhead.classList.remove('on');
      showCaption(key);
      current = target;
      backBtn.disabled = history.length === 0;
    };

    const step = (t) => {
      drawBar('guards', sc.guards, t);
      drawBar('data', sc.data, t);
      drawBar('loading', sc.loading, t);
      drawBar('render', sc.render, t);
      place(playhead, t);

      if (!state.committed && t >= sc.commit) {
        state.committed = true;
        place(lane('commit').querySelector('.tick-mark'), sc.commit);
        lane('commit').querySelector('.tick-mark').classList.add('on');
        setUrl(targetPath);
        if (sc.commit === HOLD) { guide('hold').classList.add('is-hit'); }
      }
      if (sc.commit === HOLD && t >= HOLD + DELAY && sc.loading) { guide('delay').classList.add('is-hit'); }
      if (sc.loading && !state.loadingShown && t >= sc.loading[0]) {
        state.loadingShown = true;
        setPage(null, LOADING_HTML);
      }
      if (sc.loading && t >= sc.loading[1]) { guide('min').classList.add('is-hit'); }
      if (!state.rendered && t >= sc.render[0]) {
        state.rendered = true;
        setPage(target);
      }
      // the platform's own pending state, as the url bar would show it
      const progress = Math.min(1, t / sc.render[1]);
      pendingBar.style.width = `${(1 - Math.pow(1 - progress, 2)) * 100}%`;
    };

    if (reduced) {
      step(sc.render[1]);
      finish();
      return;
    }

    pendingBar.classList.add('on');
    playhead.classList.add('on');
    const start = performance.now();
    const end = sc.render[1];
    const loop = (now) => {
      const t = ((now - start) * SPEED);
      step(Math.min(t, end));
      if (t < end) { raf = requestAnimationFrame(loop); }
      else { finish(); }
    };
    raf = requestAnimationFrame(loop);
  }

  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      const key = tab.dataset.scenario;
      const target = SCENARIOS[key].page;
      if (target === current) { return; }
      history.push(current);
      play(key);
    })
  );

  backBtn.addEventListener('click', () => {
    if (!history.length) { return; }
    const prev = history.pop();
    play('back', { from: prev });
  });

  // the one orchestrated moment: a slow navigation plays once on arrival.
  // with reduced motion the same trace is drawn complete, so the hero is never empty
  if (reduced) {
    root.querySelector('.trace-speed')?.remove();
    history.push(current);
    play('activity');
  }
  else {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        io.disconnect();
        setTimeout(() => {
          history.push(current);
          play('activity');
        }, 600);
      }
    }, { threshold: 0.5 });
    io.observe(root);
  }
}
