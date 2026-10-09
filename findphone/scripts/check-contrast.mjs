// Verifies WCAG 2.1 contrast for every foreground/background pairing the UI actually uses.
// Text pairs need 4.5:1 (AA, normal text); non-text UI (borders, focus rings, dots) needs 3:1.
// Usage: node scripts/check-contrast.mjs [--table]   (exits 1 on any failure)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tokensPath = fileURLToPath(new URL('../shared/design-tokens.json', import.meta.url));
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

const TEXT = 4.5;
const UI = 3;

const SURFACES = ['bg.canvas', 'bg.surface', 'bg.raised', 'bg.subtle'];

/** [foreground, background(s), minimum ratio, what it is used for] */
const PAIRS = [
  ['text.primary', SURFACES, TEXT, 'body and headings'],
  ['text.secondary', SURFACES, TEXT, 'supporting text'],
  ['text.tertiary', SURFACES, TEXT, 'captions, info-row labels'],
  ['text.link', ['bg.surface', 'bg.raised', 'bg.canvas'], TEXT, 'inline links'],
  ['text.onAccent', ['accent.default', 'accent.hover', 'accent.pressed'], TEXT, 'primary button label'],
  ['accent.onSubtle', ['accent.subtle'], TEXT, 'selected item label'],
  ['destructive.onDefault', ['destructive.default', 'destructive.hover', 'destructive.pressed'], TEXT, 'destructive button label'],
  ['destructive.text', ['bg.surface', 'bg.raised', 'destructive.subtle'], TEXT, 'error message, ghost destructive'],
  ['text.onInverse', ['bg.inverse'], TEXT, 'toast'],
  ['status.live.fg', ['status.live.bg', 'bg.surface', 'bg.raised'], TEXT, 'Live badge'],
  ['status.stale.fg', ['status.stale.bg', 'bg.surface', 'bg.raised'], TEXT, 'Last seen badge'],
  ['status.danger.fg', ['status.danger.bg', 'bg.surface', 'bg.raised'], TEXT, 'Error badge'],
  ['status.paused.fg', ['status.paused.bg', 'bg.surface', 'bg.raised'], TEXT, 'Paused badge'],
  ['border.control', ['bg.surface', 'bg.raised', 'bg.canvas'], UI, 'input and checkbox boundary'],
  ['focus.ring', ['bg.surface', 'bg.raised', 'bg.canvas'], UI, 'keyboard focus ring'],
  ['accent.default', ['bg.surface', 'bg.raised'], UI, 'checked checkbox, switch'],
  ['map.marker', ['map.markerHalo'], UI, 'marker fill against its white ring'],
  ['status.live.dot', ['bg.surface', 'bg.raised'], UI, 'status dot'],
  ['status.stale.dot', ['bg.surface', 'bg.raised'], UI, 'status dot'],
  ['status.danger.dot', ['bg.surface', 'bg.raised'], UI, 'status dot'],
];

const get = (theme, path) => {
  const value = path.split('.').reduce((node, key) => node?.[key], tokens.color[theme]);
  if (typeof value !== 'string') throw new Error(`Missing colour token ${theme}.${path}`);
  return value;
};

const parseHex = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
};

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (fgHex, bgHex) => {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  if (fg.a < 1 || bg.a < 1) throw new Error(`Translucent colours cannot be checked: ${fgHex} on ${bgHex}`);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const rows = [];
for (const theme of ['light', 'dark']) {
  for (const [fg, bgs, min, use] of PAIRS) {
    for (const bg of bgs) {
      const value = ratio(get(theme, fg), get(theme, bg));
      rows.push({ theme, fg, bg, ratio: value, min, use, pass: value >= min });
    }
  }
}

const failures = rows.filter((r) => !r.pass);

if (process.argv.includes('--table')) {
  console.log('| Theme | Foreground | Background | Ratio | Needs | Use |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(`| ${r.theme} | \`${r.fg}\` | \`${r.bg}\` | ${r.ratio.toFixed(2)} | ${r.min} | ${r.use} |`);
  }
} else {
  for (const r of failures) {
    console.error(`FAIL ${r.theme}: ${r.fg} on ${r.bg} = ${r.ratio.toFixed(2)} (needs ${r.min})`);
  }
  const lowest = rows.reduce((a, b) => (b.ratio / b.min < a.ratio / a.min ? b : a));
  console.log(
    `${rows.length - failures.length}/${rows.length} pairs pass. ` +
      `Tightest: ${lowest.theme} ${lowest.fg} on ${lowest.bg} = ${lowest.ratio.toFixed(2)} (needs ${lowest.min}).`,
  );
}

process.exit(failures.length ? 1 : 0);
