import { ZONE_POSITIONS } from './config.js';
import { drawCourt } from './court.js';
import { Player } from './player.js';
import { RotationState } from './rotation.js';
import { checkOverlap } from './overlap.js';

const svg = document.getElementById('court');
const serverZoneEl = document.getElementById('serverZone');
const overlapResultsEl = document.getElementById('overlapResults');

drawCourt(svg);

const rotationState = new RotationState();

// One Player instance per role, created once and repositioned/relabeled
// as rotations happen (rather than recreating DOM nodes each time).
const playersByRole = {};
for (const [zone, role] of Object.entries(rotationState.zoneToRole)) {
  const { x, y } = ZONE_POSITIONS[zone];
  playersByRole[role] = new Player(svg, role, role, x, y, handleDragEnd);
}

function currentPositionsByZone() {
  const positions = {};
  for (let zone = 1; zone <= 6; zone++) {
    const role = rotationState.roleInZone(zone);
    const player = playersByRole[role];
    positions[zone] = { x: player.x, y: player.y, role };
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
    animations.push(playersByRole[role].animateTo(x, y, duration));
  }
  await Promise.all(animations);
}

async function rotate(direction) {
  rotationState.rotate(direction);
  serverZoneEl.textContent = rotationState.roleInZone(1);
  await snapAllToZonePositions();
}

document.getElementById('rotateCw').addEventListener('click', () => rotate(1));
document.getElementById('rotateCcw').addEventListener('click', () => rotate(-1));
document.getElementById('resetBtn').addEventListener('click', () => {
  rotationState.reset();
  serverZoneEl.textContent = rotationState.roleInZone(1);
  snapAllToZonePositions();
});
document.getElementById('checkOverlapBtn').addEventListener('click', runOverlapCheck);

serverZoneEl.textContent = rotationState.roleInZone(1);
