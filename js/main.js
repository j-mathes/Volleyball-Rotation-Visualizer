import { ZONE_POSITIONS, BACK_ROW, COURT_SIZE } from './config.js';
import { createCourtRenderer } from './renderer.js';
import { createCourtRenderer3D } from './renderer3d.js';
import { RotationState } from './rotation.js';
import { checkOverlap, summarizeByPlayer, getClampBounds } from './overlap.js';
import { getPlayerLabels } from './playerLabels.js';
import { saveSetup, takePendingSetup, getSavedSetups } from './courtSetups.js';
import { applyColors } from './colors.js';
import { applyLineSettings } from './lineSettings.js';
import { applyFontSettings } from './fontSettings.js';
import { applyEffectSettings } from './effectSettings.js';
import { getPlaylist, getPlaylistDelay } from './playlist.js';
import { getViewMode, saveViewMode } from './viewModeSettings.js';
import { getBenchSide3D } from './benchSideSettings.js';
import { getViewCubeSize3D } from './viewCubeSizeSettings.js';
import { getLabelScaleMode3D } from './labelScaleSettings.js';
import { createQuadMenu } from './quadMenu.js';
import { KEYBOARD_SHORTCUTS } from './shortcutsData.js';

applyColors();
applyLineSettings();
applyFontSettings();
applyEffectSettings();

const svg = document.getElementById('court');
const scene3dMount = document.getElementById('scene3dMount');
const viewCubeWrap = document.getElementById('viewCubeWrap');
const serverZoneEl = document.getElementById('serverZone');
const rotationBadgeEl = document.getElementById('rotationBadge');
const overlapResultsEl = document.getElementById('overlapResults');
const overlapResultsSummaryEl = document.getElementById('overlapResultsSummary');
const liberoSwapBtn = document.getElementById('liberoSwapBtn');
const overlapGuideToggle = document.getElementById('overlapGuideToggle');
const playerLinkToggle = document.getElementById('playerLinkToggle');
const clampToggle = document.getElementById('clampToggle');
const saveSetupBtn = document.getElementById('saveSetupBtn');
const setupNameInput = document.getElementById('setupNameInput');
const quickLoadInput = document.getElementById('quickLoadInput');
const quickLoadBtn = document.getElementById('quickLoadBtn');
const quickLoadOptionsEl = document.getElementById('quickLoadOptions');
const playlistPlayBtn = document.getElementById('playlistPlayBtn');
const playlistStepBtn = document.getElementById('playlistStepBtn');
const playlistStatusEl = document.getElementById('playlistStatus');
const viewMode2DBtn = document.getElementById('viewMode2DBtn');
const viewMode3DBtn = document.getElementById('viewMode3DBtn');
const benchSide3DLeftBtn = document.getElementById('benchSide3DLeft');
const benchSide3DRightBtn = document.getElementById('benchSide3DRight');
const quadMenuEl = document.getElementById('quadMenu');
const quadViewCameraSection = document.getElementById('quadViewCamera');
const quadSceneSetupSection = document.getElementById('quadSceneSetup');
const quadShortcutsListEl = document.getElementById('quadShortcutsList');
const qmResetViewBtn = document.getElementById('qmResetView');
const qmZoomExtentsBtn = document.getElementById('qmZoomExtents');
const qmViewCubeSizeBtns = quadViewCameraSection.querySelectorAll('button[data-size]');
const qmLabelScaleBtns = quadViewCameraSection.querySelectorAll('button[data-mode]');
const qmOverlapGuideToggle = document.getElementById('qmOverlapGuideToggle');
const qmPlayerLinkToggle = document.getElementById('qmPlayerLinkToggle');
const qmClampToggle = document.getElementById('qmClampToggle');
const qmRotateCwBtn = document.getElementById('qmRotateCw');
const qmRotateCcwBtn = document.getElementById('qmRotateCcw');
const qmResetToBaseBtn = document.getElementById('qmResetToBase');
const qmSwapLiberoBtn = document.getElementById('qmSwapLibero');
const qmSceneGuideToggle = document.getElementById('qmSceneGuideToggle');
const qmSceneLinkToggle = document.getElementById('qmSceneLinkToggle');
const qmSceneClampToggle = document.getElementById('qmSceneClampToggle');

