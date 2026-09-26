// Phase 2.1-2.4 — Three.js scene: court plane, lighting, camera, draggable
// player pucks, and overlap-driven guide/violation/link lines. Three.js
// (core + the addons/lines "fat line" module) is loaded from a CDN via
// scene3d.html's import map (no bundler/build step, consistent with the
// rest of this project) - the addons resolve their own internal `import
// ... from 'three'` this way too, which a plain CDN URL import can't do.
// Not yet wired into the 2D app's view-angle toggle - that's Phase 2.6,
// once enough of the 3D scene exists to be a real 4th `viewMode` option.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { COURT_SIZE, ATTACK_LINE_Y, BENCH_WIDTH, ZONE_POSITIONS, INITIAL_ZONE_ROLES, BACK_ROW } from './config.js';
import { PLAYER_RADIUS } from './player.js';
import { checkOverlap, getClampBounds } from './overlap.js';
import { applyColors } from './colors.js';
import { getLineSettings } from './lineSettings.js';
import { getFontSettings } from './fontSettings.js';
import { getBenchSide3D } from './benchSideSettings.js';
import { getLabelScaleMode3D } from './labelScaleSettings.js';

applyColors();

const mount = document.getElementById('scene3d');

// Reads a customizable color (see colors.js/setup.html) so the 3D court
// matches whatever the user picked for the 2D one, instead of duplicating
// separate hardcoded defaults here.
function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(cssColor('--court-bg', '#189a94'));

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
// Elevated behind the near end line, angled down at the court's center -
// a typical broadcast-style volleyball camera position.
camera.position.set(COURT_SIZE / 2, COURT_SIZE * 0.9, COURT_SIZE * 1.35);
camera.lookAt(COURT_SIZE / 2, 0, COURT_SIZE / 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
mount.appendChild(renderer.domElement);

// Billboarded (always-facing-camera) text labels (Phase 2.8) - a DOM
// overlay positioned by each label's Object3D world transform, rather
// than 3D text geometry, so it stays crisp and legible at any zoom/angle.
// Sits on top of the WebGL canvas but ignores pointer events, so it never
// blocks the drag/click raycasting below.
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
mount.appendChild(labelRenderer.domElement);
const fontSettings = getFontSettings();

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(COURT_SIZE * 0.3, COURT_SIZE, COURT_SIZE * 0.2);
scene.add(sun);

// Court plane - a true full court (9m x 18m in real dimensions), unlike
// the 2D renderer which only shows one team's half. Three.js's
// PlaneGeometry defaults to the XY plane, so it's rotated flat onto the
// XZ plane (Y is "up"). The 2D app's (x, y) maps to this plane's (x, z);
// reusing COURT_SIZE for the (square) half-court depth keeps both
// renderers' footprints numerically consistent. The net sits at z=0;
// OUR team's half (where ZONE_POSITIONS/players live) is z:[0,COURT_SIZE];
// the opponent's half mirrors it at z:[-COURT_SIZE,0] and is purely
// visual - no players are ever placed or draggable there (see the drag
// clamp below).
const court = new THREE.Mesh(
  new THREE.PlaneGeometry(COURT_SIZE, COURT_SIZE * 2),
  new THREE.MeshStandardMaterial({ color: cssColor('--court-fill', '#e2836b') }),
);
court.rotation.x = -Math.PI / 2;
court.position.set(COURT_SIZE / 2, 0, 0);
scene.add(court);

// Ground extending past the court's edges, matching the 2D background.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(COURT_SIZE * 4, COURT_SIZE * 4),
  new THREE.MeshStandardMaterial({ color: cssColor('--court-bg', '#189a94') }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(COURT_SIZE / 2, -1, 0);
scene.add(ground);

// Boundary and attack lines, raised slightly above the court plane to
// avoid z-fighting - just enough static geometry to make the plane read
// as an actual court; the dynamic guide/violation/link lines come later
// (Phase 2.4). Both attack lines mirror around the net (z=0), 1/3 of a
// half-court's depth from it on each side - the real layout, unlike an
// earlier draft that mistakenly mirrored around each half's own center.
const lineMaterial = new THREE.LineBasicMaterial({ color: cssColor('--line-colour', '#ffffff') });
const lineY = 0.5;
function addCourtLine(x1, z1, x2, z2) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x1, lineY, z1),
    new THREE.Vector3(x2, lineY, z2),
  ]);
  scene.add(new THREE.Line(geometry, lineMaterial));
}
addCourtLine(0, -COURT_SIZE, COURT_SIZE, -COURT_SIZE); // opponent's back line
addCourtLine(0, COURT_SIZE, COURT_SIZE, COURT_SIZE); // our back line
addCourtLine(0, -COURT_SIZE, 0, COURT_SIZE); // left sideline
addCourtLine(COURT_SIZE, -COURT_SIZE, COURT_SIZE, COURT_SIZE); // right sideline
addCourtLine(0, ATTACK_LINE_Y, COURT_SIZE, ATTACK_LINE_Y); // our attack line
addCourtLine(0, -ATTACK_LINE_Y, COURT_SIZE, -ATTACK_LINE_Y); // opponent's attack line

