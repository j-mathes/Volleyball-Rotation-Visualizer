# Volleyball Rotation Visualizer

An interactive, dependency-free SVG diagram of a volleyball team's on-court
formation. It focuses on four mechanics:

- **Rotation** — click a rotate button to cycle all six players through the
  court's six zones the way a real side-out rotation works.
- **Free movement** — drag any player anywhere on the court. An optional
  "Lock to Legal Positions" toggle clamps dragging so a player can't be
  moved past the fault line against its current row/column neighbors,
  showing a dashed black boundary line live while it's pressed against one.
- **Overlap detection** — the current formation is continuously checked
  against the FIVB positional-fault rules (row order and front/back order),
  updating live while dragging (not just after you let go): violation
  lines, red player highlighting, and the collapsible results
  list/indicator all track in real time. Optional "Show Overlap Guides" and
  "Show Player Links" toggles let you select a player and preview its
  positional boundaries/relationships with corresponding players, with a
  lockable selection so you can move other players without losing it.
- **Libero swap** — replace a back-row player with the Libero, with
  automatic swap-out if that player would rotate to the front row.
- **Save/load court setups** — save the current on-court arrangement
  (positions, rotation, Libero swap) under a name, then load, export to a
  JSON file, import, or delete it from the setup page.
- **Court position playlist** — build an ordered sequence of saved setups
  on the setup page, then animate through them automatically (or step
  through manually) from the visualizer, with a configurable per-step delay.
- **Folders & quick-load** — group saved setups into named folders on the
  setup page (export/import a whole folder at once), and quick-load any
  saved setup by name directly from the visualizer via a searchable field.
- **Color customization** — every court/player/UI color is a CSS custom
  property, editable on the setup page instead of hardcoded, including a
  separate fill color just for the Libero.
- **Line thickness customization** — the player outline and
  guide/violation/link line stroke widths are editable on the setup page
  instead of hardcoded.
- **Font customization** — the font family and text sizes for player
  labels, the BENCH label, and the rotation tracker are editable on the
  setup page.
- **Glow/pulse effect tuning** — the glow blur radius for
  selectable/selected player highlights, and the lock-pulse animation's
  duration, are editable on the setup page.

A separate **3D View** mode (toggle at the top of the panel) renders the
same court/state as a true Three.js scene instead of the flat SVG - free-
orbit camera controls (right-click-drag; right-click a puck to orbit
around it), a 3ds Max-style ViewCube for quick preset views, and the same
drag/overlap-detection/Libero-swap/rotation/save-load/playlist behavior as
2D, since both view modes share the exact same underlying app state and
only differ in how they're drawn (see [ROADMAP.md](ROADMAP.md)'s Phase 2
for how it was built up incrementally).

See [RULES.md](RULES.md) for the full rules/conventions reference this
project is built against, and [ROADMAP.md](ROADMAP.md) for the full
development history and any remaining planned work.

## Running it

No build step or dependencies — just open [index.html](index.html) directly
in a browser, or serve the folder with any static file server.

## Setup page

[setup.html](setup.html) hosts how-to-use help text and customization
options, kept separate from the main visualizer so its panel stays
uncluttered. Currently includes:

- **Player Names** — customize each player's on-court label (e.g. a jersey
  number instead of the position code, up to 3 characters), persisted in
  localStorage and shared with the main visualizer.
