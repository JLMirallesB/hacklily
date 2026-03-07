# Hacklily Desktop (Option 2)

This folder turns Hacklily into an installable desktop app for macOS and Windows.
The end user installs a DMG/EXE and opens a normal app. No Docker is required for the user.

## What this includes

- Electron desktop shell.
- Local JSON-RPC backend over `ws://127.0.0.1:3210`.
- LilyPond rendering by bundled runtime binaries.
- Installer packaging with `electron-builder`.

## Product behavior for non-technical users

- Install the app.
- Open the app from Applications/Start Menu.
- Edit and render scores offline.

GitHub publish/login calls are intentionally disabled in offline mode.

## Repository prerequisites (maintainer side)

- Node.js 20+
- npm 10+
- For local/manual packaging: LilyPond runtime binaries copied into `desktop/runtime/current/bin`

Expected runtime files:

- macOS/Linux: `desktop/runtime/current/bin/lilypond`
- Windows: `desktop/runtime/current/bin/lilypond.exe`
- Optional converter: `musicxml2ly` / `musicxml2ly.exe`

## Build installers

From the repository root:

```bash
npm ci
cd desktop
npm install
npm run dist:mac
# or
npm run dist:win
```

Artifacts are created in `desktop/release/`.

## Release automation (tags -> binaries)

This repository is prepared so every new tag `desktop-v*` builds installers automatically.

Workflows:

- `.github/workflows/create-desktop-release-tag.yml`: manually create/push a release tag.
- `.github/workflows/desktop-release.yml`: when tag `desktop-v*` is pushed, download LilyPond `2.24.4`, build DMG/EXE, and publish them to a GitHub Release.

Recommended release flow:

1. Open GitHub Actions and run **Create Hacklily Desktop Release Tag**.
2. Enter a version like `1.0.0` (this creates `desktop-v1.0.0`).
3. Wait for **Build Hacklily Desktop Installers** to finish.
4. Download binaries from the generated GitHub Release assets.

## Frontend bundling

`npm run build:frontend` compiles the main Hacklily frontend with:

- `REACT_APP_BACKEND_WS_URL=ws://127.0.0.1:3210`
- `REACT_APP_GITHUB_CLIENT_ID=""` (GitHub login disabled in offline mode)

## Runtime template folders

Template folders are placeholders for manual/local builds:

- `desktop/runtime/templates/darwin-universal/`
- `desktop/runtime/templates/win32-x64/`

For CI releases from tags, these templates are not used because the workflow downloads LilyPond automatically.

## Licensing

- Frontend/client code remains GPLv3+.
- Server-side behavior remains AGPLv3+.
- Distribute source and notices alongside binaries to stay compliant.