// Custom per-role display labels (e.g. jersey numbers), set on the setup
// page - read once at load, since they only change there.
const playerLabels = getPlayerLabels();

// Which rendering mode (2D SVG vs. 3D Three.js scene) is currently
// active. Persisted across reloads; changed live via the View Mode
// toggle. Both renderers implement the SAME interface (see renderer.js/
// renderer3d.js's `createCourtRenderer`/`createCourtRenderer3D`) so all
// the app logic below (rotation, Libero swap, overlap checking, save/
// load, playlist) talks to whichever one is current via `renderer`
// without ever knowing which it is.
let viewMode = getViewMode();

function createRendererForMode(mode) {
  return mode === '3d'
    ? createCourtRenderer3D(scene3dMount, viewCubeWrap)
    : createCourtRenderer(svg);
}

let renderer = createRendererForMode(viewMode);

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
// True while the "Lock to Legal Positions" toggle is on: dragging any of
// the 6 on-court players is clamped so it can't cross a fault line against
// its current row/column neighbors. The benched player (Libero or whoever
// it replaced) is never clamped, since it isn't part of the 6 on-court
// zone checks until swapped in.
let clampEnabled = false;
// True while the selection is locked (toggled by double-clicking a player):
// clicking/dragging other players still moves them, but never changes
// which player is selected.
let selectionLocked = false;
let selectedRole = null;

// One Player instance per role, recreated whenever the renderer is
// (mode switch) and otherwise repositioned/relabeled in place as
// rotations happen (rather than recreating DOM nodes each time).
const playersByRole = {};

// (Re)creates every player against whichever renderer is currently
// active, and wires their click/double-click handlers - called once at
// load and again after every view-mode switch, since a fresh renderer
// instance means fresh Player/Player3D objects (the old ones, and their
// old event wiring, are discarded along with the old renderer).
function createPlayers() {
  for (const [zone, role] of Object.entries(rotationState.zoneToRole)) {
    const { x, y } = ZONE_POSITIONS[zone];
    playersByRole[role] = renderer.createCourtPlayer(role, playerLabels[role], x, y, handleDragEnd, handleDragMove);
  }
  // The Libero doesn't rotate through the six zones; it waits on the
  // sideline (in the currently active bench layout, upright) and can be
  // dragged onto the court to test a replacement.
  const initialBenchPos = renderer.benchPosition();
  playersByRole.L = renderer.createBenchPlayer('L', playerLabels.L, initialBenchPos.x, initialBenchPos.y, handleDragEnd, handleDragMove);
  wirePlayerClickHandlers();
}

// Whichever role is currently on the bench: the Libero itself, unless it
// has swapped in for someone, in which case that role is benched instead.
function benchedRole() {
  return liberoState.replacedRole || 'L';
}

createPlayers();
wireRendererEvents();
refreshViewModeButtons();


function isWithinCourt(x, y) {
  return x >= 0 && x <= COURT_SIZE && y >= 0 && y <= COURT_SIZE;
}

// The rotation number is based on the Setter's zone, independent of
// whoever's currently serving from zone 1.
function refreshRotationDisplay() {
  serverZoneEl.textContent = playerLabels[rotationState.roleInZone(1)];
  rotationBadgeEl.textContent = `R${rotationState.rotationNumber}`;
}

