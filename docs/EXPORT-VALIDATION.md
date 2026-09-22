# Source export validation — 21 September 2026

Base: published version 7, commit `cd9aa040a41a8daac4fa470fee6b7e4cf4a7f40f`.

- All 161 Git-tracked source/configuration/assets/documentation files were included or preserved in the archived Sites reference folder; see `SOURCE-MANIFEST.json`.
- Reorganized frontend, backend and shared imports pass TypeScript.
- All 68 existing tests passed from the reorganized tree.
- All three SQL migrations applied successfully to a new local D1 emulator.
- Development server started using the root cross-platform command.
- Local API integration: GET workspace returned 200; POST created a fictional hospital and returned 200; a fresh GET returned the saved hospital. Sample API returned 8 fictional hospitals and 4 events.
- Production build succeeded with the relocated five API routes and frontend entry point.

The checks ran on Linux with Node 24.19 and the dependency versions in the supplied lockfile. Windows/macOS scripts use portable Node APIs but were not executed on those operating systems. Validation reused matching installed dependencies; it did not perform a new Internet dependency download.

The export's active local configuration is standalone; original Sites helpers are retained as documentation. Backend auth fails closed for standalone production unless a trusted provider is configured. No live emails, social posts or invitations were sent during validation. No online data was copied.

The ZIP excludes installed packages, local DB state, development secrets, generated builds, caches and Git history. Run the README installation/setup commands after extraction.
