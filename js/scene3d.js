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
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COURT_SIZE, ATTACK_LINE_Y, BENCH_WIDTH, ZONE_POSITIONS, INITIAL_ZONE_ROLES, BACK_ROW } from './config.js';
import { PLAYER_RADIUS } from './player.js';
import { checkOverlap, getClampBounds, summarizeByPlayer } from './overlap.js';
import { applyColors } from './colors.js';
import { getLineSettings } from './lineSettings.js';
import { getFontSettings } from './fontSettings.js';
import { getEffectSettings } from './effectSettings.js';
import { getBenchSide3D, saveBenchSide3D } from './benchSideSettings.js';
import { getLabelScaleMode3D } from './labelScaleSettings.js';
import { getViewCubeSize3D } from './viewCubeSizeSettings.js';
import { RotationState } from './rotation.js';

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

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 4000);
// Elevated behind the near end line, angled down at the court's center -
// a typical broadcast-style volleyball camera position.
camera.position.set(COURT_SIZE / 2, COURT_SIZE * 0.9, COURT_SIZE * 1.35);
camera.lookAt(COURT_SIZE / 2, 0, COURT_SIZE / 2);

// logarithmicDepthBuffer avoids z-fighting flicker (the ground plane's
// teal bleeding through the court, especially at the grazing viewing
// angles OrbitControls now allows) - depth precision is otherwise spread
// very unevenly across a 1-4000 near/far range.
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
mount.appendChild(renderer.domElement);

// Camera controls (Phase 2.9) - orbit (drag) + tilt (also drag, via the
// polar angle) + zoom (wheel), focused on the court center. Panning is
// disabled to keep that focus point fixed, since "orbit/tilt" (not
// "pan") is what the roadmap actually asks for; polar angle is capped
// just short of the ground plane so the camera can't end up underneath
// the court looking up through it.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(COURT_SIZE / 2, 0, COURT_SIZE / 2);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 200;
controls.maxDistance = 3000;
controls.maxPolarAngle = Math.PI * 0.49;
// Left button is reserved for selecting/dragging pucks (see the
// pointerdown handler below); orbiting is right-button-drag instead of
// OrbitControls' left-button default, so the two gestures never compete
// for the same button. OrbitControls suppresses the browser's right-click
// context menu on its own domElement automatically once RIGHT is bound.
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.update();

// Default view (Phase 2.12's Home button/key), captured once before any
// user interaction.
const DEFAULT_CAMERA_POSITION = camera.position.clone();
const DEFAULT_CONTROLS_TARGET = controls.target.clone();

// Smoothly animates the camera position/orbit-target over `durationMs`
// (Phase 2.12 - used by the ViewCube/keyboard shortcuts/Home button, and
// by selecting/deselecting a puck). Safe to drive every frame alongside
// OrbitControls: `OrbitControls.update()` re-derives its internal
// spherical state from the camera's CURRENT position relative to
// `target` on every call rather than caching a stale one, so directly
// tweening `camera.position`/`controls.target` here and letting the
// existing `controls.update()` in `animate()` run afterward "just works"
// with no desync.
let cameraTween = null;
function flyCameraTo(endPosition, endTarget, durationMs = 400) {
  cameraTween = {
    startPosition: camera.position.clone(),
    endPosition: endPosition.clone(),
    startTarget: controls.target.clone(),
    endTarget: endTarget.clone(),
    startTime: performance.now(),
    durationMs,
  };
}
function updateCameraTween(nowMs) {
  if (!cameraTween) {
    return;
  }
  const t = Math.min(1, (nowMs - cameraTween.startTime) / cameraTween.durationMs);
  const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  camera.position.lerpVectors(cameraTween.startPosition, cameraTween.endPosition, eased);
  controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, eased);
  if (t >= 1) {
    cameraTween = null;
  }
}

function resetToDefaultView() {
  // A full reset also clears whatever puck is selected - Home means "back
  // to the default state" globally, unlike a plain view-cube/keyboard
  // direction snap (which only moves the camera, never touches selection).
  selectedGroup = null;
  selectionLocked = false;
  refreshOverlayLines();
  flyCameraTo(DEFAULT_CAMERA_POSITION, DEFAULT_CONTROLS_TARGET);
}

