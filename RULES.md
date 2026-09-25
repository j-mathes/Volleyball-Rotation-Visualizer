# Rules Reference

Single source of truth for the game rules and visual conventions this
visualizer implements. Check new features/fixes against this doc rather
than re-deriving or guessing.

## Zones & court layout

- 6 zones, numbered 1-6 the way volleyball describes them.
- Front row (nearer the net): 4 (left), 3 (middle), 2 (right)
- Back row: 5 (left), 6 (middle), 1 (right/server)
- Rotation is clockwise: the player in zone N moves to zone N-1 (wrapping
  1 -> 6). See `RotationState.rotate()` / `zoneAfterRotation()` in
  [js/rotation.js](js/rotation.js).

## Starting lineup (Rotation 1)

Counter-clockwise by zone, 1 through 6: **S, OH1, MB2, OP, OH2, MB1**.

| Zone | 1 | 2 | 3 | 4 | 5 | 6 |
|------|---|---|---|---|---|---|
| Role | S | OH1 | MB2 | OP | OH2 | MB1 |

Setter and Opposite are opposite each other (3 zones apart: 1&4, 2&5,
3&6), as are the two Middles and the two Outsides. Defined in
`INITIAL_ZONE_ROLES` in [js/config.js](js/config.js).

## Overlap rules (FIVB Rule 7.4)

- 7.4.1: zone numbering as above.
- 7.4.2.1: each back-row player must stay further from the net than the
  front-row player in the same column (4/5, 3/6, 2/1).
- 7.4.2.2: front-row and back-row players must each keep their row's
  left-to-right order (4-3-2 and 5-6-1).
- 7.4.3: "level with" (tied) positions are legal - ties are not faults.
  Rule 7.4.3 judges position by foot contact, not a single center point;
  since our player icons have no feet, we treat each circle's edge as its
  foot boundary. A player is only in violation once its entire circle has
  moved completely past the other player's circle - partial overlap
  (even of the centers) is still legal. This means the tolerance used is
  a full player diameter, not a near-zero epsilon.
- Implemented in [js/overlap.js](js/overlap.js) and runs automatically
  (no button) any time a player moves. This is grounded directly in the
  rule text above, not derived from the archived reference site
  (`reference/`), which testing showed to be inaccurate.

## Libero rules

- Terminology: the Libero **replaces** a player - never "subs" or
  "substitutes."
- The Libero may only replace a **back-row** player (zones 5, 6, 1).
- Only one replacement can be active at a time.
- If a rotation would carry the replaced player into the front row, the
  Libero automatically swaps off *before* the rotation happens.
- The Libero is excluded from the overlap check while on the bench; only
  the current on-court occupant of each zone is checked.
- UI flow: click "Swap In Libero" -> click a highlighted back-row player
  to complete the swap; click "Swap Out Libero" to reverse it.
- Animations must never show 7 players on court at once: the outgoing
  player fully leaves before the incoming one arrives, and the Libero and
  the player it replaced each have their own bench slot (never share
  coordinates - see `BENCH_POSITION` / `BENCH_POSITION_REPLACED` in
  [js/config.js](js/config.js)).
- Manually dragging the benched player onto the court (which would create
  a 7th on-court body) highlights it red as a warning, without blocking
  the drag.

## Visual conventions

- Court colors match the teal free-zone / coral playing-surface look of
  real Taraflex volleyball courts: `--court-bg: #189a94`,
  `--court-fill: #e2836b`.
- Selectable back-row highlight: green (`--player-selectable: #22c55e`),
  chosen for contrast against the coral court.
- Overlap violation / bench-overflow warning: red
  (`--player-overlap: #e74c3c`).