// Net line at z=0, thicker and wider than the boundary lines (extending
// past both sides) - a flat plane rather than another THREE.Line, since
// WebGL line width is capped at ~1px on most GPUs/browsers regardless of
// `linewidth`, unlike SVG's stroke-width. No actual net mesh (a vertical
// net plane) yet - just this ground-level marking, matching what court.js
// draws in 2D.
const net = new THREE.Mesh(
  new THREE.PlaneGeometry(COURT_SIZE + 80, 10),
  new THREE.MeshBasicMaterial({ color: cssColor('--line-colour', '#ffffff') }),
);
net.rotation.x = -Math.PI / 2;
net.position.set(COURT_SIZE / 2, lineY, 0);
scene.add(net);

// Bench/Libero substitution area - a tinted strip running the depth of
// OUR half only, immediately beside it on whichever side the "3D Preview
// - Bench Side" setup.html setting picks (see benchSideSettings.js).
// Reuses the same customizable --bench-fill/--bench-fill-opacity as the
// 2D bench panel.
const benchSide = getBenchSide3D();
const benchX = benchSide === 'left' ? -BENCH_WIDTH / 2 : COURT_SIZE + BENCH_WIDTH / 2;
const bench = new THREE.Mesh(
  new THREE.PlaneGeometry(BENCH_WIDTH, COURT_SIZE),
  new THREE.MeshStandardMaterial({
    color: cssColor('--bench-fill', '#ffffff'),
    opacity: Number(cssColor('--bench-fill-opacity', '0.12')) || 0.12,
    transparent: true,
  }),
);
bench.rotation.x = -Math.PI / 2;
bench.position.set(benchX, 0.25, COURT_SIZE / 2);
scene.add(bench);

// Player representation - a squat cylinder ("puck") per role, colored
// like the 2D player circles (a thin larger cylinder behind it stands in
// for the 2D circle's stroked outline). Positions are static placeholders
// (the 6 zone base positions + one bench slot for the Libero) since this
// scene isn't wired into the shared rotation/Libero state yet (Phase 2.7).
const PUCK_HEIGHT = 20;
const playerFill = cssColor('--player-fill', '#efa581');
const liberoFill = cssColor('--libero-fill', '#efa581');
const playerOutline = cssColor('--player-outline', '#f5f5f5');
const violationFill = cssColor('--player-overlap', '#e74c3c');
const selectedOutline = cssColor('--guide-selected', '#3498db');
// Matches the 2D renderer's `.guide-related` CSS rule - a hardcoded
// black outline (not a customizable CSS var there either).
const guideRelatedOutline = '#000000';

