# Verification record

Verified 2026-10-04. Repository started empty; no existing code, license, or user
changes were replaced. No commits or publication were made.

## Sources and compatibility decisions

Checked the current official Sine docs, Sine's latest stable release, its current
main branch, an actively maintained mod, Zen's current release source, and native
Firefox tab/sessionstore source before choosing the implementation.

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
  Import reads a list of registry entries, then fetches each homepage. There is no
  private-repository authentication or offline-mod ZIP import in that path. The
  local helper uses the verified native registry format, not an invented UI feature.
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

## Initial 0.1.0 automated checks

```sh
node --check recent-tab-trail.uc.js
node --check tools/install-local.mjs
node --test tests/*.test.cjs
```

16 tests pass with Node 24.21.0. They cover the requested literal MRU sequences,
default depth, native seed gating, newly opened tabs, same-session and previous-session
restore metadata, closing/compaction, current/global eligibility, pinned/Essential
inclusion and conversion, visibility changes, live preferences, startup cancellation,
cleanup of pending work, reinitialization, window isolation, and real local installer
filesystem effects. Installer tests also verify registry backups, preservation of
other mods and disabled state, and refusal to modify invalid/uninitialized profiles.

## Initial 0.1.0 live Zen results

Ran the official Linux x86_64 **Zen 1.23b**, official Sine **2.3.3 engine**, and
Sine bootloader **0.1.4** under Xvfb in a disposable `/tmp` profile. Installed this
mod with the supplied local helper. Exercised chrome through Marionette using
`uv run --with marionette-driver python ...`; no user's browser/profile was used.
Chrome DevTools MCP was unavailable and cannot validate privileged Zen chrome,
so native Firefox/Zen automation was used instead.

| Check | Observed result |
| --- | --- |
| Sine boot loading / metadata | `window.__recentTabTrail` present and root style `both`; script loaded by Sine itself |
| Sine preferences page | All six real checkbox/dropdown controls rendered in `about:preferences#sineMods` |
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
| Bar/background/both settings | Root presentation switched immediately for every option |
| Sine disable / enable / rebuild | Disable removed instance and every marker; enable/rebuild restored one functioning trail |
| Second normal window | Independent trail: previous rank 1, selected unranked; original window selection unchanged |
| Private window | Independently loaded and ranked previous tab; selected unmarked |
| Discard previous tab | Tab retained rank 1 while `pending` and `discarded` stayed true |
| 235 tabs including 200 lazy background tabs | Five markers, no new background markers; one measured switch including native browser work ~5.05 ms |
| Graceful quit and session restore | Before quit A rank 1, B selected; Zen restarted on its native New Tab, B rank 1 / A rank 2 without a tab switch |
| Runtime errors | No console errors referencing this mod during tested ordinary use, loader reloads, or restart |

Saved real sidebar captures in [assets/light.png](assets/light.png) and
[assets/dark.png](assets/dark.png). Fixture labels are for demonstration only;
the mod never edits labels. Initial live testing caught an invalid `ownerGlobal`
assumption; using `ownerDocument.defaultView` fixed it, and the corrected boundary
fixture demonstrated the failure before the fix. Initial dark-theme inspection also
led to lifting Zen's very dark primary color within the same accent family.

Restore tests used a local `data:` page because Firefox does not put a pristine
`about:blank` tab into its undo-close history. Restart testing accounts for Zen's
own choice of startup tab rather than forcing the old selected tab.

## Initial 0.1.0 acceptance audit and remaining manual scope

Acceptance items 1–18 are supported by the live results above, automated tests,
and inspection of the implementation: no tab-movement calls, browser navigation,
keyboard interception, label/ARIA changes, network APIs, storage APIs, polling,
or DOM observation exist in the mod. The CSS adds a pointer-transparent paint
layer; it does not replace native backgrounds or modify layout dimensions.
The manifest, six preferences, implementation, styling, license, installation
helper, README and screenshots are present.