// Warns (in red) if the single benched player has been dragged onto a
// court that already has its full 6 players. Also keeps overlap status
// (violation lines, red player icons, results text) and the guide/link
// previews live while dragging any player - not just the selected one,
// since dragging one of its linked/related players should move that end
// of the line too.
function handleDragMove(player) {
  if (player.role === benchedRole()) {
    player.setBenchWarning(isWithinCourt(player.x, player.y));
  } else if (clampEnabled) {
    clampToLegalPosition(player);
  }
  runOverlapCheck();
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

// Snaps `player` back inside its legal range against its current row/
// column neighbors, so it can never actually be dragged into a fault -
// only the 6 on-court zone occupants are constrained this way (checked via
// findZoneForRole; a benched player isn't in `positions`, so this is a
// no-op for it). Redraws (or clears) a dashed boundary line for whichever
// axis is actively being clamped this frame, reusing drawSeparatorLine in
// the pair's canonical zoneA/zoneB order so it anchors identically to a
// guide-preview line for the same pair (rather than the mirrored side).
function clampToLegalPosition(player) {
  const positions = currentPositionsByZone();
  const zone = findZoneForRole(positions, player.role);
  if (!zone) {
    return;
  }
  const bounds = getClampBounds(zone, positions);
  const rawX = player.x;
  const rawY = player.y;
  const clampedX = Math.min(Math.max(rawX, bounds.minX), bounds.maxX);
  const clampedY = Math.min(Math.max(rawY, bounds.minY), bounds.maxY);

  renderer.clearClampLines();
  if (clampedX !== rawX) {
    const [zoneA, zoneB] = clampedX === bounds.maxX ? bounds.maxXPair : bounds.minXPair;
    renderer.drawSeparatorLine(positions[zoneA], positions[zoneB], zoneA, zoneB, 'horizontal', false, zone, 'clamp');
  }
  if (clampedY !== rawY) {
    const [zoneA, zoneB] = clampedY === bounds.maxY ? bounds.maxYPair : bounds.minYPair;
    renderer.drawSeparatorLine(positions[zoneA], positions[zoneB], zoneA, zoneB, 'vertical', false, zone, 'clamp');
  }

  if (clampedX !== rawX || clampedY !== rawY) {
    player.setPosition(clampedX, clampedY);
  }
}

function clearHighlights() {
  Object.values(playersByRole).forEach((player) => {
    player.setOverlapping(false);
    player.setBenchWarning(false);
  });
  // Deliberately leaves #overlapResults alone - it's rebuilt wholesale by
  // the runOverlapCheck() every caller runs right after (once positions
  // settle), so clearing it here just makes the status row flash empty/
  // shorter for the length of the in-between animation.
  renderer.clearViolationLines();
  renderer.clearLinkLines();
  renderer.clearClampLines();
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
  renderer.clearViolationLines();
  renderer.clearLinkLines();

  const violationCount = summary.filter((entry) => !entry.ok).length;
  overlapResultsSummaryEl.textContent = violationCount === 0
    ? 'Overlap Results — all legal'
    : `Overlap Results — ${violationCount} violation${violationCount === 1 ? '' : 's'}`;

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
      renderer.drawSeparatorLine(positions[result.zoneA], positions[result.zoneB], result.zoneA, result.zoneB, result.axis, true, selectedZone);
    }
  }

  if (guidesEnabled && selectedZone) {
    for (const result of pairwiseResults) {
      if (result.ok && (result.zoneA === selectedZone || result.zoneB === selectedZone)) {
        renderer.drawSeparatorLine(positions[result.zoneA], positions[result.zoneB], result.zoneA, result.zoneB, result.axis, false, selectedZone);
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        playersByRole[positions[neighborZone].role].setGuideRelated(true);
      }
    }
  }

  if (linksEnabled && selectedZone) {
    for (const result of pairwiseResults) {
      if (result.zoneA === selectedZone || result.zoneB === selectedZone) {
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        renderer.drawLinkLine(positions[selectedZone], positions[neighborZone], BACK_ROW.includes(neighborZone));
      }
    }
  }

  for (const entry of summary) {
    const item = document.createElement('li');
    item.className = `status-card ${entry.ok ? 'ok' : 'violation'}`;

    const top = document.createElement('span');
    top.className = 'status-card-top';

    const zone = document.createElement('span');
    zone.className = 'status-card-zone';
    zone.textContent = `Z${entry.zone}`;
    top.appendChild(zone);

    const role = document.createElement('span');
    role.className = 'status-card-role';
    role.textContent = playerLabels[entry.role];
    top.appendChild(role);

    item.appendChild(top);

    const status = document.createElement('span');
    status.className = 'status-card-status';
    status.textContent = entry.ok
      ? '\u2713 OK'
      : `\u2715 ${entry.violatingRoles.map((role) => playerLabels[role]).join(', ')}`;
    item.appendChild(status);

    overlapResultsEl.appendChild(item);
    if (!entry.ok) {
      playersByRole[entry.role].setOverlapping(true);
    }
  }
}

