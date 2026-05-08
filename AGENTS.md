## Project conventions

After making changes, build, lint, and test:

```sh
bun run build
bunx biome check <files>
bun test
```

### Build system

Source lives in `src/`. The build script (`scripts/build.ts`) bundles `src/main.ts` via `Bun.build()` and prepends the `==UserScript==` header, writing the result to `ddb-encounter-alt-difficulty.user.js`. That compiled file is committed to git so the Tampermonkey `@updateURL` raw GitHub URL keeps working.

### Versioning

Bump `@version` in `scripts/build.ts` (inside the `HEADER` constant) with every push to GitHub. Tampermonkey compares the installed version against `@updateURL` and will only auto-update if the version number is higher.

### XP budget table

The per-character XP budget values in `src/difficulty2024.ts` (`XP_BUDGET_PER_CHAR`) come from the SRD 5.2, pp. 202–203. Two values in the published table appeared to be typos and were corrected:

- Level 18, High: **14,200** (SRD printed 14,400)
- Level 20, High: **22,000** (SRD printed 22,400)

Don't revert these to match the raw SRD text; the corrected values are consistent with the surrounding progression.

### Capturing local HTML snapshots for debugging

If the script breaks due to a D&D Beyond SPA change, capturing a fresh HTML snapshot and sharing it with an AI agent is a good way to diagnose the DOM structure. Save snapshots to `./snapshots/` (git-ignored).

To capture the encounter edit page (`/encounters/UUID/edit`):

1. Navigate to the page while logged in.
2. In the browser console, copy the full DOM to the clipboard:
   ```js
   copy(document.documentElement.outerHTML)
   ```
3. Write it to a file without opening it in a text editor (large files make editors slow):
   ```sh
   wl-paste > snapshots/ddb-encounters-edit.html
   ```
   Note: `wl-paste` is Wayland-specific (Linux only). On X11 use `xclip -o` or `xsel -bo` instead.

The same process applies to the read-only view page (`/encounters/UUID`) — save it as `snapshots/ddb-encounter.html`.
