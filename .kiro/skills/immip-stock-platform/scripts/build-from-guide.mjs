#!/usr/bin/env node
// Recreates the IMMIP app from the skill's guide/*.md files alone.
// Every "<!-- file: path -->" marker is followed by a ```` fenced block with that file's exact content.
// Then it generates the 30-day candle database (scripts/generate-candles.mjs) and a .env file.
//
// Usage: node build-from-guide.mjs <target-dir>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!target) {
  console.error('Usage: node build-from-guide.mjs <target-dir>');
  process.exit(1);
}
const out = path.resolve(target);
if (fs.existsSync(out) && fs.readdirSync(out).length > 0) {
  console.error(`Refusing to write into non-empty directory: ${out}`);
  process.exit(1);
}

const guideDir = path.join(skillDir, 'guide');
const chapters = fs.readdirSync(guideDir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
const block = /<!-- file: (\S+)( noeol)? -->\n````[^\n]*\n([\s\S]*?)\n````\n/g;

let count = 0;
for (const ch of chapters) {
  const md = fs.readFileSync(path.join(guideDir, ch), 'utf8');
  for (const [, rel, noeol, body] of md.matchAll(block)) {
    const dest = path.resolve(out, rel);
    if (!dest.startsWith(out + path.sep)) throw new Error(`Unsafe path in guide: ${rel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, noeol ? body : body + '\n');
    count++;
  }
}
console.log(`Wrote ${count} source files from ${chapters.length} guide chapters to ${out}`);

execFileSync(process.execPath, [path.join(skillDir, 'scripts', 'generate-candles.mjs'), out], { stdio: 'inherit' });

const envFile = path.join(out, '.env');
if (!fs.existsSync(envFile)) fs.copyFileSync(path.join(out, '.env.example'), envFile);
console.log(`Done. Next: cd "${out}" && npm install && npm run dev`);
