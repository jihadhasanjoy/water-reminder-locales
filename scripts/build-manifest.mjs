// Rewrites manifest.json from languages.json, the locale files and the
// Insights stories. The version goes up by one whenever any file's hash
// changes, which is how the app knows to download again.
//   node scripts/build-manifest.mjs           update manifest.json
//   node scripts/build-manifest.mjs --check   fail if it's out of date (CI)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { flatten, readJSON, ROOT, sha256 } from './lib.mjs';

const check = process.argv.includes('--check');
const path = join(ROOT, 'manifest.json');
const previous = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : { version: 0, locales: {} };

const languages = readJSON('languages.json');
const locales = {};
for (const { code } of languages) {
  const file = `locales/${code}.json`;
  locales[code] = {
    file,
    sha256: sha256(file),
    keys: Object.keys(flatten(readJSON(file))).length,
  };
}
const languagesHash = sha256('languages.json');

// Insights stories per language (stories/<lang>.json). Pictures aren't
// listed: the app loads them by their links and caches them.
const storiesDir = join(ROOT, 'stories');
const stories = {};
if (existsSync(storiesDir)) {
  for (const name of readdirSync(storiesDir).filter(f => f.endsWith('.json')).sort()) {
    const file = `stories/${name}`;
    stories[name.replace(/\.json$/, '')] = { file, sha256: sha256(file) };
  }
}

// Story animations (stories/animations/*.json), by path: the app keeps
// them on the phone and downloads one again when its hash changes.
const animationsDir = join(storiesDir, 'animations');
const animations = {};
if (existsSync(animationsDir)) {
  for (const name of readdirSync(animationsDir).filter(f => f.endsWith('.json')).sort()) {
    const file = `stories/animations/${name}`;
    animations[file] = { sha256: sha256(file) };
  }
}

const changed =
  languagesHash !== previous.languagesSha256 ||
  JSON.stringify(locales) !== JSON.stringify(previous.locales) ||
  JSON.stringify(stories) !== JSON.stringify(previous.stories ?? {}) ||
  JSON.stringify(animations) !== JSON.stringify(previous.animations ?? {});

if (check) {
  if (changed) {
    console.error('manifest.json is out of date: run node scripts/build-manifest.mjs');
    process.exit(1);
  }
  console.log(`manifest.json is up to date (version ${previous.version}).`);
  process.exit(0);
}

if (!changed) {
  console.log(`No changes; manifest stays at version ${previous.version}.`);
  process.exit(0);
}

const manifest = {
  schemaVersion: 1,
  version: previous.version + 1,
  updatedAt: new Date().toISOString(),
  languages: 'languages.json',
  languagesSha256: languagesHash,
  locales,
  stories,
  animations,
};
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json → version ${manifest.version}`);
