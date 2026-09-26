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

## Phase 1 — 2D View Orientation Toggle (REMOVED, see note below)

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

**Removed** (post-2.13, per explicit user request): once 3D View's free-
orbit camera + ViewCube existed as a real alternative way to look at the
court from any angle, the "Net Left"/"Net Right" 2D view-orientation
options no longer earned their keep - only "Net Top" (angle 0) is left,
and the whole angle-parameterization system (viewBox swapping, the
rotating viewport, the second "top-of-court" bench layout, per-player
counter-rotation) was deleted along with it as dead weight. See the
"View Orientation removal" note in repo memory for the full list of what
was deleted. Phase 1.4's thin rendering interface (the actual point of
this phase) remains fully intact and is what let 3D plug in cleanly in
the first place - only the angle-specific PARTS of 1.1-1.3 were removed.

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
- [x] 2.7 Bench-warning drag feedback — port the 2D app's check that
      warns (red tint) when the benched/Libero puck is dragged onto a
      court that already has its full 6 players, so it's never possible
      to end up with 7. Not yet in the 3D scene at all.
- [x] 2.8 Billboarded text labels via `CSS2DRenderer`.
- [x] 2.9 Camera controls (orbit/tilt).
- [x] 2.10 Floating 3D control UI + dashboard — 2D's fixed side panel
      doesn't work once the camera can move freely around the full 3D
      scene (2.9), since it'd end up blocking the view or sitting far
      from whatever's currently on screen. Needs a movable/floating panel
      (draggable to reposition) and/or a right-click context menu (design
      still open - pick whichever tests better) for toggles, plus a
      floating "dashboard" readout for status info. Sub-items:
      - [x] "Show Overlap Guides" / "Show Player Links" independent
            toggle buttons (3D currently always shows both together
            whenever a puck is selected, unlike 2D's separate toggles).
      - [x] Selection lock (double-click a puck to lock the selection,
            same as 2D - not in 3D yet).
      - [x] Surface the "Lock to Legal Positions" (2.6) and "3D Preview -
            Bench Side" (2.2, currently setup.html-only) toggles here too.
      - [x] Dashboard readout: rotation number / server-zone (depends on
            2.8's text labels existing first) + an overlap-results list
            (3D currently has no on-screen equivalent of either).
- [x] 2.11 Glow/pulse effect settings analog for 3D — `effectSettings.js`
      drives a CSS drop-shadow glow in 2D (selectable/guide-selected/
      locked highlights); 3D has no equivalent yet (e.g. an emissive
      material intensity pulse) - needs its own design, not a direct port.
- [x] 2.12 3ds Max-style view navigation for 3D — redefines the original
      "View Orientation toggle" idea now that 2.9's free-orbit camera
      exists (a literal port of 2D's Net Left/Top/Right toggle doesn't map
      cleanly onto a full 3D perspective scene). Per explicit user
      request, modeled on 3ds Max's ViewCube + view shortcuts:
      - [x] ViewCube widget (small 3D cube in the viewport corner; 6
            faces + 12 edges + 8 corners = 26 clickable regions) that
            smoothly snaps the camera to that preset view (preserving
            current zoom distance), and visually rotates in sync with the
            main camera as the user orbits, for at-a-glance orientation
            feedback.
      - [x] Home button/icon (plus Home/P keys) resets to the scene's
            original default camera view.
      - [x] Keyboard shortcuts: P (perspective/home), T (top), F
            (endline), L (left), V (view picker menu of all 6 faces), Z
            (zoom extents - frames the whole court, or tightly frames the
            selected puck if one is selected). (3ds Max's C/object-
            transform-gizmo/shading/grid/snap shortcuts don't apply here -
            no secondary camera object and this isn't a modeling tool.)
      - [x] Left-click selects/drags pucks; right-click is reserved for
            orbiting instead of OrbitControls' left-button default (so
            the two gestures never compete for the same button) -
            right-click-and-hold on a puck sets it as the orbit anchor
            for that gesture (re-targets the camera onto it), right-
            click-and-hold on empty court/ground orbits normally around
            the court center. This replaced an earlier "Orbit Around
            Selection" panel toggle (which re-centered on the left-click
            selection instead) - no toggle is needed once left/right
            click are split, and it keeps left-click selection
            completely free of camera side-effects as before. `Z` (zoom
            extents) still explicitly frames the left-click selection
            regardless of the current right-click orbit anchor.
      - [x] The cube's two Z-axis faces are labeled ENDLINE/NET rather
            than a generic Front/Back - which side of the net counts as
            "front" is inherently ambiguous (flips depending which team
            you consider yourself on, and the net itself has no front/
            back), whereas our team's fixed endline and the fixed net
            plane (z=0) are unambiguous world landmarks that stay correct
            regardless of what's added later. Any future "view from a
            specific prop's own facing" (e.g. a referee stand) belongs in
            a separate, object-specific camera preset, not a repurposing
            of this generic world-axis ViewCube.
      - [x] Edge/corner ViewCube hotspots are small 3D boxes (6 tiny
            faces each), not flat 2D squares - a flat hotspot rotates
            edge-on and becomes nearly invisible/unclickable when the
            cube is viewed close to face-on from that side.
- [x] 2.13 Wire the 3D renderer in as the 4th `viewMode` option behind
      the Phase 1 interface. Sub-items to verify while wiring (expected
      to mostly fall out "for free" once the shared app state/rotation
      logic drives the 3D renderer too via the same interface, but called
      out explicitly so they don't get missed during testing):
      - [x] Switching between 2D and 3D (either direction) preserves the
            exact current court setup (rotation number, every player's
            position, Libero swap state) - this is standard, expected
            behavior for any `viewMode` switch (same as toggling the 2D
            Net Left/Top/Right angle never resets positions today), not
            an optional nice-to-have.
      - [x] Rotation state + Rotate CW/CCW/Reset-to-Base actually rotate
            the pucks (currently static placeholders, no rotation logic
            wired in at all).
      - [x] Libero swap-in/out as real tracked state (not just a freely
            draggable puck with no role-replacement semantics).
      - [x] Save/Load court setups + Playlist playback work against the
            3D scene.
      - [x] Rotation number / server-zone display (see 2.10's dashboard;
            depends on 2.8's text labels).
      - [x] Player display-name customization (jersey numbers) shows up
            on the 3D labels too (same 2.8 dependency).

This turned into a full architectural unification rather than a thin
wire-up: `js/scene3d.js` (the standalone preview's self-contained scene,
with its own `RotationState`, overlap-checking, and selection) was
retired and replaced by `js/renderer3d.js` + `js/player3d.js`, which
implement the SAME interface `js/renderer.js` does - main.js's existing
(already renderer-agnostic) rotation/Libero/overlap logic now drives
BOTH renderers identically, with zero duplicated app-state logic. The 3D
scene mounts directly inside index.html (a `#scene3dMount` div alongside
`#court`, toggled via a new "View Mode" panel section) instead of a
separate page; `scene3d.html` now just redirects to `index.html` (forcing
3D mode first, so old bookmarks/links still land somewhere useful). The
floating "Controls" panel from Phase 2.10 was removed entirely - its
guide/link toggles, clamp toggle, and overlap-results list are now the
SAME shared elements the 2D view already had (no more duplicate UI); only
genuinely 3D-only concepts (the ViewCube/camera, and the Bench Side
toggle) remain 3D-specific, shown/hidden by the same "View Mode" section.

## Phase 3 — Two-Team Support (planned, not started)

Eventually show both teams on court at once (ours + an opponent on the
mirrored far half of the net). Both renderers already draw the full
court (see Phase 2.13's note above and the 2D full-court change that
followed it), and a couple of small preparatory refactors have already
landed ahead of time - see below - but the bulk of this is still design
+ implementation work, not yet started.

**Already prepped, ahead of time** (behavior-preserving, verified no
regressions):
- `court.js`/`renderer3d.js` draw the FULL court (our half + the
  opponent's half mirrored across the net), not just our half - the far
  half is currently just cropped off-screen by the 2D viewBox, but the
  geometry is there for a second team to occupy.
- `config.js`'s `ZONE_POSITIONS` are now derived from a net-relative
  source of truth (`ZONE_LOCAL_POSITIONS`, keyed by `{x, depth}` instead
  of raw world `{x, y}`) via a new `zoneWorldPosition(zone, side)`
  helper - `side: 'near'` (today's only team, unchanged values) or
  `'far'` (mirrors depth to the opposite side of the net, not used yet).
  A future second team's zone positions can reuse the same table instead
  of a hand-authored duplicate.
- `overlap.js` got a comment (no logic change) flagging that its front/
  back check assumes near-side sign conventions (smaller y = closer to
  net) and will need the far team's y negated back to net-relative depth
  before being passed in - `checkOverlap` itself has no team/side concept.

**Still needed when this is actually built** (not started):
- Per-team state in `main.js` - currently exactly one `playersByRole`,
  `rotationState`, `liberoState`, `benchedRole()`. Needs namespacing
  (e.g. by team id) rather than module-level singletons.
- A decision on zone-numbering mirroring - real volleyball mirrors each
  team's zone numbers diagonally (each team's own zone 1 is opposite when
  viewed from a fixed camera), not just a straight y-flip; `far` in
  `zoneWorldPosition` only handles the y-flip so far.
- A second bench (per team) in both renderers.
- A second "Serving:"/rotation-tracker readout, or a combined one.
- A `courtSetups.js` schema version bump - the save/load format currently
  flattens to one team's role set (`positions: { S: {x,y}, ... }`) with
  no team wrapper at all.


