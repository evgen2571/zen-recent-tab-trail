# Working on Recent Tab Trail

The Node checks are listed in the [README](README.md#development). They cover tab
history, settings, cleanup, window isolation, and the local installer. They don't
run Zen or check how the sidebar looks.

## Development / offline installation

Use Node.js 22+ and a Zen profile where Sine 2.3.3+ has already been started once.

1. Open `about:support` in Zen and find **Profile Folder**.
2. Close all Zen windows using that profile.
3. From this checkout, run:

   ```sh
   node tools/install-local.mjs "/absolute/path/to/Zen/profile"
   ```

   Use the profile folder, not the installation folder or the directory containing
   `profiles.ini`. For a Windows profile from WSL, use its `/mnt/c/...` path;
   with Windows Node, use its `C:\Users\...` path.
4. Start Zen, allow JavaScript from unofficial sources in **Sine settings**
   (`sine.allow-unsafe-js = true`), and enable **Recent Tab Trail**. If it doesn't
   appear, use **about:support → Clear startup cache** and restart.

The installer copies the mod and updates `chrome/sine-mods/mods.json`. It keeps
other mods and this mod's enabled/disabled state, and saves a `mods.json.rtt-backup-*`
file beside the registry. Settings are preserved. Automatic updates are disabled
for the local entry.

To try edits, close Zen, run the installer again, and restart. To return to GitHub
updates, uninstall the local entry in Sine and follow the README's installation
steps.

## Browser checks

Use a disposable profile. Previous browser checks used Zen 1.23b and Sine 2.3.3
on Linux; Windows, macOS, and third-party theme combinations haven't been tested.

- Visit A, B, C, then D. C, B, and A should fade in that order; D should keep its
  normal selected appearance. Select B: D, C, and A should now form the trail.
  Repeat with keyboard shortcuts and check that tab positions don't change.
- Open a background tab, close a recent tab, undo the close, and restart with
  session restore. Unvisited background tabs should stay unmarked during the
  session; restored history is limited by native session data.
- Try workspaces, collapsed folders, pinned tabs, Essentials, and their inclusion
  settings. Check that separate normal and private windows have separate trails.
- Change the count, colors, styles, and intensity in light and dark mode. Check
  counts 1 and 20, invalid inputs, and that Custom color appears only for Custom.
  Hover, selection, dragging, and close/audio/container controls should still work.
- Disable and re-enable the mod in Sine. Markers should disappear on disable,
  return once on enable, and leave no errors from the mod in Browser Console.

For debugging, inspect `.tabbrowser-tab[data-rtt-rank]` in Browser Toolbox. Rank 1
is the most recent eligible previous tab; `--rtt-prominence` controls its strength.

## Things that aren't obvious from the code

- Zen's `gBrowser.tabs` only covers the active workspace. `allStoredTabs` includes
  tabs in other workspaces, folders, and Essentials in the same window.
- Firefox initializes `lastAccessed` even for unvisited background tabs.
  `_lastSeenActive` and pre-startup timestamps help identify actual visits.
  SessionStore can replace a creation timestamp before `SSTabRestoring`.
  These are browser internals and may change between releases.
- Equal session timestamps don't preserve visit order. If `_lastSeenActive` is
  unavailable, installing mid-session can miss earlier visits. New selections
  are tracked directly through `TabSelect`.
- `content.css` works around Sine 2.3.3's broken preference conditions: visibility
  is evaluated before the control is attached, and the observer calls an undefined
  `th.updatePrefVisibility`. Keep this workaround until Sine handles both cases.
- Preference keys and defaults are in `preferences.json`, under `recent-tab-trail.`.
  Counts round to the nearest integer and clamp to 1 through 20; blank, non-numeric,
  or non-finite input uses 5 without rewriting the saved text.
