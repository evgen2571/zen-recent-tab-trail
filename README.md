# Recent Tab Trail

Recent Tab Trail shows your most recently visited previous tabs in Zen's existing
vertical sidebar, without reordering tabs. The selected tab keeps Zen's normal
appearance. Older visits get a progressively fainter accent bar and subtle tint.

Tab position is spatial organization; the recent indicator is temporal navigation.
You can keep your folders and tab positions while seeing where you were just working.

```text
  D — selected normally
┃ C — previous tab, rank 1
┃ B — rank 2, fainter
┃ A — rank 3, fainter still
  Never-visited background tab — no indicator
```

Actual Zen 1.23b sidebar captures (light / dark):

<img src="assets/light.png" alt="Light sidebar: selected tab unchanged, five previous tabs with fading bars" width="186"> <img src="assets/dark.png" alt="Dark sidebar with the same five fading indicators" width="186">

## Installation

Requires **Zen Browser and Sine 2.3.3 or later** with userChrome JavaScript enabled.
The manifest uses Sine's `.uc.js` scripts, `style.chrome`, `preferences.json`,
`fork: ["zen"]`, and `supportsUnload` conventions. No build step or runtime
dependencies are needed. Install Sine first using its
[official installation guide](https://github.com/sineorg/docs/blob/main/src/installation.md).
Start Zen once after installing Sine so its mod registry is initialized.

### Private / unpublished local installation

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

## Configuration

Open Recent Tab Trail's settings in Sine Mods. Changes apply immediately, without
restart. Defaults work even before you open the settings page.

| Setting | Choices | Default | about:config preference |
| --- | --- | --- | --- |
| Number of recent tabs | 3, 5, 7, 10 | 5 | `recent-tab-trail.count` |
| Indicator style | Bar, background, both | Both | `recent-tab-trail.style` |
| Indicator strength | Subtle, normal, strong | Normal | `recent-tab-trail.strength` |
| Include pinned tabs | On/off | On | `recent-tab-trail.include-pinned` |
| Include Essentials | On/off | On | `recent-tab-trail.include-essentials` |
| Workspace history | Current workspace, global | Current | `recent-tab-trail.workspace` |

Dropdown preferences are strings (`"5"`, `"both"`, `"normal"`, `"current"`);
include preferences are booleans. Invalid dropdown choices fall back to defaults.
Essentials have their own inclusion switch, independent of the pinned-tab switch.
The accent follows `--zen-primary-color`, falling back to the browser focus accent.
Try Strong if your custom workspace accent is too close to the sidebar color.

## Behavior and compatibility

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

## Known limitations

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

## Development and verification

| File | Purpose |
| --- | --- |
| `theme.json` | Sine metadata, CSS/script loading, Zen declaration |
| `recent-tab-trail.uc.js` | Native history seeding, event ranking, eligibility, cleanup |
| `chrome.css` | Accent paint layer, declining prominence, style/strength variants |
| `preferences.json` | Native Sine configuration UI |
| `tools/install-local.mjs` | Offline installation into an initialized, closed profile |
| `tests/*.test.cjs` | Node boundary tests for ranking, events, lifecycle, installation |

Run the canonical automated checks with Node.js 22+:

```sh
node --check recent-tab-trail.uc.js
node --check tools/install-local.mjs
node --test tests/*.test.cjs
```

These tests use chrome boundary fixtures; they do not prove browser rendering.
Live browser validation and source references are recorded in [VERIFICATION.md](VERIFICATION.md).

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
No label, URL, accessible name, or inline style is changed by this mod.

## License

[MIT](LICENSE).
