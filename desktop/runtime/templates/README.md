# Runtime templates

These folders are placeholders.

For local/manual packaging, replace each template with real LilyPond runtime files:

- `darwin-universal/bin/lilypond`
- `win32-x64/bin/lilypond.exe`

Optional converter:

- `darwin-universal/bin/musicxml2ly`
- `win32-x64/bin/musicxml2ly.exe`

The tag-based CI release workflow does not use these templates; it downloads LilyPond automatically.
If local runtime binaries are missing, the build fails in `npm run check:runtime`.