// Converts a preset view direction (e.g. "top-endline-right" = (1,1,1))
// into a camera position at the current orbit distance from `target`,
// clamped to the same polar-angle limits normal dragging respects (so,
// e.g., "Bottom" snaps to the lowest angle the ground plane still allows,
// rather than an unreachable literal underside view).
function directionToCameraPosition(direction, target, distance) {
  const spherical = new THREE.Spherical().setFromVector3(direction.clone().normalize());
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  spherical.makeSafe();
  return target.clone().add(new THREE.Vector3().setFromSpherical(spherical).multiplyScalar(distance));
}

// Snaps to a preset view, orbiting around whichever point is currently
// the active orbit target (the court center by default, or wherever
// `zoomExtents` last framed) rather than resetting that choice.
function snapToViewDirection(direction) {
  const target = controls.target.clone();
  const distance = camera.position.distanceTo(target);
  flyCameraTo(directionToCameraPosition(direction, target, distance), target);
}

// Frames either the whole court (nothing selected) or tightly frames the
// selected puck, preserving the current viewing angle/direction and only
// adjusting distance - matches 3ds Max's "Zoom Extents" (Z key).
function zoomExtents() {
  const target = selectedGroup ? selectedGroup.position.clone() : DEFAULT_CONTROLS_TARGET.clone();
  const distance = THREE.MathUtils.clamp(
    selectedGroup ? PLAYER_RADIUS * 8 : COURT_SIZE * 1.3,
    controls.minDistance,
    controls.maxDistance,
  );
  const offset = camera.position.clone().sub(controls.target);
  const direction = offset.lengthSq() > 0 ? offset.normalize() : new THREE.Vector3(0, 1, 0);
  flyCameraTo(target.clone().add(direction.multiplyScalar(distance)), target);
}

// The 26 ViewCube regions (6 faces + 12 edges + 8 corners), each a unit
// direction from the target - built programmatically (not 26 hand-authored
// DOM elements) since it's the same shape for all three groups. Faces are
// full flush panels (need a rotation to lie against the cube's surface,
// the standard CSS cube recipe); edges/corners are just small markers
// positioned by a plain `translate3d` in the cube's own (unrotated) local
// space - no extra rotation needed since they aren't flush panels.
//
// The Z-axis faces are labeled ENDLINE/NET rather than a generic Front/
// Back: which side of the net counts as "front" is inherently ambiguous
// (it flips depending which team you consider yourself on, and the net
// itself has no front/back at all) - ENDLINE (our team's fixed back
// line) and NET (the fixed z=0 plane) are unambiguous world landmarks
// that stay correct no matter what's added later. When a net mesh or
// referee-stand props eventually get modeled, this ViewCube should stay a
// purely world-axis-relative navigation aid (Top/Bottom/Endline/Net/
// Left/Right) - any "view from a specific prop's own facing direction"
// (e.g. a future "View from 1st Referee" preset) belongs in a separate,
// object-specific camera preset, not a repurposing of these generic axis
// labels.
// The ViewCube's actual pixel sizes live as CSS custom properties on
// `#viewCubeWrap` (defaults in scene3d.html's `<style>`), overridden here
// per the setup.html "3D Preview - View Cube Size" setting - every face/
// hotspot transform below references these vars (`var(--vc-half)` etc.)
// instead of a hardcoded number, so switching sizes is just a handful of
// custom-property writes, no DOM/transform regeneration needed.
const VIEW_CUBE_SIZE_PRESETS = {
  small: { sceneSize: 100, perspective: 500, half: 30, faceFontRem: 0.6, edgeHalf: 8, cornerHalf: 6 },
  medium: { sceneSize: 150, perspective: 750, half: 45, faceFontRem: 0.75, edgeHalf: 10, cornerHalf: 8 },
  large: { sceneSize: 200, perspective: 1000, half: 60, faceFontRem: 0.9, edgeHalf: 13, cornerHalf: 10 },
};
const viewCubeWrapEl = document.getElementById('viewCubeWrap');
const viewCubeSizePreset = VIEW_CUBE_SIZE_PRESETS[getViewCubeSize3D()];
viewCubeWrapEl.style.setProperty('--vc-scene-size', `${viewCubeSizePreset.sceneSize}px`);
viewCubeWrapEl.style.setProperty('--vc-perspective', `${viewCubeSizePreset.perspective}px`);
viewCubeWrapEl.style.setProperty('--vc-half', `${viewCubeSizePreset.half}px`);
viewCubeWrapEl.style.setProperty('--vc-face-size', `${viewCubeSizePreset.half * 2}px`);
viewCubeWrapEl.style.setProperty('--vc-face-font-size', `${viewCubeSizePreset.faceFontRem}rem`);
viewCubeWrapEl.style.setProperty('--vc-edge-half', `${viewCubeSizePreset.edgeHalf}px`);
viewCubeWrapEl.style.setProperty('--vc-edge-size', `${viewCubeSizePreset.edgeHalf * 2}px`);
viewCubeWrapEl.style.setProperty('--vc-corner-half', `${viewCubeSizePreset.cornerHalf}px`);
viewCubeWrapEl.style.setProperty('--vc-corner-size', `${viewCubeSizePreset.cornerHalf * 2}px`);