Platform/theme/mod combinations cannot all be proven here. Windows/macOS,
third-party themes/mods, audio/container combinations, nested folder and collapsed
pinned-section appearance, and native drag-and-drop should be checked with the
[manual steps below](#manual-checks-in-your-zen-installation).
Their browser controls are not changed by the implementation. No GPU or
cross-platform performance claim is made.

Native metadata ambiguities (old background tabs, missing activation metadata,
equal saved timestamps, Zen startup selection) are documented in the README.
No private/history persistence was introduced to disguise those limits.

## Maintainer reference

### Native history and eligibility


Tested in a disposable **Zen 1.23b Linux** profile with **Sine 2.3.3**, including
real mouse/keyboard activation, native folders/Essentials/workspaces, session
restore, and screenshots in both themes. Firefox compatibility is not claimed.

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

### Native metadata limitations


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

### Local and public installation details


Sine's GitHub installer uses unauthenticated raw/codeload requests; signing into
GitHub in Zen does not grant it access to this private repository. Sine's Import
button imports a mod-list JSON and downloads each entry's GitHub homepage; it is
not an offline ZIP installer.

This repository supplies an **offline local registration helper**, not a Sine
UI import feature. It copies the mod into Sine's native profile layout and merges
its entry into `chrome/sine-mods/mods.json`, preserving other mods and saving a
registry backup. It disables automatic updates for this local entry.

1. Clone/download this repository using your own GitHub access.
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

### Public repository / eventual Sine release

Once this repository is public, enable unofficial JavaScript as above and paste
`https://github.com/evgen2571/zen-recent-tab-trail` into Sine's **Add your own locally
from a GitHub repo** field. Install and enable the mod. A Sine marketplace listing
requires a separate submission to the [Sine store](https://github.com/sineorg/store);
this repository is not currently listed. When replacing a local installation,
uninstall that entry first, then install the public version to restore normal updates.

### Manual checks in your Zen installation


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
8. Check light and dark mode, custom accents, all indicator styles/strengths,
   narrow sidebar, and a large tab set. Selected styling and pointer targets must remain usable.
9. Disable/re-enable in Sine several times. Disabling should remove all markers;
   re-enabling should produce one trail. Use Browser Console to check for errors.

For debugging with the Browser Toolbox, inspect `.tabbrowser-tab[data-rtt-rank]`.
No tab label, URL, accessible name, or tab inline style is changed by this mod.


## 0.2.0 appearance and release verification

This pass changes presentation only. MRU history, event handling, restore seeding,
workspace filtering, and startup/unload architecture remain intact. The existing
preference observer also applies the new settings; no polling or DOM observation
was introduced.

### Native Sine preferences

Settings use native Recency / Appearance separators. Dropdowns retain string values;
checkboxes retain boolean values. Defaults are also supplied by the script.

| Preference | Values / default | Change |
| --- | --- | --- |
| `recent-tab-trail.count` | `3`, `5`, `7`, `10`; default `5` | Unchanged |
| `recent-tab-trail.workspace` | `current`, `global`; default `current` | Unchanged |
| `recent-tab-trail.include-pinned` | Boolean; default true | Unchanged |
| `recent-tab-trail.include-essentials` | Boolean; default true | Unchanged |
| `recent-tab-trail.style` | `both`, `bar`, `outline`, `background`, `fill`; default `both` | Labels Bar + tint, Bar only, Outline, Tint, Solid fill |
| `recent-tab-trail.color-source` | `theme`, `custom`; default `theme` | New Color dropdown |
| `recent-tab-trail.custom-color` | String; default `#7c6cff` | New native string input, conditioned on source `custom` |
| `recent-tab-trail.strength` | `subtle`, `normal`, `strong`; default `normal` | Label changed to Intensity |

Color validation uses privileged chrome's `window.CSS.supports("color", value)`.
The input is trimmed; unresolved `var()` / `env()` references and CSS-wide keywords
are rejected because syntax support alone would let them invalidate the shared
accent. Invalid/empty colors or an unavailable validation API use the theme accent,
remove the custom property, and emit no errors. Valid custom colors are exposed
once on the root via `--rtt-custom-accent` and `data-rtt-color-source="custom"`.
Theme colors retain the existing light/dark adjustment; custom hues are unchanged.
Unload removes both the attribute and custom property, including pending updates.

All styles use the shared pointer-transparent `.tab-stack::after` layer. Outline
uses a 1px border; fill uses the same rank curve at 0.46 times its strength, capped
at 35% alpha. Normal fill ranks 1–5 are about 29.9%, 22.1%, 16.1%, 11.5%, 8.3%.
The existing default tint formula is unchanged. Bar/outline alpha is capped at 90%.
Selected, visually selected, and multi-selected tabs keep their native appearance.
Native text, close/audio/container controls, tab DOM, and tab dimensions are untouched.

### Sine 2.3.3 condition compatibility

Live testing exposed two upstream issues in the pinned Sine preference source:
`parsePref` sets up visibility before the element is attached, and the preference
observer calls undefined `th.updatePrefVisibility`. The native `conditions` metadata
is retained. A small `content.css`, loaded by Sine's supported `style.content`,
uses the native Color dropdown's `value` to hide/show only this mod's custom-color
field in `about:preferences`. This also works when the Sine condition implementation
is corrected, and adds no settings JS or custom UI. The installer now copies that
stylesheet. Sine's own observer typo can still produce a Sine console error on a
color-source change; no installed Sine files were patched to conceal it.

### Automated and live evidence

19 Node boundary/installer tests pass on Node 24.21.0. New tests cover every style
and intensity, invalid choice fallback, theme/custom sources, browser-validated
hex/RGB/HSL colors, invalid/context-dependent/empty colors, live presentation with
unchanged ranks, queued cleanup, and installation of the content stylesheet and all six screenshot assets.
The canonical syntax checks pass. `.github/workflows/checks.yml` runs the same
three commands in one Ubuntu / Node 24 job on pushes and pull requests. It has
not been run on GitHub in this local pass and does not verify browser rendering.

Reinstalled the final files using the local helper in the existing disposable
Zen 1.23b / Sine 2.3.3 Linux profile under Xvfb. Marionette verified 210 combinations:
2 light/dark themes × 7 color cases × 5 styles × 3 intensities. Color cases were
Zen accent, purple hex, white, black, RGB, HSL, and invalid text. Checks confirmed:

- Correct computed border/background paint for each style and strictly decreasing
  rank alpha, with Solid fill at or below 35%.
- Identical tab width/height across all combinations, unchanged MRU ranks, no
  selected overlay, and `pointer-events: none` on every recent overlay.
- Native Sine Recency/Appearance headings and string input rendered. Theme initially
  hides the input; native dropdown commands show/hide it live. A native input change
  saved `#ff6b6b` and updated the browser-root property without restart.
- Destroy and native Sine disable removed all rank markers, all three root
  presentation attributes, and the custom property. Sine re-enable/rebuild restored
  the instance. No console errors referenced `recent-tab-trail.uc.js`.

Real sidebar screenshots were refreshed in `assets/light.png` and `assets/dark.png`;
Outline and Solid fill captures were added as `assets/light-outline.png`,
`assets/dark-outline.png`, `assets/light-fill.png`, and `assets/dark-fill.png`.
The README shows default captures and the two dark-style examples. These are real
Zen captures with fixture tab labels, not generated images.

The 0.1.0 live interaction records above remain useful; this pass does not claim to
repeat every original keyboard, restore, folder, window, or drag test. Windows/macOS,
third-party themes/mods, narrow/pinned/Essential layouts, audio/container controls,
hover and drag should still be checked manually with every new style. Very low
contrast custom colors are intentionally not corrected by a contrast engine.
The mod is ready for local installation and manual testing; no commits, publication,
or GitHub workflow run were performed.