function handleDragEnd(player) {
  // The clamp-boundary line only makes sense while actively pressed
  // against it mid-drag; clear it once the drag is complete.
  if (player.role !== benchedRole()) {
    renderer.clearClampLines();
  }
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

// Restores a previously captured (or imported) state. Snaps every player
// straight to its saved position by default (used on load or an explicit
// "Load" from the setup page); pass `animate: true` to tween instead
// (used by playlist playback).
async function applyState(state, { animate = false, duration = 600 } = {}) {
  setAwaitingSelection(false);
  rotationState.zoneToRole = { ...state.zoneToRole };
  liberoState.replacedRole = state.liberoReplacedRole || null;
  const benched = benchedRole();
  const animations = [];
  for (const [role, player] of Object.entries(playersByRole)) {
    const pos = state.positions[role];
    if (!pos) {
      continue;
    }
    if (role === benched) {
      renderer.moveToBench(player);
    } else {
      renderer.moveToCourt(player);
    }
    if (animate) {
      animations.push(player.animateTo(pos.x, pos.y, duration));
    } else {
      player.setPosition(pos.x, pos.y);
    }
  }
  refreshRotationDisplay();
  refreshLiberoButtonLabel();
  clearHighlights();
  if (animate) {
    await Promise.all(animations);
  }
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
      const replacedPos = renderer.benchPositionReplaced();
      animations.push(playersByRole[role].animateTo(replacedPos.x, replacedPos.y, duration));
    } else {
      animations.push(playersByRole[role].animateTo(x, y, duration));
    }
  }
  if (!liberoState.replacedRole) {
    const benchPos = renderer.benchPosition();
    animations.push(playersByRole.L.animateTo(benchPos.x, benchPos.y, duration));
  }
  await Promise.all(animations);
  runOverlapCheck();
}

