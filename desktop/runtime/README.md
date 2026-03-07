# Runtime layout

This desktop app bundles LilyPond binaries so end users do not need Docker.

## Folders

- `current/`: exact runtime used for packaging.
- `templates/darwin-universal/`: placeholder for manual macOS runtime payload.
- `templates/win32-x64/`: placeholder for manual Windows runtime payload.

Each runtime must expose at least:

- `bin/lilypond` (or `bin/lilypond.exe` on Windows)

Optional:

- `bin/musicxml2ly` (or `bin/musicxml2ly.exe`)

For tag-based CI releases, the GitHub workflow downloads LilyPond directly into `current/`.
Templates are kept for manual/local packaging workflows.
