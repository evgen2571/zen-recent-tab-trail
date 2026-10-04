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

## Automated checks

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

## Live Zen results

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

## Acceptance audit and remaining manual scope

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
[README manual steps](README.md#manual-checks-in-your-zen-installation).
Their browser controls are not changed by the implementation. No GPU or
cross-platform performance claim is made.

Native metadata ambiguities (old background tabs, missing activation metadata,
equal saved timestamps, Zen startup selection) are documented in the README.
No private/history persistence was introduced to disguise those limits.