const VIEW_CUBE_FACES = [
  { label: 'TOP', dir: [0, 1, 0], transform: 'rotateX(90deg) translateZ(var(--vc-half))' },
  { label: 'BOTTOM', dir: [0, -1, 0], transform: 'rotateX(-90deg) translateZ(var(--vc-half))' },
  { label: 'ENDLINE', dir: [0, 0, 1], transform: 'translateZ(var(--vc-half))' },
  { label: 'NET', dir: [0, 0, -1], transform: 'rotateY(180deg) translateZ(var(--vc-half))' },
  { label: 'LEFT', dir: [-1, 0, 0], transform: 'rotateY(-90deg) translateZ(var(--vc-half))' },
  { label: 'RIGHT', dir: [1, 0, 0], transform: 'rotateY(90deg) translateZ(var(--vc-half))' },
];
// Edges: exactly one axis is zero. Corners: none are zero.
const VIEW_CUBE_EDGES_AND_CORNERS = [];
for (const x of [-1, 0, 1]) {
  for (const y of [-1, 0, 1]) {
    for (const z of [-1, 0, 1]) {
      const nonZeroCount = [x, y, z].filter((n) => n !== 0).length;
      if (nonZeroCount === 2 || nonZeroCount === 3) {
        VIEW_CUBE_EDGES_AND_CORNERS.push({ dir: [x, y, z], kind: nonZeroCount === 2 ? 'vc-edge' : 'vc-corner' });
      }
    }
  }
}
// Same 6-face recipe `VIEW_CUBE_FACES` uses above, just parameterized by
// which CSS custom property holds the half-size - shared by the small
// edge/corner "mini cubes" below.
function cubeFaceTransforms(halfSizeVar) {
  return [
    `translateZ(var(${halfSizeVar}))`,
    `rotateY(180deg) translateZ(var(${halfSizeVar}))`,
    `rotateY(90deg) translateZ(var(${halfSizeVar}))`,
    `rotateY(-90deg) translateZ(var(${halfSizeVar}))`,
    `rotateX(90deg) translateZ(var(${halfSizeVar}))`,
    `rotateX(-90deg) translateZ(var(${halfSizeVar}))`,
  ];
}

const viewCubeEl = document.getElementById('viewCube3D');
for (const { label, dir, transform } of VIEW_CUBE_FACES) {
  const face = document.createElement('div');
  face.className = 'vc-face';
  face.textContent = label;
  face.style.transform = transform;
  face.dataset.dir = dir.join(',');
  viewCubeEl.appendChild(face);
}
for (const { dir, kind } of VIEW_CUBE_EDGES_AND_CORNERS) {
  const [x, y, z] = dir;
  const hotspot = document.createElement('div');
  hotspot.className = `vc-hotspot ${kind}`;
  // CSS Y grows downward, so the vertical offset is negated to keep "up"
  // (dir y = +1, i.e. TOP) visually above center.
  hotspot.style.transform = `translate3d(calc(${x} * var(--vc-half)), calc(${-y} * var(--vc-half)), calc(${z} * var(--vc-half)))`;
  hotspot.dataset.dir = dir.join(',');
  // Real 3D boxes (6 tiny faces each), not flat squares - a flat marker
  // rotates edge-on and nearly disappears when the cube is viewed close
  // to face-on from that side, making it hard to click.
  const halfSizeVar = kind === 'vc-edge' ? '--vc-edge-half' : '--vc-corner-half';
  for (const faceTransform of cubeFaceTransforms(halfSizeVar)) {
    const hotspotFace = document.createElement('div');
    hotspotFace.className = 'vc-hotspot-face';
    hotspotFace.style.transform = faceTransform;
    hotspot.appendChild(hotspotFace);
  }
  viewCubeEl.appendChild(hotspot);
}
viewCubeEl.querySelectorAll('[data-dir]').forEach((el) => {
  el.addEventListener('click', () => snapToViewDirection(new THREE.Vector3(...el.dataset.dir.split(',').map(Number))));
});

