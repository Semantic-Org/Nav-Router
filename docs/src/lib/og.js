// share cards, 1200×630 png per page: the mark, the section, the title (in mono for a symbol) and the
// lede. satori turns the text to paths from the font files themselves, so the build machine's fonts
// don't matter; sharp rasterizes. colors are the dark theme's, as literals since there is no css here
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const font = (pkg, file) => readFileSync(require.resolve(`${pkg}/files/${file}`));
const FONTS = [
  {
    name: 'Sans',
    weight: 500,
    style: 'normal',
    data: font('@fontsource/schibsted-grotesk', 'schibsted-grotesk-latin-500-normal.woff'),
  },
  {
    name: 'Sans',
    weight: 700,
    style: 'normal',
    data: font('@fontsource/schibsted-grotesk', 'schibsted-grotesk-latin-700-normal.woff'),
  },
  {
    name: 'Mono',
    weight: 400,
    style: 'normal',
    data: font('@fontsource/fragment-mono', 'fragment-mono-latin-400-normal.woff'),
  },
];

const C = { bg: '#000000', text: '#ececec', text2: '#b4b4b4', text3: '#7c7c7c', line: '#1a1a22', accent: '#5aa9ff' };
const MARK = `data:image/svg+xml;utf8,${
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5 19V12a5 5 0 0 1 5-5h9" stroke="#5aa9ff" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="19" r="2.6" fill="#ececec"/><circle cx="19" cy="7" r="2.6" stroke="#ececec" stroke-width="1.8"/></svg>',
  )
}`;

const h = (type, style, children = []) => ({ type, props: { style, children } });
// backticks in a lede are code in the page; on a card they're plain text
const plainText = (s = '') => s.replace(/`/g, '');

// a lede cut at a word, so it fits two lines of the card
const fit = (s, max = 104) => (s.length <= max ? s : `${s.slice(0, s.lastIndexOf(' ', max)).replace(/[,;:]$/, '')}…`);

export async function renderCard({ title, lede, section, symbol = false }) {
  // the ruler lines behind the page, as the homepage hero draws them, fading out before the text
  const rules = h('div', { position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex' }, [
    ...Array.from(
      { length: 12 },
      (_, i) =>
        h('div', { position: 'absolute', top: 0, height: 630, left: 96 * (i + 1), width: 1, background: C.line }),
    ),
    h('div', {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1200,
      height: 630,
      backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 15%, #000000 62%)',
    }),
  ]);
  const tree = h('div', {
    display: 'flex',
    width: 1200,
    height: 630,
    background: C.bg,
    fontFamily: 'Sans',
    color: C.text,
  }, [
    rules,
    // positioned, so it paints above the positioned rules and fade; inset rather than padded, since
    // satori sizes a box without its padding
    h('div', {
      position: 'absolute',
      top: 72,
      right: 72,
      bottom: 64,
      left: 72,
      display: 'flex',
      flexDirection: 'column',
    }, [
      h('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
        { type: 'img', props: { src: MARK, width: 44, height: 44 } },
        h('div', { fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }, 'nav-router'),
      ]),
      h('div', { display: 'flex', flexGrow: 1 }),
      h(
        'div',
        { display: 'flex', flexDirection: 'column', width: 1040 },
        [
          section
            ? h('div', { display: 'flex', fontSize: 28, color: C.accent, fontWeight: 500, marginBottom: 16 }, section)
            : null,
          h('div', {
            display: 'flex',
            fontSize: symbol ? 84 : 76,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: symbol ? -2 : -2.5,
            fontFamily: symbol ? 'Mono' : 'Sans',
          }, title),
          lede
            ? h('div', {
              display: 'flex',
              marginTop: 22,
              fontSize: 32,
              lineHeight: 1.4,
              color: C.text2,
              fontWeight: 500,
            }, fit(plainText(lede)))
            : null,
        ].filter(Boolean),
      ),
    ]),
  ]);
  const svg = await satori(tree, { width: 1200, height: 630, fonts: FONTS });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