// Each entry's `.parent` is the group raycasting/dragging moves as a unit,
// so the fill and outline meshes always stay aligned to each other.
// `zone` (1-6) is set for on-court pucks only - it's what ties a puck to
// overlap.js's zone-keyed positions, and is null for the (not zone-
// checked) benched Libero puck.
const draggablePlayers = [];
function createPlayerPuck(x, z, fillColor, labelText, zone = null) {
  const group = new THREE.Group();
  group.position.set(x, PUCK_HEIGHT / 2, z);
  group.userData.zone = zone;

  const outline = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAYER_RADIUS + 4, PLAYER_RADIUS + 4, PUCK_HEIGHT * 0.8, 32),
    new THREE.MeshStandardMaterial({ color: playerOutline }),
  );
  outline.position.y = -1;
  group.add(outline);
  group.userData.outline = outline;

  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PUCK_HEIGHT, 32),
    new THREE.MeshStandardMaterial({ color: fillColor }),
  );
  group.add(fill);
  group.userData.fill = fill;
  group.userData.baseFillColor = fillColor;

  const labelDiv = document.createElement('div');
  labelDiv.style.transformOrigin = 'center';
  const labelTextEl = document.createElement('div');
  labelTextEl.textContent = labelText;
  labelTextEl.style.color = playerOutline;
  labelTextEl.style.fontFamily = fontSettings.fontFamily;
  labelTextEl.style.fontSize = `${fontSettings.playerLabelSize}px`;
  labelTextEl.style.fontWeight = 'bold';
  labelTextEl.style.textAlign = 'center';
  labelTextEl.style.userSelect = 'none';
  labelDiv.appendChild(labelTextEl);
  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 0, 0);
  group.add(label);
  // The CSS2DObject's own div (labelDiv) is positioned/transformed by
  // CSS2DRenderer itself every frame - scaling it directly would fight
  // that. The distance-scaling toggle below instead scales this INNER
  // text div, which CSS2DRenderer never touches.
  group.userData.labelText = labelTextEl;

  scene.add(group);
  draggablePlayers.push(group);
  return group;
}

for (const [zone, pos] of Object.entries(ZONE_POSITIONS)) {
  createPlayerPuck(pos.x, pos.y, playerFill, INITIAL_ZONE_ROLES[zone], Number(zone));
}
createPlayerPuck(benchX, COURT_SIZE / 2, liberoFill, 'L');

// Guide/violation/link lines (Phase 2.4) - reuses overlap.js's zone-based
// rule checker (identical logic to the 2D renderer) fed with each on-court
// puck's live (x, z) position, and draws the results as "fat" lines via
// the Line2/LineGeometry/LineMaterial addon, since regular THREE.Line
// ignores `linewidth` on most GPUs/browsers (capped at ~1px) - the same
// limitation that motivated the net/court-line planes above, but dashed
// lines specifically need this addon's LineMaterial (`dashed: true`)
// rather than another plane. `worldUnits: true` makes `linewidth` scale
// with the court instead of staying a fixed pixel size on screen.
const linkColor = cssColor('--link-line', '#16a34a');
const guideColor = cssColor('--guide-line', '#000000');
const violationColor = cssColor('--player-overlap', '#e74c3c');
// Same customizable widths as the 2D renderer (SVG stroke-width units,
// numerically compatible with the 3D world since worldUnits:true and both
// use COURT_SIZE=900 for the same real-world court scale).
const lineSettings = getLineSettings();
const overlayLines = [];

function clearOverlayLines() {
  for (const line of overlayLines) {
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }
  overlayLines.length = 0;
}

function addFatLine(points, color, { dashed = false, linewidth = 8 } = {}) {
  const geometry = new LineGeometry();
  geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const material = new LineMaterial({ color, linewidth, dashed, dashSize: 24, gapSize: 16, worldUnits: true });
  material.resolution.set(renderer.domElement.width, renderer.domElement.height);
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  scene.add(line);
  overlayLines.push(line);
}

// On-court pucks only (the benched Libero's `userData.zone` is null).
function currentPositionsByZone() {
  const positions = {};
  for (const group of draggablePlayers) {
    if (group.userData.zone) {
      positions[group.userData.zone] = { x: group.position.x, y: group.position.z, role: `Z${group.userData.zone}` };
    }
  }
  return positions;
}

