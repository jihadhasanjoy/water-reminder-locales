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
    "minVersion": "1.2.0",
    "latestVersion": "1.3.0",
    "whatsNew": {
      "en": "• Wheel pickers for dates and times\n• Past times can't be added to the schedule",
      "bn": "• তারিখ আর সময়ের জন্য চাকার মতো পিকার\n• অতীতের সময় আর যোগ করা যায় না"
    }
  },
  "ios": {}
}
```

| Field | Meaning |
|---|---|
| `minVersion` | Versions below this see a full-screen **Update required** page and can't use the app until they update |
| `latestVersion` | Versions below this get a **New version available** sheet once (dismissable), and Settings → About shows **Update available**. Also the name shown: "Version 1.3.0 is here" |
| `minBuild`, `latestBuild` | Optional. Build numbers that only count between builds of the **same** version, e.g. to block one bad build of 1.2.0. On their own (no version) they compare build numbers only |
| `whatsNew` | Optional. What changed, per language code (`\n` starts a new line). The app shows its own language, else `en`, on the update sheet and the required page |
| `storeUrl` | Where **Update now** sends people. Optional on Android (defaults to the Play listing). On iOS nothing is required or offered until this is set |

**How versions are compared:** part by part, as numbers, left to right: `1.10.0` is newer than `1.9.0`, and `1.2` equals `1.2.0`. The version decides first; the build number only matters when the versions are the same. That keeps iOS right, where build numbers may start again at 1 for each new version (1.1.0 build 1 is newer than 1.0.0 build 7). A rule left out is off.

| Installed | `minVersion` | `latestVersion` | Result |
|---|---|---|---|
| 1.1.9 | 1.2.0 | 1.3.0 | Update required |
| 1.2.0 | 1.2.0 | 1.3.0 | New version available |
| 1.3.0 | 1.2.0 | 1.3.0 | Nothing |
| 1.10.0 | 1.2.0 | 1.9.0 | Nothing (1.10 is newer than 1.9) |

**Every release needs a new version name** (the `versionName` input of the GitHub Actions release, e.g. 1.1.0, 1.2.0), or all builds look the same to this check. Settings → About shows the installed version and build, e.g. `1.2.0 (42)`.

On Android, **Update now** uses Google Play's in-app update: Play downloads and installs the new version inside the app. That only works for installs from Play; other installs, and iOS, open the store page instead.

To change it: edit the file, check it with `node scripts/validate-config.mjs`, commit and push. Phones pick it up the next time the app opens (GitHub's cache can add up to about 5 minutes). Offline phones keep the last copy they downloaded, and a broken file is ignored, so a mistake can't lock anyone out; CI also rejects it.

Before raising `minVersion`, make sure that version is live in the store, or people will be sent to an update they can't get yet.

Debug builds can try all of this without touching the file: Settings → Developer → **Test: update required** / **Test: new version available**.
