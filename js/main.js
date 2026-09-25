import { ZONE_POSITIONS, BENCH_POSITION, BENCH_POSITION_REPLACED, BACK_ROW, COURT_SIZE } from './config.js';
import { setViewBox, drawBenchZone, drawCourt, createRotationTracker, createViolationLinesLayer } from './court.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { RotationState } from './rotation.js';
import { checkOverlap, summarizeByPlayer } from './overlap.js';

const svg = document.getElementById('court');
const serverZoneEl = document.getElementById('serverZone');
const overlapResultsEl = document.getElementById('overlapResults');
const liberoSwapBtn = document.getElementById('liberoSwapBtn');
const overlapGuideToggle = document.getElementById('overlapGuideToggle');

setViewBox(svg);
drawBenchZone(svg);
drawCourt(svg);
const rotationTrackerEl = createRotationTracker(svg);
const violationLinesLayer = createViolationLinesLayer(svg);

const rotationState = new RotationState();

// Role of the on-court player the Libero is currently replacing, or
// null if the Libero is on the bench. Only ever a back-row role.
const liberoState = { replacedRole: null };

// True while the swap button is waiting for the user to click a back-row
// player to complete a swap-in.
let awaitingSelection = false;

// True while the "Show Overlap Guides" toggle is on, and the role of the
// player currently selected to preview its overlap boundaries (if any).
let guidesEnabled = false;
let selectedRole = null;

// One Player instance per role, created once and repositioned/relabeled
// as rotations happen (rather than recreating DOM nodes each time).
const playersByRole = {};
for (const [zone, role] of Object.entries(rotationState.zoneToRole)) {
  const { x, y } = ZONE_POSITIONS[zone];
  playersByRole[role] = new Player(svg, role, role, x, y, handleDragEnd, handleDragMove);
}

// The Libero doesn't rotate through the six zones; it waits on the
// sideline and can be dragged onto the court to test a replacement.
playersByRole.L = new Player(svg, 'L', 'L', BENCH_POSITION.x, BENCH_POSITION.y, handleDragEnd, handleDragMove);

// Whichever role is currently on the bench: the Libero itself, unless it
// has swapped in for someone, in which case that role is benched instead.
function benchedRole() {
  return liberoState.replacedRole || 'L';
}

function isWithinCourt(x, y) {
  return x >= 0 && x <= COURT_SIZE && y >= 0 && y <= COURT_SIZE;
}

// The rotation number is based on the Setter's zone, independent of
// whoever's currently serving from zone 1.
function refreshRotationDisplay() {
  serverZoneEl.textContent = rotationState.roleInZone(1);
  rotationTrackerEl.textContent = `R${rotationState.rotationNumber}`;
}

// Warns (in red) if the single benched player has been dragged onto a
// court that already has its full 6 players.
function handleDragMove(player) {
  if (player.role !== benchedRole()) {
    return;
  }
  player.setBenchWarning(isWithinCourt(player.x, player.y));
}

// Only the on-court occupant of each zone counts toward the overlap check:
// if the Libero has replaced this zone's role, use the Libero's position
// and label instead of the benched player it replaced.
function currentPositionsByZone() {
  const positions = {};
  for (let zone = 1; zone <= 6; zone++) {
    const role = rotationState.roleInZone(zone);
    const onCourtRole = liberoState.replacedRole === role ? 'L' : role;
    const player = playersByRole[onCourtRole];
    positions[zone] = { x: player.x, y: player.y, role: onCourtRole };
  }
  return positions;
}

function clearHighlights() {
  Object.values(playersByRole).forEach((player) => {
    player.setOverlapping(false);
    player.setBenchWarning(false);
  });
  overlapResultsEl.innerHTML = '';
  violationLinesLayer.innerHTML = '';
}

