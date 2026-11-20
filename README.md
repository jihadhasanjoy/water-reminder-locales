# water-reminder-locales

Translations for the [Water Reminder](https://github.com/jihadhasanjoy/WaterReminder) app. The app downloads them from this repo, caches them on the phone, and checks for updates every time it opens, so text can be fixed or improved without an app release.

## Files

| File | What it is |
|---|---|
| `languages.json` | The languages, with their own names, script and text direction. The app reads it: a language listed here (with its locale file) shows up in the app |
| `locales/<code>.json` | Every string for one language. `en.json` is the source: other languages use the same keys |
| `manifest.json` | Generated. A version number and a hash per file; the app compares these to decide what to download |
| `app-config.json` | Not translations: which app builds must or may update (see below) |
| `stories/<code>.json` | The stories on the app's Insights tab, one file per language (see below) |
| `stories/images/` | Pictures for those stories, shared by every language |
| `stories/animations/` | Lottie animations for those stories, shared by every language |

Strings can contain `{{placeholders}}` (e.g. `"Added {{amount}}"`). Keep the same placeholders as English, and keep the keys the same; a missing key shows the English text.

## Changing a translation

1. Edit `locales/<code>.json`.
2. Check it: `node scripts/validate.mjs`
3. Update the manifest: `node scripts/build-manifest.mjs` (bumps `version`)
4. Commit `locales/` and `manifest.json` together and push to `main`.

Phones pick it up the next time the app opens (GitHub's raw file cache can add up to about 5 minutes). CI fails the push if a locale doesn't match English or the manifest wasn't rebuilt.

## Adding a language

No app release needed (from the app build that reads `languages.json`, commit `0cc4aeb` in WaterReminder; older builds show only their built-in languages and simply ignore new ones).

1. Add `locales/<code>.json` with the same keys and `{{placeholders}}` as `en.json` (missing keys fall back to English).
2. Add the language to `languages.json`:
   ```json
   { "code": "zh", "englishName": "Chinese (Simplified)", "nativeName": "简体中文", "rtl": false, "script": "cjk" }
   ```
   - `code`: lowercase language code, e.g. `zh`, `es`, or `pt-BR` style with a region.
   - `nativeName`: how the language calls itself; that's what the language list shows.
   - `rtl`: `true` for right-to-left languages (Arabic, Persian, Urdu…). The layout flips after the app restarts.
   - `script`: `latin`, `indic` (Bangla, Hindi…), `arabic` or `cjk` (Chinese, Japanese, Korean). It picks the font and line height; anything else uses the phone's system font.
3. Check it: `node scripts/validate.mjs`, then `node scripts/build-manifest.mjs`.
4. Commit and push. Phones download it the next time the app opens, and it appears in Settings → Language once its whole file is saved on the phone.

Date and month names come from the app. It has them for about 25 common languages (including Chinese, Japanese, Korean, Arabic, Spanish, French, Portuguese, Russian, Turkish, Indonesian, Thai and Vietnamese); a language without them shows English date names.

## How the app uses this

- First launch: text comes from the copy built into the app (English, Bangla, Hindi, Urdu, German, Italian), so it works offline.
- Every launch: the app reads `manifest.json`; when it changed, also `languages.json`. It downloads only the locale files whose hash changed (built-in languages and those in `languages.json`), checks them, saves them on the phone and switches the text over without a restart.
- Offline or GitHub unreachable: the last downloaded copy is used, including downloaded languages.

## Stories (Insights tab)

The Insights tab lists short reads about drinking water. They all live here (nothing is built into the app), so stories and pictures can be added or changed with a push, no app release. Until a phone has downloaded them once, the tab shows "No insights found" with a retry.

`stories/<code>.json`:

```json
{
  "schemaVersion": 1,
  "stories": [
    {
      "id": "kidneys",
      "category": "Health",
      "title": "Why water keeps your kidneys happy",
      "summary": "One or two lines for the list.",
      "image": "stories/images/kidneys.webp",
      "animation": "stories/animations/kidneys.json",
      "readMinutes": 3,
      "featured": true,
      "body": [
        { "type": "paragraph", "text": "…" },
        { "type": "heading", "text": "…" },
        { "type": "tip", "text": "…" },
        { "type": "list", "items": ["…", "…"] },
        { "type": "image", "src": "stories/images/glass.webp", "caption": "…" }
      ],
      "source": { "label": "NHS", "url": "https://www.nhs.uk/…" }
    }
  ]
}
```

- Order in the file is the order in the app. `featured` stories show first as big cards; the rest as a list.
- `id`: lowercase letters, digits and dashes; the same in every language.
- `image` / `src`: a path in this repo (`stories/images/…`, `.webp`, `.png` or `.jpg`, at most 400 KB; about 800×480 WebP works well) or a full `https://` link.
- A language without its own file, or without one of the stories, shows the English story. `stories/en.json` is required.
- `animation` (optional): a Lottie file (`stories/animations/…json`, at most 150 KB, or an `https://` link) that plays in place of the picture on the list and the story page: a short loop showing what the story is about. The app downloads it with the stories, keeps it for offline use and downloads it again when the file changes. Until it's downloaded, or if it's broken, the picture shows, so keep `image` too. The starter animations come from `python3 scripts/make-story-animations.py` (edit a scene there and run it), but any Lottie file works, e.g. one exported from After Effects or downloaded from LottieFiles.
- Unknown block types are skipped by the app, so new ones can be added later without breaking older builds.

### Ads in stories

`{ "type": "ad" }` puts an ad (a Google inline banner, labelled "Advertisement") where the tag is:

- **Inside a story**, as a body block: in the middle, at the bottom, or several in a long story.
  ```json
  "body": [
    { "type": "paragraph", "text": "…" },
    { "type": "ad" },
    { "type": "paragraph", "text": "…" },
    { "type": "ad" }
  ]
  ```
- **In the list**, as an entry between stories: the ad shows after the story before it.
  ```json
  "stories": [
    { "id": "kidneys", … },
    { "id": "breakfast", … },
    { "type": "ad" },
    { "id": "lunch", … }
  ]
  ```

The app keeps it reasonable whatever the file says: at most 3 ads per story and 2 in the list, never two in a row, never before the first text. No ads while the user has ad-free time, and nothing (no gap) when an ad doesn't load. A language without list ads uses the English file's. `validate-stories.mjs` warns about tags the app will ignore. Older app builds skip the tags.

To add or change a story:

1. Edit `stories/en.json` (and the other languages), add any picture to `stories/images/`.
2. Check it: `node scripts/validate-stories.mjs`
3. Update the manifest: `node scripts/build-manifest.mjs`
4. Commit and push. Phones download the changed files the next time the app opens (or on pull to refresh on the Insights tab) and keep them, pictures included, for offline use.

## Requiring an app update (`app-config.json`)

The app also reads `app-config.json` each time it opens (and on coming back to it after 30 minutes). It has nothing to do with the translations; it only lives here so no server is needed.

```json
{
  "schemaVersion": 1,
  "android": {
    "minVersion": "1.0.0-7",
    "latestVersion": "1.1.0-9",
    "storeUrl": ""
  },
  "ios": {
    "minVersion": "1.0.0-7",
    "latestVersion": "1.1.0-9",
    "storeUrl": ""
  }
}
```

A platform with no rules (or no `ios`/`android` entry at all) isn't checked.

Two settings for ads, shared by both platforms:

| Field | Meaning |
|---|---|
| `adFreeTrialDays` | Days without ads a **new user** gets, counted from the welcome sheet right after onboarding (2 = 48 hours). `0` turns the gift off. Missing, or the file can't be read: 1 day. Whole number, 0–30 |
| `rewardedAdFreeHours` | Hours without ads each **watched video** adds (from the "Hide ads?" link under banners). Videos stack: each adds its hours on top of any ad-free time left. Missing: 12. Whole number, 1–72 |

Changes apply to phones the next time they read the file; ad-free time already given isn't changed.

| Field | Meaning |
|---|---|
| `minVersion` | Older than this: a full-screen **Update required** page; the app can't be used until it's updated |
| `latestVersion` | Older than this: a **New version available** sheet each time the app opens (Later closes it until the next open), and Settings → About shows **Update available**. Its version is the name shown: "Version 1.1.0 is here" |
| `storeUrl` | Where **Update now** sends people: the Play Store / App Store page. Leave it `""` until the app is in the store; meanwhile **Update now** downloads nothing and just says the update isn't ready yet. On Android, with a link, Google Play downloads and installs the update inside the app when it can |

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

To change it: edit the file, check it with `node scripts/validate-config.mjs`, commit and push. Phones pick it up the next time the app opens (GitHub's cache can add up to about 5 minutes). Offline phones keep the last copy they downloaded, and a broken file is ignored, so a mistake can't lock anyone out; CI also rejects it.

Before raising `minVersion`, make sure that version is live in the store, or people will be sent to an update they can't get yet.

Debug builds can try all of this without touching the file: Settings → Developer → **Test: update required** / **Test: new version available**.
