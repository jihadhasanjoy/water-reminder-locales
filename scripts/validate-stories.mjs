// Checks stories/<lang>.json, the Insights stories the app downloads: the
// shape the app expects, unique ids, and that every picture they point at
// exists here (or is an https link) and is small enough for phones.
// { "type": "ad" } marks where an ad goes: between stories, or in a body.
//   node scripts/validate-stories.mjs
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readJSON, ROOT } from './lib.mjs';

const MAX_IMAGE_KB = 400;
const MAX_ANIMATION_KB = 150;
const IMAGE_TYPES = ['.webp', '.png', '.jpg', '.jpeg'];
const BLOCK_TYPES = ['paragraph', 'heading', 'tip', 'list', 'image', 'ad'];
// The app shows at most this many; more are ignored there.
const MAX_STORY_ADS = 3;
const MAX_LIST_ADS = 2;

const codes = readJSON('languages.json').map(l => l.code);
const errors = [];
const warnings = [];
const isText = (v, max = 4000) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

function checkImage(where, value) {
  if (typeof value !== 'string' || value === '') {
    errors.push(`${where}: image is missing`);
    return;
  }
  if (value.startsWith('https://')) {
    return;
  }
  if (/^[a-z]+:/i.test(value)) {
    errors.push(`${where}: "${value}" must be a path in this repo or an https link`);
    return;
  }
  if (!IMAGE_TYPES.some(ext => value.toLowerCase().endsWith(ext))) {
    errors.push(`${where}: "${value}" must be ${IMAGE_TYPES.join(', ')}`);
  }
  const file = join(ROOT, value);
  if (!existsSync(file)) {
    errors.push(`${where}: "${value}" doesn't exist`);
    return;
  }
  const kb = statSync(file).size / 1024;
  if (kb > MAX_IMAGE_KB) {
    errors.push(`${where}: "${value}" is ${Math.round(kb)} KB (max ${MAX_IMAGE_KB} KB)`);
  }
}

// A Lottie animation: a .json in this repo (small, and Lottie-shaped) or an
// https link.
function checkAnimation(where, value) {
  if (typeof value !== 'string' || value.startsWith('https://')) {
    if (typeof value !== 'string') errors.push(`${where}: animation must be a path or an https link`);
    return;
  }
  if (!value.endsWith('.json')) {
    errors.push(`${where}: animation "${value}" must be a .json Lottie file`);
    return;
  }
  const file = join(ROOT, value);
  if (!existsSync(file)) {
    errors.push(`${where}: animation "${value}" doesn't exist`);
    return;
  }
  const kb = statSync(file).size / 1024;
  if (kb > MAX_ANIMATION_KB) {
    errors.push(`${where}: animation "${value}" is ${Math.round(kb)} KB (max ${MAX_ANIMATION_KB} KB)`);
  }
  try {
    const data = readJSON(value);
    if (typeof data.v !== 'string' || typeof data.w !== 'number' || typeof data.h !== 'number' || !Array.isArray(data.layers)) {
      errors.push(`${where}: animation "${value}" isn't a Lottie file`);
    }
  } catch (error) {
    errors.push(`${where}: animation "${value}": ${error.message}`);
  }
}

const dir = join(ROOT, 'stories');
const files = existsSync(dir)
  ? readdirSync(dir).filter(f => f.endsWith('.json'))
  : [];
if (!files.includes('en.json')) {
  errors.push('stories/en.json is missing (English is the fallback for every language)');
}

let total = 0;
for (const name of files) {
  const code = name.replace(/\.json$/, '');
  const file = `stories/${name}`;
  if (!codes.includes(code)) {
    errors.push(`${file}: "${code}" isn't a language in languages.json`);
  }
  let data;
  try {
    data = readJSON(file);
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
    continue;
  }
  if (data.schemaVersion !== 1) {
    errors.push(`${file}: schemaVersion must be 1`);
  }
  if (!Array.isArray(data.stories)) {
    errors.push(`${file}: "stories" must be a list`);
    continue;
  }
  const ids = new Set();
  const listAds = data.stories.filter(s => s?.type === 'ad').length;
  if (listAds > MAX_LIST_ADS) {
    warnings.push(`${file}: ${listAds} list ads; the app shows only the first ${MAX_LIST_ADS}`);
  }
  if (data.stories[0]?.type === 'ad') {
    warnings.push(`${file}: an ad before the first story is ignored`);
  }
  data.stories.forEach((story, index) => {
    const where = `${file} #${index + 1}${story?.id ? ` (${story.id})` : ''}`;
    if (story?.type === 'ad') {
      if (Object.keys(story).length > 1) {
        errors.push(`${where}: an ad entry is just { "type": "ad" }`);
      }
      return;
    }
    total += 1;
    if (typeof story?.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(story.id)) {
      errors.push(`${where}: id must be lowercase letters, digits and dashes`);
    } else if (ids.has(story.id)) {
      errors.push(`${where}: duplicate id`);
    } else {
      ids.add(story.id);
    }
    if (!isText(story.category, 40)) errors.push(`${where}: category is missing or too long`);
    if (!isText(story.title, 120)) errors.push(`${where}: title is missing or too long`);
    if (!isText(story.summary, 300)) errors.push(`${where}: summary is missing or too long`);
    checkImage(where, story.image);
    if (story.animation !== undefined) checkAnimation(where, story.animation);
    if (!Number.isInteger(story.readMinutes) || story.readMinutes < 1 || story.readMinutes > 30) {
      errors.push(`${where}: readMinutes must be a whole number from 1 to 30`);
    }
    if (story.featured !== undefined && typeof story.featured !== 'boolean') {
      errors.push(`${where}: featured must be true or false`);
    }
    if (!Array.isArray(story.body) || story.body.length === 0) {
      errors.push(`${where}: body must be a non-empty list`);
    } else {
      story.body.forEach((block, b) => {
        const at = `${where} body #${b + 1}`;
        if (!BLOCK_TYPES.includes(block?.type)) {
          errors.push(`${at}: type must be ${BLOCK_TYPES.join(', ')}`);
        } else if (block.type === 'list') {
          if (!Array.isArray(block.items) || block.items.length === 0 || !block.items.every(i => isText(i, 400))) {
            errors.push(`${at}: list needs "items" with text`);
          }
        } else if (block.type === 'image') {
          checkImage(at, block.src);
          if (block.caption !== undefined && !isText(block.caption, 300)) {
            errors.push(`${at}: caption must be text`);
          }
        } else if (block.type === 'ad') {
          if (b === 0) warnings.push(`${at}: an ad as the first block is ignored`);
          if (story.body[b - 1]?.type === 'ad') warnings.push(`${at}: two ads in a row; the second is ignored`);
        } else if (!isText(block.text)) {
          errors.push(`${at}: "text" is missing`);
        }
      });
      const ads = story.body.filter(block => block?.type === 'ad').length;
      if (ads > MAX_STORY_ADS) {
        warnings.push(`${where}: ${ads} ads; the app shows at most ${MAX_STORY_ADS}`);
      }
    }
    if (story.source !== undefined) {
      if (!isText(story.source.label, 120) || typeof story.source.url !== 'string' || !story.source.url.startsWith('https://')) {
        errors.push(`${where}: source needs a label and an https url`);
      }
    }
  });
}

warnings.forEach(w => console.warn(`warning: ${w}`));
if (errors.length) {
  errors.forEach(e => console.error(`error: ${e}`));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`OK: ${files.length} story files, ${total} stories.`);