// Draws a dashed line marking a positional boundary, spanning the full
// court from end line to end line: a horizontal (left/right) rule is shown
// as a vertical line, and vice versa. Red marks an actual violation, gray
// marks a guide preview of a still-legal boundary - same line, same anchor
// logic, only the color differs. The line anchors on the edge of whichever
// of the two players is closer to its own zone's base position (the one
// that stayed put), facing the other player - not a fixed posA/posB
// choice, since either one could be the one that moved. When neither has
// moved (a tie, e.g. right after a reset), `selectedZone` breaks the tie
// in favor of anchoring on the OTHER (non-selected) player.
function drawSeparatorLine(posA, posB, zoneA, zoneB, axis, isViolation, selectedZone) {
  const displacement = (pos, zone) => {
    const base = ZONE_POSITIONS[zone];
    return (pos.x - base.x) ** 2 + (pos.y - base.y) ** 2;
  };
  const dispA = displacement(posA, zoneA);
  const dispB = displacement(posB, zoneB);
  let anchorIsA;
  if (dispA !== dispB) {
    anchorIsA = dispA < dispB;
  } else {
    anchorIsA = selectedZone !== zoneA;
  }

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  if (axis === 'horizontal') {
    const x = anchorIsA ? posA.x - PLAYER_RADIUS : posB.x + PLAYER_RADIUS;
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
    line.setAttribute('y1', 0);
    line.setAttribute('y2', COURT_SIZE);
  } else {
    const y = anchorIsA ? posA.y - PLAYER_RADIUS : posB.y + PLAYER_RADIUS;
    line.setAttribute('x1', 0);
    line.setAttribute('x2', COURT_SIZE);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
  }
  line.setAttribute('stroke', isViolation ? 'var(--player-overlap)' : 'var(--guide-line)');
  line.setAttribute('stroke-width', isViolation ? 4 : 3);
  line.setAttribute('stroke-dasharray', '10,8');
  violationLinesLayer.appendChild(line);
}

// Finds which zone (if any) a role currently occupies on court - a
// benched role (e.g. replaced by the Libero) isn't in `positionsByZone`.
function findZoneForRole(positionsByZone, role) {
  for (const [zone, pos] of Object.entries(positionsByZone)) {
    if (pos.role === role) {
      return Number(zone);
    }
  }
  return null;
}

function runOverlapCheck() {
  const positions = currentPositionsByZone();
  const pairwiseResults = checkOverlap(positions);
  const summary = summarizeByPlayer(pairwiseResults, positions);
  overlapResultsEl.innerHTML = '';
  violationLinesLayer.innerHTML = '';

  Object.values(playersByRole).forEach((player) => {
    player.setOverlapping(false);
    player.setGuideSelected(guidesEnabled && player.role === selectedRole);
  });

  const selectedZone = guidesEnabled && selectedRole ? findZoneForRole(positions, selectedRole) : null;

  for (const result of pairwiseResults) {
    if (!result.ok) {
      drawSeparatorLine(positions[result.zoneA], positions[result.zoneB], result.zoneA, result.zoneB, result.axis, true, selectedZone);
    }
  }

  if (selectedZone) {
    for (const result of pairwiseResults) {
      if (result.ok && (result.zoneA === selectedZone || result.zoneB === selectedZone)) {
        drawSeparatorLine(positions[result.zoneA], positions[result.zoneB], result.zoneA, result.zoneB, result.axis, false, selectedZone);
      }
    }
  }

  for (const entry of summary) {
    const item = document.createElement('li');
    item.className = entry.ok ? 'ok' : 'violation';

    const icon = document.createElement('span');
    icon.className = `status-icon ${entry.ok ? 'ok' : 'violation'}`;
    icon.textContent = entry.ok ? '\u2713' : '\u2715';
    item.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = entry.ok
      ? entry.role
      : `${entry.role} \u2014 ${entry.violatingRoles.join(', ')}`;
    item.appendChild(label);

    overlapResultsEl.appendChild(item);
    if (!entry.ok) {
      playersByRole[entry.role].setOverlapping(true);
    }
  }
}

function handleDragEnd() {
  // Dragging can introduce/resolve overlaps; overlap status is always live.
  runOverlapCheck();
}

async function snapAllToZonePositions(duration = 600) {
  clearHighlights();
  const animations = [];
  for (let zone = 1; zone <= 6; zone++) {
    const role = rotationState.roleInZone(zone);
    const { x, y } = ZONE_POSITIONS[zone];
    if (liberoState.replacedRole === role) {
      // The Libero takes this zone; the player it replaced waits in its own bench slot.
      animations.push(playersByRole.L.animateTo(x, y, duration));
      animations.push(playersByRole[role].animateTo(BENCH_POSITION_REPLACED.x, BENCH_POSITION_REPLACED.y, duration));
    } else {
      animations.push(playersByRole[role].animateTo(x, y, duration));
    }
  }
  if (!liberoState.replacedRole) {
    animations.push(playersByRole.L.animateTo(BENCH_POSITION.x, BENCH_POSITION.y, duration));
  }
  await Promise.all(animations);
  runOverlapCheck();
}

function refreshLiberoButtonLabel() {
  if (awaitingSelection) {
    liberoSwapBtn.textContent = 'Select a back-row player…';
    return;
  }
  liberoSwapBtn.textContent = liberoState.replacedRole
    ? `Swap Out Libero (for ${liberoState.replacedRole})`
    : 'Swap In Libero';
}

