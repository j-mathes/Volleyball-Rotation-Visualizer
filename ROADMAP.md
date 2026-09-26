# Feature Roadmap

Tracks planned work beyond the current feature set. Mark items `[x]` as they're completed.

## Phase 0 — Customization Features (Setup Page)

All customization UI lives on `setup.html`, keeping the main visualizer
(`index.html`) uncluttered. These are independent of rendering technology
(2D SVG vs. future 3D) — they operate on settings *values*, not drawing
*mechanism* — so they're safe to build before Phase 1/2, and won't need
rework when the renderer changes later.

- [x] 0.1 Player display names — customizable per-role labels (e.g. jersey
      numbers instead of "S"/"OH1"), editable on the setup page.
- [x] 0.2 Save/load a court position setup — serialize player positions +
      rotation number + Libero state (JSON, localStorage and/or
      export/import), restorable later. Setup page hosts the save/load UI.
- [x] 0.3 Color customization — expose the existing CSS custom properties
      (court fill, player fill, overlap red, etc.) via a settings UI on
      the setup page instead of hardcoded `:root` values.
- [x] 0.4 Custom Libero-only color — scoped variant of 0.3, giving the
      Libero its own fill color independent of other players.
- [x] 0.5 Line thickness/color customization — move the currently
      hardcoded stroke-width/color literals in `drawSeparatorLine`/
      `drawLinkLine`, plus the player circle's outline stroke-width in
      `style.css`, into a shared settings object, editable on the setup page.
- [x] 0.6 Court position "playlist" — save multiple named setups (reusing
      0.2's serialization format as the list items) and animate through
      them in sequence, reusing the existing `Player.animateTo` tweening
      for the transitions between each saved setup. Setup page hosts
      building/reordering the list; playback controls (play/pause/step,
      per-step delay) live wherever makes sense once designed.
- [x] 0.7 Organize saved court setups into folders — group related saved
      setups (e.g. per-rotation variants, different lineups) into named,
      possibly nested folders on the setup page's saved-setup list, rather
      than one flat list. Export/import stay scoped to a single setup (or
      a chosen folder), not all-or-nothing. Also add a quick-recall
      affordance for jumping straight to a saved setup (e.g. a searchable
      dropdown) instead of always navigating to the setup page's full list.
- [x] 0.8 Font customization — expose the font family (and size) used for
      player labels, the BENCH label, and the "R#" rotation tracker as a
      setting, replacing the hardcoded `Verdana` literals in `court.js`,
      `player.js`, and `style.css`.
- [x] 0.9 Glow/pulse effect tuning — expose the drop-shadow blur radius
      used for selectable/guide-selected/locked player highlights, and the
      `lock-pulse` animation's duration, as settings instead of the
      hardcoded values in `style.css`.

## Phase 1 — 2D View Orientation Toggle

- [x] 1.1 Generalize the court rotation into a parameterized angle
      (0°/net-top, 90°/net-right, -90°/net-left) with matching viewBox
      swap for the ±90° cases.
- [x] 1.2 Counter-rotate all text elements (BENCH label, "R#" tracker,
      player labels) so they stay upright at any angle.
- [x] 1.3 Add a UI toggle (segmented control) wired to a `viewMode` state.
- [ ] 1.4 Extract a thin rendering interface (`createPlayer`,
      `drawSeparatorLine`, `drawLinkLine`, `setRotationTrackerText`, etc.)
      so `main.js` stops talking to SVG-specifics directly — this is what
      lets Phase 2 plug in without another refactor.
- [ ] 1.5 Configurable Libero bench side — the bench/Libero substitution
      area's placement (currently hardcoded to one side) needs to be a
      selectable setting independent of the net-orientation toggle, since
      "which side" stops being an obvious single fixed answer once the
      court can be viewed from multiple orientations.

## Phase 2 — 3D True Rendering Mode

- [ ] 2.1 Add Three.js; build the scene (court plane, lighting, camera).
- [ ] 2.2 Player representation (disc/cylinder or sprite) + drag via
      raycasting onto the court plane.
- [ ] 2.3 Guide/violation/link lines as 3D geometry — "fat line" technique
      for thickness, `LineDashedMaterial` for dashed styles.
- [ ] 2.4 Billboarded text labels via `CSS2DRenderer`.
- [ ] 2.5 Camera controls (orbit/tilt).
- [ ] 2.6 Wire the 3D renderer in as the 4th `viewMode` option behind the
      Phase 1 interface.
- [ ] 2.7 Carry the 1.5 configurable Libero bench side setting into the 3D
      scene (bench placement in 3D space follows the same setting).

