// Build step for the Honeycomb Content Planner.
//
// The app ships as hand-written static files (index.html, app.js, style.css).
// This script produces the *deployed* artefacts:
//
//   assets/vendor/supabase-js.min.js  — @supabase/supabase-js, bundled + pinned
//                                       (was a runtime import from esm.sh — ~20
//                                        chained third-party requests on cold load)
//   app.min.js                        — minified app.js
//   style.min.css                     — minified style.css
//
// index.html references the .min.* files; sources stay editable. Run `npm run
// build` before every deploy and bump the ?v= query strings in index.html.

import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./node_modules/@supabase/supabase-js/package.json', import.meta.url)));

// 1. Vendor Supabase — single self-contained ESM module, version pinned.
await esbuild.build({
  entryPoints: ['@supabase/supabase-js'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  outfile: 'assets/vendor/supabase-js.min.js',
  banner: { js: `// @supabase/supabase-js v${pkg.version} — bundled by build.mjs, do not edit. Re-run \`npm run build\` to update.` },
  legalComments: 'none',
});
console.log(`  assets/vendor/supabase-js.min.js  (@supabase/supabase-js v${pkg.version})`);

// 2. Minify app.js
await esbuild.build({
  entryPoints: ['app.js'],
  minify: true,
  format: 'esm',
  target: 'es2020',
  outfile: 'app.min.js',
  legalComments: 'none',
});
console.log('  app.min.js');

// 3. Minify style.css
await esbuild.build({
  entryPoints: ['style.css'],
  minify: true,
  loader: { '.css': 'css' },
  outfile: 'style.min.css',
  legalComments: 'none',
});
console.log('  style.min.css');

console.log('build ok');
