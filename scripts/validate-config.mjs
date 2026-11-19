// Checks app-config.json, which tells the app which builds must or may
// update. A mistake here could lock people out of the app, so anything
// unexpected fails. Exits non-zero on any problem.
//   node scripts/validate-config.mjs
import { readJSON } from './lib.mjs';

const FILE = 'app-config.json';
const errors = [];

let config;
try {
  config = readJSON(FILE);
} catch (error) {
  console.error(`error: ${FILE}: ${error.message}`);
  process.exit(1);
}

const isBuild = value => Number.isInteger(value) && value >= 0;

for (const key of Object.keys(config)) {
  if (!['schemaVersion', 'android', 'ios'].includes(key)) {
    errors.push(`unknown field "${key}"`);
  }
}
if (config.schemaVersion !== 1) {
  errors.push('schemaVersion must be 1');
}
for (const platform of ['android', 'ios']) {
  const rules = config[platform];
  if (rules === undefined) {
    continue;
  }
  for (const key of Object.keys(rules)) {
    if (!['minBuild', 'latestBuild', 'storeUrl'].includes(key)) {
      errors.push(`${platform}: unknown field "${key}"`);
    }
  }
  for (const key of ['minBuild', 'latestBuild']) {
    if (!isBuild(rules[key])) {
      errors.push(`${platform}.${key} must be a whole number, 0 or more`);
    }
  }
  if (isBuild(rules.minBuild) && rules.latestBuild < rules.minBuild) {
    errors.push(`${platform}.latestBuild can't be below minBuild`);
  }
  if (
    rules.storeUrl !== undefined &&
    !(typeof rules.storeUrl === 'string' && rules.storeUrl.startsWith('https://'))
  ) {
    errors.push(`${platform}.storeUrl must start with https://`);
  }
}

if (errors.length) {
  errors.forEach(e => console.error(`error: ${FILE}: ${e}`));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
const summary = ['android', 'ios']
  .filter(p => config[p])
  .map(p => `${p} min ${config[p].minBuild}, latest ${config[p].latestBuild}`)
  .join('; ');
console.log(`OK: ${FILE} (${summary}).`);