// Highlights (or un-highlights) the current back-row players as valid
// swap-in targets and toggles the button's "waiting for a click" state.
function setAwaitingSelection(active) {
  awaitingSelection = active;
  for (const zone of BACK_ROW) {
    playersByRole[rotationState.roleInZone(zone)].setSelectable(active);
  }
  liberoSwapBtn.classList.toggle('active', active);
  refreshLiberoButtonLabel();
}

// Swaps the Libero onto the court for `role`. The outgoing player leaves
// the court first so the court never shows more than 6 players at once.
async function swapLiberoOn(role) {
  clearHighlights();
  const { x, y } = ZONE_POSITIONS[rotationState.zoneOfRole(role)];
  await playersByRole[role].animateTo(BENCH_POSITION_REPLACED.x, BENCH_POSITION_REPLACED.y, 500);
  await playersByRole.L.animateTo(x, y, 500);
  liberoState.replacedRole = role;
  refreshLiberoButtonLabel();
  runOverlapCheck();
}

// Swaps the Libero off the court, returning the player it replaced. Also
// used automatically when that player is about to rotate to the front row.
async function swapLiberoOff() {
  const role = liberoState.replacedRole;
  if (!role) {
    return;
  }
  clearHighlights();
  const { x, y } = ZONE_POSITIONS[rotationState.zoneOfRole(role)];
  await playersByRole.L.animateTo(BENCH_POSITION.x, BENCH_POSITION.y, 500);
  await playersByRole[role].animateTo(x, y, 500);
  liberoState.replacedRole = null;
  refreshLiberoButtonLabel();
  runOverlapCheck();
}

async function rotate(direction) {
  if (awaitingSelection) {
    setAwaitingSelection(false);
  }
  // The Libero can only replace a back-row player: if this rotation
  // would carry them to the front row, swap the Libero out first, then rotate.
  if (liberoState.replacedRole) {
    const nextZone = rotationState.zoneAfterRotation(rotationState.zoneOfRole(liberoState.replacedRole), direction);
    if (!BACK_ROW.includes(nextZone)) {
      await swapLiberoOff();
    }
  }
  rotationState.rotate(direction);
  refreshRotationDisplay();
  await snapAllToZonePositions();
}

document.getElementById('rotateCw').addEventListener('click', () => rotate(1));
document.getElementById('rotateCcw').addEventListener('click', () => rotate(-1));
document.getElementById('resetBtn').addEventListener('click', () => {
  setAwaitingSelection(false);
  rotationState.reset();
  liberoState.replacedRole = null;
  refreshRotationDisplay();
  refreshLiberoButtonLabel();
  snapAllToZonePositions();
});

liberoSwapBtn.addEventListener('click', async () => {
  if (liberoState.replacedRole) {
    liberoSwapBtn.disabled = true;
    await swapLiberoOff();
    liberoSwapBtn.disabled = false;
    return;
  }
  setAwaitingSelection(!awaitingSelection);
});

// Clicking a highlighted back-row player while awaiting selection completes
// the swap-in for that player.
for (const role of Object.keys(playersByRole)) {
  playersByRole[role].group.addEventListener('click', async () => {
    if (!awaitingSelection) {
      return;
    }
    const zone = rotationState.zoneOfRole(role);
    if (!zone || !BACK_ROW.includes(zone)) {
      return;
    }
    setAwaitingSelection(false);
    liberoSwapBtn.disabled = true;
    await swapLiberoOn(role);
    liberoSwapBtn.disabled = false;
  });
}

// Selects which player's overlap guides are previewed. A drag always
// selects that player (so guides update live while moving it); a plain
// tap (no real movement) instead toggles selection off if it was already
// the selected player. Ignored mid-way through a Libero swap-in selection.
const TAP_MOVE_THRESHOLD = 5;
for (const role of Object.keys(playersByRole)) {
  const player = playersByRole[role];
  player.group.addEventListener('click', () => {
    if (!guidesEnabled || awaitingSelection) {
      return;
    }
    const wasTap = player.lastMoveDistance <= TAP_MOVE_THRESHOLD;
    selectedRole = wasTap && selectedRole === role ? null : role;
    runOverlapCheck();
  });
}

overlapGuideToggle.addEventListener('click', () => {
  guidesEnabled = !guidesEnabled;
  overlapGuideToggle.classList.toggle('active', guidesEnabled);
  if (!guidesEnabled) {
    selectedRole = null;
  }
  runOverlapCheck();
});

// Clicking anywhere on the court that isn't a player deselects the
// currently previewed player.
svg.addEventListener('click', (event) => {
  if (!guidesEnabled || !selectedRole || event.target.closest('.player')) {
    return;
  }
  selectedRole = null;
  runOverlapCheck();
});

refreshRotationDisplay();
refreshLiberoButtonLabel();
runOverlapCheck();
