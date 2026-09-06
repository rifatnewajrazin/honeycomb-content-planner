// One-off (re-runnable) image optimisation.
//
// Avatars, brand logos and profile photos are 100–330 KB PNG/JPG files that
// render at 14–64 px. This writes a small WebP sibling next to each one
// (same basename, .webp extension). Originals are left in place as a fallback
// for any Supabase row that still stores a .png/.jpg path — nothing is
// deleted, no stored data changes. app.js resolves .png/.jpg asset paths to
// .webp at render time via honeyAsset().
//
// Run: npm run images

import { readdir, mkdir, copyFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

const ORIG_DIR = 'assets/_originals'; // extra safety copy of every source file

const JOBS = [
  { dir: 'assets/avatars', size: 96 },
  { dir: 'assets/logos', size: 128 },
  { files: ['assets/rifat-profile.jpg', 'assets/jubayer-profile.jpg'], size: 256 },
];

let saved = 0, count = 0;

async function convert(file, size) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) return;
  const out = file.slice(0, -ext.length) + '.webp';

  // stash a pristine copy of the original
  const origCopy = path.join(ORIG_DIR, file);
  await mkdir(path.dirname(origCopy), { recursive: true });
  if (!existsSync(origCopy)) await copyFile(file, origCopy);

  const before = (await stat(file)).size;
  await sharp(file)
    .resize(size, size, { fit: 'cover', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  const after = (await stat(out)).size;
  saved += before - after;
  count++;
  console.log(`  ${file}  ${(before / 1024).toFixed(0)}K -> ${(after / 1024).toFixed(0)}K  ${path.basename(out)}`);
}

for (const job of JOBS) {
  const files = job.files || (await readdir(job.dir)).map((f) => path.join(job.dir, f));
  for (const f of files) {
    try { await convert(f, job.size); }
    catch (e) { console.warn(`  skip ${f}: ${e.message}`); }
  }
}

console.log(`\n${count} images -> WebP, ~${(saved / 1024 / 1024).toFixed(2)} MB saved. Originals kept in place + copied to ${ORIG_DIR}/`);
