# Volleyball Rotation Visualizer

An interactive, dependency-free SVG diagram of a volleyball team's on-court
formation. It focuses on four mechanics:

- **Rotation** — click a rotate button to cycle all six players through the
  court's six zones the way a real side-out rotation works.
- **Free movement** — drag any player anywhere on the court.
- **Overlap detection** — the current formation is continuously checked
  against the FIVB positional-fault rules (row order and front/back order),
  with no button to press.
- **Libero swap** — replace a back-row player with the Libero, with
  automatic swap-out if that player would rotate to the front row.

See [RULES.md](RULES.md) for the full rules/conventions reference this
project is built against.

## Running it

No build step or dependencies — just open [index.html](index.html) directly
in a browser, or serve the folder with any static file server.

## Project structure

```
index.html          Page shell and layout
setup.html           Placeholder page for future setup options (moved help text lives here)
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

See [RULES.md](RULES.md) for the full breakdown of the zone layout,
starting lineup, overlap rules (FIVB 7.4), and Libero swap behavior.
