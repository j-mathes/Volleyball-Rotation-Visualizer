// Phase 2.1 — Three.js scene foundation: court plane, lighting, camera.
// Loaded via a CDN ES module URL (no bundler/build step, consistent with
// the rest of this project) from scene3d.html. Not yet wired into the 2D
// app's view-angle toggle - that's Phase 2.6, once enough of the 3D scene
// exists to be a real 4th `viewMode` option.
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { COURT_SIZE, ATTACK_LINE_Y, BENCH_WIDTH, ZONE_POSITIONS } from './config.js';
import { PLAYER_RADIUS } from './player.js';
import { applyColors } from './colors.js';
import { getBenchSide3D } from './benchSideSettings.js';

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

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(COURT_SIZE * 0.3, COURT_SIZE, COURT_SIZE * 0.2);
scene.add(sun);

// Court plane - Three.js's PlaneGeometry defaults to the XY plane, so it's
// rotated flat onto the XZ plane (Y is "up"). The 2D app's (x, y) maps to
// this plane's (x, z); reusing COURT_SIZE keeps both renderers' court
// footprints numerically identical.
const court = new THREE.Mesh(
  new THREE.PlaneGeometry(COURT_SIZE, COURT_SIZE),
  new THREE.MeshStandardMaterial({ color: cssColor('--court-fill', '#e2836b') }),
);
court.rotation.x = -Math.PI / 2;
court.position.set(COURT_SIZE / 2, 0, COURT_SIZE / 2);
scene.add(court);

// Ground extending past the court's edges, matching the 2D background.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(COURT_SIZE * 4, COURT_SIZE * 4),
  new THREE.MeshStandardMaterial({ color: cssColor('--court-bg', '#189a94') }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(COURT_SIZE / 2, -1, COURT_SIZE / 2);
scene.add(ground);

// Boundary, center, and attack lines, raised slightly above the court
// plane to avoid z-fighting - just enough static geometry to make the
// plane read as an actual court; the dynamic guide/violation/link lines
// come later (Phase 2.4).
const lineMaterial = new THREE.LineBasicMaterial({ color: cssColor('--line-colour', '#ffffff') });
const lineY = 0.5;
function addCourtLine(x1, z1, x2, z2) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x1, lineY, z1),
    new THREE.Vector3(x2, lineY, z2),
  ]);
  scene.add(new THREE.Line(geometry, lineMaterial));
}
addCourtLine(0, 0, COURT_SIZE, 0);
addCourtLine(0, COURT_SIZE, COURT_SIZE, COURT_SIZE);
addCourtLine(0, 0, 0, COURT_SIZE);
addCourtLine(COURT_SIZE, 0, COURT_SIZE, COURT_SIZE);
addCourtLine(0, COURT_SIZE / 2, COURT_SIZE, COURT_SIZE / 2); // center (net) line
addCourtLine(0, ATTACK_LINE_Y, COURT_SIZE, ATTACK_LINE_Y);
addCourtLine(0, COURT_SIZE - ATTACK_LINE_Y, COURT_SIZE, COURT_SIZE - ATTACK_LINE_Y);

// Bench/Libero substitution area - a tinted strip running the full length
// of the court, immediately beside it on whichever side the "3D Preview -
// Bench Side" setup.html setting picks (see benchSideSettings.js). Reuses
// the same customizable --bench-fill/--bench-fill-opacity as the 2D
// bench panel. No player/Libero occupies it yet - that's Phase 2.3.
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

// Each entry's `.parent` is the group raycasting/dragging moves as a unit,
// so the fill and outline meshes always stay aligned to each other.
const draggablePlayers = [];
function createPlayerPuck(x, z, fillColor) {
  const group = new THREE.Group();
  group.position.set(x, PUCK_HEIGHT / 2, z);

  const outline = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAYER_RADIUS + 4, PLAYER_RADIUS + 4, PUCK_HEIGHT * 0.8, 32),
    new THREE.MeshStandardMaterial({ color: playerOutline }),
  );
  outline.position.y = -1;
  group.add(outline);

  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PUCK_HEIGHT, 32),
    new THREE.MeshStandardMaterial({ color: fillColor }),
  );
  group.add(fill);

  scene.add(group);
  draggablePlayers.push(group);
  return group;
}

for (const pos of Object.values(ZONE_POSITIONS)) {
  createPlayerPuck(pos.x, pos.y, playerFill);
}
createPlayerPuck(benchX, COURT_SIZE / 2, liberoFill);

// Drag via raycasting: pointerdown hit-tests the player pucks; while
// dragging, pointermove re-casts against a fixed horizontal plane at the
// pucks' resting height to find where to move the grabbed one, regardless
// of which mesh (court/ground/bench) is actually under the cursor.
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(PUCK_HEIGHT / 2));
const dragPoint = new THREE.Vector3();
let draggingGroup = null;

function updatePointerNDC(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.style.touchAction = 'none';

renderer.domElement.addEventListener('pointerdown', (event) => {
  updatePointerNDC(event);
  raycaster.setFromCamera(pointerNDC, camera);
  const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
  if (!hit) {
    return;
  }
  draggingGroup = hit.object.parent;
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
    draggingGroup.position.x = dragPoint.x;
    draggingGroup.position.z = dragPoint.z;
  }
});

function endDrag(event) {
  if (!draggingGroup) {
    return;
  }
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
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
