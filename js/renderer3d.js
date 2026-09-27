// 3D rendering interface (Phase 2.13) - implements the SAME shape
// renderer.js exports (`createCourtRenderer`) so main.js can drive either
// renderer through identical code, per Phase 1.4's design intent. Wraps
// the Three.js scene/camera/OrbitControls/ViewCube built during Phase
// 2.1-2.12 into a factory function instead of a page-level side-effect
// script; the previously-standalone scene3d.html has been retired (see
// its redirect) now that this mounts directly inside index.html as the
// "3D View" mode.
//
// Unlike the earlier standalone scene3d.js, this module owns NO rotation/
// overlap/selection state of its own - main.js's existing (already
// renderer-agnostic) rotationState/liberoState/overlap-checking logic
// drives BOTH renderers identically. This renderer only creates/moves/
// labels pucks and draws whatever lines it's told to, exactly like
// renderer.js's SVG implementation - the 3D-only extras with no 2D
// equivalent (ViewCube navigation, camera controls, bench-side, glow/
// pulse, label distance-scaling) are still all here, just no longer
// entangled with app state.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COURT_SIZE, ATTACK_LINE_Y, BENCH_WIDTH, ZONE_POSITIONS } from './config.js';
import { getLineSettings } from './lineSettings.js';
import { getFontSettings } from './fontSettings.js';
import { getEffectSettings } from './effectSettings.js';
import { getBenchSide3D, saveBenchSide3D } from './benchSideSettings.js';
import { getLabelScaleMode3D, saveLabelScaleMode3D } from './labelScaleSettings.js';
import { getViewCubeSize3D, saveViewCubeSize3D } from './viewCubeSizeSettings.js';
import { Player3D, PLAYER_RADIUS_3D, PUCK_HEIGHT } from './player3d.js';

