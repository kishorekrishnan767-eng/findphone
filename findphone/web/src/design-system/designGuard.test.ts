// Guards the design system in code review's place: the 4 px grid, token-only colours, no console.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const src = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const sources = files(src).map((p) => ({ path: relative(src, p), text: readFileSync(p, 'utf8') }));

test('no fractional spacing utilities (p-1.5, gap-0.5 …): spacing stays on the 4 px grid', () => {
  const offGrid = /\b-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|inset|top|right|bottom|left|w|h|size)-\d+\.\d+\b/g;
  const hits = sources.flatMap(({ path, text }) => (text.match(offGrid) ?? []).map((m) => `${path}: ${m}`));
  expect(hits).toEqual([]);
});

test('no hard-coded colours in components: everything comes from tokens', () => {
  const raw = /(?:bg|text|border|outline|fill|stroke|ring|divide)-\[#|#[0-9a-fA-F]{6}\b|rgb\(/g;
  const allowed = new Set(['features/map/mapStyles.ts']); // converts token values for MapLibre
  const hits = sources
    .filter(({ path }) => !allowed.has(path.replaceAll('\\', '/')))
    .flatMap(({ path, text }) => (text.match(raw) ?? []).map((m) => `${path}: ${m}`));
  expect(hits).toEqual([]);
});

test('no console.* outside lib/log.ts (privacy: nothing personal reaches the console)', () => {
  const hits = sources
    .filter(({ path }) => path.replaceAll('\\', '/') !== 'lib/log.ts')
    .filter(({ text }) => /\bconsole\./.test(text))
    .map(({ path }) => path);
  expect(hits).toEqual([]);
});
