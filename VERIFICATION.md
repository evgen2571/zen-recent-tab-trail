# Verification

Current-state technical reference for Recent Tab Trail 0.2.1: automated coverage,
recorded live Zen results, implementation decisions, and repeatable manual checks.
Browser observations below were made in disposable profiles; they are recorded
evidence, not checks repeated by CI or by a documentation update.

## Tested versions

- Recent Tab Trail **0.2.1**.
- Official Linux x86_64 **Zen 1.23b**.
- **Sine 2.3.3** engine and **0.1.4** bootloader.
- **Node 24.21.0** for automated checks; development tools require Node.js 22+.

Firefox compatibility is not claimed. Windows/macOS and third-party mod/theme
combinations have less live testing coverage.

## Automated verification

Run the canonical checks from the repository root:

```sh
node --check recent-tab-trail.uc.js
node --check tools/install-local.mjs
node --test tests/*.test.cjs
```

All **22 Node boundary/installer tests** pass on Node 24.21.0. Coverage includes:

- Literal MRU sequences, default depth, counts 1–20, rounding, clamps and invalid
  input fallbacks; live expansion/contraction without reordering recent ranks.
- Native seed gating, background/foreground creation, same-session and previous-session
  restore metadata, closing/compaction, current/global workspace eligibility,
  pinned/Essential inclusion and conversion, and visibility changes.
- Every style, intensity and color preset; Theme/Preset/Custom transitions,
  standalone CSS color validation, invalid choices, and unchanged ranks on appearance changes.
- Strict prominence decrease, rank 20's nonzero floor, startup cancellation,
  queued cleanup, close/reload/unload, reinitialization and window isolation.
- Actual installer filesystem effects: registry backups, preservation of other
  mods and disabled state, rejection of invalid/uninitialized profiles, and copying
  the compatibility stylesheet and all six screenshot assets.

[GitHub Actions](.github/workflows/checks.yml) runs these canonical Node checks
on pushes and pull requests in an Ubuntu / Node 24 job. The workflow has
successfully run on main. CI verifies syntax and Node fixtures, not browser rendering.
JSON parsing and `git diff --check` are additional lightweight repository checks.

## Live Zen verification

Chrome was exercised through Marionette under Xvfb with
`uv run --with marionette-driver python ...`, using the local installer and
no user's browser/profile. Chrome DevTools MCP was unavailable and cannot validate
privileged Zen chrome, so native Firefox/Zen automation was used.

### MRU and native browser behavior

These interaction observations were recorded against the MRU implementation
retained in 0.2.1. Settings and appearance checks below exercised 0.2.1 directly;
they do not claim to repeat every earlier keyboard, restore, folder or window check.

| Check | Observed result |
| --- | --- |
| Sine boot loading / metadata | `window.__recentTabTrail` present and root style `both`; script loaded by Sine itself |
| Eight background tabs opened | All eight unranked before selection |
| A → B → C → D | A/B/C/D ranks `3 / 2 / 1 / none` |
| D → B | A/B/C/D ranks `3 / none / 2 / 1` |
| Positions across selections | Same tab object at every original array position |
| Native mouse click | Newly selected tab unranked; previous selected tab rank 1 |
| Ctrl+Tab and Ctrl+Shift+Tab | Both changed selection; current unranked, immediately previous rank 1 |
| Close rank 1 / older tab | Detached tab attributes removed; remaining ranks compacted |
| Native undo-close | Real data-page tab restored and selected; previous active rank 1; detached old element unmarked |
| Pin/unpin, include switch | Existing visit rank retained or removed according to inclusion |
| Essentials | Actual conversion succeeded; rank retained; exclusion and conversion back refreshed immediately |
| Zen folder | Real child ranked; collapse made it nonvisible/unmarked; expand restored rank; placeholder unmarked |
| Workspace switch | Other-space tab unmarked in Current mode; ranking refreshed after async switch |
| Move tab to other workspace and back | Ranks `2/1/none` → `1/none/none` → `2/1/none`, without visiting moved tab |
| Global option | Other-space tab retained global rank 1; current-space older tab rank 2 |
| Light and dark | Inspected real sidebar captures; selected tab unchanged, five declining bars visible |
| Sine disable / enable / rebuild | Disable removed instance and every marker; enable/rebuild restored one functioning trail |
| Second normal window | Independent trail: previous rank 1, selected unranked; original window selection unchanged |
| Private window | Independently loaded and ranked previous tab; selected unmarked |
| Discard previous tab | Tab retained rank 1 while `pending` and `discarded` stayed true |
| 235 tabs including 200 lazy background tabs | Five markers, no new background markers; one measured switch including native browser work ~5.05 ms |
| Graceful quit and session restore | Before quit A rank 1, B selected; Zen restarted on its native New Tab, B rank 1 / A rank 2 without a tab switch |
| Runtime errors | No console errors referencing this mod during tested ordinary use, loader reloads, or restart |