// Ported from the 2D renderer's drawSeparatorLine anchor logic: anchor on
// whichever of the pair ISN'T the selected player (so previewing a
// selection always measures against the other, stationary-feeling side),
// falling back to whichever player is closer to its own zone's base
// position when neither is selected.
function boundaryAnchor(positions, zoneA, zoneB, axis, selectedZone) {
  let anchorIsA;
  if (selectedZone === zoneA) {
    anchorIsA = false;
  } else if (selectedZone === zoneB) {
    anchorIsA = true;
  } else {
    const displacement = (zone) => {
      const pos = positions[zone];
      const base = ZONE_POSITIONS[zone];
      return (pos.x - base.x) ** 2 + (pos.y - base.y) ** 2;
    };
    anchorIsA = displacement(zoneA) <= displacement(zoneB);
  }
  const posA = positions[zoneA];
  const posB = positions[zoneB];
  return axis === 'horizontal'
    ? (anchorIsA ? posA.x - PLAYER_RADIUS : posB.x + PLAYER_RADIUS)
    : (anchorIsA ? posA.y - PLAYER_RADIUS : posB.y + PLAYER_RADIUS);
}

// A boundary line spans the full court along the OPPOSITE axis from the
// one it's constraining - e.g. a left/right ("horizontal") fault is drawn
// as a line running front-to-back at a fixed x.
function boundaryLinePoints(axis, anchor) {
  return axis === 'horizontal'
    ? [new THREE.Vector3(anchor, lineY, 0), new THREE.Vector3(anchor, lineY, COURT_SIZE)]
    : [new THREE.Vector3(0, lineY, anchor), new THREE.Vector3(COURT_SIZE, lineY, anchor)];
}

let selectedGroup = null;

// Recomputes overlap status from the pucks' current positions and redraws
// every guide/violation/link line, plus tints the affected pucks (red
// fill for a violation, blue outline for the current selection) - called
// after every drag move and every selection change, matching the 2D
// renderer's "always live" overlap feedback. `selectedGroup` (not just a
// zone number) is what's tracked, so the zone-less benched Libero can
// still be selected/highlighted even though it never has guide/link
// lines drawn for it (it isn't part of the on-court zone checks).
function refreshOverlayLines() {
  clearOverlayLines();
  const positions = currentPositionsByZone();
  const results = checkOverlap(positions);
  const violatingZones = new Set();
  const relatedZones = new Set();
  const selectedZone = selectedGroup ? selectedGroup.userData.zone : null;

  for (const result of results) {
    if (!result.ok) {
      violatingZones.add(result.zoneA);
      violatingZones.add(result.zoneB);
      const anchor = boundaryAnchor(positions, result.zoneA, result.zoneB, result.axis, selectedZone);
      addFatLine(boundaryLinePoints(result.axis, anchor), violationColor, { dashed: true, linewidth: lineSettings.violationLineWidth });
    }
  }

  if (selectedZone) {
    for (const result of results) {
      if (result.ok && (result.zoneA === selectedZone || result.zoneB === selectedZone)) {
        const anchor = boundaryAnchor(positions, result.zoneA, result.zoneB, result.axis, selectedZone);
        addFatLine(boundaryLinePoints(result.axis, anchor), guideColor, { dashed: true, linewidth: lineSettings.guideLineWidth });
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        relatedZones.add(neighborZone);
      }
      if (result.zoneA === selectedZone || result.zoneB === selectedZone) {
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        const a = positions[selectedZone];
        const b = positions[neighborZone];
        addFatLine(
          [new THREE.Vector3(a.x, PUCK_HEIGHT / 2, a.y), new THREE.Vector3(b.x, PUCK_HEIGHT / 2, b.y)],
          linkColor,
          { dashed: BACK_ROW.includes(neighborZone), linewidth: lineSettings.linkLineWidth },
        );
      }
    }
  }

  for (const group of draggablePlayers) {
    if (group.userData.zone !== null) {
      group.userData.fill.material.color.set(violatingZones.has(group.userData.zone) ? violationColor : group.userData.baseFillColor);
    }
    let outlineColor = playerOutline;
    if (group === selectedGroup) {
      outlineColor = selectedOutline;
    } else if (relatedZones.has(group.userData.zone)) {
      outlineColor = guideRelatedOutline;
    }
    group.userData.outline.material.color.set(outlineColor);
  }
}
refreshOverlayLines();

