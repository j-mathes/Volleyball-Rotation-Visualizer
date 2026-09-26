// Shared constants describing the court's internal coordinate system and
// the six on-court zones (1 = back-right/server ... 6 = back-middle),
// numbered clockwise the way real volleyball rotations are described.

export const COURT_SIZE = 900;
export const ATTACK_LINE_Y = COURT_SIZE / 3;

// Blue padding drawn around the court on every side.
export const SIDE_MARGIN = 60;
export const BENCH_WIDTH = 260;

// Gap between the bench panel's near edge and the attack line, on the
// side away from the net - 3/4 of the bench's own width.
const BENCH_GAP_FROM_ATTACK_LINE = BENCH_WIDTH * 0.75;

// The bench layout: a vertical strip on the court's left side, with the
// "R#" tracker above it near the net. This is what sets the SVG
// viewBox's overall width (see setViewBox). Positioned the same distance
// "behind" (further from the net than) the attack line - the net is at
// y=0, so "away from the net" is toward increasing Y.
export const BENCH_PANEL_HEIGHT_CLASSIC = 220;
export const BENCH_CENTER_CLASSIC = {
  x: -(SIDE_MARGIN + BENCH_WIDTH / 2),
  y: ATTACK_LINE_Y + BENCH_GAP_FROM_ATTACK_LINE + BENCH_PANEL_HEIGHT_CLASSIC / 2,
};
const CLASSIC_SLOT_GAP = 110;
export const BENCH_POSITION_CLASSIC = { x: BENCH_CENTER_CLASSIC.x, y: BENCH_CENTER_CLASSIC.y - CLASSIC_SLOT_GAP / 2 };
export const BENCH_POSITION_REPLACED_CLASSIC = { x: BENCH_CENTER_CLASSIC.x, y: BENCH_CENTER_CLASSIC.y + CLASSIC_SLOT_GAP / 2 };
export const ROTATION_TRACKER_CENTER_X_CLASSIC = BENCH_CENTER_CLASSIC.x;



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