The 235-tab switch measurement includes native browser work and is a single scoped
observation, not a GPU or cross-platform performance claim. Restore tests used a
local `data:` page because Firefox does not put a pristine `about:blank` tab into
undo-close history. Restart checks account for Zen's native choice of startup tab.

### Settings, appearance and cleanup

A 210-case appearance run (2 themes × 7 color cases × 5 styles × 3 intensities)
verified computed border/background paint, decreasing alpha, identical tab width/height,
unchanged MRU ranks, no selected overlay and `pointer-events: none`. Color cases
were Zen accent, purple hex, white, black, RGB, HSL and invalid text. Native input
saved `#ff6b6b` and updated the root property without restart. Native Sine disable
removed the instance, markers, root presentation attributes and explicit accent;
re-enable/rebuild restored one functioning trail.

Live settings checks in a disposable Zen 1.23b / Sine 2.3.3 Linux profile under Xvfb
passed 5,400 combinations: 2 themes × 20 counts × 9 color sources × 5 styles ×
3 intensities. Every case retained ranks, excluded selected/never-visited tabs,
produced valid nonzero paint and preserved the Solid fill cap. Prominence strictly
decreases through rank 20. Zen's computed-color serialization quantizes some faint
neighboring alphas; computed alpha never increased, and ranks 1–5 strictly decreased.
Native settings exposed a text count input, only the Appearance separator, and
all nine color choices. Native dropdown commands hid Custom for every preset and
Theme, showed it for Custom, and updated chrome live. Native text changes saved
count 13 and a custom hex color; the input border reflected that color. Browser
checks also covered invalid counts and standalone/context-dependent custom colors.
Destroy removed all markers, per-tab prominence and root color state. No console
errors referenced the mod script. Light/dark sidebar captures were inspected;
the six sidebar screenshots use the Purple preset (`#8b5cf6`), Normal intensity
and five ranked tabs. They show Bar + tint, Outline and Solid fill in both themes:
[light](assets/light.png), [dark](assets/dark.png),
[light outline](assets/light-outline.png), [dark outline](assets/dark-outline.png),
[light fill](assets/light-fill.png), and [dark fill](assets/dark-fill.png).
Fixture labels are for demonstration only; the mod never edits labels.

## Implementation notes

### Current preferences

Native settings begin with a count text input, workspace and inclusion controls,
then the Appearance separator. Dropdown values are strings; inclusion switches
are booleans. Script defaults also apply before settings are opened.

| Preference (`recent-tab-trail.` prefix) | Values | Default |
| --- | --- | --- |
| `count` | Numeric text, normalized to 1–20 | `5` |
| `workspace` | `current`, `global` | `current` |
| `include-pinned` | Boolean | `true` |
| `include-essentials` | Boolean | `true` |
| `style` | `both` (Bar + tint), `bar` (Bar only), `outline` (Outline), `background` (Tint), `fill` (Solid fill) | `both` |
| `color-source` | `theme` (Zen accent), `purple`, `blue`, `cyan`, `green`, `orange`, `red`, `pink`, `custom` | `theme` |
| `custom-color` | Standalone CSS color text; visible only for Custom | `#7c6cff` |
| `strength` | `subtle` (Subtle), `normal` (Normal), `strong` (Strong) | `normal` |

Count is parsed as a finite number, rounded with `Math.round`, then clamped to
1–20. Empty/whitespace, non-numeric and non-finite input use 5. Normalization
controls effective depth without rewriting stored text. Existing saved count,
theme and custom values remain valid.

### Native history and eligibility

- Actual `TabSelect` events record visits, regardless of mouse, shortcuts,
  extensions, or programmatic selection. No shortcuts are intercepted.
- `data-rtt-rank` on real tabs exposes the ranking for inspection. The current
  selected tab is excluded; rank 1 is the latest *eligible* previous tab.
