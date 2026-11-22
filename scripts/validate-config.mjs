// Checks app-config.json (every build reads it: the store app from main,
// the test app and debug builds from dev), which tells the app which
// versions must or may update, and how long new users and rewarded videos
// go without ads. A mistake here could lock people out of the app, so
// anything unexpected fails. Exits non-zero on any problem.
//   node scripts/validate-config.mjs              # app-config.json
//   node scripts/validate-config.mjs other.json   # another file
import { readJSON } from './lib.mjs';

const FILE = process.argv[2] ?? 'app-config.json';
const errors = [];

let config;
try {
  config = readJSON(FILE);
} catch (error) {
  console.error(`error: ${FILE}: ${error.message}`);
  process.exit(1);
}

// "1.2.0" or "1.2.0-7" (a version, optionally with the build of it), as the
// app reads it.
const RULE = /^(\d+(?:\.\d+){0,3})(?:-(\d+))?$/;
const parseRule = rule => {
  const match = typeof rule === 'string' ? RULE.exec(rule) : null;
  return match
    ? { version: match[1], build: match[2] !== undefined ? Number(match[2]) : undefined }
    : undefined;
};

// -1, 0 or 1, as the app compares: version part by part, then the build.
function compareRules(a, b) {
  const left = a.version.split('.').map(Number);
  const right = b.version.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return Math.sign((a.build ?? 0) - (b.build ?? 0));
}

// The AdMob account that owns the app's ad units (src/core/utils/constants.ts
// in the app: ADMOB_PUBLISHER).
const ADMOB_PUBLISHER = 'ca-app-pub-2066803851976714';
const AD_UNIT = new RegExp(`^${ADMOB_PUBLISHER}/\\d{6,}$`);

for (const key of Object.keys(config)) {
  if (!['schemaVersion', 'adFreeTrialDays', 'rewardedAdFreeHours', 'android', 'ios'].includes(key)) {
    errors.push(`unknown field "${key}"`);
  }
}
if (config.schemaVersion !== 1) {
  errors.push('schemaVersion must be 1');
}
// Whole numbers, in the ranges the app accepts (outside them the app
// ignores the whole file and keeps its last good copy).
const wholeIn = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;
if (config.adFreeTrialDays !== undefined && !wholeIn(config.adFreeTrialDays, 0, 30)) {
  errors.push('adFreeTrialDays must be a whole number from 0 to 30');
}
// 0 switches the watch-a-video offer off.
if (config.rewardedAdFreeHours !== undefined && !wholeIn(config.rewardedAdFreeHours, 0, 72)) {
  errors.push('rewardedAdFreeHours must be a whole number from 0 to 72');
}
for (const platform of ['android', 'ios']) {
  const rules = config[platform];
  if (rules === undefined) {
    continue;
  }
  for (const key of Object.keys(rules)) {
    if (!['minVersion', 'latestVersion', 'storeUrl', 'storeUrlProd', 'storeUrlDev', 'bannerUnit', 'rewardedUnit'].includes(key)) {
      errors.push(`${platform}: unknown field "${key}"`);
    }
  }
  for (const key of ['minVersion', 'latestVersion']) {
    if (rules[key] !== undefined && !parseRule(rules[key])) {
      errors.push(`${platform}.${key} must look like 1.2.0 or 1.2.0-7 (version-build)`);
    }
  }
  // The newest version can't be older than the oldest one still allowed.
  const min = parseRule(rules.minVersion);
  const latest = parseRule(rules.latestVersion);
  if (min && latest && compareRules(latest, min) < 0) {
    errors.push(`${platform}.latestVersion can't be below minVersion`);
  }
  // Store app: storeUrlProd (storeUrl for older app versions), empty until
  // the app is in the store. Test app: storeUrlDev, its download page.
  for (const key of ['storeUrl', 'storeUrlProd', 'storeUrlDev']) {
    const url = rules[key];
    if (url !== undefined && url !== '' && !(typeof url === 'string' && url.startsWith('https://'))) {
      errors.push(`${platform}.${key} must be empty or start with https://`);
    }
  }
  // AdMob ad units of this app's own account (the app ignores any other).
  for (const key of ['bannerUnit', 'rewardedUnit']) {
    const unit = rules[key];
    if (unit !== undefined && unit !== '' && !(typeof unit === 'string' && AD_UNIT.test(unit))) {
      errors.push(`${platform}.${key} must be empty or an ad unit of this app's AdMob account: ${ADMOB_PUBLISHER}/1234567890`);
    }
  }
}

if (errors.length) {
  errors.forEach(e => console.error(`error: ${FILE}: ${e}`));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
const summary = ['android', 'ios']
  .filter(p => config[p])
  .map(p => `${p} min ${config[p].minVersion ?? 'off'}, latest ${config[p].latestVersion ?? 'off'}`)
  .join('; ');
const units = ['android', 'ios']
  .filter(p => config[p])
  .map(p => `${p} ads ${config[p].bannerUnit && config[p].rewardedUnit ? 'real' : config[p].bannerUnit || config[p].rewardedUnit ? 'partly real' : 'test'}`)
  .join(', ');
const ads = `ad-free welcome ${config.adFreeTrialDays ?? 1} day(s), video ${config.rewardedAdFreeHours === 0 ? 'off' : `+${config.rewardedAdFreeHours ?? 12} h`}; ${units}`;
console.log(`OK: ${FILE} (${summary}; ${ads}).`);
