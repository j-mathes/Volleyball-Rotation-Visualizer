import { ZONE_POSITIONS, BENCH_POSITION, BACK_ROW } from './config.js';
import { setViewBox, drawBenchZone, drawCourt } from './court.js';
import { Player } from './player.js';
import { RotationState } from './rotation.js';
import { checkOverlap } from './overlap.js';

const svg = document.getElementById('court');
const serverZoneEl = document.getElementById('serverZone');
const overlapResultsEl = document.getElementById('overlapResults');
const liberoSwapEl = document.getElementById('liberoSwap');

setViewBox(svg);
drawBenchZone(svg);
drawCourt(svg);

const rotationState = new RotationState();

// Role of the on-court player the Libero is currently standing in for, or
// null if the Libero is on the bench. Only ever a back-row role - see
// enforceLiberoRule().
const liberoState = { replacedRole: null };

// One Player instance per role, created once and repositioned/relabeled
// as rotations happen (rather than recreating DOM nodes each time).
const playersByRole = {};
for (const [zone, role] of Object.entries(rotationState.zoneToRole)) {
  const { x, y } = ZONE_POSITIONS[zone];
  playersByRole[role] = new Player(svg, role, role, x, y, handleDragEnd);
}

// The Libero doesn't rotate through the six zones; it waits on the
// sideline and can be dragged onto the court to test a substitution.
playersByRole.L = new Player(svg, 'L', 'L', BENCH_POSITION.x, BENCH_POSITION.y, handleDragEnd);

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

function clearOverlapHighlights() {
  Object.values(playersByRole).forEach((player) => player.setOverlapping(false));
  overlapResultsEl.innerHTML = '';
}

function runOverlapCheck() {
  const results = checkOverlap(currentPositionsByZone());
  overlapResultsEl.innerHTML = '';

  Object.values(playersByRole).forEach((player) => player.setOverlapping(false));

  for (const result of results) {
    const item = document.createElement('li');
    item.textContent = result.message;
    item.className = result.ok ? 'ok' : 'violation';
    overlapResultsEl.appendChild(item);
    if (!result.ok) {
      playersByRole[result.roleA].setOverlapping(true);
      playersByRole[result.roleB].setOverlapping(true);
    }
  }
}

function handleDragEnd() {
  // Dragging can introduce/resolve overlaps; refresh results if the panel
  // is already showing some (keeps feedback live without being pushy).
  if (overlapResultsEl.children.length > 0) {
    runOverlapCheck();
  }
}

async function snapAllToZonePositions(duration = 600) {
  clearOverlapHighlights();
  const animations = [];
  for (let zone = 1; zone <= 6; zone++) {
    const role = rotationState.roleInZone(zone);
    const { x, y } = ZONE_POSITIONS[zone];
    if (liberoState.replacedRole === role) {
      // The Libero takes this zone; the player it replaced waits on the bench.
      animations.push(playersByRole.L.animateTo(x, y, duration));
      animations.push(playersByRole[role].animateTo(BENCH_POSITION.x, BENCH_POSITION.y, duration));
    } else {
      animations.push(playersByRole[role].animateTo(x, y, duration));
    }
  }
  if (!liberoState.replacedRole) {
    animations.push(playersByRole.L.animateTo(BENCH_POSITION.x, BENCH_POSITION.y, duration));
  }
  await Promise.all(animations);
}

// The Libero may only replace a back-row player (zones 5, 6, 1). If a
// rotation carries the replaced role into the front row, the swap ends
// automatically, mirroring the real substitution rule.
function enforceLiberoRule() {
  if (liberoState.replacedRole && !BACK_ROW.includes(rotationState.zoneOfRole(liberoState.replacedRole))) {
    liberoState.replacedRole = null;
  }
}

// Rebuilds the swap dropdown with the roles currently in the back row,
// preserving the active selection if it's still valid.
function refreshLiberoOptions() {
  liberoSwapEl.innerHTML = '';
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'None (Libero on bench)';
  liberoSwapEl.appendChild(noneOption);

  for (const zone of BACK_ROW) {
    const role = rotationState.roleInZone(zone);
    const option = document.createElement('option');
    option.value = role;
    option.textContent = `${role} (zone ${zone})`;
    liberoSwapEl.appendChild(option);
  }

  liberoSwapEl.value = liberoState.replacedRole || '';
}

async function rotate(direction) {
  rotationState.rotate(direction);
  serverZoneEl.textContent = rotationState.roleInZone(1);
  enforceLiberoRule();
  refreshLiberoOptions();
  await snapAllToZonePositions();
}

document.getElementById('rotateCw').addEventListener('click', () => rotate(1));
document.getElementById('rotateCcw').addEventListener('click', () => rotate(-1));
document.getElementById('resetBtn').addEventListener('click', () => {
  rotationState.reset();
  liberoState.replacedRole = null;
  serverZoneEl.textContent = rotationState.roleInZone(1);
  refreshLiberoOptions();
  snapAllToZonePositions();
});
document.getElementById('checkOverlapBtn').addEventListener('click', runOverlapCheck);
liberoSwapEl.addEventListener('change', () => {
  liberoState.replacedRole = liberoSwapEl.value || null;
  snapAllToZonePositions();
});

serverZoneEl.textContent = rotationState.roleInZone(1);
refreshLiberoOptions();