// Rotates the (purely decorative/navigational) CSS cube to visually
// track the main camera's current orbit angle every frame, so it always
// shows which way the "camera" is currently facing - the actual point of
// a ViewCube.
function updateViewCubeOrientation() {
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const azimuthDeg = THREE.MathUtils.radToDeg(spherical.theta);
  const polarDeg = THREE.MathUtils.radToDeg(spherical.phi);
  viewCubeEl.style.transform = `rotateX(${polarDeg - 90}deg) rotateY(${-azimuthDeg}deg)`;
}

document.getElementById('viewCubeHome').addEventListener('click', resetToDefaultView);

// "V" view-picker menu (Phase 2.12) - a simple list of all 6 faces plus
// Home/Perspective, standing in for 3ds Max's popup view menu.
const viewMenuEl = document.getElementById('viewMenu3D');
function setViewMenuOpen(open) {
  viewMenuEl.hidden = !open;
}
viewMenuEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-view]');
  if (!button) {
    return;
  }
  if (button.dataset.view === 'home') {
    resetToDefaultView();
  } else {
    snapToViewDirection(new THREE.Vector3(...button.dataset.view.split(',').map(Number)));
  }
  setViewMenuOpen(false);
});
document.addEventListener('click', (event) => {
  if (!viewMenuEl.hidden && !event.target.closest('.view-cube-wrap')) {
    setViewMenuOpen(false);
  }
});

// Keyboard shortcuts (Phase 2.12), modeled on 3ds Max's view navigation:
// P/Home (perspective/home), T/F/L (top/endline/left - the 3 most useful
// preset angles for a court), V (view picker menu), Z (zoom extents).
// Ignored while a modifier key is held (so browser shortcuts like Ctrl+F
// still work) or while a text input has focus (none currently exist on
// this page, but this guards against future ones).
window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const focusedTag = document.activeElement?.tagName;
  if (focusedTag === 'INPUT' || focusedTag === 'TEXTAREA') {
    return;
  }
  switch (event.key.toLowerCase()) {
    case 'p':
    case 'home':
      resetToDefaultView();
      break;
    case 't':
      snapToViewDirection(new THREE.Vector3(0, 1, 0));
      break;
    case 'f':
      // Endline view (our team's fixed back line, looking toward the net).
      snapToViewDirection(new THREE.Vector3(0, 0, 1));
      break;
    case 'l':
      snapToViewDirection(new THREE.Vector3(-1, 0, 0));
      break;
    case 'z':
      zoomExtents();
      break;
    case 'v':
      setViewMenuOpen(viewMenuEl.hidden);
      break;
    default:
      return;
  }
  event.preventDefault();
});

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
ground.position.set(COURT_SIZE / 2, -10, 0);
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
let benchSide = getBenchSide3D();
let benchX = benchSide === 'left' ? -BENCH_WIDTH / 2 : COURT_SIZE + BENCH_WIDTH / 2;
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
    new THREE.MeshStandardMaterial({ color: playerOutline, emissive: 0x000000, emissiveIntensity: 0 }),
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
      positions[group.userData.zone] = { x: group.position.x, y: group.position.z, role: INITIAL_ZONE_ROLES[group.userData.zone] };
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
// True once a puck's selection has been locked via double-click: other
// pucks can still be dragged/tapped without changing the selection until
// unlocked (double-click the locked puck again).
let selectionLocked = false;
// True while the "Show Overlap Guides" / "Show Player Links" panel
// toggles are on (independently, matching 2D - previously 3D always drew
// both together whenever a puck was selected). Selecting a puck at all is
// gated on at least one of these being enabled, same as 2D.
let guidesEnabled = false;
let linksEnabled = false;

const overlapResultsEl = document.getElementById('overlapResults3D');
const overlapResultsSummaryEl = document.getElementById('overlapResultsSummary3D');

