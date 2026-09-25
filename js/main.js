import { ZONE_POSITIONS, BENCH_POSITION, BENCH_POSITION_REPLACED, BACK_ROW, COURT_SIZE } from './config.js';
import { setViewBox, drawBenchZone, drawCourt, createRotationTracker, createViolationLinesLayer, createLinkLinesLayer } from './court.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { RotationState } from './rotation.js';
import { checkOverlap, summarizeByPlayer } from './overlap.js';
import { getPlayerLabels } from './playerLabels.js';
import { saveSetup, takePendingSetup } from './courtSetups.js';

const svg = document.getElementById('court');
const serverZoneEl = document.getElementById('serverZone');
const overlapResultsEl = document.getElementById('overlapResults');
const liberoSwapBtn = document.getElementById('liberoSwapBtn');
const overlapGuideToggle = document.getElementById('overlapGuideToggle');
const playerLinkToggle = document.getElementById('playerLinkToggle');
const saveSetupBtn = document.getElementById('saveSetupBtn');
const setupNameInput = document.getElementById('setupNameInput');

// Custom per-role display labels (e.g. jersey numbers), set on the setup
// page - read once at load, since they only change there.
const playerLabels = getPlayerLabels();

setViewBox(svg);
drawBenchZone(svg);
drawCourt(svg);
const rotationTrackerEl = createRotationTracker(svg);
const violationLinesLayer = createViolationLinesLayer(svg);
const linkLinesLayer = createLinkLinesLayer(svg);

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
// True while the "Show Player Links" toggle is on, drawing solid green
// lines from the selected player to its corresponding players.
let linksEnabled = false;
// True while the selection is locked (toggled by double-clicking a player):
// clicking/dragging other players still moves them, but never changes
// which player is selected.
let selectionLocked = false;
let selectedRole = null;

// One Player instance per role, created once and repositioned/relabeled
// as rotations happen (rather than recreating DOM nodes each time).
const playersByRole = {};
for (const [zone, role] of Object.entries(rotationState.zoneToRole)) {
  const { x, y } = ZONE_POSITIONS[zone];
  playersByRole[role] = new Player(svg, role, playerLabels[role], x, y, handleDragEnd, handleDragMove);
}

// The Libero doesn't rotate through the six zones; it waits on the
// sideline and can be dragged onto the court to test a replacement.
playersByRole.L = new Player(svg, 'L', playerLabels.L, BENCH_POSITION.x, BENCH_POSITION.y, handleDragEnd, handleDragMove);

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
  serverZoneEl.textContent = playerLabels[rotationState.roleInZone(1)];
  rotationTrackerEl.textContent = `R${rotationState.rotationNumber}`;
}

// Warns (in red) if the single benched player has been dragged onto a
// court that already has its full 6 players. Also keeps the guide/link
// previews tracking live while dragging any player - not just the
// selected one, since dragging one of its linked/related players should
// move that end of the line too.
function handleDragMove(player) {
  if (player.role === benchedRole()) {
    player.setBenchWarning(isWithinCourt(player.x, player.y));
  }
  if (guidesEnabled || linksEnabled) {
    runOverlapCheck();
  }
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
  linkLinesLayer.innerHTML = '';
}

// Draws a thin green line connecting the centers of two players -
// visualizes which players correspond to the selected one, independent of
// whether they're actually in violation. Solid for a front-row target,
// dotted for a back-row one.
function drawLinkLine(posA, posB, isBackRowTarget) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', posA.x);
  line.setAttribute('y1', posA.y);
  line.setAttribute('x2', posB.x);
  line.setAttribute('y2', posB.y);
  line.setAttribute('stroke', 'var(--link-line)');
  line.setAttribute('stroke-width', 3);
  if (isBackRowTarget) {
    line.setAttribute('stroke-dasharray', '4,5');
  }
  linkLinesLayer.appendChild(line);
}

