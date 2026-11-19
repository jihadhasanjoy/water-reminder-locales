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
    "minBuild": 42,
    "latestBuild": 45,
    "latestVersion": "1.2.0",
    "whatsNew": {
      "en": "• Wheel pickers for dates and times\n• Past times can't be added to the schedule",
      "bn": "• তারিখ আর সময়ের জন্য চাকার মতো পিকার\n• অতীতের সময় আর যোগ করা যায় না"
    },
    "storeUrl": "https://play.google.com/store/apps/details?id=com.dropwise.waterreminder"
  },
  "ios": { "minBuild": 0, "latestBuild": 0 }
}
```

| Field | Meaning |
|---|---|
| `minBuild` | Builds below this see a full-screen **Update required** page and can't use the app until they update |
| `latestBuild` | Builds below this get a **New version available** sheet once, which they can dismiss |
| `latestVersion` | Optional. The new version's name, shown as "Version 1.2.0 is here" and in Settings → About |
| `whatsNew` | Optional. What changed, per language code (`\n` starts a new line). The app shows its own language, else `en`, on the update sheet and the required page |
| `storeUrl` | Where **Update now** sends people. Optional on Android (defaults to the Play listing). On iOS nothing is required or offered until this is set |

Settings → About always shows the installed version and build, e.g. `1.0.0 (42)`, plus an **Update available** row while a newer build is out.

Build numbers are the store build numbers: `versionCode` on Android (the GitHub Actions run number for release builds), `CFBundleVersion` on iOS. Use `0` to turn a rule off.

On Android, **Update now** uses Google Play's in-app update: Play downloads and installs the new version inside the app. That only works for installs from Play; other installs, and iOS, open the store page instead.

To change it: edit the file, check it with `node scripts/validate-config.mjs`, commit and push. Phones pick it up the next time the app opens (GitHub's cache can add up to about 5 minutes). Offline phones keep the last copy they downloaded, and a broken file is ignored, so a mistake can't lock anyone out; CI also rejects it.

Before raising `minBuild`, make sure that build is live in the store, or people will be sent to an update they can't get yet.