// Dashboard readout (Phase 2.10) - reuses the same RotationState class
// the 2D app drives, though nothing rotates it yet (Phase 2.13 wires up
// real Rotate CW/CCW buttons); shows the correct static R1/server-zone
// values now and will start reflecting real rotations for free once that
// lands.
const rotationState = new RotationState();
const serverZoneEl = document.getElementById('serverZone3D');
const rotationNumberEl = document.getElementById('rotationNumber3D');
function refreshRotationDisplay() {
  serverZoneEl.textContent = rotationState.roleInZone(1);
  rotationNumberEl.textContent = `R${rotationState.rotationNumber}`;
}
refreshRotationDisplay();

// Mirrors main.js's runOverlapCheck list rendering (one row per on-court
// player, clockwise from zone 1).
function renderOverlapResultsList(results, positions) {
  const summary = summarizeByPlayer(results, positions);
  overlapResultsEl.innerHTML = '';
  const violationCount = summary.filter((entry) => !entry.ok).length;
  overlapResultsSummaryEl.textContent = violationCount === 0
    ? 'Overlap Results — all legal'
    : `Overlap Results — ${violationCount} violation${violationCount === 1 ? '' : 's'}`;

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
  }
}

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

  if (selectedZone && guidesEnabled) {
    for (const result of results) {
      if (result.ok && (result.zoneA === selectedZone || result.zoneB === selectedZone)) {
        const anchor = boundaryAnchor(positions, result.zoneA, result.zoneB, result.axis, selectedZone);
        addFatLine(boundaryLinePoints(result.axis, anchor), guideColor, { dashed: true, linewidth: lineSettings.guideLineWidth });
        const neighborZone = result.zoneA === selectedZone ? result.zoneB : result.zoneA;
        relatedZones.add(neighborZone);
      }
    }
  }

  if (selectedZone && linksEnabled) {
    for (const result of results) {
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

  renderOverlapResultsList(results, positions);

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

// "Show Overlap Guides" / "Show Player Links" (Phase 2.10) - independent
// toggles matching 2D, instead of always drawing both together whenever a
// puck is selected. Selecting a puck itself is independent of these (see
// `endDrag`/the `dblclick` handler below) - selection also drives the
// glow highlight (2.11), which is useful even with neither toggle on, so
// these toggles only gate whether guide/link LINES get drawn for
// whatever's currently selected.
const guideToggleBtn = document.getElementById('overlapGuideToggle3D');
const linkToggleBtn = document.getElementById('playerLinkToggle3D');
guideToggleBtn.addEventListener('click', () => {
  guidesEnabled = !guidesEnabled;
  guideToggleBtn.classList.toggle('active', guidesEnabled);
  refreshOverlayLines();
});
linkToggleBtn.addEventListener('click', () => {
  linksEnabled = !linksEnabled;
  linkToggleBtn.classList.toggle('active', linksEnabled);
  refreshOverlayLines();
});

// Bench Side (Phase 2.10) - surfaces the setup.html-only setting
// (benchSideSettings.js) directly in the 3D panel too, applying and
// persisting it immediately instead of only taking effect on next load:
// moves the bench plane and snaps whichever puck is currently benched
// (userData.zone === null) to the new side.
const benchSideLeftBtn = document.getElementById('benchSideLeft3D');
const benchSideRightBtn = document.getElementById('benchSideRight3D');
function refreshBenchSideButtons() {
  benchSideLeftBtn.classList.toggle('active', benchSide === 'left');
  benchSideRightBtn.classList.toggle('active', benchSide === 'right');
}
function setBenchSide(side) {
  if (side === benchSide) {
    return;
  }
  benchSide = side;
  saveBenchSide3D(side);
  benchX = benchSide === 'left' ? -BENCH_WIDTH / 2 : COURT_SIZE + BENCH_WIDTH / 2;
  bench.position.x = benchX;
  const benchedGroup = draggablePlayers.find((group) => group.userData.zone === null);
  if (benchedGroup) {
    benchedGroup.position.x = benchX;
    benchedGroup.position.z = COURT_SIZE / 2;
    benchedGroup.userData.fill.material.color.set(benchedGroup.userData.baseFillColor);
  }
  refreshBenchSideButtons();
  refreshOverlayLines();
}
benchSideLeftBtn.addEventListener('click', () => setBenchSide('left'));
benchSideRightBtn.addEventListener('click', () => setBenchSide('right'));
refreshBenchSideButtons();

// Floating control panel is draggable via its handle (Phase 2.10) - a
// plain DOM pointer drag, unrelated to the puck-drag/OrbitControls
// coordination above since it never touches the WebGL canvas.
const controlPanel = document.getElementById('controlPanel3D');
const controlPanelHandle = controlPanel.querySelector('.floating-panel-handle');
let panelDrag = null;
controlPanelHandle.addEventListener('pointerdown', (event) => {
  // Don't start a drag when the collapse button itself was pressed - it's
  // inside the handle (for a compact single-row layout) but has its own
  // click behavior.
  if (event.target.closest('.floating-panel-collapse-btn')) {
    return;
  }
  panelDrag = { startX: event.clientX, startY: event.clientY, originLeft: controlPanel.offsetLeft, originTop: controlPanel.offsetTop };
  controlPanel.style.right = 'auto';
  controlPanel.style.bottom = 'auto';
  controlPanelHandle.setPointerCapture(event.pointerId);
});
controlPanelHandle.addEventListener('pointermove', (event) => {
  if (!panelDrag) {
    return;
  }
  controlPanel.style.left = `${panelDrag.originLeft + (event.clientX - panelDrag.startX)}px`;
  controlPanel.style.top = `${panelDrag.originTop + (event.clientY - panelDrag.startY)}px`;
});
controlPanelHandle.addEventListener('pointerup', (event) => {
  panelDrag = null;
  controlPanelHandle.releasePointerCapture(event.pointerId);
});

// Collapse/minimize the whole panel down to just its handle bar, so it
// can be tucked out of the way without leaving the page.
const panelCollapseBtn = document.getElementById('panelCollapseToggle3D');
panelCollapseBtn.addEventListener('click', () => {
  const collapsed = controlPanel.classList.toggle('collapsed');
  panelCollapseBtn.title = collapsed ? 'Expand this panel' : 'Collapse this panel';
});

// Hard sanity clamp (always active, independent of the optional "Lock to
// Legal Positions" row/column clamp below) - keeps every puck within the
// actual modeled play area, so a fast/oblique drag can never fling it off
// the court into the open ground/void beyond it.
function clampToPlayArea(zone, x, z) {
  if (zone !== null) {
    return {
      x: THREE.MathUtils.clamp(x, 0, COURT_SIZE),
      z: THREE.MathUtils.clamp(z, 0, COURT_SIZE),
    };
  }
  // The benched Libero (or a future swapped-in role) can additionally
  // roam the bench strip on whichever side it's currently on.
  const minX = benchSide === 'left' ? -BENCH_WIDTH : 0;
  const maxX = benchSide === 'left' ? COURT_SIZE : COURT_SIZE + BENCH_WIDTH;
  return {
    x: THREE.MathUtils.clamp(x, minX, maxX),
    z: THREE.MathUtils.clamp(z, 0, COURT_SIZE),
  };
}

// Registered capture-phase so this runs BEFORE OrbitControls' own
// (bubble-phase) pointerdown listener on the same element - letting us
// disable orbiting for this gesture before OrbitControls sees it, so
// dragging a puck never also orbits the camera at the same time. Only the
// left/primary button selects/drags pucks - right-click is reserved for
// orbiting (see `controls.mouseButtons` above), so a right-click over a
// puck must fall through to OrbitControls instead of grabbing it.
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
  if (!hit) {
    return;
  }
  draggingGroup = hit.object.parent;
  pointerDownAt = { x: event.clientX, y: event.clientY };
  controls.enabled = false;
  renderer.domElement.setPointerCapture(event.pointerId);
  renderer.domElement.style.cursor = 'grabbing';
}, { capture: true });