// Reads a customizable color (see colors.js/setup.html) so the 3D court
// matches whatever the user picked for the 2D one, instead of duplicating
// separate hardcoded defaults here.
function cssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// `mountEl` hosts the WebGL/label canvases and must be `position:
// relative` (its children - the canvases and the ViewCube - are
// positioned absolutely within it). `viewCubeWrapEl` is the ViewCube
// widget's container (a sibling overlay, also absolutely positioned
// within `mountEl` by index.html's CSS).
export function createCourtRenderer3D(mountEl, viewCubeWrapEl) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cssColor('--court-bg', '#189a94'));

  const camera = new THREE.PerspectiveCamera(50, mountEl.clientWidth / mountEl.clientHeight, 1, 4000);
  // Elevated behind the near end line, angled down at the court's center -
  // a typical broadcast-style volleyball camera position.
  camera.position.set(COURT_SIZE / 2, COURT_SIZE * 0.9, COURT_SIZE * 1.35);
  camera.lookAt(COURT_SIZE / 2, 0, COURT_SIZE / 2);

  // logarithmicDepthBuffer avoids z-fighting flicker (the ground plane's
  // teal bleeding through the court, especially at the grazing viewing
  // angles OrbitControls allows) - depth precision is otherwise spread
  // very unevenly across a 1-4000 near/far range.
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  mountEl.appendChild(renderer.domElement);

  // Camera controls (Phase 2.9) - orbit (drag) + tilt (also drag, via the
  // polar angle) + zoom (wheel) + pan (Shift+drag, see below), focused by
  // default on the court center; polar angle is capped just short of the
  // ground plane so the camera can't end up underneath the court looking
  // up through it.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(COURT_SIZE / 2, 0, COURT_SIZE / 2);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.minDistance = 200;
  controls.maxDistance = 3000;
  controls.maxPolarAngle = Math.PI * 0.49;
  // Left button is reserved for selecting/dragging pucks; holding Alt or
  // Shift temporarily turns left-drag into orbiting/panning instead
  // (Maya/Houdini convention - see the keydown/keyup listeners below,
  // which live-toggle `controls.mouseButtons.LEFT` between ROTATE/null -
  // OrbitControls itself picks rotate vs. pan per its own built-in Shift
  // handling, see that comment for why), so plain left-click never has a
  // camera side effect. Right-click is reserved for the quad-menu
  // (ROADMAP Phase 3.3) rather than orbiting.
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null };
  controls.update();

  // Default view (Phase 2.12's Home button/key), captured once before any
  // user interaction.
  const DEFAULT_CAMERA_POSITION = camera.position.clone();
  const DEFAULT_CONTROLS_TARGET = controls.target.clone();

  // Smoothly animates the camera position/orbit-target over `durationMs`
  // (Phase 2.12 - used by the ViewCube/keyboard shortcuts/Home button and
  // the Alt+click orbit-anchor below). Safe to drive every frame
  // alongside OrbitControls: `OrbitControls.update()` re-derives its
  // internal spherical state from the camera's CURRENT position relative
  // to `target` on every call rather than caching a stale one, so
  // directly tweening `camera.position`/`controls.target` here and
  // letting the existing `controls.update()` in `animate()` run
  // afterward "just works" with no desync.
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
    flyCameraTo(DEFAULT_CAMERA_POSITION, DEFAULT_CONTROLS_TARGET);
  }

  // Converts a preset view direction (e.g. "top-endline-right" = (1,1,1))
  // into a camera position at the current orbit distance from `target`,
  // clamped to the same polar-angle limits normal dragging respects (so
  // a near-ground-level direction snaps to the lowest angle the ground
  // plane still allows, rather than an unreachable literal underside
  // view - this is also why there's no "Bottom" preset at all, see the
  // ViewCube/keyboard-shortcut comments below).
  function directionToCameraPosition(direction, target, distance) {
    const spherical = new THREE.Spherical().setFromVector3(direction.clone().normalize());
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
    spherical.makeSafe();
    return target.clone().add(new THREE.Vector3().setFromSpherical(spherical).multiplyScalar(distance));
  }

  // Snaps to a preset view, orbiting around whichever point is currently
  // the active orbit target rather than resetting that choice.
  function snapToViewDirection(direction) {
    const target = controls.target.clone();
    const distance = camera.position.distanceTo(target);
    flyCameraTo(directionToCameraPosition(direction, target, distance), target);
  }

  // Frames either the whole court (nothing selected) or tightly frames
  // the selected puck, preserving the current viewing angle/direction and
  // only adjusting distance - matches 3ds Max's "Zoom Extents" (Z key).
  function zoomExtents() {
    const target = selectedPlayer ? new THREE.Vector3(selectedPlayer.x, PUCK_HEIGHT / 2, selectedPlayer.y) : DEFAULT_CONTROLS_TARGET.clone();
    const distance = THREE.MathUtils.clamp(
      selectedPlayer ? PLAYER_RADIUS_3D * 8 : COURT_SIZE * 1.3,
      controls.minDistance,
      controls.maxDistance,
    );
    const offset = camera.position.clone().sub(controls.target);
    const direction = offset.lengthSq() > 0 ? offset.normalize() : new THREE.Vector3(0, 1, 0);
    flyCameraTo(target.clone().add(direction.multiplyScalar(distance)), target);
  }

  // Accepts the same "x,y,z" string format as the ViewCube/view-menu
  // buttons' `data-view` attribute (or the literal string "home") - lets
  // callers outside this module (the quad-menu, ROADMAP Phase 3.3)
  // trigger a preset view without needing to import/construct a
  // THREE.Vector3 themselves.
  function snapToPresetView(dataView) {
    if (dataView === 'home') {
      resetToDefaultView();
      return;
    }
    snapToViewDirection(new THREE.Vector3(...dataView.split(',').map(Number)));
  }

  // The 26 ViewCube regions (6 faces + 12 edges + 8 corners), each a unit
  // direction from the target. The Z-axis faces are labeled ENDLINE/NET
  // rather than a generic Front/Back: which side of the net counts as
  // "front" is inherently ambiguous (it flips depending which team you
  // consider yourself on, and the net itself has no front/back at all) -
  // ENDLINE (our team's fixed back line) and NET (the fixed z=0 plane)
  // are unambiguous world landmarks that stay correct no matter what's
  // added later.
  const VIEW_CUBE_SIZE_PRESETS = {
    small: { sceneSize: 100, perspective: 500, half: 30, faceFontRem: 0.6, edgeHalf: 8, cornerHalf: 6 },
    medium: { sceneSize: 150, perspective: 750, half: 45, faceFontRem: 0.75, edgeHalf: 10, cornerHalf: 8 },
    large: { sceneSize: 200, perspective: 1000, half: 60, faceFontRem: 0.9, edgeHalf: 13, cornerHalf: 10 },
  };
  // Applies a size preset's CSS custom properties - called once below
  // with the saved size, and again by the live `setViewCubeSize` setter
  // (ROADMAP Phase 3.3's quad-menu) whenever the user changes it.
  function applyViewCubeSizePreset(size) {
    const preset = VIEW_CUBE_SIZE_PRESETS[size];
    viewCubeWrapEl.style.setProperty('--vc-scene-size', `${preset.sceneSize}px`);
    viewCubeWrapEl.style.setProperty('--vc-perspective', `${preset.perspective}px`);
    viewCubeWrapEl.style.setProperty('--vc-half', `${preset.half}px`);
    viewCubeWrapEl.style.setProperty('--vc-face-size', `${preset.half * 2}px`);
    viewCubeWrapEl.style.setProperty('--vc-face-font-size', `${preset.faceFontRem}rem`);
    viewCubeWrapEl.style.setProperty('--vc-edge-half', `${preset.edgeHalf}px`);
    viewCubeWrapEl.style.setProperty('--vc-edge-size', `${preset.edgeHalf * 2}px`);
    viewCubeWrapEl.style.setProperty('--vc-corner-half', `${preset.cornerHalf}px`);
    viewCubeWrapEl.style.setProperty('--vc-corner-size', `${preset.cornerHalf * 2}px`);
  }
  applyViewCubeSizePreset(getViewCubeSize3D());
  function setViewCubeSize(size) {
    saveViewCubeSize3D(size);
    applyViewCubeSizePreset(size);
  }

  const VIEW_CUBE_FACES = [
    { label: 'TOP', dir: [0, 1, 0], transform: 'rotateX(90deg) translateZ(var(--vc-half))' },
    { label: 'ENDLINE', dir: [0, 0, 1], transform: 'translateZ(var(--vc-half))' },
    { label: 'NET', dir: [0, 0, -1], transform: 'rotateY(180deg) translateZ(var(--vc-half))' },
    { label: 'LEFT', dir: [-1, 0, 0], transform: 'rotateY(-90deg) translateZ(var(--vc-half))' },
    { label: 'RIGHT', dir: [1, 0, 0], transform: 'rotateY(90deg) translateZ(var(--vc-half))' },
  ];
  // Edges: exactly one axis is zero. Corners: none are zero. Excludes any
  // direction with y=-1 (Bottom and its adjoining edges/corners) - the
  // camera's polar angle is clamped just short of the ground plane (see
  // `controls.maxPolarAngle` above), so a true underneath view is never
  // reachable; the upper-hemisphere faces/edges/corners already cover
  // every angle that's actually possible.
  const VIEW_CUBE_EDGES_AND_CORNERS = [];
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (y === -1) {
          continue;
        }
        const nonZeroCount = [x, y, z].filter((n) => n !== 0).length;
        if (nonZeroCount === 2 || nonZeroCount === 3) {
          VIEW_CUBE_EDGES_AND_CORNERS.push({ dir: [x, y, z], kind: nonZeroCount === 2 ? 'vc-edge' : 'vc-corner' });
        }
      }
    }
  }
  // Same 6-face recipe `VIEW_CUBE_FACES` uses above, just parameterized by
  // which CSS custom property holds the half-size - shared by the small
  // edge/corner "mini cube" hotspots (real 3D boxes, not flat 2D squares -
  // a flat marker rotates edge-on and nearly disappears when the cube is
  // viewed close to face-on from that side).
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

  const viewCubeEl = viewCubeWrapEl.querySelector('.view-cube');
  viewCubeEl.innerHTML = '';
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
    // CSS Y grows downward, so the vertical offset is negated to keep
    // "up" (dir y = +1, i.e. TOP) visually above center.
    hotspot.style.transform = `translate3d(calc(${x} * var(--vc-half)), calc(${-y} * var(--vc-half)), calc(${z} * var(--vc-half)))`;
    hotspot.dataset.dir = dir.join(',');
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
  // track the main camera's current orbit angle every frame.
  function updateViewCubeOrientation() {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    const azimuthDeg = THREE.MathUtils.radToDeg(spherical.theta);
    const polarDeg = THREE.MathUtils.radToDeg(spherical.phi);
    viewCubeEl.style.transform = `rotateX(${polarDeg - 90}deg) rotateY(${-azimuthDeg}deg)`;
  }

  const viewCubeHomeBtn = viewCubeWrapEl.querySelector('.view-cube-home');
  viewCubeHomeBtn.addEventListener('click', resetToDefaultView);

  // "V" view-picker menu - a simple list of all 6 faces plus Home/
  // Perspective, standing in for 3ds Max's popup view menu.
  const viewMenuEl = viewCubeWrapEl.querySelector('.view-menu');
  function setViewMenuOpen(open) {
    viewMenuEl.hidden = !open;
  }
  function onViewMenuClick(event) {
    const button = event.target.closest('button[data-view]');
    if (!button) {
      return;
    }
    snapToPresetView(button.dataset.view);
    setViewMenuOpen(false);
  }
  viewMenuEl.addEventListener('click', onViewMenuClick);
  function onDocumentClickForViewMenu(event) {
    if (!viewMenuEl.hidden && !event.target.closest('.view-cube-wrap')) {
      setViewMenuOpen(false);
    }
  }
  document.addEventListener('click', onDocumentClickForViewMenu);

  // Keyboard shortcuts, modeled on 3ds Max's view navigation: P/Home
  // (perspective/home), T/E/N/L/R (top/endline/net/left/right), V (view
  // picker menu), Z (zoom extents). No Bottom shortcut - the camera's
  // polar angle is clamped just short of the ground plane (see
  // `controls.maxPolarAngle` above), so a true underneath view is never
  // reachable. Ignored while a modifier key is held or a text input has
  // focus.
  function onKeydown(event) {
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
      case 'e':
        snapToViewDirection(new THREE.Vector3(0, 0, 1));
        break;
      case 'l':
        snapToViewDirection(new THREE.Vector3(-1, 0, 0));
        break;
      case 'n':
        snapToViewDirection(new THREE.Vector3(0, 0, -1));
        break;
      case 'r':
        snapToViewDirection(new THREE.Vector3(1, 0, 0));
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
  }
  window.addEventListener('keydown', onKeydown);

  // Holding Alt or Shift temporarily turns left-drag into orbiting/
  // panning (see the `controls.mouseButtons` comment above) - toggled
  // live rather than a fixed mapping so plain left-click keeps
  // selecting/dragging pucks the rest of the time. `onPointerDownLeft`
  // below checks both flags and no-ops while either is true, letting
  // OrbitControls own the drag entirely. The 'blur' listener guards
  // against a modifier getting "stuck" held if the user Alt/Shift-tabs
  // away mid-drag (no keyup ever fires in that case).
  //
  // Both modifiers map `LEFT` to the SAME `THREE.MOUSE.ROTATE` value -
  // not `PAN` for Shift, despite that being the intuitive-looking
  // choice. OrbitControls has its own built-in Shift handling baked into
  // `onMouseDown`: whenever `mouseButtons.LEFT` is `ROTATE`, a Shift-held
  // click automatically becomes a pan instead (and, confusingly, the
  // reverse also happens if `LEFT` is set to `PAN` directly - a
  // Shift-held click on a `PAN`-mapped button flips BACK to rotate).
  // Setting `LEFT` to `PAN` ourselves while Shift is down was exactly
  // backwards - it triggered that reverse flip, so Shift+drag rotated
  // instead of panning. Leaving `LEFT` as `ROTATE` for both modifiers and
  // letting OrbitControls' own `event.shiftKey` check pick rotate-vs-pan
  // is the correct/only way to get this behavior.
  let altHeld = false;
  let shiftHeld = false;
  function updateLeftButtonMapping() {
    controls.mouseButtons.LEFT = (altHeld || shiftHeld) ? THREE.MOUSE.ROTATE : null;
  }
  // No standard CSS cursor keyword is literally "rotate", so orbit
  // (Alt) uses 'all-scroll' (four-way arrows - the closest conventional
  // stand-in for free camera movement) while pan (Shift) uses 'grab',
  // upgraded to 'grabbing' for the duration of an actual pan drag (see
  // the pointerdown/up listeners below) - orbit has no equivalent
  // "actively dragging" cursor since there's no closed-fist-style
  // rotate icon in the standard set, so 'all-scroll' just stays as-is
  // for the whole gesture.
  function updateCursor() {
    renderer.domElement.style.cursor = shiftHeld ? 'grab' : altHeld ? 'all-scroll' : '';
  }
  function onModifierKeydown(event) {
    if (event.key === 'Alt') {
      altHeld = true;
    } else if (event.key === 'Shift') {
      shiftHeld = true;
    } else {
      return;
    }
    updateLeftButtonMapping();
    updateCursor();
  }
  function onModifierKeyup(event) {
    if (event.key === 'Alt') {
      altHeld = false;
    } else if (event.key === 'Shift') {
      shiftHeld = false;
    } else {
      return;
    }
    updateLeftButtonMapping();
    updateCursor();
  }
  function onWindowBlur() {
    altHeld = false;
    shiftHeld = false;
    panCursorActive = false;
    updateLeftButtonMapping();
    updateCursor();
  }
  window.addEventListener('keydown', onModifierKeydown);
  window.addEventListener('keyup', onModifierKeyup);
  window.addEventListener('blur', onWindowBlur);

  // Upgrades the pan cursor to 'grabbing' for the duration of an actual
  // Shift+left drag, reverting to whichever "ready" cursor (or none)
  // applies once released - mirrors the puck-drag cursor in
  // onPointerDownLeft/endDrag further down. Reasserted on every
  // pointermove (not just once on pointerdown) because browsers only
  // repaint the actual cursor glyph in response to pointer movement, so
  // a style change made at the instant of mousedown (before any drag
  // motion) can visually appear to not take effect until the pointer
  // moves.
  let panCursorActive = false;
  function onPointerDownForPanCursor(event) {
    if (event.button === 0 && shiftHeld) {
      panCursorActive = true;
      renderer.domElement.style.cursor = 'grabbing';
    }
  }
  function onPointerMoveForPanCursor() {
    if (panCursorActive) {
      renderer.domElement.style.cursor = 'grabbing';
    }
  }
  function onPointerUpForPanCursor() {
    panCursorActive = false;
    updateCursor();
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDownForPanCursor);
  renderer.domElement.addEventListener('pointermove', onPointerMoveForPanCursor);
  renderer.domElement.addEventListener('pointerup', onPointerUpForPanCursor);
  renderer.domElement.addEventListener('pointercancel', onPointerUpForPanCursor);

  // Billboarded (always-facing-camera) text labels (Phase 2.8) - a DOM
  // overlay positioned by each label's Object3D world transform. Sits on
  // top of the WebGL canvas but ignores pointer events, so it never
  // blocks the drag/click raycasting below.
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.inset = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  mountEl.appendChild(labelRenderer.domElement);
  const fontSettings = getFontSettings();

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(COURT_SIZE * 0.3, COURT_SIZE, COURT_SIZE * 0.2);
  scene.add(sun);

  // Court plane - a true full court (9m x 18m in real dimensions), unlike
  // the 2D renderer which only shows one team's half. The net sits at
  // z=0; OUR team's half (where ZONE_POSITIONS/players live) is
  // z:[0,COURT_SIZE]; the opponent's half mirrors it at z:[-COURT_SIZE,0]
  // and is purely visual.
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
  // avoid z-fighting. Both attack lines mirror around the net (z=0), 1/3
  // of a half-court's depth from it on each side.
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

  // Net line at z=0, a flat plane rather than another THREE.Line, since
  // WebGL line width is capped at ~1px on most GPUs/browsers.
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT_SIZE + 80, 10),
    new THREE.MeshBasicMaterial({ color: cssColor('--line-colour', '#ffffff') }),
  );
  net.rotation.x = -Math.PI / 2;
  net.position.set(COURT_SIZE / 2, lineY, 0);
  scene.add(net);

  // Bench/Libero substitution area - a tinted strip running the depth of
  // OUR half only, immediately beside it on whichever side the "Bench
  // Side" setting picks. Two distinct slots along its depth (near/far)
  // mirror 2D's BENCH_POSITION_CLASSIC/BENCH_POSITION_REPLACED_CLASSIC -
  // so the Libero and whichever role it replaced don't sit on top of
  // each other while both are benched-adjacent.
  let benchSide = getBenchSide3D();
  let benchX = benchSide === 'left' ? -BENCH_WIDTH / 2 : COURT_SIZE + BENCH_WIDTH / 2;
  const BENCH_SLOT_Z = COURT_SIZE * 0.35;
  const BENCH_REPLACED_SLOT_Z = COURT_SIZE * 0.65;
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

  function benchPosition() {
    return { x: benchX, y: BENCH_SLOT_Z };
  }
  function benchPositionReplaced() {
    return { x: benchX, y: BENCH_REPLACED_SLOT_Z };
  }
  // 3D-only extra (not part of the shared 2D-matching interface) - called
  // by main.js's Bench Side panel buttons only while 3D is the active
  // renderer. Repositions the bench mesh immediately; repositioning
  // whichever player is currently benched to the new `benchPosition()`/
  // `benchPositionReplaced()` is main.js's job.
  function setBenchSide(side) {
    benchSide = side;
    saveBenchSide3D(side);
    benchX = benchSide === 'left' ? -BENCH_WIDTH / 2 : COURT_SIZE + BENCH_WIDTH / 2;
    bench.position.x = benchX;
  }

  // Player pucks (Phase 2.13 - positions/labels/roles are now entirely
  // driven by main.js via createCourtPlayer/createBenchPlayer, not a
  // static placeholder layout).
  const draggablePlayers = []; // Player3D `.group` Object3Ds, for raycasting
  const colors = {
    playerFill: cssColor('--player-fill', '#efa581'),
    liberoFill: cssColor('--libero-fill', '#efa581'),
    playerOutline: cssColor('--player-outline', '#f5f5f5'),
    violationFill: cssColor('--player-overlap', '#e74c3c'),
    selectedOutline: cssColor('--guide-selected', '#3498db'),
    selectableOutline: cssColor('--player-selectable', '#22c55e'),
    // Matches the 2D renderer's `.guide-related` CSS rule - a hardcoded
    // black outline (not a customizable CSS var there either).
    guideRelatedOutline: '#000000',
  };

  function createCourtPlayer(role, label, x, y, onDragEnd, onDragMove) {
    return new Player3D(scene, draggablePlayers, role, label, x, y, onDragEnd, onDragMove, colors, fontSettings);
  }
  function createBenchPlayer(role, label, x, y, onDragEnd, onDragMove) {
    const player = createCourtPlayer(role, label, x, y, onDragEnd, onDragMove);
    player.isBenched = true;
    return player;
  }
  function moveToCourt(player) {
    player.isBenched = false;
  }
  function moveToBench(player) {
    player.isBenched = true;
  }

  // Guide/violation/link lines - reuses the "fat line" Line2/LineMaterial
  // addon technique (regular THREE.Line ignores `linewidth` on most GPUs/
  // browsers). `drawSeparatorLine`'s anchor logic is ported directly from
  // renderer.js's SVG version (same math, just a 3rd (z) coordinate along
  // for the ride where renderer.js has none).
  const linkColor = cssColor('--link-line', '#16a34a');
  const guideColor = cssColor('--guide-line', '#000000');
  const violationColor = cssColor('--player-overlap', '#e74c3c');
  const lineSettings = getLineSettings();
  const separatorLines = []; // violation (isViolation=true) AND guide (isViolation=false) lines share this - matches renderer.js's single violationLinesLayer
  const linkLines = [];
  const clampLines = [];

  function addFatLine(points, color, { dashed = false, linewidth = 8 } = {}) {
    const geometry = new LineGeometry();
    geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    const material = new LineMaterial({ color, linewidth, dashed, dashSize: 24, gapSize: 16, worldUnits: true });
    material.resolution.set(renderer.domElement.width, renderer.domElement.height);
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    scene.add(line);
    return line;
  }

  function disposeLines(list) {
    for (const line of list) {
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    list.length = 0;
  }

  function boundaryLinePoints(axis, anchor) {
    return axis === 'horizontal'
      ? [new THREE.Vector3(anchor, lineY, 0), new THREE.Vector3(anchor, lineY, COURT_SIZE)]
      : [new THREE.Vector3(0, lineY, anchor), new THREE.Vector3(COURT_SIZE, lineY, anchor)];
  }

  function drawSeparatorLine(posA, posB, zoneA, zoneB, axis, isViolation, selectedZone, target = 'violation') {
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
      anchorIsA = displacement(posA, zoneA) <= displacement(posB, zoneB);
    }
    const anchor = axis === 'horizontal'
      ? (anchorIsA ? posA.x - PLAYER_RADIUS_3D : posB.x + PLAYER_RADIUS_3D)
      : (anchorIsA ? posA.y - PLAYER_RADIUS_3D : posB.y + PLAYER_RADIUS_3D);
    const line = addFatLine(boundaryLinePoints(axis, anchor), isViolation ? violationColor : guideColor, {
      dashed: true,
      linewidth: isViolation ? lineSettings.violationLineWidth : lineSettings.guideLineWidth,
    });
    (target === 'clamp' ? clampLines : separatorLines).push(line);
  }

  function drawLinkLine(posA, posB, isBackRowTarget) {
    const points = [new THREE.Vector3(posA.x, PUCK_HEIGHT / 2, posA.y), new THREE.Vector3(posB.x, PUCK_HEIGHT / 2, posB.y)];
    linkLines.push(addFatLine(points, linkColor, { dashed: isBackRowTarget, linewidth: lineSettings.linkLineWidth }));
  }

  function clearViolationLines() {
    disposeLines(separatorLines);
  }
  function clearLinkLines() {
    disposeLines(linkLines);
  }
  function clearClampLines() {
    disposeLines(clampLines);
  }

  // Hard sanity clamp (always active, independent of the optional "Lock
  // to Legal Positions" rule-based clamp main.js applies on top) - keeps
  // every puck within the actual modeled play area, so a fast/oblique
  // drag can never fling it off the court into the open ground/void.
  function clampToPlayArea(isBenched, x, z) {
    if (!isBenched) {
      return {
        x: THREE.MathUtils.clamp(x, 0, COURT_SIZE),
        z: THREE.MathUtils.clamp(z, 0, COURT_SIZE),
      };
    }
    const minX = benchSide === 'left' ? -BENCH_WIDTH : 0;
    const maxX = benchSide === 'left' ? COURT_SIZE : COURT_SIZE + BENCH_WIDTH;
    return {
      x: THREE.MathUtils.clamp(x, minX, maxX),
      z: THREE.MathUtils.clamp(z, 0, COURT_SIZE),
    };
  }

  // Drag/selection via raycasting - unlike the earlier standalone
  // scene3d.js, this does NOT track its own "selected puck"/overlap state
  // at all: `_fireClick`/`_fireDoubleClick` (see player3d.js) invoke
  // whatever `onClick`/`onDoubleClick` handler main.js registered, which
  // is where all of that logic (identical to 2D) actually lives. The
  // only local state this renderer needs is which puck is currently the
  // orbit anchor (`selectedPlayer`, used solely for the Z/zoom-extents
  // shortcut - see below).
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(PUCK_HEIGHT / 2));
  const dragPoint = new THREE.Vector3();
  let draggingPlayer = null;
  let pointerDownAt = null;
  // Tracks whichever puck was last Alt+left-clicked (the current orbit
  // anchor) purely so `zoomExtents` (Z key) can frame it - independent of
  // main.js's own left-click "selectedRole" concept.
  let selectedPlayer = null;

  function updatePointerNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  renderer.domElement.style.touchAction = 'none';

  // Registered capture-phase so this runs BEFORE OrbitControls' own
  // (bubble-phase) pointerdown listener on the same element - letting us
  // disable orbiting for this gesture before OrbitControls sees it, so
  // dragging a puck never also orbits the camera at the same time. Only
  // the left/primary button selects/drags pucks, and only while neither
  // Alt nor Shift is held (Alt+left orbits, Shift+left pans instead).
  function onPointerDownLeft(event) {
    if (event.button !== 0 || altHeld || shiftHeld) {
      return;
    }
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
    if (!hit) {
      return;
    }
    draggingPlayer = hit.object.parent.userData.player3d;
    pointerDownAt = { x: event.clientX, y: event.clientY };
    controls.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDownLeft, { capture: true });

  // Alt+left-click sets the orbit anchor for the gesture that follows:
  // Alt+clicking a puck re-targets `controls.target` onto it, Alt+
  // clicking empty space resets the target back to the default court
  // center. Completely independent of plain left-click puck selection -
  // purely a camera pivot choice, made fresh on every Alt+click. Tweened
  // (not instant) so re-anchoring doesn't cause a jarring jump. Fires on
  // pointerdown (not click) so the drag that follows (OrbitControls, via
  // `controls.mouseButtons.LEFT` while Alt is held) already orbits around
  // the new anchor.
  function onPointerDownAlt(event) {
    if (event.button !== 0 || !altHeld) {
      return;
    }
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
    selectedPlayer = hit ? hit.object.parent.userData.player3d : null;
    const endTarget = hit ? hit.object.parent.position.clone() : DEFAULT_CONTROLS_TARGET.clone();
    flyCameraTo(camera.position.clone(), endTarget, 250);
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDownAlt, { capture: true });

  // Right-click is reserved for the quad-menu (ROADMAP Phase 3.3, not
  // built yet) rather than orbiting - suppress the native browser menu
  // now so it doesn't pop up in the meantime.
  let contextMenuHandler = null;
  function onContextMenuEvent(event) {
    event.preventDefault();
    contextMenuHandler?.(event);
  }
  renderer.domElement.addEventListener('contextmenu', onContextMenuEvent);
  function onContextMenu(handler) {
    contextMenuHandler = handler;
  }

  function onPointerMove(event) {
    if (!draggingPlayer) {
      return;
    }
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      const { x, z } = clampToPlayArea(draggingPlayer.isBenched, dragPoint.x, dragPoint.z);
      draggingPlayer.setPosition(x, z);
      draggingPlayer.onDragMove?.(draggingPlayer);
    }
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  // Mirrors player.js's native-DOM-event contract: `onDragEnd` and a
  // 'click'-equivalent (`_fireClick`) both fire on every release
  // regardless of tap vs. drag - main.js's own registered `onClick`
  // handler is what tells them apart, via `lastMoveDistance`, identically
  // for both renderers.
  function endDrag(event) {
    if (!draggingPlayer) {
      return;
    }
    const player = draggingPlayer;
    player.lastMoveDistance = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
    player.onDragEnd?.(player);
    player._fireClick();
    renderer.domElement.releasePointerCapture(event.pointerId);
    renderer.domElement.style.cursor = '';
    draggingPlayer = null;
    controls.enabled = true;
  }
  renderer.domElement.addEventListener('pointerup', endDrag);
  renderer.domElement.addEventListener('pointercancel', endDrag);

  function onDoubleClick(event) {
    if (event.button !== 0) {
      return;
    }
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
    hit?.object.parent.userData.player3d._fireDoubleClick();
  }
  renderer.domElement.addEventListener('dblclick', onDoubleClick);

  // "Click empty space to deselect" (mirrors renderer.js's
  // onBackgroundClick) - fires on a plain click that doesn't hit a puck.
  // A native 'click' only fires here for the left button (right-click
  // never produces one on a canvas), so no button check is needed.
  let backgroundClickHandler = null;
  function onCanvasClick(event) {
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
    if (!hit) {
      backgroundClickHandler?.(event);
    }
  }
  renderer.domElement.addEventListener('click', onCanvasClick);
  function onBackgroundClick(handler) {
    backgroundClickHandler = handler;
  }

  // Label distance scaling (setup.html's "3D View - Label Scaling"
  // setting, default "scale"): CSS2DObject text otherwise stays a fixed
  // screen size regardless of camera distance, unlike the pucks
  // themselves (which shrink/grow normally via perspective). `let` (not
  // `const`) so the quad-menu's live `setLabelScaleMode` setter can
  // change it without a full renderer rebuild.
  let labelScaleMode = getLabelScaleMode3D();
  function setLabelScaleMode(mode) {
    labelScaleMode = mode;
    saveLabelScaleMode3D(mode);
  }
  const labelScaleReferenceDistance = camera.position.distanceTo(new THREE.Vector3(COURT_SIZE / 2, PUCK_HEIGHT / 2, COURT_SIZE / 2));
  function updateLabelScaling() {
    for (const group of draggablePlayers) {
      const player = group.userData.player3d;
      if (labelScaleMode !== 'scale') {
        player.updateLabelScale(null);
        continue;
      }
      const distance = camera.position.distanceTo(group.position);
      const scale = Math.min(2.5, Math.max(0.4, labelScaleReferenceDistance / distance));
      player.updateLabelScale(scale);
    }
  }

  // Glow/pulse selection highlight (Phase 2.11) - reuses the same
  // effectSettings.js values 2D's setup.html panel edits, reinterpreted
  // as MeshStandardMaterial emissive-intensity units (no CSS filter/blur
  // equivalent for a WebGL material).
  const effectSettings = getEffectSettings();
  const glowIntensity = effectSettings.glowBlurRadius / 6;
  const pulseMaxIntensity = effectSettings.pulseMaxBlurRadius / 6;
  function updateSelectionGlow(nowMs) {
    for (const group of draggablePlayers) {
      group.userData.player3d.updateGlow(nowMs, glowIntensity, pulseMaxIntensity, effectSettings.pulseDurationMs);
    }
  }

  function onResize() {
    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    for (const list of [separatorLines, linkLines, clampLines]) {
      for (const line of list) {
        line.material.resolution.set(renderer.domElement.width, renderer.domElement.height);
      }
    }
  }
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(mountEl);

  let rafId = null;
  function animate(nowMs) {
    rafId = requestAnimationFrame(animate);
    updateCameraTween(nowMs);
    controls.update();
    updateLabelScaling();
    updateSelectionGlow(nowMs);
    updateViewCubeOrientation();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate(0);

  // Tears down this renderer instance - called by main.js when switching
  // back to 2D, so the WebGL context/animation loop/listeners don't leak
  // (main.js re-creates a fresh instance the next time 3D is selected).
  function destroy() {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keydown', onModifierKeydown);
    window.removeEventListener('keyup', onModifierKeyup);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('click', onDocumentClickForViewMenu);
    controls.dispose();
    renderer.domElement.remove();
    labelRenderer.domElement.remove();
    renderer.dispose();
    viewCubeEl.innerHTML = '';
    setViewMenuOpen(false);
    scene.traverse((object) => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material?.dispose();
      }
    });
  }

  return {
    benchPosition,
    benchPositionReplaced,
    setBenchSide,
    drawSeparatorLine,
    drawLinkLine,
    clearViolationLines,
    clearLinkLines,
    clearClampLines,
    createCourtPlayer,
    createBenchPlayer,
    moveToCourt,
    moveToBench,
    onBackgroundClick,
    onContextMenu,
    resetToDefaultView,
    snapToPresetView,
    zoomExtents,
    setViewCubeSize,
    setLabelScaleMode,
    destroy,
  };
}
