# Volleyball Rotation Visualizer

An interactive volleyball rotation and positional-fault (overlap) diagram.
Drag players around the court, rotate the lineup, swap in the Libero, and
get instant feedback on whether the formation is legal - in both a 2D
diagram and a fully navigable 3D scene. No installs, no build step, no
account needed.

**[Try it now on GitHub Pages &rarr;](https://j-mathes.github.io/Volleyball-Rotation-Visualizer/)**

## Getting started

### Option 1 — Use it online

Just open the live demo link above. Nothing to install.

### Option 2 — Run it on your own computer

No dependencies to install, but the app must be served over `http://`,
not opened directly as a file - it uses ES modules, which browsers block
when opened straight from disk (`file://`). Pick whichever is easiest:

- **Windows:** double-click [start-server.bat](start-server.bat) - starts
  a local server and opens the app in your browser. Close its console
  window to stop the server.
- **VS Code:** install the "Live Server" extension, right-click
  [index.html](index.html), choose "Open with Live Server".
- **Any OS with Python:** run `python -m http.server` in this folder,
  then visit `http://localhost:8000`.

## How to use it

1. **The court** - each circle is a player, labeled by position (`S` =
   Setter, `OH` = Outside Hitter, `MB` = Middle Blocker, `OP` = Opposite,
   `L` = Libero). Zone numbers 1-6 mark each position on court, with
   zone 1 being the back-right serving position.
2. **Rotate** - click "Rotate" to cycle every player one zone, the way a
   real side-out rotation works. "Rotate Back" undoes it.
3. **Move players** - drag any player anywhere on the court to test a
   formation. The "Overlap Results" list updates live, and any player
   breaking a positional-fault rule turns red.
4. **Swap in the Libero** - click "Swap In Libero", then click a
   highlighted back-row player to swap them out for the Libero. Rotating
   that player to the front row automatically swaps the Libero back out.
5. **Save & replay setups** - save the current arrangement under a name,
   reload it later, or chain several together into a playlist that steps
   or auto-plays through them (managed from the Setup page).
6. **Switch to 3D** - click "3D View" at the top to see the same court
   rendered as a real 3D scene: orbit the camera freely, or click either
   referee (R1/R2) to jump to their exact viewpoint and look around.
7. **Right-click for more** - right-click anywhere on the court to open a
   quick menu of extra toggles and camera shortcuts.
8. **Customize** - visit the Setup page (top-right link) to rename
   players, recolor the court, adjust fonts/line thickness, and manage
   saved setups and playlists.

The "Shortcuts" link at the top of the app lists every keyboard and mouse
control.

## Learn more

- [RULES.md](RULES.md) - the exact FIVB rules this app implements.
- [ROADMAP.md](ROADMAP.md) - full development history and planned work.

## License

Copyright © 2026 Jared Mathes — [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