- **Saved Court Setups** — manage setups saved from the visualizer's "Court
  Setups" panel: Load (opens the visualizer with that setup applied),
  Export (download as JSON), Import (from a JSON file), and Delete. Group
  setups into named folders (edit a folder's name inline to rename it);
  Export Folder bundles every setup in a folder into one file.
- **Court Setup Playlist** — build/reorder an ordered list of saved setups
  to animate through; play/pause/step and the per-step delay are
  controlled from the visualizer's "Playlist Playback" panel.
- **Colors** — pick custom colors for the court, players, overlap/guide
  lines, and panel UI, persisted in localStorage and shared with the main
  visualizer.
- **Line Thickness** — set the stroke width (px) of the player outline and
  the guide/violation/link lines, persisted in localStorage and shared
  with the main visualizer.
- **Font** — set the font family and text sizes for player labels, the
  BENCH label, and the rotation tracker.
- **Glow & Pulse Effects** — set the glow blur radius for
  selectable/selected player highlights and the lock-pulse animation's
  duration/max blur; also drives the equivalent emissive-material glow/
  pulse on the selected puck in 3D View.
- **3D View — Bench Side** — choose which side of the court the
  bench/Libero substitution area sits on in 3D View specifically (2D
  already places it automatically per net orientation, so it doesn't need
  this setting).
- **3D View — Label Scaling** — choose whether player labels in 3D View
  shrink/grow with camera distance (matching the pucks' own perspective
  scaling, the default) or stay a fixed screen size regardless of distance.
- **3D View — View Cube Size** — choose Small/Medium (default)/Large for
  the ViewCube navigation widget's size in 3D View's viewport corner.

## Project structure

```
index.html            Page shell/layout for BOTH view modes (the 2D <svg>
                      and the 3D mount/ViewCube live side by side, toggled
                      via the "View Mode" panel section)
setup.html             Help text and customization options (see "Setup page" above)
scene3d.html            Retired standalone 3D preview - now just redirects to
                        index.html (forcing 3D View), kept for old bookmarks/links
css/style.css          Styling for the court, panel, players, and the 3D
                        mount/ViewCube widget
js/config.js           Court/zone coordinates and the starting lineup
js/court.js            Draws the static court lines and bench layouts (SVG primitives)
js/player.js           Draggable, animatable 2D player SVG element
js/player3d.js          3D analog of player.js - a duck-typed drop-in with the
                        SAME public shape, backed by a Three.js puck instead
                        of an SVG element
js/renderer.js          Thin 2D (SVG) rendering interface - create/move
                        players, draw guide/link lines
js/renderer3d.js        Thin 3D (Three.js) rendering interface implementing
                        the SAME shape as renderer.js, plus the 3D-only
                        extras with no 2D equivalent (ViewCube navigation,
                        OrbitControls, bench-side, glow/pulse, label
                        distance-scaling) - main.js drives whichever
                        renderer is active identically either way
js/rotation.js         Tracks which role occupies each zone and rotates them
js/overlap.js          Positional-overlap rule checks
js/playerLabels.js      Custom player-label persistence (shared by index.html/setup.html)
js/courtSetups.js       Saved court setup persistence (shared by index.html/setup.html)
js/playlist.js          Court setup playlist persistence (shared by index.html/setup.html)
js/colors.js            Custom color persistence (shared by index.html/setup.html)
js/lineSettings.js      Custom line-thickness persistence (shared by index.html/setup.html)
js/fontSettings.js      Custom font persistence (shared by index.html/setup.html)
js/effectSettings.js    Custom glow/pulse effect persistence (shared by index.html/setup.html)
js/viewModeSettings.js  2D-vs-3D view mode persistence (shared by index.html/scene3d.html's redirect)
js/benchSideSettings.js Bench/Libero side persistence for 3D View only
                        (shared by index.html/setup.html)
js/labelScaleSettings.js 3D player-label distance-scaling mode persistence
                        (shared by index.html/setup.html)
js/viewCubeSizeSettings.js 3D ViewCube widget size persistence (shared by
                        index.html/setup.html)
js/main.js             Wires the UI controls to the above, driving whichever
                        renderer (2D or 3D) is currently active identically
js/setup.js             Wires up the setup page's customization forms
```

## Notes on the overlap rules

See [RULES.md](RULES.md) for the full breakdown of the zone layout,
starting lineup, overlap rules (FIVB 7.4), and Libero swap behavior.

## License

Copyright © 2026 Jared Mathes — [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