// Right-click sets the orbit anchor for the gesture that follows (per
// user request: "right click on an object selects it for orbit; right
// click and hold on empty space orbits normally around court world
// space") - right-clicking a puck re-targets `controls.target` onto it,
// right-clicking empty space resets the target back to the default court
// center. This is completely independent of the left-click puck
// selection above (blue outline/glow/overlap preview) - purely a camera
// pivot choice, made fresh on every right-click. Registered capture-phase
// so the retarget lands before OrbitControls reads `controls.target` on
// the same gesture. Tweened (not instant) so re-anchoring doesn't cause a
// jarring jump - camera.position itself never moves, so this is a smooth
// re-aim, not a dolly.
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 2) {
    return;
  }
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
  const endTarget = hit ? hit.object.parent.position.clone() : DEFAULT_CONTROLS_TARGET.clone();
  flyCameraTo(camera.position.clone(), endTarget, 250);
}, { capture: true });

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!draggingGroup) {
    return;
  }
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
    clearClampLines();
    let { x, z } = clampToPlayArea(draggingGroup.userData.zone, dragPoint.x, dragPoint.z);
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
  // one case that toggles it back off instead. Selection works regardless
  // of the guide/link toggles, and never changes the current camera view
  // (right-click is what sets the orbit anchor - see the right-click
  // handler below) or while the selection is locked (2.10) - other pucks
  // can still be dragged, they just won't steal the selection.
  if (!selectionLocked) {
    const moved = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
    const wasTap = moved <= TAP_MOVE_THRESHOLD;
    selectedGroup = wasTap && selectedGroup === draggingGroup ? null : draggingGroup;
  }
  refreshOverlayLines();
  renderer.domElement.releasePointerCapture(event.pointerId);
  renderer.domElement.style.cursor = '';
  draggingGroup = null;
  controls.enabled = true;
}
renderer.domElement.addEventListener('pointerup', endDrag);
renderer.domElement.addEventListener('pointercancel', endDrag);