function refreshLiberoButtonLabel() {
  if (awaitingSelection) {
    liberoSwapBtn.textContent = 'Select a back-row player…';
  } else {
    liberoSwapBtn.textContent = liberoState.replacedRole
      ? `Swap Out Libero (for ${playerLabels[liberoState.replacedRole]})`
      : 'Swap In Libero';
  }
  // The button truncates with an ellipsis at this width - title shows the full text on hover.
  liberoSwapBtn.title = liberoSwapBtn.textContent;
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
  const replacedPos = renderer.benchPositionReplaced();
  renderer.moveToBench(playersByRole[role]);
  await playersByRole[role].animateTo(replacedPos.x, replacedPos.y, 500);
  renderer.moveToCourt(playersByRole.L);
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
  const benchPos = renderer.benchPosition();
  renderer.moveToBench(playersByRole.L);
  await playersByRole.L.animateTo(benchPos.x, benchPos.y, 500);
  renderer.moveToCourt(playersByRole[role]);
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
qmRotateCwBtn.addEventListener('click', () => rotate(1));
qmRotateCcwBtn.addEventListener('click', () => rotate(-1));

function resetToBasePositions() {
  setAwaitingSelection(false);
  liberoState.replacedRole = null;
  refreshLiberoButtonLabel();
  snapAllToZonePositions();
}
document.getElementById('resetBtn').addEventListener('click', resetToBasePositions);
qmResetToBaseBtn.addEventListener('click', resetToBasePositions);

// Swaps the Libero off if it's currently in, otherwise toggles "awaiting
// selection" mode - the same behavior whether triggered from the button
// or the "S" keyboard shortcut.
async function triggerLiberoSwap() {
  if (liberoState.replacedRole) {
    liberoSwapBtn.disabled = true;
    await swapLiberoOff();
    liberoSwapBtn.disabled = false;
    return;
  }
  setAwaitingSelection(!awaitingSelection);
}
liberoSwapBtn.addEventListener('click', triggerLiberoSwap);
qmSwapLiberoBtn.addEventListener('click', triggerLiberoSwap);

// Clicking a highlighted back-row player while awaiting selection completes
// the swap-in for that player; otherwise (or once resolved) falls through
// to the overlap-guide/link selection behavior below. A drag always
// selects that player (so previews update live while moving it); a plain
// tap (no real movement) instead toggles selection off if it was already
// the selected player. Ignored while neither preview toggle is on or
// while selection is locked. Each player gets exactly ONE `onClick`
// registration (not two, like an earlier draft) - Player3D's `onClick`
// only stores a single handler slot (there's no native DOM element to
// `addEventListener` a second listener onto), so both flows have to share
// one callback per player, for both renderers.
const TAP_MOVE_THRESHOLD = 5;
function wirePlayerClickHandlers() {
  for (const role of Object.keys(playersByRole)) {
    const player = playersByRole[role];

    player.onClick(async () => {
      if (awaitingSelection) {
        const zone = rotationState.zoneOfRole(role);
        if (!zone || !BACK_ROW.includes(zone)) {
          return;
        }
        setAwaitingSelection(false);
        liberoSwapBtn.disabled = true;
        await swapLiberoOn(role);
        liberoSwapBtn.disabled = false;
        return;
      }
      if ((!guidesEnabled && !linksEnabled) || selectionLocked) {
        return;
      }
      const wasTap = player.lastMoveDistance <= TAP_MOVE_THRESHOLD;
      selectedRole = wasTap && selectedRole === role ? null : role;
      runOverlapCheck();
    });

    // Double-clicking toggles the selection lock: double-clicking the
    // already-locked selected player unlocks it, double-clicking any
    // other player locks the selection onto that player instead.
    player.onDoubleClick(() => {
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
}


// Each of these three toggles has a duplicate button in BOTH the
// quad-menu's View quadrant AND its Scene quadrant (ROADMAP Phase 3.3
// follow-ups), alongside the original top-bar one - all call the same
// function and get their `.active` state refreshed together, so no copy
// can ever fall out of sync.
function toggleOverlapGuides() {
  guidesEnabled = !guidesEnabled;
  overlapGuideToggle.classList.toggle('active', guidesEnabled);
  qmOverlapGuideToggle.classList.toggle('active', guidesEnabled);
  qmSceneGuideToggle.classList.toggle('active', guidesEnabled);
  if (!guidesEnabled && !linksEnabled) {
    selectedRole = null;
    selectionLocked = false;
  }
  runOverlapCheck();
}
overlapGuideToggle.addEventListener('click', toggleOverlapGuides);
qmOverlapGuideToggle.addEventListener('click', toggleOverlapGuides);
qmSceneGuideToggle.addEventListener('click', toggleOverlapGuides);

function togglePlayerLinks() {
  linksEnabled = !linksEnabled;
  playerLinkToggle.classList.toggle('active', linksEnabled);
  qmPlayerLinkToggle.classList.toggle('active', linksEnabled);
  qmSceneLinkToggle.classList.toggle('active', linksEnabled);
  if (!guidesEnabled && !linksEnabled) {
    selectedRole = null;
    selectionLocked = false;
  }
  runOverlapCheck();
}
playerLinkToggle.addEventListener('click', togglePlayerLinks);
qmPlayerLinkToggle.addEventListener('click', togglePlayerLinks);
qmSceneLinkToggle.addEventListener('click', togglePlayerLinks);

function toggleClamp() {
  clampEnabled = !clampEnabled;
  clampToggle.classList.toggle('active', clampEnabled);
  qmClampToggle.classList.toggle('active', clampEnabled);
  qmSceneClampToggle.classList.toggle('active', clampEnabled);
  if (clampEnabled) {
    // Snaps every on-court player back inside bounds immediately, in case
    // it was already mid-fault when the toggle was switched on.
    for (const player of Object.values(playersByRole)) {
      if (player.role !== benchedRole()) {
        clampToLegalPosition(player);
      }
    }
    runOverlapCheck();
  }
}
clampToggle.addEventListener('click', toggleClamp);
qmClampToggle.addEventListener('click', toggleClamp);
qmSceneClampToggle.addEventListener('click', toggleClamp);

// Bench Side (3D-only - the 2D view already places the bench
// automatically). `renderer.setBenchSide` only exists on the 3D
// renderer; these buttons are hidden (so unclickable) whenever 2D is
// active, but each handler still guards against `viewMode` just in case.
function refreshBenchSide3DButtons() {
  const side = getBenchSide3D();
  benchSide3DLeftBtn.classList.toggle('active', side === 'left');
  benchSide3DRightBtn.classList.toggle('active', side === 'right');
}
function applyBenchSide3D(side) {
  if (viewMode !== '3d') {
    return;
  }
  renderer.setBenchSide(side);
  const benched = benchedRole();
  const pos = benched === 'L' ? renderer.benchPosition() : renderer.benchPositionReplaced();
  playersByRole[benched].setPosition(pos.x, pos.y);
  refreshBenchSide3DButtons();
}
benchSide3DLeftBtn.addEventListener('click', () => applyBenchSide3D('left'));
benchSide3DRightBtn.addEventListener('click', () => applyBenchSide3D('right'));

// Right-click quad-menu (ROADMAP Phase 3.3) - up to 4 sections, only as
// many shown as apply to the current view mode. js/quadMenu.js owns the
// generic open/close/positioning mechanics; everything below is what
// each button actually does.
const quadMenu = createQuadMenu(quadMenuEl);

qmResetViewBtn.addEventListener('click', () => { renderer.resetToDefaultView?.(); quadMenu.close(); });
qmZoomExtentsBtn.addEventListener('click', () => { renderer.zoomExtents?.(); quadMenu.close(); });

function refreshViewCubeSizeButtons() {
  const size = getViewCubeSize3D();
  qmViewCubeSizeBtns.forEach((button) => button.classList.toggle('active', button.dataset.size === size));
}
qmViewCubeSizeBtns.forEach((button) => {
  button.addEventListener('click', () => {
    renderer.setViewCubeSize?.(button.dataset.size);
    refreshViewCubeSizeButtons();
  });
});

function refreshLabelScaleButtons() {
  const mode = getLabelScaleMode3D();
  qmLabelScaleBtns.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
}
qmLabelScaleBtns.forEach((button) => {
  button.addEventListener('click', () => {
    renderer.setLabelScaleMode?.(button.dataset.mode);
    refreshLabelScaleButtons();
  });
});

// Calls straight through to renderer3d.js's exposed camera-preset
// methods (3D-only) or the equivalent app-level function (both modes) -
// matching each entry's `action` id in shortcutsData.js.
const shortcutActions = {
  resetView: () => renderer.resetToDefaultView?.(),
  viewTop: () => renderer.snapToPresetView?.('0,1,0'),
  viewEndline: () => renderer.snapToPresetView?.('0,0,1'),
  viewNet: () => renderer.snapToPresetView?.('0,0,-1'),
  viewLeft: () => renderer.snapToPresetView?.('-1,0,0'),
  viewRight: () => renderer.snapToPresetView?.('1,0,0'),
  zoomExtents: () => renderer.zoomExtents?.(),
  rotateCw: () => rotate(1),
  rotateCcw: () => rotate(-1),
  resetToBase: () => resetToBasePositions(),
  swapLibero: () => triggerLiberoSwap(),
  toggleGuides: () => toggleOverlapGuides(),
  toggleLinks: () => togglePlayerLinks(),
  toggleClamp: () => toggleClamp(),
};

// Renders the quad-menu's Keys section from shortcutsData.js - just the
// clickable subset (key + short label, full description in the `title`
// tooltip); non-actionable entries and mouse gestures aren't "clickable"
// so they're left for the full reference page instead, per the "keep the
// menu itself minimal" ask. Only 3D camera shortcuts remain here now -
// the both-modes ones (rotate/reset/libero/overlap toggles) moved to
// dedicated Scene-quadrant buttons per user request.
function renderShortcutsList() {
  quadShortcutsListEl.innerHTML = '';
  const list = document.createElement('ul');
  list.className = 'shortcuts-list';
  for (const entry of KEYBOARD_SHORTCUTS) {
    if (entry.appliesTo !== viewMode) {
      continue;
    }
    const action = entry.action && shortcutActions[entry.action];
    if (!action) {
      continue;
    }
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = `${entry.shortLabel} (${entry.key})`;
    button.title = entry.label;
    button.addEventListener('click', () => {
      action();
      quadMenu.close();
    });
    item.appendChild(button);
    list.appendChild(item);
  }
  if (list.children.length) {
    quadShortcutsListEl.appendChild(list);
  }
}

// Both-modes keyboard shortcuts (rotate/reset/libero/overlap toggles) -
// unlike renderer3d.js's own onKeydown (3D camera shortcuts only), these
// work in 2D too, so they're wired here once rather than per-renderer.
// Guarded like renderer3d.js's onKeydown: ignored while Ctrl/Alt/Meta is
// held (Alt is the 3D orbit modifier) or a text input has focus.
function onGlobalKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const focusedTag = document.activeElement?.tagName;
  if (focusedTag === 'INPUT' || focusedTag === 'TEXTAREA') {
    return;
  }
  switch (event.key.toLowerCase()) {
    case ']':
      shortcutActions.rotateCw();
      break;
    case '[':
      shortcutActions.rotateCcw();
      break;
    case '0':
      shortcutActions.resetToBase();
      break;
    case 's':
      shortcutActions.swapLibero();
      break;
    case 'g':
      shortcutActions.toggleGuides();
      break;
    case 'j':
      shortcutActions.toggleLinks();
      break;
    case 'c':
      shortcutActions.toggleClamp();
      break;
    default:
      return;
  }
  event.preventDefault();
}
window.addEventListener('keydown', onGlobalKeydown);

// Clicking anywhere on the court that isn't a player deselects the
// currently previewed player - re-registered on every renderer instance
// (see switchViewMode), since a fresh 3D renderer needs its own listener
// wired the same way a fresh 2D one would.
function wireRendererEvents() {
  renderer.onBackgroundClick(() => {
    if ((!guidesEnabled && !linksEnabled) || !selectedRole || selectionLocked) {
      return;
    }
    selectedRole = null;
    runOverlapCheck();
  });
  renderer.onContextMenu((event) => {
    refreshBenchSide3DButtons();
    refreshViewCubeSizeButtons();
    refreshLabelScaleButtons();
    renderShortcutsList();
    quadMenu.open(event.clientX, event.clientY, viewMode === '3d');
  });
}

// View Mode (Phase 2.13) - switches between the 2D SVG renderer and the
// 3D Three.js one, preserving the exact current court setup (rotation,
// every player's position, Libero swap state) via the same capture/apply
// round-trip already used for save/load and playlist steps. The old
// renderer is torn down first (`destroy()` only exists on the 3D one -
// the 2D renderer has no teardown to do, its SVG elements just stay in
// the DOM hidden) and every player is recreated against the new one,
// since a Player/Player3D instance is tied to the renderer that created
// it.
function refreshViewModeButtons() {
  viewMode2DBtn.classList.toggle('active', viewMode === '2d');
  viewMode3DBtn.classList.toggle('active', viewMode === '3d');
  svg.style.display = viewMode === '2d' ? '' : 'none';
  scene3dMount.hidden = viewMode !== '3d';
}

async function switchViewMode(mode) {
  if (mode === viewMode) {
    return;
  }
  const state = captureCurrentState();
  // The bench area's exact layout (position/orientation/shape) is
  // entirely renderer-specific - 2D's and 3D's bench coordinates aren't
  // the same coordinate space at all, so a captured bench-area position
  // from the OLD renderer is meaningless in the NEW one (previously this
  // carried the stale raw x/y across, silently misplacing the benched
  // player until its next unrelated reposition - e.g. a rotation - visibly
  // snapped it into the correct spot). On-court positions don't have this
  // problem since both renderers share the same ZONE_POSITIONS space.
  const benchedBeforeSwitch = state.liberoReplacedRole || 'L';
  renderer.destroy?.();
  viewMode = mode;
  saveViewMode(mode);
  refreshViewModeButtons();
  renderer = createRendererForMode(mode);
  wireRendererEvents();
  createPlayers();
  const newBenchPos = benchedBeforeSwitch === 'L' ? renderer.benchPosition() : renderer.benchPositionReplaced();
  state.positions[benchedBeforeSwitch] = { x: newBenchPos.x, y: newBenchPos.y };
  if (mode === '3d') {
    refreshBenchSide3DButtons();
  }
  await applyState(state);
}

viewMode2DBtn.addEventListener('click', () => switchViewMode('2d'));
viewMode3DBtn.addEventListener('click', () => switchViewMode('3d'));

saveSetupBtn.addEventListener('click', () => {
  const name = setupNameInput.value.trim();
  if (!name) {
    setupNameInput.focus();
    return;
  }
  saveSetup(name, captureCurrentState());
  setupNameInput.value = '';
  refreshQuickLoadOptions();
  const originalLabel = saveSetupBtn.textContent;
  saveSetupBtn.textContent = 'Saved!';
  setTimeout(() => { saveSetupBtn.textContent = originalLabel; }, 1200);
});

// Quick-recall: load a saved setup by name (or "Folder / name") straight
// from the visualizer, without a trip to the setup page's full list.
function refreshQuickLoadOptions() {
  quickLoadOptionsEl.innerHTML = '';
  for (const setup of getSavedSetups()) {
    const option = document.createElement('option');
    option.value = setup.folder ? `${setup.folder} / ${setup.name}` : setup.name;
    quickLoadOptionsEl.appendChild(option);
  }
}

quickLoadBtn.addEventListener('click', async () => {
  const query = quickLoadInput.value.trim();
  if (!query) {
    return;
  }
  const setup = getSavedSetups().find((candidate) => {
    const label = candidate.folder ? `${candidate.folder} / ${candidate.name}` : candidate.name;
    return label === query;
  });
  if (!setup) {
    return;
  }
  playlistPlaying = false;
  clearTimeout(playlistTimer);
  await applyState(setup.state, { animate: true });
  quickLoadInput.value = '';
});

refreshQuickLoadOptions();

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

// Resolves the playlist (built on the setup page) into the actual saved
// states it references, silently dropping any entry whose saved setup was
// since deleted.
function getPlaylistStates() {
  const byId = Object.fromEntries(getSavedSetups().map((setup) => [setup.id, setup]));
  return getPlaylist().map((item) => byId[item.setupId]).filter(Boolean);
}

let playlistPlaying = false;
let playlistIndex = -1;
let playlistTimer = null;

function refreshPlaylistUI() {
  const states = getPlaylistStates();
  playlistPlayBtn.textContent = playlistPlaying ? '\u23F8 Pause' : '\u25B6 Play';
  playlistPlayBtn.title = playlistPlaying ? 'Pause Playlist' : 'Play Playlist';
  playlistPlayBtn.classList.toggle('active', playlistPlaying);
  playlistStepBtn.disabled = states.length === 0;
  playlistPlayBtn.disabled = states.length === 0;
  if (states.length === 0) {
    playlistStatusEl.textContent = 'Playlist is empty - build one on the Setup page.';
    return;
  }
  const current = states[Math.max(playlistIndex, 0)];
  playlistStatusEl.textContent = `Step ${Math.max(playlistIndex, 0) + 1} / ${states.length}: ${current.name}`;
}

async function goToPlaylistStep(index) {
  const states = getPlaylistStates();
  if (states.length === 0) {
    return;
  }
  playlistIndex = ((index % states.length) + states.length) % states.length;
  await applyState(states[playlistIndex].state, { animate: true });
  refreshPlaylistUI();
}

// Queues the next step after the configured delay; a no-op once paused.
function schedulePlaylistAdvance() {
  clearTimeout(playlistTimer);
  if (!playlistPlaying) {
    return;
  }
  playlistTimer = setTimeout(async () => {
    await goToPlaylistStep(playlistIndex + 1);
    schedulePlaylistAdvance();
  }, getPlaylistDelay());
}

playlistPlayBtn.addEventListener('click', async () => {
  if (playlistPlaying) {
    playlistPlaying = false;
    clearTimeout(playlistTimer);
    refreshPlaylistUI();
    return;
  }
  playlistPlaying = true;
  refreshPlaylistUI();
  if (playlistIndex === -1) {
    await goToPlaylistStep(0);
  }
  schedulePlaylistAdvance();
});

playlistStepBtn.addEventListener('click', async () => {
  playlistPlaying = false;
  clearTimeout(playlistTimer);
  await goToPlaylistStep(playlistIndex + 1);
  refreshPlaylistUI();
});

refreshPlaylistUI();