- Initial history uses native `lastAccessed` only when a timestamp predates
  `tabContainer.startupTime` or native `_lastSeenActive` proves activation.
  New background tabs have creation timestamps and are excluded. In-session
  selection order breaks timestamp ties without a separate clock or database.
- Restore events merge trustworthy native timestamps, including same-session
  timestamps that SessionStore replaces after `TabOpen`. Tabs do not need to load:
  `SSTabRestoring` also handles pending session-restored tabs.
- Zen's `allStoredTabs` supplies window-local normal, pinned, folder, and Essential
  tabs across workspaces. Workspace IDs and Zen's `tab.visible` determine eligibility.
  Current mode filters history before assigning contiguous ranks. Global mode
  ranks across spaces, so other-space tabs can cause gaps in visible ranks.
  Native-hidden tabs and folder members that Zen considers nonvisible are excluded.
- Essentials are actual native tabs marked `zen-essential`, not folder controls.
  Visible Essentials participate by default. Empty workspace/folder placeholder
  tabs (`zen-empty-tab`) and transient Glance tabs (`glance-id`) are excluded.
- Folder collapse/expand and workspace lifecycle events refresh visibility.
  Pinned and Essential layouts remain native. Multi-selected/split-view tabs
  retain native visual selection styling even if they hold a history rank.
- Each window owns its own in-memory state, including private windows. No URLs,
  titles, history, or recency records are stored. Only user configuration is stored
  by the browser/Sine. The mod makes no network requests.
- Tab switches perform a bounded linear scan. Updates are coalesced in a microtask;
  there are no polling timers, MutationObservers, or tab moves. Startup/restore
  metadata may require sorting. Sine unload hooks and window unload remove all
  listeners, observers, attributes, and queued effects. Reinitialization is safe.

Inspection confirms no tab-movement calls, browser navigation, keyboard
interception, label/ARIA changes, network APIs, history storage, polling or DOM
observation in the mod. The CSS paint layer preserves native layout dimensions.

### Rank prominence and color handling

Each marked tab receives `--rtt-prominence` as a percentage calculated by
`4 + 61 * 0.72 ** (rank - 1)`. Ranks 1–5 are approximately 65%, 47.92%, 35.62%,
26.77% and 20.39%; rank 20 is approximately 4.12%. The strictly decreasing curve
depends only on age, regardless of count. Rank removal, close, reinitialization
and unload clear both the marker and property.

All styles use the shared pointer-transparent `.tab-stack::after` layer. Outline
uses a 1px border. Solid fill uses prominence at 0.46 times intensity, capped at
35% alpha; Normal ranks 1–5 are about 29.9%, 22.1%, 16.4%, 12.3% and 9.4%.
Bar/outline alpha is capped at 90%. Selected, visually selected and multi-selected
tabs retain native appearance. Text, close/audio/container controls and tab
sizes are untouched.

A single JS mapping supplies Purple `#8b5cf6`, Blue `#3b82f6`, Cyan `#06b6d4`,
Green `#22c55e`, Orange `#f97316`, Red `#ef4444` and Pink `#ec4899`. Presets and
validated custom colors share root `--rtt-custom-accent`; `data-rtt-color-source`
identifies the chosen source. Zen accent retains its light/dark adjustment;
custom hues are unchanged.

Custom validation uses privileged chrome's `window.CSS.supports("color", value)`.
Input is trimmed; unresolved `var()` / `env()` and CSS-wide keywords are rejected.
Invalid/empty colors, an unavailable validation API or an invalid source remove
the explicit accent and fall back to Zen's adjusted accent without errors.
No individual tab colors or settings DOM scripting are introduced. Native Sine
`applyString` supports `border: "value"` on rendering and input changes, which
Custom color uses. Unload removes root attributes and properties, including queued effects.

### Sine 2.3.3 condition compatibility

Live testing exposed two upstream issues in the pinned Sine preference source:
`parsePref` sets up visibility before the element is attached, and the preference
observer calls undefined `th.updatePrefVisibility`. The native `conditions` metadata
is retained. A small `content.css`, loaded by Sine's supported `style.content`,
uses the native Color dropdown's `value` to hide/show only this mod's custom-color
field in `about:preferences`. This also works when the Sine condition implementation
is corrected, and adds no settings JS or custom UI. The local installer copies that
stylesheet. Sine's own observer typo can still produce a Sine console error on a
color-source change; no installed Sine files were patched to conceal it.

### Sources and compatibility decisions

Implementation decisions were checked against the following official and native
sources. Pinned links identify the versions inspected during verification.

