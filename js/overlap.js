import { FRONT_ROW, BACK_ROW, FRONT_BACK_PAIRS } from './config.js';

const TOLERANCE = 0.5; // px slack so exact base positions never false-positive

function pairs(row) {
  const result = [];
  for (let i = 0; i < row.length - 1; i++) {
    result.push([row[i], row[i + 1]]);
  }
  return result;
}

const LEFT_RIGHT_CHECKS = [...pairs(FRONT_ROW), ...pairs(BACK_ROW)];

// Runs the standard volleyball positional-overlap rules against the
// current on-court positions:
//  - within a row, left-to-right zone order must be preserved
//  - each front-row player must be nearer the net than their back-row pair
//
// `positionsByZone` is `{ zone: { x, y, role } }` for the current layout.
// Returns an array of { zoneA, zoneB, roleA, roleB, ok, message }.
export function checkOverlap(positionsByZone) {
  const results = [];

  for (const [leftZone, rightZone] of LEFT_RIGHT_CHECKS) {
    const left = positionsByZone[leftZone];
    const right = positionsByZone[rightZone];
    const ok = left.x <= right.x + TOLERANCE;
    results.push({
      zoneA: leftZone,
      zoneB: rightZone,
      roleA: left.role,
      roleB: right.role,
      ok,
      message: ok
        ? `Zone ${leftZone} (${left.role}) is left of zone ${rightZone} (${right.role})`
        : `Overlap: zone ${leftZone} (${left.role}) must stay left of zone ${rightZone} (${right.role})`,
    });
  }

  for (const [frontZone, backZone] of FRONT_BACK_PAIRS) {
    const front = positionsByZone[frontZone];
    const back = positionsByZone[backZone];
    const ok = front.y <= back.y + TOLERANCE;
    results.push({
      zoneA: frontZone,
      zoneB: backZone,
      roleA: front.role,
      roleB: back.role,
      ok,
      message: ok
        ? `Zone ${frontZone} (${front.role}) is ahead of zone ${backZone} (${back.role})`
        : `Overlap: zone ${frontZone} (${front.role}) must stay ahead of zone ${backZone} (${back.role})`,
    });
  }

  return results;
}
