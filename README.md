# water-local

Translations for the [Water Reminder](https://github.com/jihadhasanjoy/WaterReminder) app. The app downloads them from this repo, caches them on the phone, and checks for updates every time it opens, so text can be fixed or improved without an app release.

## Files

| File | What it is |
|---|---|
| `languages.json` | The languages, with their own names, script and text direction |
| `locales/<code>.json` | Every string for one language. `en.json` is the source: other languages use the same keys |
| `manifest.json` | Generated. A version number and a hash per file; the app compares these to decide what to download |

Strings can contain `{{placeholders}}` (e.g. `"Added {{amount}}"`). Keep the same placeholders as English, and keep the keys the same; a missing key shows the English text.

## Changing a translation

1. Edit `locales/<code>.json`.
2. Check it: `node scripts/validate.mjs`
3. Update the manifest: `node scripts/build-manifest.mjs` (bumps `version`)
4. Commit `locales/` and `manifest.json` together and push to `main`.

Phones pick it up the next time the app opens (GitHub's raw file cache can add up to about 5 minutes). CI fails the push if a locale doesn't match English or the manifest wasn't rebuilt.

## Adding a language

A new language needs an app release too (date names, fonts and right-to-left layout are set up in the app). Add it to `languages.json` and `locales/`, then add its code to the app.

## How the app uses this

- First launch: text comes from the copy built into the app, so it works offline.
- Every launch: the app reads `manifest.json`, downloads only the locale files whose hash changed, checks them, saves them on the phone and switches the text over without a restart.
- Offline or GitHub unreachable: the last downloaded copy is used.
