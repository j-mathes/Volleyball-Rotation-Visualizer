// Shared constants describing the court's internal coordinate system and
// the six on-court zones (1 = back-right/server ... 6 = back-middle),
// numbered clockwise the way real volleyball rotations are described.

export const COURT_SIZE = 900;
export const ATTACK_LINE_Y = COURT_SIZE / 3;

// Blue padding drawn around the court on every side, and an extra strip on
// the left reserved for the Libero, who sits on the sideline rather than
// rotating through the six zones.
export const SIDE_MARGIN = 60;
export const BENCH_WIDTH = 260;
export const BENCH_POSITION = { x: -(SIDE_MARGIN + BENCH_WIDTH / 2), y: COURT_SIZE / 2 };

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

// Starting (Rotation 1) lineup: role assigned to each zone.
// Setter and Opposite are opposite each other (3 zones apart), as are the
// two Middles and the two Outsides - this mirrors a standard 5-1 lineup.
export const INITIAL_ZONE_ROLES = {
  1: 'S',
  2: 'MB1',
  3: 'OH1',
  4: 'OP',
  5: 'MB2',
  6: 'OH2',
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
