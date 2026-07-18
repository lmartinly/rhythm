# Rhythm

A personal life tracker. It remembers what you did and when — gently, and without pressure.

No streaks. No scores. No guilt. Just a calm record of your days.

## What's inside

```
rhythm/
├── index.html            App shell
├── manifest.webmanifest  PWA manifest (installable on iOS/Android)
├── sw.js                 Service worker — full offline support
├── css/styles.css        Design system (light + dark)
├── icons/                App icons generated from the Rhythm logo
└── js/
    ├── app.js            Router, navigation, refresh loop
    ├── store.js          Data layer (localStorage, versioned)
    ├── seed.js           Editable starter templates
    ├── util.js           DOM builder, dates, icon system, constants
    ├── icons.js          Curated Lucide icon set (ISC license)
    ├── ui.js             Sheets, toasts, menus, form fields
    ├── actions.js        Shared flows (run routine, cleaning session, editors…)
    ├── theme.js          System / Light / Dark
    ├── drive.js          Google Drive backup (optional)
    └── views/            Dashboard · Calendar · Quick Add · Library · Settings
```

No build step, no dependencies, no backend. Vanilla ES modules — what you see is what ships. Icons are a bundled subset of
[Lucide](https://lucide.dev) (ISC license), so nothing loads from a CDN.

## Deploy to GitHub Pages

1. Create a new repository (e.g. `rhythm`) and push these files to the root of the `main` branch.
2. In the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. Wait a minute, then open `https://<your-username>.github.io/rhythm/`.

All paths are relative, so it works from any subdirectory. When you update the app, bump the
`CACHE` version string at the top of `sw.js` (e.g. `rhythm-v2`) so installed phones pick up
the new files.

## Install on iPhone

1. Open your GitHub Pages URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Rhythm launches full-screen with its own icon, works offline, and keeps all data on-device.

## Your data

Everything lives in `localStorage` on your device. Nothing is ever sent anywhere unless you
back it up yourself.

- **Export / Import** — Settings → Backup gives you a plain JSON file any time.
- **Google Drive backup (optional)** — Rhythm can save `rhythm-backup.json` straight to your
  own Drive, phone-to-Google with no server in between.

### One-time Google Drive setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project (any name).
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → External → add yourself as a test user.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `https://<your-username>.github.io`
5. Copy the Client ID (ends in `.apps.googleusercontent.com`) and paste it into
   **Rhythm → Settings → Google Drive → Set up Drive backup**.

Rhythm uses the `drive.file` scope, which means it can only ever see the single backup file it
created itself — never the rest of your Drive.

## Local development

```
cd rhythm
python3 -m http.server 8080
```

Open `http://localhost:8080`. (ES modules and service workers need a server; opening
`index.html` directly from disk won't work.)
