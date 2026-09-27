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

## Phase 3 — Control Layout Overhaul, Quad-Menu, Referee/Net Viewpoints (in progress)

Replaces the vertical right-side panel with a horizontal top bar (an
operations row of action buttons + a status row of read-only info),
freeing the space for a wider court/3D scene. Moves secondary settings
into a 3ds-Max-inspired right-click quad-menu, adds a keyboard/mouse
reference page, and adds selectable (not draggable) referee/net objects
in 3D as camera viewpoints/orbit targets. Applies to both 2D and 3D, with
only the applicable options shown per mode.

- [x] 3.1 Top-bar layout - operations row (2D/3D toggle, Rotate CW/CCW,
      Reset, Libero swap, Overlap Guide/Player Link/Lock toggles) +
      status row (rotation/serving readout + per-player overlap-status
      cards - role label on top, ok/violation status below - restyled
      from the existing `#overlapResults` list, reusing `summarizeByPlayer`
      unchanged). Court/`#scene3dMount` width expands into the freed
      space.
      Follow-up: moved the "R#" rotation tracker off the 2D court diagram
      (it never had a 3D equivalent) into a single top-bar badge shared by
      both view modes - a large teal-bordered tile (`#rotationBadge`) at
      the far left of `.top-bar`, spanning the full height of both rows,
      updated directly by `refreshRotationDisplay()` in main.js instead of
      via a per-renderer `setRotationTrackerText` (removed from both
      renderer interfaces; the SVG box/text it drew, plus its
      `rotationTrackerSize` font setting on setup.html, were removed
      entirely). Also added a small "Z#" zone-number sub-label to the left
      of each per-player role in the overlap-status cards (`entry.zone`
      from `summarizeByPlayer` was already available, just not
      displayed).
- [x] 3.2 3D Alt-to-orbit remap - holding Alt temporarily turns
      LEFT-click-drag into camera orbit (toggles
      `controls.mouseButtons.LEFT` between `ROTATE`/`null` on Alt
      keydown/keyup; puck select/drag no-ops while Alt is held). RIGHT
      click becomes exclusively the quad-menu trigger (`contextmenu` +
      `preventDefault()`). Anchor-repick (previously right-click) moves to
      Alt+LEFT pointerdown, raycasting against pucks + the new net
      viewpoint (net -> retarget to its center-top point; puck -> retarget
      to it; empty space -> reset to default court center). Add
      `onContextMenu(handler)` to both renderer.js and renderer3d.js
      interfaces, mirroring the existing `onBackgroundClick` pattern.
      Follow-up: Shift+LEFT-drag pans the camera the same way (`controls.
      enablePan` turned on, `controls.mouseButtons.LEFT` now toggles
      between `ROTATE`/`PAN`/`null` based on which modifier - if either -
      is currently held, Shift taking precedence in the rare case both are
      held at once).
- [x] 3.3 Quad-menu (new `js/quadMenu.js`) - simplified fixed layout (not
      true cursor-quadrant flyouts), showing only as many of up to 4
      sections as are applicable per view mode:
      - View & Camera (3D-only): reset view, zoom extents, the 6 preset
        views, ViewCube size (S/M/L), label scale mode.
      - Scene Setup (3D-only): bench side (left/right).
      - Court Setups & Playlist (both modes): save current setup, quick
        load, play/pause, step - relocated off the old side panel.
      - Keyboard & Mouse Shortcuts (both modes): clickable list (choosing
        an entry executes it) + a link to the new reference page.
      - Zone-label toggle (both modes, see 3.7) - NOT YET ADDED to the
        menu; deferred until 3.7 actually implements the underlying
        toggle (no point in a menu item with nothing behind it yet).
      Requires exposing `resetToDefaultView`, `snapToPresetView(label)`,
      `zoomExtents`, and new live setters `setViewCubeSize(size)`/
      `setLabelScaleMode(mode)` (mirroring `setBenchSide`'s existing live-
      update pattern) on renderer3d.js's returned interface.
      Follow-up (per user feedback after first landing): rebuilt as a
      TRUE cursor-centered radial layout (each quadrant expands outward
      from the right-click point, not a fixed 4-box grid), with icon+word
      buttons instead of bare letters, grouped into `.quad-group` clusters
      with extra spacing BETWEEN groups; the 6 preset-view buttons were
      then removed entirely (redundant with the always-visible ViewCube);
      Overlap Guides/Player Links/Lock to Legal Positions got duplicate
      quick-access buttons here too (both modes, alongside the top bar's
      originals, sharing the same toggle functions so neither copy can
      drift out of sync) and moved into the View quadrant (which is no
      longer entirely 3D-only - individual `.quad-3d-only`-marked groups
      within it still hide in 2D, generalized in `js/quadMenu.js` beyond
      just whole-section hiding); ViewCube-size buttons got a small cube
      emoji suffix and label-scale buttons a script-F suffix, so their
      purpose reads at a glance.
