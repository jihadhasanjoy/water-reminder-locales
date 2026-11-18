// Shared helpers for the validate and manifest scripts. No dependencies.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(import.meta.dirname, '..');
export const SOURCE = 'en';

export const readJSON = file => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

export const sha256 = file =>
  createHash('sha256').update(readFileSync(join(ROOT, file))).digest('hex');

// { "home.title": "…", … } for every string in a nested locale object.
export function flatten(object, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

// The {{placeholders}} in a string, sorted.
export const placeholders = text =>
  [...String(text).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m => m[1]).sort();
