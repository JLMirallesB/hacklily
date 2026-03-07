# Runtime templates

These folders are placeholders.

Before publishing installers, replace each template with real LilyPond runtime files:

- `darwin-universal/bin/lilypond`
- `win32-x64/bin/lilypond.exe`

Optional converter:

- `darwin-universal/bin/musicxml2ly`
- `win32-x64/bin/musicxml2ly.exe`

The CI workflow copies one template into `desktop/runtime/current` and then runs packaging.
If runtime binaries are missing, the build fails in `npm run check:runtime`.