- [x] 3.4 Shared `js/shortcutsData.js` (canonical list tagged
      `2d`/`3d`/`both`) + new `reference.html`/`js/reference.js` page
      (setup.html-style chrome) listing keyboard shortcuts and mouse
      options, linked from the app header. Covers everything that exists
      today (Alt-orbit, right-click-menu, the 3D keyboard shortcuts); 3.8
      will ADD its new playlist shortcuts to this same data file once
      built, not restructure it.
      Follow-up: greatly expanded past the original "camera only" scope -
      added Bottom/Net/Right 3D view shortcuts (B/N/R, filling the gap
      left by removing their quad-menu buttons) and a full set of
      both-modes app shortcuts (Rotate CW/CCW = `]`/`[`, Reset to Base =
      `0`, Swap Libero = `S`, Overlap Guides/Player Links/Lock to Legal =
      `G`/`J`/`C`), wired via a new `onGlobalKeydown` listener in main.js
      (guarded like renderer3d.js's own `onKeydown`) plus a
      `shortcutActions` map shared with the quad-menu's Keys section,
      which now renders two grouped lists (camera shortcuts vs. app
      shortcuts) instead of one flat one. Shift+drag pan also documented
      in `MOUSE_CONTROLS`.
      Follow-up (cursor feedback): fixed a real bug where Shift+drag
      still rotated instead of panning - three.js's OrbitControls has
      built-in Shift handling that flips ROTATE<->PAN symmetrically, so
      mapping `LEFT` to `PAN` directly while Shift was held triggered its
      OWN reverse flip back to rotate; the fix maps `LEFT` to `ROTATE`
      for both Alt and Shift and lets OrbitControls' native
      `event.shiftKey` check pick rotate-vs-pan itself. Also added cursor
      feedback: `grab`/`grabbing` while Shift/pan is ready/active, and
      `all-scroll` while Alt/orbit is held (no standard CSS keyword is
      literally "rotate" - `all-scroll`'s four-way-arrow look is the
      closest conventional stand-in for free camera movement).
      Follow-up 2: the 7 both-modes app shortcuts (Rotate CW/CCW/Reset to
      Base/Swap Libero/Overlap Guides/Player Links/Lock to Legal) moved
      out of the Keys quadrant's dynamic list into dedicated static
      buttons in the Scene quadrant instead (per user request), which -
      like View before it - is no longer entirely 3D-only: only its Bench
      Side group still carries `.quad-3d-only`. Keys reverted to a single
      flat list (camera shortcuts only, since the both-modes group moved
      out). The `]`/`[` button labels also gained a space around the
      bracket character ("Rotate CW ( ] )") since they looked visually
      crowded without one.
      Follow-up 3: Endline's shortcut changed from `F` to `E` (more
      mnemonic); the Bottom view preset was removed entirely - keyboard
      shortcut, ViewCube face, ViewCube edges/corners involving it, and
      the view-picker dropdown's "Bottom" button all deleted, since the
      camera's polar-angle clamp (`controls.maxPolarAngle`) makes a true
      underneath view unreachable anyway - clicking/pressing it just
      clamped to the same near-horizontal angle other low-angle presets
      already reach, so it never did anything genuinely distinct.
      Follow-up 4: reference.html redesigned from two separate tables
      (2D View/3D View, each listing every "both"-mode entry twice) into
      a single deduplicated table - one row per action, with 2D/3D
      checkmark columns instead of separate sections. `js/reference.js`
      no longer filters by mode or takes a `mode` param; it just renders
      `[...KEYBOARD_SHORTCUTS, ...MOUSE_CONTROLS]` once, each row's
      checkmark cells computed from `entry.appliesTo`.
- [ ] 3.5 New 3D objects: net posts (at the sidelines, z=0) + a real
      vertical net (canvas-textured grid plane, 2.43m tall, between the
      posts - today's "net" is just a flat ground-level line marker with
      no vertical mesh at all) + an R2 floor-referee puck (1.8m tall,
      bench side, ~0.5m outside its post) + an R1 stand puck (3.2m tall,
      opposite side, ~0.5m outside its post). R1/R2 are selectable via
      plain LEFT-click (new `selectableViewpoints` raycast list, separate
      from `draggablePlayers`) - selecting one tweens the camera (via the
      existing `flyCameraTo`) to eye height at that object's position
      looking at court center, and hides that object's mesh while active;
      restoring hidden visibility is centralized at the top of
      `flyCameraTo` so any other navigation action auto-restores it. The
      net is selectable only via Alt+LEFT (see 3.2) and only retargets the
      orbit anchor (COURT_SIZE/2, 243, 0) - camera position unchanged, no
      hide/jump. Both R1/R2 reposition via the existing `setBenchSide`
      mechanism, extended to also move them (not just the bench mesh).
