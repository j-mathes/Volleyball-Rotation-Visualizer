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
export const BENCH_WIDTH = 260;

// Gap between the bench panel's near edge and the attack line (rotated,
// for Net Left/Right; unrotated, for Net Top), on the side away from the
// net - 3/4 of the bench's own width. Used to position the bench
// consistently across all 3 orientations (see BENCH_CENTER_CLASSIC/
// BENCH_CENTER_TOP_RIGHT/BENCH_CENTER_TOP_LEFT below).
const BENCH_GAP_FROM_ATTACK_LINE = BENCH_WIDTH * 0.75;

// Classic (bench-on-the-left) layout used at the default Net Top (0 deg)
// orientation - the original, pre-orientation-toggle design: a vertical
// bench strip on the left, with the "R#" tracker above it near the net.
// This is what sets the SVG viewBox's overall width (see setViewBox), so
// the court renders at this same on-screen size at every orientation.
// Positioned the same distance "behind" (further from the net than) the
// attack line as the side-view layouts below - the net is at y=0, so
// "away from the net" is toward increasing Y.
export const BENCH_PANEL_HEIGHT_CLASSIC = 220;
export const BENCH_CENTER_CLASSIC = {
  x: -(SIDE_MARGIN + BENCH_WIDTH / 2),
  y: ATTACK_LINE_Y + BENCH_GAP_FROM_ATTACK_LINE + BENCH_PANEL_HEIGHT_CLASSIC / 2,
};
const CLASSIC_SLOT_GAP = 110;
export const BENCH_POSITION_CLASSIC = { x: BENCH_CENTER_CLASSIC.x, y: BENCH_CENTER_CLASSIC.y - CLASSIC_SLOT_GAP / 2 };
export const BENCH_POSITION_REPLACED_CLASSIC = { x: BENCH_CENTER_CLASSIC.x, y: BENCH_CENTER_CLASSIC.y + CLASSIC_SLOT_GAP / 2 };
export const ROTATION_TRACKER_CENTER_X_CLASSIC = BENCH_CENTER_CLASSIC.x;

// Top-of-court layout used at the Net Left/Right (+-90 deg) orientations,
// since the classic left-side bench would otherwise swing to a different
// screen side depending on rotation direction. A fixed, non-rotating
// strip above the court - see court.js's createTopBenchLayer - with the
// "R#" tracker pinned at the same on-screen X position as the classic
// layout's tracker (so it never visibly moves when toggling between Net
// Top and a side view). The bench panel itself is positioned behind the
// (rotated) attack line, on the side away from the net, by
// BENCH_GAP_FROM_ATTACK_LINE - mirrored between Net Right and Net Left
// so both look like the same relative arrangement.
export const BENCH_STRIP_HEIGHT = 220;
const STRIP_TOP = -SIDE_MARGIN - BENCH_STRIP_HEIGHT;
const STRIP_CENTER_Y = STRIP_TOP + BENCH_STRIP_HEIGHT / 2;

// On-screen X the attack line (a horizontal line at y=ATTACK_LINE_Y in
// the un-rotated court) lands at once the viewport is rotated +90/-90
// around the court's center.
const COURT_CENTER = COURT_SIZE / 2;
const ATTACK_LINE_SCREEN_X_RIGHT = COURT_CENTER - (ATTACK_LINE_Y - COURT_CENTER);
const ATTACK_LINE_SCREEN_X_LEFT = COURT_CENTER + (ATTACK_LINE_Y - COURT_CENTER);

// Net Right (+90 deg): the net ends up on the right edge, so "away from
// the net" is toward decreasing X.
export const BENCH_CENTER_TOP_RIGHT = {
  x: ATTACK_LINE_SCREEN_X_RIGHT - BENCH_GAP_FROM_ATTACK_LINE - BENCH_WIDTH / 2,
  y: STRIP_CENTER_Y,
};
// Net Left (-90 deg): mirrored - net on the left edge, so "away from the
// net" is toward increasing X.
export const BENCH_CENTER_TOP_LEFT = {
  x: ATTACK_LINE_SCREEN_X_LEFT + BENCH_GAP_FROM_ATTACK_LINE + BENCH_WIDTH / 2,
  y: STRIP_CENTER_Y,
};

const TOP_SLOT_GAP = 110;
function topSlotPositions(benchCenter) {
  const slotY = benchCenter.y + 20; // below the BENCH label
  return {
    position: { x: benchCenter.x - TOP_SLOT_GAP / 2, y: slotY },
    replaced: { x: benchCenter.x + TOP_SLOT_GAP / 2, y: slotY },
  };
}
export const BENCH_POSITION_TOP_RIGHT = topSlotPositions(BENCH_CENTER_TOP_RIGHT).position;
export const BENCH_POSITION_REPLACED_TOP_RIGHT = topSlotPositions(BENCH_CENTER_TOP_RIGHT).replaced;
export const BENCH_POSITION_TOP_LEFT = topSlotPositions(BENCH_CENTER_TOP_LEFT).position;
export const BENCH_POSITION_REPLACED_TOP_LEFT = topSlotPositions(BENCH_CENTER_TOP_LEFT).replaced;
export const ROTATION_TRACKER_CENTER_X_TOP = ROTATION_TRACKER_CENTER_X_CLASSIC;



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
