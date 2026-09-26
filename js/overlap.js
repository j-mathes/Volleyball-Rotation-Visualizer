import { FRONT_ROW, BACK_ROW, FRONT_BACK_PAIRS } from './config.js';
import { PLAYER_RADIUS } from './player.js';

// Rule 7.4.3 judges position by foot contact, not a single reference
// point. Our icons have no feet, so we treat each player's circle edge as
// its foot boundary: a player is only in violation once its entire circle
// has crossed completely past the other player's circle (i.e. the two no
// longer overlap at all in the wrong order). Any partial overlap, even if
// the centers are already "swapped", is still legal - hence a tolerance
// equal to a full player diameter rather than a near-zero epsilon.
const TOLERANCE = PLAYER_RADIUS * 2;

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
//  - 7.4.3 judges position by foot contact: "level with" is legal, and
//    (per our circle-edge model above) a player is only out of position
//    once it has moved completely past the other player, not merely when
//    its center has.
//
// `positionsByZone` is `{ zone: { x, y, role } }` for the current on-court
// layout only - callers should exclude any benched player (e.g. someone
// replaced by the Libero) before calling this.
// Returns an array of { zoneA, zoneB, roleA, roleB, ok, message, axis }.
// `axis` is 'horizontal' for left/right checks, 'vertical' for front/back
// checks - useful for drawing a line along the violated direction.
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
      axis: 'horizontal',
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
      axis: 'vertical',
      message: ok
        ? `Zone ${frontZone} (${front.role}) is ahead of zone ${backZone} (${back.role})`
        : `Overlap: zone ${frontZone} (${front.role}) must stay ahead of zone ${backZone} (${back.role})`,
    });
  }

  return results;
}

// Computes the legal drag range (in x and/or y) for whichever player
// currently occupies `zone`, based on where its row/column neighbors
// currently sit - the same rule pairs checkOverlap uses, just solved for
// "how far can this one player move" instead of "are these two ok".
// Used to clamp dragging so a fault can't be created in the first place,
// rather than only flagging it after the fact. Any side with no
// constraint is left as +-Infinity.
export function getClampBounds(zone, positionsByZone) {
  const bounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };

  for (const [leftZone, rightZone] of LEFT_RIGHT_CHECKS) {
    if (zone === leftZone) {
      bounds.maxX = Math.min(bounds.maxX, positionsByZone[rightZone].x + TOLERANCE);
    } else if (zone === rightZone) {
      bounds.minX = Math.max(bounds.minX, positionsByZone[leftZone].x - TOLERANCE);
    }
  }

  for (const [frontZone, backZone] of FRONT_BACK_PAIRS) {
    if (zone === frontZone) {
      bounds.maxY = Math.min(bounds.maxY, positionsByZone[backZone].y + TOLERANCE);
    } else if (zone === backZone) {
      bounds.minY = Math.max(bounds.minY, positionsByZone[frontZone].y - TOLERANCE);
    }
  }

  return bounds;
}

// Displays players, not zone-pair rules: one entry per on-court player,
// ordered clockwise starting at zone 1 (1, 6, 5, 4, 3, 2). Each entry is
// "ok" (no overlap) or lists which other player(s) it's violating with.
// Displays players, not zone-pair rules: one entry per on-court player,
// ordered clockwise starting at zone 1 (1, 6, 5, 4, 3, 2). Each entry is
// "ok" (no overlap) or lists which other player(s) it's violating with.
// Takes the already-computed pairwiseResults (from checkOverlap) to avoid
// recomputing them.
export function summarizeByPlayer(pairwiseResults, positionsByZone) {
  const clockwiseFromZone1 = [1, 6, 5, 4, 3, 2];

  return clockwiseFromZone1.map((zone) => {
    const { role } = positionsByZone[zone];
    const violatingRoles = pairwiseResults
      .filter((result) => !result.ok && (result.zoneA === zone || result.zoneB === zone))
      .map((result) => (result.zoneA === zone ? result.roleB : result.roleA));
    return { zone, role, ok: violatingRoles.length === 0, violatingRoles };
  });
}

