# Recent Tab Trail

See your recently visited tabs in Zen’s sidebar without rearranging them.
The latest previous tab gets the strongest highlight; older visits fade away.
Your selected tab keeps Zen’s normal appearance.

Real Zen 1.23b captures, using the default Bar + tint:

<img src="assets/light.png" alt="Light Zen sidebar with five fading recent-tab indicators" width="186"> <img src="assets/dark.png" alt="Dark Zen sidebar with five fading recent-tab indicators" width="186">

## What it does

- Highlights 3, 5, 7, or 10 previously visited tabs.
- Follows actual tab activation, including mouse and keyboard navigation.
- Works with workspaces, folders, pinned tabs, and Essentials.
- Keeps a separate trail in each window, including private windows.
- Stores settings only. The mod saves no browsing history and makes no network requests.

## Why

**Tab position = spatial organization. Trail intensity = temporal recency.**
Keep your folders and tab positions while seeing where you were just working.

## Installation

Requires Zen Browser, [Sine 2.3.3 or later](https://github.com/sineorg/docs/blob/main/src/installation.md),
and permission for unofficial userChrome JavaScript.

For this unpublished repository:

1. Clone or download the repository. Start Zen once after installing Sine.
2. Find **Profile Folder** in `about:support`, then close all Zen windows using it.
3. With Node.js 22+ installed, run from the checkout:

   ```sh
   node tools/install-local.mjs "/absolute/path/to/Zen/profile"
   ```

4. Start Zen. In **Settings → Sine Mods → Sine settings**, allow JavaScript from
   unofficial sources and enable **Recent Tab Trail**. If needed, clear the startup
   cache from `about:support` and restart.

Run the same command with Zen closed to install edits. Existing preferences and
other mods are preserved, and the registry is backed up. For Windows from WSL,
use the profile’s `/mnt/c/...` path.

Once the repository is public, its GitHub URL can be installed through Sine’s
**Add your own locally from a GitHub repo** field. It is not yet in the marketplace.
See [installation details](VERIFICATION.md#local-and-public-installation-details).

## Customization

Open Recent Tab Trail’s settings in Sine Mods. Changes apply immediately.

| Setting | Choices | Default |
| --- | --- | --- |
| Number of recent tabs | 3, 5, 7, 10 | 5 |
| Workspace history | Current workspace, Global | Current workspace |
| Include pinned tabs / Essentials | Separate switches | Both on |
| Indicator style | Bar + tint, Bar only, Outline, Tint, Solid fill | Bar + tint |
| Color | Zen accent, Custom | Zen accent |
| Custom color | CSS color text; shown only with Custom | `#7c6cff` |
| Intensity | Subtle, Normal, Strong | Normal |

Custom colors accept hex, RGB, HSL, and other standalone CSS colors, for example
`#ff6b6b`, `rgb(120 90 255)`, or `hsl(260 90% 65%)`. Invalid colors fall back to
Zen’s accent. All ranks use the same base color, fading automatically with age.
Solid fill stays translucent, even with Strong intensity.

Outline and Solid fill, shown in dark mode:

<img src="assets/dark-outline.png" alt="Real Zen sidebar with fading one-pixel outlines" width="186"> <img src="assets/dark-fill.png" alt="Real Zen sidebar with fading translucent solid fills" width="186">

## Compatibility

Tested with Zen 1.23b Linux and Sine 2.3.3 in a disposable profile. Native hover,
selection, tab controls, and tab positions are preserved. No build step or runtime
dependencies are required. Firefox compatibility is not claimed.

## Known limitations

- Restored recency depends on native session metadata; old background tabs and
  equal timestamps can be ambiguous.
- Hidden tabs and collapsed folder members do not consume ranks. Global workspace
  history can leave gaps in the currently visible trail.
- Very light or dark custom colors can be faint against a matching sidebar.
- Windows/macOS, third-party themes, and native drag/audio/container combinations
  still need manual visual checks. Recency is supplementary to native focus and selection.
- Sine 2.3.3 has a condition-observer typo that can produce a Sine console error.
  A small compatibility stylesheet keeps its native custom-color field conditional;
  no custom settings UI is added.

## Development

Version **0.2.0** remains pre-release. With Node.js 22+:

```sh
node --check recent-tab-trail.uc.js
node --check tools/install-local.mjs
node --test tests/*.test.cjs
```

GitHub Actions runs these checks on Linux with Node 24. Boundary tests do not
verify browser rendering. See [VERIFICATION.md](VERIFICATION.md) for native behavior,
preference keys, live browser results, installation details, and manual checks.

## License

[MIT](LICENSE).