// Selection lock (Phase 2.10): double-clicking a puck locks the selection
// onto it (dragging/tapping other pucks no longer changes the selection,
// though they still move normally) - double-clicking the already-locked
// puck again unlocks it. Matches 2D's player.onDoubleClick behavior, minus
// the guide/link-toggle gate (see `endDrag` above - selection here is
// independent of those).
renderer.domElement.addEventListener('dblclick', (event) => {
  if (event.button !== 0) {
    return;
  }
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
  if (!hit) {
    return;
  }
  const group = hit.object.parent;
  if (selectionLocked && selectedGroup === group) {
    selectionLocked = false;
  } else {
    selectedGroup = group;
    selectionLocked = true;
  }
  refreshOverlayLines();
});

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

// Glow/pulse selection highlight (Phase 2.11) - the 3D analog of 2D's
// `.guide-selected`/`.locked` CSS drop-shadow glow, which has no direct
// equivalent for a WebGL material (no CSS filter/blur to reuse). Reuses
// the SAME `effectSettings.js` values 2D's setup.html panel edits (not a
// separate 3D-only setting - settings are independent of rendering
// mechanism, per Phase 0), reinterpreted as `MeshStandardMaterial`
// emissive-intensity units on the puck's outline mesh: a steady glow at
// `glowBlurRadius` while selected, pulsing up to `pulseMaxBlurRadius` and
// back down over `pulseDurationMs` while the selection is also locked
// (2.10). `/ 6` just rescales the CSS pixel-radius numbers (default 6px)
// onto a sensible ~1.0 default emissive-intensity baseline.
const effectSettings = getEffectSettings();
const glowIntensity = effectSettings.glowBlurRadius / 6;
const pulseMaxIntensity = effectSettings.pulseMaxBlurRadius / 6;

function updateSelectionGlow(nowMs) {
  for (const group of draggablePlayers) {
    const material = group.userData.outline.material;
    if (group !== selectedGroup) {
      if (material.emissiveIntensity !== 0) {
        material.emissiveIntensity = 0;
      }
      continue;
    }
    material.emissive.set(selectedOutline);
    if (selectionLocked) {
      // Same "ease-in-out, low at 0%/100%, peak at 50%" shape as the CSS
      // `lock-pulse` keyframe.
      const phase = (nowMs % effectSettings.pulseDurationMs) / effectSettings.pulseDurationMs;
      const t = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      material.emissiveIntensity = glowIntensity + (pulseMaxIntensity - glowIntensity) * t;
    } else {
      material.emissiveIntensity = glowIntensity;
    }
  }
}

function animate(nowMs) {
  requestAnimationFrame(animate);
  updateCameraTween(nowMs);
  controls.update();
  updateLabelScaling();
  updateSelectionGlow(nowMs);
  updateViewCubeOrientation();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate(0);