// Drag via raycasting: pointerdown hit-tests the player pucks; while
// dragging, pointermove re-casts against a fixed horizontal plane at the
// pucks' resting height to find where to move the grabbed one, regardless
// of which mesh (court/ground/bench) is actually under the cursor. A
// press-and-release without much movement is treated as a tap instead of
// a drag, toggling the puck's selection (for the guide/link lines above)
// rather than moving it.
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(PUCK_HEIGHT / 2));
const dragPoint = new THREE.Vector3();
const TAP_MOVE_THRESHOLD = 5;
let draggingGroup = null;
let pointerDownAt = null;

function updatePointerNDC(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.style.touchAction = 'none';

// "Lock to Legal Positions" (Phase 2.6) - an optional drag clamp so a
// fault can never be created in the first place, reusing overlap.js's
// getClampBounds (identical to the 2D renderer). Only on-court pucks are
// clamped - the benched Libero isn't part of the zone-based rule checks.
// Toggled via the plain header button for now; folds into the floating
// control panel once Phase 2.10 exists.
let clampEnabled = false;
const clampLines = [];
function clearClampLines() {
  for (const line of clampLines) {
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }
  clampLines.length = 0;
}
function addClampLine(axis, anchor) {
  const geometry = new LineGeometry();
  geometry.setPositions(boundaryLinePoints(axis, anchor).flatMap((p) => [p.x, p.y, p.z]));
  const material = new LineMaterial({ color: guideColor, linewidth: lineSettings.guideLineWidth, dashed: true, dashSize: 24, gapSize: 16, worldUnits: true });
  material.resolution.set(renderer.domElement.width, renderer.domElement.height);
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  scene.add(line);
  clampLines.push(line);
}

// Solves the legal x/z range for `zone` against its current row/column
// neighbors and clamps (rawX, rawZ) into it. `bounds.minX`/`maxX`/etc. are
// the DRAGGED player's own center stop-coordinate (they bake in TOLERANCE,
// the sum of BOTH circles' radii, so its edge just touches the neighbor's
// edge there) - NOT the boundary line's position. The line belongs at the
// actual shared edge, one PLAYER_RADIUS further from center (toward
// whichever neighbor is binding), i.e. `bounds.minX + PLAYER_RADIUS` /
// `bounds.maxX - PLAYER_RADIUS` - drawing it at the raw bound instead
// makes it cut through the dragged puck's own center.
function clampToLegalPosition(zone, rawX, rawZ, { drawLines = false } = {}) {
  const bounds = getClampBounds(zone, currentPositionsByZone());
  const clampedX = Math.min(Math.max(rawX, bounds.minX), bounds.maxX);
  const clampedZ = Math.min(Math.max(rawZ, bounds.minY), bounds.maxY);
  if (drawLines) {
    if (clampedX !== rawX) {
      addClampLine('horizontal', clampedX === bounds.maxX ? clampedX - PLAYER_RADIUS : clampedX + PLAYER_RADIUS);
    }
    if (clampedZ !== rawZ) {
      addClampLine('vertical', clampedZ === bounds.maxY ? clampedZ - PLAYER_RADIUS : clampedZ + PLAYER_RADIUS);
    }
  }
  return { x: clampedX, z: clampedZ };
}

const clampToggleBtn = document.getElementById('clampToggle3D');
clampToggleBtn.addEventListener('click', () => {
  clampEnabled = !clampEnabled;
  clampToggleBtn.classList.toggle('active', clampEnabled);
  if (clampEnabled) {
    // Snaps every on-court puck back inside bounds immediately, in case
    // one was already mid-fault when the toggle was switched on.
    for (const group of draggablePlayers) {
      if (group.userData.zone !== null) {
        const { x, z } = clampToLegalPosition(group.userData.zone, group.position.x, group.position.z);
        group.position.x = x;
        group.position.z = z;
      }
    }
    refreshOverlayLines();
  }
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
  if (!hit) {
    return;
  }
  draggingGroup = hit.object.parent;
  pointerDownAt = { x: event.clientX, y: event.clientY };
  renderer.domElement.setPointerCapture(event.pointerId);
  renderer.domElement.style.cursor = 'grabbing';
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!draggingGroup) {
    return;
  }
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
    clearClampLines();
    // Clamped to z >= 0 so a player can never be dragged across the net
    // into the (purely visual, no-players-allowed) opponent's half.
    let x = dragPoint.x;
    let z = Math.max(dragPoint.z, 0);
    if (draggingGroup.userData.zone !== null) {
      if (clampEnabled) {
        ({ x, z } = clampToLegalPosition(draggingGroup.userData.zone, x, z, { drawLines: true }));
      }
    } else {
      // Warns (red tint) if the benched Libero has been dragged onto a
      // court that already has its full 6 players, so it's never
      // possible to end up with 7 - matches the 2D renderer's check.
      // Left as-is (not reset) after the drag ends, same as 2D, since the
      // puck may still be sitting on the court at that point.
      const isWithinCourt = x >= 0 && x <= COURT_SIZE && z >= 0 && z <= COURT_SIZE;
      draggingGroup.userData.fill.material.color.set(isWithinCourt ? violationColor : draggingGroup.userData.baseFillColor);
    }
    draggingGroup.position.x = x;
    draggingGroup.position.z = z;
    refreshOverlayLines();
  }
});