- [Sine installation docs](https://github.com/sineorg/docs/blob/c8a75292477a97e54bf271be6b0808e590353910/src/installation.md): official bootloader + profile + engine setup.
- [Sine 2.3.3 manager](https://github.com/CosmoCreeper/Sine/blob/1d2879b4d2c69d11a84e447be994431376e6576b/src/core/manager.sys.mjs):
  `.uc.js` loading, `window.addUnloadListener`, `supportsUnload`, GitHub raw/codeload
  installation, metadata, and `no-updates` registry behavior.
- [Sine utilities](https://github.com/CosmoCreeper/Sine/blob/1d2879b4d2c69d11a84e447be994431376e6576b/src/core/utils.sys.mjs):
  `chrome/sine-mods/mods.json`, script include matching, and unofficial-JS gate.
- [Sine preferences](https://github.com/CosmoCreeper/Sine/blob/1d2879b4d2c69d11a84e447be994431376e6576b/src/core/preferences.sys.mjs):
  `property`, `defaultValue`, dropdown `options`, and checkbox types. Defaults are
  also supplied by the script because preferences need to work before settings open.
- [Sine settings](https://github.com/CosmoCreeper/Sine/blob/1d2879b4d2c69d11a84e447be994431376e6576b/src/core/settings.mjs):
  Import reads a list of registry entries, then fetches each homepage. The local
  helper instead uses the verified native registry format for offline installation.
- [Zen Library example](https://github.com/JustAdumbPrsn/Zen-Library/blob/main/theme.json):
  current script/style/Zen-fork manifest shape.
- [Zen 1.23b workspace manager](https://github.com/zen-browser/desktop/blob/84a8300ff8579c91c9587990f6b13e32b994e5ca/src/zen/spaces/ZenSpaceManager.mjs):
  `allStoredTabs`, `activeWorkspace`, `zen-workspace-id`, change listeners and restore/UI events.
- [Zen tab visibility](https://github.com/zen-browser/desktop/blob/84a8300ff8579c91c9587990f6b13e32b994e5ca/src/browser/components/tabbrowser/content/tab-js.patch):
  real tabs, recursive folder visibility, collapsed pins, and empty placeholders.
- [Zen Essentials](https://github.com/zen-browser/desktop/blob/84a8300ff8579c91c9587990f6b13e32b994e5ca/src/zen/tabs/ZenPinnedTabManager.mjs):
  native tab elements with `zen-essential`, separate addition/removal events.
- [Firefox tab metadata](https://github.com/mozilla-firefox/firefox/blob/main/browser/components/tabbrowser/content/tab.mjs),
  [selection](https://github.com/mozilla-firefox/firefox/blob/main/browser/components/tabbrowser/Tabbrowser.sys.mjs),
  [Ctrl+Tab](https://github.com/mozilla-firefox/firefox/blob/main/browser/components/tabbrowser/content/browser-ctrlTab.js),
  [session restore](https://github.com/mozilla-firefox/firefox/blob/main/browser/components/sessionstore/SessionStore.sys.mjs):
  background creation initializes `lastAccessed`; selection updates old/new access
  metadata, foreground activation sets `_lastSeenActive`, and SessionStore restores
  saved `lastAccessed` before `SSTabRestoring`. Native Ctrl+Tab also includes newly
  opened tabs; this mod deliberately shows visits rather than that unvisited tail.

Minimum documented Sine version is 2.3.3, the stable release exercised here.
Main at `fb0bd4ca6af888f10648e126947f7d1f82228433` retained these interfaces;
future compatibility is not guaranteed.

## Known technical limitations

- Native session data cannot distinguish an unvisited background tab saved in a
  previous session from a visited one when only `lastAccessed` survives. Startup
  uses that timestamp as Firefox's MRU does; there is no invented persistent history.
- `_lastSeenActive` is a private Firefox field. If it is absent, late installation
  cannot identify all tabs visited earlier in the current session, and starts with
  retained session timestamps plus the current tab. Subsequent selections are exact.
- Equal timestamps from a saved session have no recoverable temporal order;
  existing collection order is the stable fallback. Restores without trustworthy
  metadata stay unranked until selected.
- Nonvisible collapsed folder/pinned-section members and hidden tabs do not consume ranks.
  An Essential hidden by Zen's container/workspace rules is likewise excluded.
- Very low-contrast custom accents can need Strong. Recency is supplementary,
  not a screen-reader announcement or a replacement for focus/selection styling.
- Zen internals can change between releases. Test on your own OS, theme, and
  other mods before relying on it. Windows/macOS and combinations with third-party
  mods were not tested. Screenshots use a disposable profile and fixture labels.
- Zen may select a new startup tab on restart. In that case the last session's
  active tab becomes rank 1 and the new selected tab stays unmarked.

## Manual verification checklist

1. Set depth to 5; create tabs A, B, C, D and click A → B → C → D.
   D should look selected normally; C/B/A should have ranks 1/2/3 with decreasing
   prominence. Click B: D/C/A should become 1/2/3. Confirm tab positions never change.
2. Repeat using Ctrl+Tab, Ctrl+Shift+Tab, and direct tab-selection shortcuts.
   Enable Zen's MRU Ctrl+Tab option if you want that switcher to traverse MRU order.
   Trail order should follow actual activation whichever option you use.
3. Open a background tab: no marker before visiting it. Open a foreground tab:
   the previous active eligible tab becomes rank 1. Close rank 1, then rank 3:
   older ranks compact. Restore with Ctrl+Shift+T; verify native restore/selection.
4. Pin/unpin tabs, visit Essentials, and toggle their separate inclusion settings.
   Check close/audio/container indicators, hover, focus, dragging and native selection.
5. Create two workspaces. Visit tabs in each and switch back. Current mode should
   show only eligible visible tabs in that space, with contiguous ranks; Global
   shares temporal history. Check moving a tab between spaces without selecting it.
6. Visit real folder tabs, including nested folders. Collapse/expand folders and
   pinned sections. Controls/placeholders must not gain markers; expanding restores
   eligible history without reordering. Discard a previous tab: it should stay unloaded.
7. Open another window and a private window; make different selection trails.
   Each must remain independent. Restart with session restore: retained history
   should initialize without a first click, subject to the native metadata limits above.
8. Try counts 1–20, including 13–20, live expansion/contraction, decimal rounding,
   clamps and invalid-value fallbacks. Check all nine color sources, valid hex/RGB/HSL
   custom colors and invalid/context-dependent colors. Custom should appear only
   for Custom, and its input border should reflect the saved color.
9. Check light and dark mode, all five styles and three intensities, narrow sidebar,
   and a large tab set. Prominence should decline with age independently of count;
   Solid fill stays translucent. Selected styling and pointer targets must remain usable.
10. Disable/re-enable in Sine several times. Disabling should remove all markers;
   re-enabling should produce one trail. Use Browser Console to check for errors.

For debugging with the Browser Toolbox, inspect `.tabbrowser-tab[data-rtt-rank]`.
No tab label, URL, or accessible name is changed. The only per-tab inline style
is the namespaced prominence custom property used by the CSS paint layer.

## Development / offline installation

The bundled `tools/install-local.mjs` helper installs the current checkout
for local development or offline testing. It copies the mod into Sine's native
profile layout and merges its entry into `chrome/sine-mods/mods.json`, preserving other mods and saving a
registry backup. It disables automatic updates for this local entry.

1. Clone or download this repository and start Zen once after installing Sine.
2. In Zen, open `about:support`, find **Profile Folder**, and note that path.
3. Close **all Zen windows using that profile** before changing its files.
4. With Node.js 22+ installed, run from this checkout:

   ```sh
   node tools/install-local.mjs "/absolute/path/to/Zen/profile"
   ```

   For a Windows profile from WSL, use its `/mnt/c/...` path; for Windows Node,
   use its `C:\Users\...` path. Use the actual profile folder, not the installation
   folder or the directory containing `profiles.ini`.
5. Start Zen. In **Settings → Sine Mods → Sine settings**, allow JavaScript from
   unofficial sources (`sine.allow-unsafe-js = true` in `about:config`). Ensure
   **Recent Tab Trail** is enabled. If it does not appear immediately, use
   **about:support → Clear startup cache** and restart.

To install edits, close Zen, run the same command again, then restart. Existing
enabled/disabled state and browser preference values are preserved. Sine's normal
disable/uninstall controls work; disable removes markers and listeners immediately.
Registry backups are named `mods.json.rtt-backup-*` next to `mods.json`.

To switch from a local entry to GitHub-managed updates, uninstall the local entry
in Sine, then install `https://github.com/evgen2571/zen-recent-tab-trail` using
**Add your own locally from a GitHub repo** and enable the mod.