- [ ] 3.6 setup.html cleanup - rename the 3 "3D Preview" headings to
      "3D View" and fix the 2 stale links to the retired `scene3d.html`
      to point at `index.html` instead.
- [ ] 3.7 Zone-label toggle (quad-menu item, in-memory only - not
      persisted, same convention as the existing guide/link/clamp
      toggles): when on, each on-court player's label gains a second line
      showing its current zone, e.g. "MB1" / "(Z6)"; the benched player
      shows none. New `setShowZone(zone|null)` method on both `Player`
      (2D: extra `<tspan dy=...>`) and `Player3D` (3D: extra child in the
      CSS2DObject's label div), updated on toggle-flip and on every
      rotate/reset.
- [ ] 3.8 Playlist keyboard shortcuts (main.js, guarded like
      renderer3d.js's `onKeydown`): Space = play/pause, Right Arrow = step
      forward, Left Arrow = step backward (new - `goToPlaylistStep`
      already wraps negative indices correctly, so this is a trivial
      addition).
- [ ] 3.9 Label vertical-offset fix for low camera angles - CSS2DObject
      labels are anchored at a fixed world-space height, which at
      shallow/grazing camera pitch reads as "floating in front of" the
      puck instead of "sitting on top". Fix: compute the camera's polar
      angle once per frame and apply an interpolated extra Y-offset
      (larger at grazing angles, ~0 extra at top-down angles) via a new
      `updateLabelHeight(offsetY)` on `Player3D`, mirroring the existing
      `updateLabelScale(scale)` pattern.
- [x] 3.10 Front/Back Row Link toggles + top-bar cleanup - two new
      quad-menu-only toggles (View quadrant, grouped with Overlap Guides/
      Player Links/Lock to Legal): "Front Row Link" (`F`) draws a solid
      icy-blue line chaining the 3 front-row players together (left-
      middle, middle-right - not every pairwise combination, which would
      double-draw the outer span and, being dashed, visually blend into a
      false-looking solid line via overlapping dash phases), "Back Row
      Link" (`B`) does the same dashed, for the back row. Both apply
      unconditionally (not tied to any player selection, unlike the
      existing Player Links). Mutually exclusive with Player Links in
      both directions (enabling either row-link toggle turns Player Links
      off; enabling Player Links turns both row-link toggles off) but
      freely combinable with each other. New `--row-link-line` color
      (default `#7fe0ff`, an icy blue distinct from the existing green
      Player Link color) - auto-appeared in setup.html's color picker
      since `colors.js`'s `DEFAULT_COLORS`/`COLOR_LABELS` drive that form
      generically. New `drawRowLinkLine`/`drawRowLinks` on both renderer
      interfaces, sharing the existing link-lines layer/clear plumbing
      with `drawLinkLine`. Also removed the "Show Overlap Guides"/"Show
      Player Links"/"Lock to Legal Positions" buttons from the top bar
      entirely (redundant with their quad-menu equivalents, which already
      existed in both the View and Scene quadrants) - all three (plus the
      two new row-link toggles) are keyboard-accessible (`G`/`J`/`C`/`F`/
      `B`, all "both modes" shortcuts, documented in `shortcutsData.js`
      and therefore the reference page too).
      Follow-up: added a row of small indicator chips (`#toggleIndicators`)
      in the space the removed top-bar buttons freed up, next to Swap In
      Libero - one per toggle (Overlap Guides/Player Links/Lock to Legal/
      Front Row Link/Back Row Link), each hidden by default and only
      shown while its toggle is on (`main.js`'s `refreshToggleIndicators`,
      called from all 5 toggle functions). Each chip has a small colored
      line swatch (solid or dashed to match) previewing the actual line
      style/color it corresponds to on the court.
      Follow-up 2: removed the duplicate Overlap Guides/Player Links/Lock
      to Legal copies from the Scene quadrant entirely (an unintended
      side effect of specifying "both quadrants" back in the original
      3.3 follow-ups) - all 5 toggles now live together in a single group
      in the View quadrant only, since the user felt they belonged
      grouped as one set rather than split. The View copies gained the
      `(G)`/`(J)`/`(C)` keyboard hints the removed Scene copies used to
      show (the two row-link toggles already had `(F)`/`(B)`). Scene
      quadrant now only holds Rotate CW/CCW, Reset to Base, and Swap
      Libero.

## Phase 4 — Two-Team Support (planned, not started)

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
- Once a Team A/B selector exists, the 3D camera's default orbit target
  (`DEFAULT_CONTROLS_TARGET`, currently a hardcoded court-center constant
  used both as the default orbit target and the empty-space anchor-reset
  target) should become a function of which team is currently active,
  rather than a fixed constant.


