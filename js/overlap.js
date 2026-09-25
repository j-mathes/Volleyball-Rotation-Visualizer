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

// Implements FIVB Rule 7.4 (positional overlap), not the reference site's
// per-system logic which testing showed to be inaccurate:
//  - 7.4.1: zones 4/3/2 are the front row, 5/6/1 are the back row
//  - 7.4.2.1 (front/back): each back-row player must stay further from the
//    net than the front-row player in the same column (4/5, 3/6, 2/1)
//  - 7.4.2.2 (left/right): front-row and back-row players must each keep
//    their row's left-to-right order (4-3-2 and 5-6-1)
//  - 7.4.3 clarifies "level with" (i.e. tied) positions are legal, which is
//    why every comparison below is <=, not <, within a small tolerance.
//
// `positionsByZone` is `{ zone: { x, y, role } }` for the current on-court
// layout only - callers should exclude any benched player (e.g. someone
// replaced by the Libero) before calling this.
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

// Displays players, not zone-pair rules: one entry per on-court player,
// ordered clockwise starting at zone 1 (1, 6, 5, 4, 3, 2). Each entry is
// "ok" (no overlap) or lists which other player(s) it's violating with.
export function summarizeByPlayer(positionsByZone) {
  const pairwiseResults = checkOverlap(positionsByZone);
  const clockwiseFromZone1 = [1, 6, 5, 4, 3, 2];

  return clockwiseFromZone1.map((zone) => {
    const { role } = positionsByZone[zone];
    const violatingRoles = pairwiseResults
      .filter((result) => !result.ok && (result.zoneA === zone || result.zoneB === zone))
      .map((result) => (result.zoneA === zone ? result.roleB : result.roleA));
    return { zone, role, ok: violatingRoles.length === 0, violatingRoles };
  });
}

