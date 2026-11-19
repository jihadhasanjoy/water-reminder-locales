// Checks every locale against English: valid JSON, only strings, the same
// keys, and the same {{placeholders}}. Exits non-zero on any problem.
//   node scripts/validate.mjs
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { flatten, placeholders, readJSON, ROOT, SOURCE } from './lib.mjs';

const languages = readJSON('languages.json');
const errors = [];
const warnings = [];

const codes = languages.map(l => l.code);
if (new Set(codes).size !== codes.length) {
  errors.push('languages.json: duplicate language codes');
}
for (const l of languages) {
  for (const field of ['code', 'englishName', 'nativeName', 'script']) {
    if (typeof l[field] !== 'string' || !l[field]) {
      errors.push(`languages.json: "${l.code}" is missing ${field}`);
    }
  }
  if (typeof l.rtl !== 'boolean') {
    errors.push(`languages.json: "${l.code}" rtl must be true or false`);
  }
  if (!['latin', 'indic', 'arabic', 'cjk'].includes(l.script)) {
    errors.push(`languages.json: "${l.code}" script must be latin, indic, arabic or cjk`);
  }
  if (!existsSync(join(ROOT, `locales/${l.code}.json`))) {
    errors.push(`locales/${l.code}.json is missing`);
  }
}

const source = flatten(readJSON(`locales/${SOURCE}.json`));

for (const { code } of languages) {
  const file = `locales/${code}.json`;
  let strings;
  try {
    strings = flatten(readJSON(file));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
    continue;
  }
  for (const [key, value] of Object.entries(strings)) {
    if (typeof value !== 'string') {
      errors.push(`${file}: ${key} must be a string`);
    } else if (!(key in source)) {
      errors.push(`${file}: ${key} is not in ${SOURCE}.json`);
    } else if (
      placeholders(value).join() !== placeholders(source[key]).join()
    ) {
      errors.push(
        `${file}: ${key} placeholders {{${placeholders(value).join('}}, {{')}}} ` +
          `don't match English {{${placeholders(source[key]).join('}}, {{')}}}`,
      );
    }
  }
  // Missing keys still work (the app falls back to English), so only warn.
  for (const key of Object.keys(source)) {
    if (!(key in strings)) {
      warnings.push(`${file}: ${key} missing (English will show)`);
    }
  }
}

warnings.forEach(w => console.warn(`warning: ${w}`));
if (errors.length) {
  errors.forEach(e => console.error(`error: ${e}`));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`OK: ${languages.length} languages, ${Object.keys(source).length} keys.`);
