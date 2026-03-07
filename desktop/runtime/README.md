# Runtime layout

This desktop app bundles LilyPond binaries so end users do not need Docker.

## Folders

- `current/`: exact runtime used for packaging.
- `templates/darwin-universal/`: placeholder for macOS runtime payload.
- `templates/win32-x64/`: placeholder for Windows runtime payload.

Each runtime must expose at least:

- `bin/lilypond` (or `bin/lilypond.exe` on Windows)

Optional:

- `bin/musicxml2ly` (or `bin/musicxml2ly.exe`)

The GitHub workflow copies one template into `current/` before building installers.
