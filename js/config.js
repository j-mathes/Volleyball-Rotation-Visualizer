// Shared constants describing the court's internal coordinate system and
// the six on-court zones (1 = back-right/server ... 6 = back-middle),
// numbered clockwise the way real volleyball rotations are described.

export const COURT_SIZE = 900;
export const ATTACK_LINE_Y = COURT_SIZE / 3;

// Blue padding drawn around the (rotating) court on every side. The court
// itself is a square, so its bounding box is identical at every net-
// orientation view angle (0/90/-90) - a 90 deg turn never changes a
// square's axis-aligned bounds - which is what keeps its on-screen size
// constant across orientations.
export const SIDE_MARGIN = 60;

// Fixed (non-rotating) strip above the court reserved for the BENCH panel
// and the "R#" rotation tracker - see court.js's createFixedLayer. Always
// stays at the top of the screen regardless of the net-orientation view
// angle, unlike the court/players below it.
export const BENCH_STRIP_HEIGHT = 220;
export const BENCH_WIDTH = 260; // width of the bench panel within the strip

// Extra horizontal padding (split evenly on both sides) added to the
// viewBox beyond the court's own rotating bounding square, matching the
// original (pre-orientation-toggle, bench-on-the-side) layout's total
// width - see court.js's setViewBox - so the court renders at the same
// on-screen size as before, now that the bench strip sits above it
// instead of contributing to the width.
export const SIDE_PADDING = BENCH_WIDTH / 2;

const STRIP_TOP = -SIDE_MARGIN - BENCH_STRIP_HEIGHT;
const BENCH_TRACKER_GROUP_WIDTH = BENCH_WIDTH + 40 + 150; // panel + gap + tracker box
const BENCH_TRACKER_GROUP_LEFT = COURT_SIZE / 2 - BENCH_TRACKER_GROUP_WIDTH / 2;

// Center of the bench panel within the fixed strip, and center-x of the
// rotation tracker box next to it - both independent of the net-
// orientation view angle, since the whole strip never rotates. The pair
// is centered as a group over the court's own horizontal center.
export const BENCH_CENTER = { x: BENCH_TRACKER_GROUP_LEFT + BENCH_WIDTH / 2, y: STRIP_TOP + BENCH_STRIP_HEIGHT / 2 };
export const ROTATION_TRACKER_CENTER_X = BENCH_TRACKER_GROUP_LEFT + BENCH_WIDTH + 40 + 75;

// Two distinct bench slots (side by side, below the BENCH label) so the
// Libero and whichever player it replaced never render on top of each
// other while swapping: the Libero rests in the left slot, the player it
// replaced waits in the right one.
const BENCH_SLOT_GAP = 110;
const BENCH_SLOT_Y = BENCH_CENTER.y + 20; // below the BENCH label
export const BENCH_POSITION = { x: BENCH_CENTER.x - BENCH_SLOT_GAP / 2, y: BENCH_SLOT_Y };
export const BENCH_POSITION_REPLACED = { x: BENCH_CENTER.x + BENCH_SLOT_GAP / 2, y: BENCH_SLOT_Y };

// Base (legal, no-overlap) position for each zone.
export const ZONE_POSITIONS = {
  1: { x: 750, y: 750 }, // back right (server)
  2: { x: 750, y: 150 }, // front right
  3: { x: 450, y: 150 }, // front middle
  4: { x: 150, y: 150 }, // front left
  5: { x: 150, y: 750 }, // back left
  6: { x: 450, y: 750 }, // back middle
};

// Which zone is in front of / behind / left of / right of which, used by
// the overlap checker. Rows and columns share the layout above.
export const FRONT_ROW = [4, 3, 2]; // left -> right
export const BACK_ROW = [5, 6, 1]; // left -> right
export const FRONT_BACK_PAIRS = [
  [4, 5],
  [3, 6],
  [2, 1],
]; // [frontZone, backZone]

// The Setter's zone determines the "rotation number" (distinct from
// whoever's currently serving from zone 1) - see RULES.md.
export const SETTER_ROLE = 'S';
export const ROTATION_NUMBER_BY_SETTER_ZONE = { 1: 1, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2 };

// Starting (Rotation 1) lineup: role assigned to each zone, in counter-
// clockwise zone order (1-6): S, OH1, MB2, OP, OH2, MB1. Setter and
// Opposite are opposite each other (3 zones apart), as are the two
// Middles and the two Outsides.
export const INITIAL_ZONE_ROLES = {
  1: 'S',
  2: 'OH1',
  3: 'MB2',
  4: 'OP',
  5: 'OH2',
  6: 'MB1',
};

export const ROLE_LABELS = {
  S: 'S',
  OP: 'OP',
  OH1: 'OH1',
  OH2: 'OH2',
  MB1: 'MB1',
  MB2: 'MB2',
  L: 'L',
};
