# Volleyball Rotation Visualizer

An interactive, dependency-free SVG diagram of a volleyball team's on-court
formation. It focuses on four mechanics:

- **Rotation** — click a rotate button to cycle all six players through the
  court's six zones the way a real side-out rotation works.
- **View orientation** — a "Net Top/Right/Left" segmented control rotates
  the whole court 90° at a time; all text (BENCH label, rotation tracker,
  player labels) stays upright regardless of orientation. Persists across
  reloads.
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

A separate, in-progress [3D Preview](scene3d.html) (linked from the main
page's header) is being built out per [ROADMAP.md](ROADMAP.md)'s Phase 2 -
a true Three.js scene with draggable player pucks and the same overlap
detection, not yet wired into the main visualizer's `viewMode` toggle.

See [RULES.md](RULES.md) for the full rules/conventions reference this
project is built against, and [ROADMAP.md](ROADMAP.md) for planned future
work (view-orientation toggle, 3D mode, and further customization options).

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
  duration/max blur.
- **3D Preview — Bench Side** — choose which side of the court the
  bench/Libero substitution area sits on in the [3D Preview](scene3d.html)
  page specifically (the 2D visualizer already places it automatically
  per net orientation, so it doesn't need this setting).

## Project structure

```
index.html            Page shell and layout
setup.html             Help text and customization options (see "Setup page" above)
scene3d.html            Phase 2 3D rendering preview (work in progress, not yet
                        wired into the main index.html view-angle toggle)
css/style.css          Styling for the court, panel, and players
js/config.js           Court/zone coordinates and the starting lineup
js/court.js            Draws the static court lines and bench layouts (SVG primitives)
js/player.js           Draggable, animatable player SVG element
js/renderer.js          Thin 2D (SVG) rendering interface - the only module
                        main.js uses for anything rendering-related (create/
                        move players, draw guide/link lines, view-angle
                        switching); a future alternate renderer (e.g. 3D)
                        would implement the same interface
js/rotation.js         Tracks which role occupies each zone and rotates them
js/overlap.js          Positional-overlap rule checks
js/playerLabels.js      Custom player-label persistence (shared by index.html/setup.html)
js/courtSetups.js       Saved court setup persistence (shared by index.html/setup.html)
js/playlist.js          Court setup playlist persistence (shared by index.html/setup.html)
js/colors.js            Custom color persistence (shared by index.html/setup.html)
js/lineSettings.js      Custom line-thickness persistence (shared by index.html/setup.html)
js/fontSettings.js      Custom font persistence (shared by index.html/setup.html)
js/effectSettings.js    Custom glow/pulse effect persistence (shared by index.html/setup.html)
js/viewSettings.js      Net-orientation view-angle persistence (shared by index.html/setup.html)
js/main.js             Wires the UI controls to the above
js/setup.js             Wires up the setup page's customization forms
js/scene3d.js           Phase 2 3D scene (Three.js, loaded via an import map
                        from a CDN - court plane, lighting, camera,
                        draggable player pucks via raycasting, and
                        overlap-driven guide/violation/link lines using
                        the Line2/LineMaterial "fat line" addon) for
                        scene3d.html
js/benchSideSettings.js Bench/Libero side persistence for the 3D scene only
                        (shared by scene3d.html/setup.html)
```

## Notes on the overlap rules

See [RULES.md](RULES.md) for the full breakdown of the zone layout,
starting lineup, overlap rules (FIVB 7.4), and Libero swap behavior.

## License

Copyright © 2026 Jared Mathes — [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