// Draws a dashed line marking a positional boundary, spanning the full
// court from end line to end line: a horizontal (left/right) rule is shown
// as a vertical line, and vice versa. Red marks an actual violation, gray
// marks a guide preview of a still-legal boundary - same line, same anchor
// logic, only the color differs. When one of the two players is the
// currently selected one, the line always anchors on the OTHER (non-
// selected) player - that's the deliberate reference point while
// previewing a selection, regardless of tiny incidental drift in either
// player's position. Otherwise (no selection involved in this pair), the
// anchor falls back to whichever player is closer to its own zone's base
// position (the one that stayed put), since either could be the one that moved.
function drawSeparatorLine(posA, posB, zoneA, zoneB, axis, isViolation, selectedZone) {
  let anchorIsA;
  if (selectedZone === zoneA) {
    anchorIsA = false;
  } else if (selectedZone === zoneB) {
    anchorIsA = true;
  } else {
    const displacement = (pos, zone) => {
      const base = ZONE_POSITIONS[zone];
      return (pos.x - base.x) ** 2 + (pos.y - base.y) ** 2;
    };
    const dispA = displacement(posA, zoneA);
    const dispB = displacement(posB, zoneB);
    anchorIsA = dispA <= dispB;
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
  linkLinesLayer.innerHTML = '';

  Object.values(playersByRole).forEach((player) => {
    player.setOverlapping(false);
    player.setGuideSelected((guidesEnabled || linksEnabled) && player.role === selectedRole);
    player.setSelectionLocked(selectionLocked && player.role === selectedRole);
    player.setGuideRelated(false);
    player.setBackRow(false);
  });
  for (let zone = 1; zone <= 6; zone++) {
    playersByRole[positions[zone].role].setBackRow(BACK_ROW.includes(zone));
  }

  const selectionActive = (guidesEnabled || linksEnabled) && selectedRole;
  const selectedZone = selectionActive ? findZoneForRole(positions, selectedRole) : null;

  for (const result of pairwiseResults) {
    if (!result.ok) {
      drawSeparatorLine(positions[result.zoneA], positions[result.zoneB], result.zoneA, result.zoneB, result.axis, true, selectedZone);
    }
  }

  if (guidesEnabled && selectedZone) {
    for (const result of pairwiseResults) {
      if (result.ok && (result.zoneA === selectedZone || result.zoneB === selectedZone)) {
        drawSeparatorLine(positions[result.zoneA], positions[result.zoneB], result.zoneA, result.zoneB, result.axis, false, selectedZone);
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        playersByRole[positions[neighborZone].role].setGuideRelated(true);
      }
    }
  }

  if (linksEnabled && selectedZone) {
    for (const result of pairwiseResults) {
      if (result.zoneA === selectedZone || result.zoneB === selectedZone) {
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        drawLinkLine(positions[selectedZone], positions[neighborZone], BACK_ROW.includes(neighborZone));
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
      ? playerLabels[entry.role]
      : `${playerLabels[entry.role]} \u2014 ${entry.violatingRoles.map((role) => playerLabels[role]).join(', ')}`;
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

// Snapshot of everything a saved setup needs to restore later: which role
// is in which zone, the Libero swap, and every player's exact (possibly
// dragged-off-zone) position.
function captureCurrentState() {
  const positions = {};
  for (const [role, player] of Object.entries(playersByRole)) {
    positions[role] = { x: player.x, y: player.y };
  }
  return {
    version: 1,
    zoneToRole: { ...rotationState.zoneToRole },
    liberoReplacedRole: liberoState.replacedRole,
    positions,
  };
}

// Restores a previously captured (or imported) state, snapping every
// player straight to its saved position (no tweening - this only runs on
// load or an explicit "Load" from the setup page).
function applyState(state) {
  setAwaitingSelection(false);
  rotationState.zoneToRole = { ...state.zoneToRole };
  liberoState.replacedRole = state.liberoReplacedRole || null;
  for (const [role, player] of Object.entries(playersByRole)) {
    const pos = state.positions[role];
    if (pos) {
      player.setPosition(pos.x, pos.y);
    }
  }
  refreshRotationDisplay();
  refreshLiberoButtonLabel();
  clearHighlights();
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
    ? `Swap Out Libero (for ${playerLabels[liberoState.replacedRole]})`
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
  liberoState.replacedRole = null;
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

// Selects which player's overlap guides and/or links are previewed. A drag
// always selects that player (so previews update live while moving it); a
// plain tap (no real movement) instead toggles selection off if it was
// already the selected player. Ignored mid-way through a Libero swap-in
// selection, while neither preview toggle is on, or while selection is locked.
const TAP_MOVE_THRESHOLD = 5;
for (const role of Object.keys(playersByRole)) {
  const player = playersByRole[role];
  player.group.addEventListener('click', () => {
    if ((!guidesEnabled && !linksEnabled) || awaitingSelection || selectionLocked) {
      return;
    }
    const wasTap = player.lastMoveDistance <= TAP_MOVE_THRESHOLD;
    selectedRole = wasTap && selectedRole === role ? null : role;
    runOverlapCheck();
  });

  // Double-clicking toggles the selection lock: double-clicking the
  // already-locked selected player unlocks it, double-clicking any other
  // player locks the selection onto that player instead.
  player.group.addEventListener('dblclick', () => {
    if ((!guidesEnabled && !linksEnabled) || awaitingSelection) {
      return;
    }
    if (selectionLocked && selectedRole === role) {
      selectionLocked = false;
    } else {
      selectedRole = role;
      selectionLocked = true;
    }
    runOverlapCheck();
  });
}

overlapGuideToggle.addEventListener('click', () => {
  guidesEnabled = !guidesEnabled;
  overlapGuideToggle.classList.toggle('active', guidesEnabled);
  if (!guidesEnabled && !linksEnabled) {
    selectedRole = null;
    selectionLocked = false;
  }
  runOverlapCheck();
});

playerLinkToggle.addEventListener('click', () => {
  linksEnabled = !linksEnabled;
  playerLinkToggle.classList.toggle('active', linksEnabled);
  if (!guidesEnabled && !linksEnabled) {
    selectedRole = null;
    selectionLocked = false;
  }
  runOverlapCheck();
});

// Clicking anywhere on the court that isn't a player deselects the
// currently previewed player.
svg.addEventListener('click', (event) => {
  if ((!guidesEnabled && !linksEnabled) || !selectedRole || selectionLocked || event.target.closest('.player')) {
    return;
  }
  selectedRole = null;
  runOverlapCheck();
});

saveSetupBtn.addEventListener('click', () => {
  const name = setupNameInput.value.trim();
  if (!name) {
    setupNameInput.focus();
    return;
  }
  saveSetup(name, captureCurrentState());
  setupNameInput.value = '';
  const originalLabel = saveSetupBtn.textContent;
  saveSetupBtn.textContent = 'Saved!';
  setTimeout(() => { saveSetupBtn.textContent = originalLabel; }, 1200);
});

refreshRotationDisplay();
refreshLiberoButtonLabel();

// A saved setup chosen on the setup page is queued here and applied once,
// on this first load, instead of the default base positions.
const pendingSetup = takePendingSetup();
if (pendingSetup) {
  applyState(pendingSetup);
} else {
  runOverlapCheck();
}
