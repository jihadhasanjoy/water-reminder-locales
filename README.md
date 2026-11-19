# water-reminder-locales

Translations for the [Water Reminder](https://github.com/jihadhasanjoy/WaterReminder) app. The app downloads them from this repo, caches them on the phone, and checks for updates every time it opens, so text can be fixed or improved without an app release.

## Files

| File | What it is |
|---|---|
| `languages.json` | The languages, with their own names, script and text direction |
| `locales/<code>.json` | Every string for one language. `en.json` is the source: other languages use the same keys |
| `manifest.json` | Generated. A version number and a hash per file; the app compares these to decide what to download |
| `app-config.json` | Not translations: which app builds must or may update (see below) |

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

## Requiring an app update (`app-config.json`)

The app also reads `app-config.json` each time it opens (and on coming back to it after 30 minutes). It has nothing to do with the translations; it only lives here so no server is needed.

```json
{
  "schemaVersion": 1,
  "android": {
    "minVersion": "1.0.0-7",
    "latestVersion": "1.1.0-12"
  },
  "ios": {
    "minVersion": "1.0.0",
    "latestVersion": "1.1.0"
  }
}
```

A platform with no rules (or no `ios`/`android` entry at all) isn't checked.

| Field | Meaning |
|---|---|
| `minVersion` | Older than this: a full-screen **Update required** page; the app can't be used until it's updated |
| `latestVersion` | Older than this: a **New version available** sheet each time the app opens (Later closes it until the next open), and Settings → About shows **Update available**. Its version is the name shown: "Version 1.1.0 is here" |
| `storeUrl` | Optional: where **Update now** sends people. Without it, Android opens the app's Play listing and iOS looks up its App Store page from the bundle id (Apple's public lookup), so neither needs a link once the app is published. Before that, **Update now** says it couldn't open the update |

Each rule is a **version, optionally with the build**: `"1.2.0"` or `"1.2.0-7"`. Leave a rule out to turn it off.

**How it compares:** the version first, part by part as numbers (`1.10.0` is newer than `1.9.0`, `1.2` equals `1.2.0`). Only when the versions are the same does the build decide. That keeps iOS right, where build numbers may start again at 1 for each new version.

| Installed | `minVersion` | `latestVersion` | Result |
|---|---|---|---|
| 1.0.0 (5) | 1.0.0-7 | 1.1.0 | Update required (same version, build 5 < 7) |
| 1.0.0 (8) | 1.0.0-7 | 1.1.0 | New version available (1.0.0 < 1.1.0) |
| 1.1.0 (1) | 1.0.0-7 | 1.1.0 | Nothing |
| 1.10.0 (1) | 1.0.0-7 | 1.9.0 | Nothing (1.10 is newer than 1.9) |

Settings → About shows the installed version and build, e.g. `1.0.0 (8)`; debug builds also show the config's minimum and latest under Settings → Developer.

**Every release needs a new version name** (the `versionName` input of the GitHub Actions release, e.g. 1.1.0), or all builds look like the same version and only the build can tell them apart.

On Android, **Update now** uses Google Play's in-app update: Play downloads and installs the new version inside the app. That only works for installs from Play; other installs, and iOS, open the store page instead.

To change it: edit the file, check it with `node scripts/validate-config.mjs`, commit and push. Phones pick it up the next time the app opens (GitHub's cache can add up to about 5 minutes). Offline phones keep the last copy they downloaded, and a broken file is ignored, so a mistake can't lock anyone out; CI also rejects it.

Before raising `minVersion`, make sure that version is live in the store, or people will be sent to an update they can't get yet.

Debug builds can try all of this without touching the file: Settings → Developer → **Test: update required** / **Test: new version available**.
