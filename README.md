# Volleyball Rotation Visualizer

An interactive, dependency-free SVG diagram of a volleyball team's on-court
formation. It focuses on four mechanics:

- **Rotation** — click a rotate button to cycle all six players through the
  court's six zones the way a real side-out rotation works.
- **Free movement** — drag any player anywhere on the court.
- **Overlap detection** — the current formation is continuously checked
  against the FIVB positional-fault rules (row order and front/back order),
  with no button to press. Optional "Show Overlap Guides" and "Show Player
  Links" toggles let you select a player and preview its positional
  boundaries/relationships with corresponding players, with a lockable
  selection so you can move other players without losing it.
- **Libero swap** — replace a back-row player with the Libero, with
  automatic swap-out if that player would rotate to the front row.
- **Save/load court setups** — save the current on-court arrangement
  (positions, rotation, Libero swap) under a name, then load, export to a
  JSON file, import, or delete it from the setup page.
- **Court position playlist** — build an ordered sequence of saved setups
  on the setup page, then animate through them automatically (or step
  through manually) from the visualizer, with a configurable per-step delay.
- **Color customization** — every court/player/UI color is a CSS custom
  property, editable on the setup page instead of hardcoded, including a
  separate fill color just for the Libero.
- **Line thickness customization** — the player outline and
  guide/violation/link line stroke widths are editable on the setup page
  instead of hardcoded.

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
  Export (download as JSON), Import (from a JSON file), and Delete.
- **Court Setup Playlist** — build/reorder an ordered list of saved setups
  to animate through; play/pause/step and the per-step delay are
  controlled from the visualizer's "Playlist Playback" panel.
- **Colors** — pick custom colors for the court, players, overlap/guide
  lines, and panel UI, persisted in localStorage and shared with the main
  visualizer.
- **Line Thickness** — set the stroke width (px) of the player outline and
  the guide/violation/link lines, persisted in localStorage and shared
  with the main visualizer.

## Project structure

```
index.html            Page shell and layout
setup.html             Help text and customization options (see "Setup page" above)
css/style.css          Styling for the court, panel, and players
js/config.js           Court/zone coordinates and the starting lineup
js/court.js            Draws the static court lines
js/player.js           Draggable, animatable player SVG element
js/rotation.js         Tracks which role occupies each zone and rotates them
js/overlap.js          Positional-overlap rule checks
js/playerLabels.js      Custom player-label persistence (shared by index.html/setup.html)
js/courtSetups.js       Saved court setup persistence (shared by index.html/setup.html)
js/playlist.js          Court setup playlist persistence (shared by index.html/setup.html)
js/colors.js            Custom color persistence (shared by index.html/setup.html)
js/lineSettings.js      Custom line-thickness persistence (shared by index.html/setup.html)
js/main.js             Wires the UI controls to the above
js/setup.js             Wires up the setup page's customization forms
reference/             Archived third-party source kept for reference only
                        (not used by the build — see its own README)
```

## Notes on the overlap rules

See [RULES.md](RULES.md) for the full breakdown of the zone layout,
starting lineup, overlap rules (FIVB 7.4), and Libero swap behavior.
