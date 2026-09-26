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
- [x] 1.4 Extract a thin rendering interface (`createPlayer`,
      `drawSeparatorLine`, `drawLinkLine`, `setRotationTrackerText`, etc.)
      so `main.js` stops talking to SVG-specifics directly — this is what
      lets Phase 2 plug in without another refactor.

## Phase 2 — 3D True Rendering Mode

- [x] 2.1 Add Three.js; build the scene (court plane, lighting, camera).
- [x] 2.2 Configurable Libero bench side — a selectable setting for the
      bench/Libero substitution area's placement in the 3D scene. Not
      needed in 2D: the renderer.js interface already resolves bench
      side automatically per net-orientation view angle (classic left /
      top-right / top-left layouts), but a true 3D scene has no such
      built-in "which side" derivation, so it needs its own explicit
      setting.
- [x] 2.3 Player representation (disc/cylinder or sprite) + drag via
      raycasting onto the court plane.
- [x] 2.4 Guide/violation/link lines as 3D geometry — "fat line" technique
      for thickness, `LineDashedMaterial` for dashed styles.
- [x] 2.5 Line-thickness settings in 3D — wire `lineSettings.js`'s
      guide/violation/link width settings into the 3D fat lines'
      `linewidth`, which are currently hardcoded (10/6/6) instead of
      reading the same customizable settings 2D uses.
- [x] 2.6 "Lock to Legal Positions" drag clamp — port the 2D app's
      off-roadmap clamp toggle (uses `overlap.js`'s `getClampBounds`) so
      dragging a puck can be constrained from crossing a fault line
      against its current row/column neighbors, same as 2D. Not yet in
      the 3D scene - currently the only drag constraint there is the
      net-crossing clamp (z >= 0).
- [ ] 2.7 Bench-warning drag feedback — port the 2D app's check that
      warns (red tint) when the benched/Libero puck is dragged onto a
      court that already has its full 6 players, so it's never possible
      to end up with 7. Not yet in the 3D scene at all.
- [ ] 2.8 Billboarded text labels via `CSS2DRenderer`.
- [ ] 2.9 Camera controls (orbit/tilt).
- [ ] 2.10 Floating 3D control UI + dashboard — 2D's fixed side panel
      doesn't work once the camera can move freely around the full 3D
      scene (2.9), since it'd end up blocking the view or sitting far
      from whatever's currently on screen. Needs a movable/floating panel
      (draggable to reposition) and/or a right-click context menu (design
      still open - pick whichever tests better) for toggles, plus a
      floating "dashboard" readout for status info. Sub-items:
      - [ ] "Show Overlap Guides" / "Show Player Links" independent
            toggle buttons (3D currently always shows both together
            whenever a puck is selected, unlike 2D's separate toggles).
      - [ ] Selection lock (double-click a puck to lock the selection,
            same as 2D - not in 3D yet).
      - [ ] Surface the "Lock to Legal Positions" (2.6) and "3D Preview -
            Bench Side" (2.2, currently setup.html-only) toggles here too.
      - [ ] Dashboard readout: rotation number / server-zone (depends on
            2.8's text labels existing first) + an overlap-results list
            (3D currently has no on-screen equivalent of either).
- [ ] 2.11 Glow/pulse effect settings analog for 3D — `effectSettings.js`
      drives a CSS drop-shadow glow in 2D (selectable/guide-selected/
      locked highlights); 3D has no equivalent yet (e.g. an emissive
      material intensity pulse) - needs its own design, not a direct port.
- [ ] 2.12 View Orientation toggle for 3D — TBD: reconsider once 2.9's
      camera orbit controls exist, since free camera movement may already
      cover what the 2D Net Left/Top/Right toggle is for; revisit before
      committing to porting it as-is.
- [ ] 2.13 Wire the 3D renderer in as the 4th `viewMode` option behind
      the Phase 1 interface. Sub-items to verify while wiring (expected
      to mostly fall out "for free" once the shared app state/rotation
      logic drives the 3D renderer too via the same interface, but called
      out explicitly so they don't get missed during testing):
      - [ ] Switching between 2D and 3D (either direction) preserves the
            exact current court setup (rotation number, every player's
            position, Libero swap state) - this is standard, expected
            behavior for any `viewMode` switch (same as toggling the 2D
            Net Left/Top/Right angle never resets positions today), not
            an optional nice-to-have.
      - [ ] Rotation state + Rotate CW/CCW/Reset-to-Base actually rotate
            the pucks (currently static placeholders, no rotation logic
            wired in at all).
      - [ ] Libero swap-in/out as real tracked state (not just a freely
            draggable puck with no role-replacement semantics).
      - [ ] Save/Load court setups + Playlist playback work against the
            3D scene.
      - [ ] Rotation number / server-zone display (see 2.10's dashboard;
            depends on 2.8's text labels).
      - [ ] Player display-name customization (jersey numbers) shows up
            on the 3D labels too (same 2.8 dependency).