function endDrag(event) {
  if (!draggingGroup) {
    return;
  }
  // The clamp-boundary line only makes sense while actively pressed
  // against it mid-drag; clear it once the drag is complete.
  clearClampLines();
  // Matches the 2D renderer: releasing over a player selects it regardless
  // of whether it was a tap or a drag (a native 'click' event fires after
  // a 2D SVG drag release too) - a tap on the ALREADY-selected puck is the
  // one case that toggles it back off instead.
  const moved = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
  const wasTap = moved <= TAP_MOVE_THRESHOLD;
  selectedGroup = wasTap && selectedGroup === draggingGroup ? null : draggingGroup;
  refreshOverlayLines();
  renderer.domElement.releasePointerCapture(event.pointerId);
  renderer.domElement.style.cursor = '';
  draggingGroup = null;
}
renderer.domElement.addEventListener('pointerup', endDrag);
renderer.domElement.addEventListener('pointercancel', endDrag);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Label distance scaling (setup.html's "3D Preview - Label Scaling"
// setting, default "scale"): CSS2DObject text otherwise stays a fixed
// screen size regardless of camera distance, unlike the pucks themselves
// (which shrink/grow normally via perspective) - scaling the inner text
// div's CSS transform by (reference distance / current distance) each
// frame fakes the same perspective falloff for the labels. The reference
// distance is measured once, at load, to whatever's roughly the middle of
// the court, so labels look their designed (fontSettings) size there,
// same as before this toggle existed.
const labelScaleMode = getLabelScaleMode3D();
const labelScaleReferenceDistance = camera.position.distanceTo(new THREE.Vector3(COURT_SIZE / 2, PUCK_HEIGHT / 2, COURT_SIZE / 2));

function updateLabelScaling() {
  for (const group of draggablePlayers) {
    if (labelScaleMode !== 'scale') {
      group.userData.labelText.style.transform = '';
      continue;
    }
    const distance = camera.position.distanceTo(group.position);
    const scale = Math.min(2.5, Math.max(0.4, labelScaleReferenceDistance / distance));
    group.userData.labelText.style.transform = `scale(${scale})`;
  }
}

function animate() {
  requestAnimationFrame(animate);
  updateLabelScaling();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

