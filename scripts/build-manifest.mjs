// Rewrites manifest.json from languages.json and the locale files. The
// version goes up by one whenever any file's hash changes, which is how the
// app knows to download again.
//   node scripts/build-manifest.mjs           update manifest.json
//   node scripts/build-manifest.mjs --check   fail if it's out of date (CI)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

const changed =
  languagesHash !== previous.languagesSha256 ||
  JSON.stringify(locales) !== JSON.stringify(previous.locales);

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
};
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json → version ${manifest.version}`);
