// Checks the posted-tracking rules that the Task Tracker, Dashboard and Log
// Report depend on. Runs at the start of `npm run build` (see build.mjs) and
// stops the build if any rule is broken, so a regression can't be deployed.
// Also runnable on its own: `node scripts/test-posted.mjs`.
//
// app.js is a browser module with side effects on load, so instead of
// importing it this pulls the exact function sources out of it and runs them
// against a fake `state`. If a function below is renamed, this script fails
// loudly rather than silently testing nothing.

import { readFileSync } from 'fs';

const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function extractBlock(startIdx, open, close) {
  let depth = 0;
  for (let i = src.indexOf(open, startIdx); i < src.length; i++) {
    if (src[i] === open) depth++;
    if (src[i] === close && --depth === 0) return src.slice(startIdx, i + 1);
  }
  throw new Error('Unbalanced block in app.js');
}
function fnSource(name) {
  const i = src.indexOf(`function ${name}(`);
  if (i === -1) throw new Error(`test-posted: function ${name}() not found in app.js`);
  return extractBlock(i, '{', '}');
}
function constSource(name, open, close) {
  const i = src.indexOf(`const ${name} =`);
  if (i === -1) throw new Error(`test-posted: const ${name} not found in app.js`);
  return extractBlock(i, open, close) + ';';
}

const FUNCS = [
  'matchTaskToBrandId', 'taskEffectiveBrandId', 'taskIsSubBrandBucket', 'pageKeysForTask',
  'brandForPageKey', 'pageLabelForLog', 'isTaskFullyPosted', 'getTaskPostedState',
  'countPublishedForBrand', 'describeTaskChanges'
];
const code = [
  constSource('DEFAULT_BRANDS', '[', ']'),
  constSource('BRAND_HIERARCHY', '{', '}'),
  ...FUNCS.map(fnSource),
  `return { DEFAULT_BRANDS, BRAND_HIERARCHY, ${FUNCS.join(', ')} };`
].join('\n');
const state = { brands: [], tasks: [] };
const app = new Function('state', code)(state);
state.brands = app.DEFAULT_BRANDS;

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`  FAIL ${label}\n       expected ${JSON.stringify(expected)}\n       got      ${JSON.stringify(actual)}`);
  }
}

// A fixed business week (Sat 19 Sep to Fri 25 Sep 2026) and the one before.
const week = [new Date(2026, 8, 19, 0, 0, 0), new Date(2026, 8, 25, 23, 59, 59)];
const lastWeek = [new Date(2026, 8, 12, 0, 0, 0), new Date(2026, 8, 18, 23, 59, 59)];
const THIS = '2026-09-23T10:00:00.000Z';
const LAST = '2026-09-15T10:00:00.000Z';
const count = (tasks, brandId, w = week) => app.countPublishedForBrand(tasks, brandId, w[0], w[1]);

// Every sub-brand and its parent must exist, or parent-page posts go nowhere.
Object.entries(app.BRAND_HIERARCHY).forEach(([sub, parent]) => {
  check(`brand "${sub}" exists`, app.DEFAULT_BRANDS.some(b => b.name === sub), true);
  check(`parent brand "${parent}" exists`, app.DEFAULT_BRANDS.some(b => b.name === parent), true);
});

// 1. Normal brand, one page.
{
  const t = { id: 'T-1', taskType: 'post', brandId: 'tahams', posted: { main: true }, postedAt: THIS };
  check('normal brand counts for its own card', count([t], 'tahams'), 1);
  check('normal brand is fully posted', app.isTaskFullyPosted(t), true);
}

// 2. Sub-brand posted on both pages: counts once on each card (the T-188 bug).
{
  const t = { id: 'T-2', taskType: 'post', brandId: 'lumina-tahams', posted: { sub: true, parent: true }, postedAt: THIS };
  check('sub-brand both pages: sub-brand card', count([t], 'lumina-tahams'), 1);
  check('sub-brand both pages: Tahams card', count([t], 'tahams'), 1);
  check('sub-brand both pages: fully posted', app.getTaskPostedState(t), 'posted');
  check('log names both pages', t && ['sub', 'parent'].map(k => app.pageLabelForLog(t, k)), ['Lumina by Tahams page', 'Tahams page']);
}

// 3. Sub-brand posted on its own page only.
{
  const t = { id: 'T-3', taskType: 'post', brandId: 'perfume-tahams', posted: { sub: true, parent: false }, postedAt: THIS };
  check('sub page only: sub-brand card counts', count([t], 'perfume-tahams'), 1);
  check('sub page only: Tahams card does not', count([t], 'tahams'), 0);
  check('sub page only: partial', app.getTaskPostedState(t), 'partial');
  check('sub page only: not fully posted', app.isTaskFullyPosted(t), false);
}

// 4. Brand changed after marking: leftover keys from the old brand are ignored.
{
  const t = { id: 'T-4', taskType: 'post', brandId: 'lumina-tahams', posted: { main: false, sub: true, parent: true }, postedAt: THIS };
  check('leftover unticked key ignored: fully posted', app.isTaskFullyPosted(t), true);
  check('leftover unticked key ignored: state', app.getTaskPostedState(t), 'posted');
  const u = { id: 'T-5', taskType: 'post', brandId: 'tahams', posted: { main: false, sub: true, parent: true }, postedAt: THIS };
  check('leftover ticked keys do not count for new brand', count([u], 'tahams'), 0);
  check('leftover ticked keys do not make it posted', app.isTaskFullyPosted(u), false);
}

// 5. Pages posted in different weeks land in their own week.
{
  const t = {
    id: 'T-6', taskType: 'post', brandId: 'star-tahams', posted: { sub: true, parent: true },
    postedAt: THIS, postedAtByPage: { sub: LAST, parent: THIS }
  };
  check('per-page time: sub-brand counted last week', count([t], 'star-tahams', lastWeek), 1);
  check('per-page time: sub-brand not this week', count([t], 'star-tahams'), 0);
  check('per-page time: Tahams counted this week', count([t], 'tahams'), 1);
}

// 6. Old marks with no postedAt fall back to the scheduled date.
{
  const t = { id: 'T-7', taskType: 'post', brandId: 'merchtile', posted: { main: true }, date: '2026-09-20' };
  check('no postedAt falls back to date', count([t], 'merchtile'), 1);
}

// 7. General design tasks and unposted posts never count.
{
  const g = { id: 'T-8', taskType: 'general', brandId: 'tahams', posted: { main: true }, postedAt: THIS };
  const n = { id: 'T-9', taskType: 'post', brandId: 'tahams', posted: { main: false }, postedAt: THIS };
  check('general task not counted, unposted not counted', count([g, n], 'tahams'), 0);
}

// 8. Edit log lists what changed.
{
  const before = { name: 'A', brandId: 'tahams', status: 'In Progress', comments: 'x', taskType: 'post' };
  const after = { name: 'A', brandId: 'lumina-tahams', status: 'Finished', comments: 'y', taskType: 'post' };
  check('edit log summary', app.describeTaskChanges(before, after),
    'brand: Tahams to Lumina by Tahams; status: "In Progress" to "Finished"; comments changed');
  check('edit log with no changes', app.describeTaskChanges(before, { ...before }), 'no changes');
}

if (failures) {
  console.error(`test-posted: ${failures} check(s) failed. Build stopped.`);
  process.exit(1);
}
console.log('  posted-tracking checks passed');
