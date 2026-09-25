# Volleyball Rotation Visualizer

An interactive, dependency-free SVG diagram of a volleyball team's on-court
formation. It focuses on three mechanics:

- **Rotation** — click a rotate button to cycle all six players through the
  court's six zones the way a real side-out rotation works.
- **Free movement** — drag any player anywhere on the court.
- **Overlap detection** — check the current formation against the standard
  positional-fault rules (row order and front/back order) and see which
  players are violating them.

## Running it

No build step or dependencies — just open [index.html](index.html) directly
in a browser, or serve the folder with any static file server.

## Project structure

```
index.html          Page shell and layout
css/style.css        Styling for the court, panel, and players
js/config.js         Court/zone coordinates and the starting lineup
js/court.js          Draws the static court lines
js/player.js         Draggable, animatable player SVG element
js/rotation.js       Tracks which role occupies each zone and rotates them
js/overlap.js        Positional-overlap rule checks
js/main.js           Wires the UI controls to the above
reference/           Archived third-party source kept for reference only
                      (not used by the build — see its own README)
```

## Notes on the overlap rules

The six zones are numbered clockwise the way volleyball describes them
(1 = back-right/server ... 6 = back-middle). The checker verifies:

- left-to-right order is preserved within the front row (4-3-2) and back
  row (5-6-1)
- each front-row player stays nearer the net than their back-row counterpart
  (4/5, 3/6, 2/1)

This intentionally does not model libero substitutions or system-specific
lineups (5-1, 6-2, etc.) — it's a generic 6-player formation check.
