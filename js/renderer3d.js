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
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COURT_SIZE, ATTACK_LINE_Y, BENCH_WIDTH, ZONE_POSITIONS } from './config.js';
import { getLineSettings } from './lineSettings.js';
import { getFontSettings } from './fontSettings.js';
import { getEffectSettings } from './effectSettings.js';
import { getBenchSide3D, saveBenchSide3D } from './benchSideSettings.js';
import { getLabelScaleMode3D, saveLabelScaleMode3D } from './labelScaleSettings.js';
import { getViewCubeSize3D, saveViewCubeSize3D } from './viewCubeSizeSettings.js';
import { getInvertPitch3D, saveInvertPitch3D } from './firstPersonSettings.js';
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
  const DEFAULT_FOV = camera.fov;
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
  // Whichever R1/R2 referee puck is currently hidden because the camera
  // flew to its viewpoint (see selectViewpoint below) - restored here,
  // at the top of every flyCameraTo call, so ANY other navigation action
  // (Home, a ViewCube click, a keyboard shortcut, Alt+click re-anchoring,
  // zoomExtents, or selecting a DIFFERENT viewpoint) automatically brings
  // it back rather than needing its own separate restore call.
  let hiddenViewpoint = null;
  function flyCameraTo(endPosition, endTarget, durationMs = 400, onComplete) {
    if (hiddenViewpoint) {
      hiddenViewpoint.group.visible = true;
      hiddenViewpoint.labelDiv.style.display = '';
      hiddenViewpoint = null;
    }
    exitFirstPersonMode();
    cameraTween = {
      startPosition: camera.position.clone(),
      endPosition: endPosition.clone(),
      startTarget: controls.target.clone(),
      endTarget: endTarget.clone(),
      startTime: performance.now(),
      durationMs,
      onComplete,
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
      const { onComplete } = cameraTween;
      cameraTween = null;
      onComplete?.();
    }
  }

  // First-person "look around" mode for a selected R1/R2 viewpoint
  // (ROADMAP 3.5 follow-up) - the camera POSITION stays fixed at the
  // referee's eyes; dragging rotates the look direction in place (like
  // turning your head) instead of orbiting around a distant target. Only
  // entered once `flyCameraTo`'s fly-in tween into the viewpoint finishes
  // (via its `onComplete` callback - see selectViewpoint below), so the
  // approach itself still uses the normal position+target tween.
  let firstPersonMode = false;
  const fpEyePosition = new THREE.Vector3();
  // Where this viewpoint's eyes started (before any WASD movement) -
  // `fpEyePosition` is clamped to a small radius around this, and R1's
  // side-to-side offset is measured from its X coordinate.
  const fpBasePosition = new THREE.Vector3();
  // R2 (floor referee) can walk around a bit in any direction; R1 (on a
  // fixed stand) can only shuffle side-to-side along the sideline - see
  // applyWasdMovement below.
  let fpCanWalk = false;
  let fpYaw = 0;
  let fpPitch = 0;
  let fpDragging = false;
  let fpLastPointer = null;
  // A more natural (less fisheye-distorted) angle than the default 50 -
  // still a bit wider to help take in more of the court from a fixed
  // vantage, without the pronounced edge-stretching much higher FOVs
  // (75-100+) cause. The eye position itself is also pulled back a bit
  // further from court center than the puck's own spot (see
  // FP_EYE_PULLBACK in selectViewpoint) to compensate for the narrower
  // angle and still frame the whole court.
  const FIRST_PERSON_FOV = 60;
  const FP_LOOK_SENSITIVITY = 0.005;
  const FP_MAX_PITCH = Math.PI * 0.49;
  const FP_WALK_SPEED = 120; // units/sec (~1.2 m/s, a slow walk)
  const FP_STRAFE_LIMIT = 100; // R1's side-to-side range
  const FP_WALK_LIMIT = 150; // R2's range in any direction
  const PAN_SPEED = 300; // units/sec for WASD panning outside first-person mode
  // Default (not inverted): dragging the mouse up pitches the view DOWN,
  // toward the court - per explicit user preference. `setInvertPitch3D`
  // (ROADMAP, quad-menu) flips this for players who prefer the opposite.
  let invertPitch = getInvertPitch3D();
  function setInvertPitch3D(invert) {
    invertPitch = invert;
    saveInvertPitch3D(invert);
  }

  function fpLookDirection() {
    return new THREE.Vector3(Math.sin(fpYaw) * Math.cos(fpPitch), Math.sin(fpPitch), Math.cos(fpYaw) * Math.cos(fpPitch));
  }
  function updateFirstPersonCamera() {
    camera.position.copy(fpEyePosition);
    camera.lookAt(fpEyePosition.clone().add(fpLookDirection()));
  }
  function enterFirstPersonMode(eyePosition, lookAt, canWalk) {
    firstPersonMode = true;
    fpEyePosition.copy(eyePosition);
    fpBasePosition.copy(eyePosition);
    fpCanWalk = canWalk;
    const direction = lookAt.clone().sub(eyePosition).normalize();
    fpPitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    fpYaw = Math.atan2(direction.x, direction.z);
    controls.enabled = false;
    camera.fov = FIRST_PERSON_FOV;
    camera.updateProjectionMatrix();
    updateFirstPersonCamera();
  }
  function exitFirstPersonMode() {
    if (!firstPersonMode) {
      return;
    }
    firstPersonMode = false;
    fpDragging = false;
    controls.enabled = true;
    camera.fov = DEFAULT_FOV;
    camera.updateProjectionMatrix();
  }
  // Look-around dragging itself is folded into onPointerDownLeft below
  // (it only engages as the LOWEST priority, after puck-drag and
  // viewpoint-click both miss) - so players/other viewpoints stay
  // clickable even while locked onto R1/R2, matching normal-mode
  // priority instead of a separate always-wins handler.
  function onFirstPersonPointerMove(event) {
    if (!fpDragging) {
      return;
    }
    const dx = event.clientX - fpLastPointer.x;
    const dy = event.clientY - fpLastPointer.y;
    fpLastPointer = { x: event.clientX, y: event.clientY };
    fpYaw -= dx * FP_LOOK_SENSITIVITY;
    const pitchDelta = dy * FP_LOOK_SENSITIVITY * (invertPitch ? -1 : 1);
    fpPitch = THREE.MathUtils.clamp(fpPitch + pitchDelta, -FP_MAX_PITCH, FP_MAX_PITCH);
    updateFirstPersonCamera();
  }
  function onFirstPersonPointerUp(event) {
    if (!fpDragging) {
      return;
    }
    fpDragging = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
  renderer.domElement.addEventListener('pointermove', onFirstPersonPointerMove);
  renderer.domElement.addEventListener('pointerup', onFirstPersonPointerUp);
  renderer.domElement.addEventListener('pointercancel', onFirstPersonPointerUp);

  // WASD movement - "walking around a bit" while locked onto R1/R2 (see
  // applyWasdMovement below), and a keyboard alternative to Shift+drag
  // panning the rest of the time. Held-key state, applied continuously
  // in the animate() loop (not a one-shot per keydown) so movement is
  // smooth and framerate-independent via `dt`.
  const wasdKeys = { forward: false, backward: false, left: false, right: false };
  function onWasdKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const focusedTag = document.activeElement?.tagName;
    if (focusedTag === 'INPUT' || focusedTag === 'TEXTAREA') {
      return;
    }
    switch (event.key.toLowerCase()) {
      case 'w':
        wasdKeys.forward = true;
        break;
      case 's':
        wasdKeys.backward = true;
        break;
      case 'a':
        wasdKeys.left = true;
        break;
      case 'd':
        wasdKeys.right = true;
        break;
      default:
        return;
    }
    event.preventDefault();
  }
  function onWasdKeyup(event) {
    switch (event.key.toLowerCase()) {
      case 'w':
        wasdKeys.forward = false;
        break;
      case 's':
        wasdKeys.backward = false;
        break;
      case 'a':
        wasdKeys.left = false;
        break;
      case 'd':
        wasdKeys.right = false;
        break;
      default:
        return;
    }
  }
  window.addEventListener('keydown', onWasdKeydown);
  window.addEventListener('keyup', onWasdKeyup);

  // Applied every frame (see animate() below) while any WASD key is held.
  // In first-person mode this moves `fpEyePosition` itself - "forward"/
  // "right" are always relative to whichever way you're CURRENTLY facing
  // (`fpYaw`), exactly like WASD in an FPS (Quake etc.) rather than fixed
  // world axes - R1 (fixed stand) only allows the strafe (A/D) component,
  // never forward/back, but that strafe still turns with you as you look
  // around; R2 (floor referee) allows both, walking freely. Both are
  // clamped to a small radius around where you started. Outside first-
  // person mode, the same keys instead pan the normal orbit camera
  // (translating both `camera.position` and `controls.target` together,
  // relative to the camera's current horizontal facing) - an unbounded,
  // keyboard alternative to Shift+drag.
  function applyWasdMovement(dt) {
    let moveForward = 0;
    let moveRight = 0;
    if (wasdKeys.forward) {
      moveForward += 1;
    }
    if (wasdKeys.backward) {
      moveForward -= 1;
    }
    if (wasdKeys.left) {
      moveRight -= 1;
    }
    if (wasdKeys.right) {
      moveRight += 1;
    }
    if (moveForward === 0 && moveRight === 0) {
      return;
    }
    if (firstPersonMode) {
      const forward = new THREE.Vector3(Math.sin(fpYaw), 0, Math.cos(fpYaw));
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const delta = new THREE.Vector3().addScaledVector(forward, fpCanWalk ? moveForward : 0).addScaledVector(right, moveRight);
      if (delta.lengthSq() > 0) {
        delta.normalize().multiplyScalar(FP_WALK_SPEED * dt);
        fpEyePosition.add(delta);
        const offset = fpEyePosition.clone().sub(fpBasePosition);
        const limit = fpCanWalk ? FP_WALK_LIMIT : FP_STRAFE_LIMIT;
        if (offset.length() > limit) {
          fpEyePosition.copy(fpBasePosition).add(offset.setLength(limit));
        }
      }
      updateFirstPersonCamera();
      return;
    }
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() === 0) {
      forward.set(0, 0, -1);
    }
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const delta = new THREE.Vector3().addScaledVector(forward, moveForward).addScaledVector(right, moveRight);
    delta.normalize().multiplyScalar(PAN_SPEED * dt);
    camera.position.add(delta);
    controls.target.add(delta);
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
    wasdKeys.forward = false;
    wasdKeys.backward = false;
    wasdKeys.left = false;
    wasdKeys.right = false;
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
  // WebGL line width is capped at ~1px on most GPUs/browsers. This is the
  // court's actual painted center line marking (a real, distinct element
  // of a volleyball court in its own right) - kept as-is even after
  // adding the real vertical net mesh below, rather than replaced by it.
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT_SIZE + 80, 10),
    new THREE.MeshBasicMaterial({ color: cssColor('--line-colour', '#ffffff') }),
  );
  net.rotation.x = -Math.PI / 2;
  net.position.set(COURT_SIZE / 2, lineY, 0);
  scene.add(net);

  // Net posts (regulation 2.55m, 0.75m outside each sideline - FIVB Rule
  // 2.5.1's 0.5-1.0m range) + a real net (FIVB Rule 2.2/2.3/2.4): the net
  // itself is only 1m tall - NOT ground-to-top - with its top edge at
  // 2.43m, so its bottom edge floats at 1.43m (previously this mesh
  // wrongly extended all the way down near the ground). 10cm black
  // square mesh between a 7cm top band and a 5cm bottom band (both white
  // canvas), plus a white side band directly above each sideline and a
  // striped antenna at each side band's outer edge extending 80cm above
  // the net.
  const NET_TOP = 243;
  const NET_TOTAL_HEIGHT = 100;
  const NET_BOTTOM = NET_TOP - NET_TOTAL_HEIGHT;
  const NET_TOP_BAND_HEIGHT = 7;
  const NET_BOTTOM_BAND_HEIGHT = 5;
  const NET_SPAN_WIDTH = 970; // ~9.7m, within the 9.5-10m spec
  const POST_MARGIN = 75;
  const POST_HEIGHT = 255;
  const postMaterial = new THREE.MeshStandardMaterial({ color: cssColor('--line-colour', '#ffffff') });
  // Solid meshes a label should be hidden behind if the camera's view of
  // its puck is actually blocked by one of these (posts, the net) - see
  // updateLabelOcclusion below. CSS2DObject labels otherwise always
  // render on top of the WebGL scene regardless of what's in front of
  // them (a separate DOM overlay, no shared depth test).
  const labelOccluders = [];
  function addNetPost(x) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, POST_HEIGHT, 16), postMaterial);
    post.position.set(x, POST_HEIGHT / 2, 0);
    scene.add(post);
    labelOccluders.push(post);
  }
  addNetPost(-POST_MARGIN);
  addNetPost(COURT_SIZE + POST_MARGIN);

  // A small canvas-drawn square (10cm cells, black cord) repeated across
  // the net's mesh section via texture wrapping.
  function createNetMeshTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    const meshHeight = NET_TOTAL_HEIGHT - NET_TOP_BAND_HEIGHT - NET_BOTTOM_BAND_HEIGHT;
    texture.repeat.set(NET_SPAN_WIDTH / 10, meshHeight / 10);
    return texture;
  }
  const netMeshTexture = createNetMeshTexture();
  const netBandMaterial = new THREE.MeshBasicMaterial({ color: cssColor('--line-colour', '#ffffff'), side: THREE.DoubleSide });
  function addNetBand(y, height) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(NET_SPAN_WIDTH, height), netBandMaterial);
    band.position.set(COURT_SIZE / 2, y, 0);
    scene.add(band);
  }
  addNetBand(NET_TOP - NET_TOP_BAND_HEIGHT / 2, NET_TOP_BAND_HEIGHT);
  addNetBand(NET_BOTTOM + NET_BOTTOM_BAND_HEIGHT / 2, NET_BOTTOM_BAND_HEIGHT);
  const netMeshHeight = NET_TOTAL_HEIGHT - NET_TOP_BAND_HEIGHT - NET_BOTTOM_BAND_HEIGHT;
  const verticalNet = new THREE.Mesh(
    new THREE.PlaneGeometry(NET_SPAN_WIDTH, netMeshHeight),
    new THREE.MeshBasicMaterial({ map: netMeshTexture, transparent: true, side: THREE.DoubleSide }),
  );
  verticalNet.position.set(COURT_SIZE / 2, NET_BOTTOM + NET_BOTTOM_BAND_HEIGHT + netMeshHeight / 2, 0);
  scene.add(verticalNet);
  labelOccluders.push(verticalNet);

  // Side bands (5cm wide, directly above each sideline, spanning the
  // net's full height) + antennae (striped fiberglass rods at each side
  // band's outer edge, 1.8m long: from the net's bottom edge to 80cm
  // above its top edge).
  function addSideBand(x) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(5, NET_TOTAL_HEIGHT), netBandMaterial);
    band.position.set(x, NET_TOP - NET_TOTAL_HEIGHT / 2, 0);
    scene.add(band);
  }
  addSideBand(0);
  addSideBand(COURT_SIZE);

  const ANTENNA_LENGTH = 180;
  function createAntennaTexture() {
    const stripeCount = 18; // 10cm stripes over the 1.8m length
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = stripeCount;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#e74c3c' : '#ffffff';
      ctx.fillRect(0, i, canvas.width, 1);
    }
    return new THREE.CanvasTexture(canvas);
  }
  const antennaTexture = createAntennaTexture();
  function addAntenna(x) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, ANTENNA_LENGTH, 8),
      new THREE.MeshBasicMaterial({ map: antennaTexture }),
    );
    antenna.position.set(x, NET_BOTTOM + ANTENNA_LENGTH / 2, 0);
    scene.add(antenna);
  }
  addAntenna(0);
  addAntenna(COURT_SIZE);

  // The flexible cable (within the top band) and rope (within the bottom
  // band) that fasten the net to the posts and keep it taut (Rule 2.2) -
  // thin lines from each band's outer edge to its post, at the same
  // height.
  const cableMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
  function addNetCable(x1, y, x2) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y, 0),
      new THREE.Vector3(x2, y, 0),
    ]);
    scene.add(new THREE.Line(geometry, cableMaterial));
  }
  const netLeftEdge = COURT_SIZE / 2 - NET_SPAN_WIDTH / 2;
  const netRightEdge = COURT_SIZE / 2 + NET_SPAN_WIDTH / 2;
  addNetCable(netLeftEdge, NET_TOP, -POST_MARGIN);
  addNetCable(netRightEdge, NET_TOP, COURT_SIZE + POST_MARGIN);
  addNetCable(netLeftEdge, NET_BOTTOM, -POST_MARGIN);
  addNetCable(netRightEdge, NET_BOTTOM, COURT_SIZE + POST_MARGIN);

  // Alt+left-clicking the net (see onPointerDownAlt below) only retargets
  // the orbit anchor here - no camera position jump, unlike selecting a
  // player or an R1/R2 viewpoint.
  const NET_ORBIT_ANCHOR = new THREE.Vector3(COURT_SIZE / 2, NET_TOP, 0);

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
    repositionReferees();
  }

  // R1 (stand referee, 3.2m) and R2 (floor referee, 1.8m) - selectable
  // camera viewpoints (see selectableViewpoints/onPointerDownLeft below),
  // not draggable like player pucks. Each stands 1.5m outside its own
  // net post: R2 outside the bench-side post, R1 outside the opposite
  // one - so both reposition via setBenchSide, like the bench itself.
  const REFEREE_OFFSET = 150;
  function createRefereePuck(label, height, radius, canWalk) {
    const group = new THREE.Group();
    const fill = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.5 }),
    );
    fill.position.y = height / 2;
    group.add(fill);
    const labelDiv = document.createElement('div');
    labelDiv.textContent = label;
    labelDiv.style.color = cssColor('--line-colour', '#ffffff');
    labelDiv.style.fontFamily = fontSettings.fontFamily;
    labelDiv.style.fontSize = `${fontSettings.playerLabelSize}px`;
    labelDiv.style.fontWeight = 'bold';
    labelDiv.style.textAlign = 'center';
    labelDiv.style.userSelect = 'none';
    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(0, height + 20, 0);
    group.add(labelObject);
    scene.add(group);
    // `eyeHeight` approximates where this referee's eyes would be (near
    // the top of the puck) - used by selectViewpoint below. `canWalk`
    // distinguishes R2 (walks freely) from R1 (fixed stand, side-to-side
    // only) - see applyWasdMovement. `labelDiv` is set/read directly
    // (not just `group.visible`) when hiding/showing this viewpoint -
    // CSS2DRenderer doesn't reliably skip an invisible ancestor's own
    // CSS2DObject children in every case, so the label could otherwise
    // stay visibly floating even once its puck is hidden. `labelHeight`
    // is the label's local Y offset, used by updateLabelOcclusion to
    // find its world position.
    return { group, eyeHeight: height - 20, canWalk, labelDiv, labelHeight: height + 20 };
  }
  const r1 = createRefereePuck('R1', 320, 40, false);
  const r2 = createRefereePuck('R2', 180, 35, true);
  const selectableViewpoints = [r1, r2];

  function repositionReferees() {
    const benchPostX = benchSide === 'left' ? 0 : COURT_SIZE;
    const oppositePostX = benchSide === 'left' ? COURT_SIZE : 0;
    const benchOutwardSign = benchSide === 'left' ? -1 : 1;
    r2.group.position.set(benchPostX + benchOutwardSign * REFEREE_OFFSET, 0, 0);
    r1.group.position.set(oppositePostX - benchOutwardSign * REFEREE_OFFSET, 0, 0);
  }
  repositionReferees();

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
  const rowLinkColor = cssColor('--row-link-line', '#7fe0ff');
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

  // Used by the "link all front row"/"link all back row" toggles - see
  // renderer.js's drawRowLinkLine for the shared rationale.
  function drawRowLinkLine(posA, posB, dashed) {
    const points = [new THREE.Vector3(posA.x, PUCK_HEIGHT / 2, posA.y), new THREE.Vector3(posB.x, PUCK_HEIGHT / 2, posB.y)];
    linkLines.push(addFatLine(points, rowLinkColor, { dashed, linewidth: lineSettings.linkLineWidth }));
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
  // Tracks an R1/R2 puck hit on pointerdown until pointerup confirms it
  // was a tap (not a drag - see endDrag) - mirrors draggingPlayer/
  // pointerDownAt above, but referees never actually move.
  let pendingViewpoint = null;
  const VIEWPOINT_CLICK_THRESHOLD = 5;
  // Tracks whichever puck was last Alt+left-clicked (the current orbit
  // anchor) purely so `zoomExtents` (Z key) can frame it - independent of
  // main.js's own left-click "selectedRole" concept.
  let selectedPlayer = null;

  // Flies the camera to eye height at an R1/R2 puck's position, looking
  // DOWN toward the court surface's center (not level at eye height) -
  // this natural downward tilt is what actually frames/centers the whole
  // court from an elevated, off-to-one-side position, matching how a
  // real elevated vantage point naturally looks - and hides that puck's
  // mesh (and label) for the duration - restored automatically by the
  // next flyCameraTo call (see its `hiddenViewpoint` handling above),
  // whatever triggers it. Once the fly-in tween finishes, first-person
  // look-around mode kicks in (see enterFirstPersonMode above). The
  // camera's actual eye position is pulled back a bit further along X
  // (the same direction the puck already sits outside its post) than
  // the puck's own (unmoved) spot - per user feedback, a lower FOV alone
  // would show less of the court from the exact same point, so stepping
  // the eye back compensates, giving a less "fisheye" look while still
  // framing the whole court. Z is left untouched (both R1 and R2 already
  // sit exactly at the net's z=0) - pulling back along a generic
  // "away-from-court-center" vector instead would drag Z toward the
  // opponent's mirrored half, which is what caused the first attempt at
  // this to look wrong.
  const FP_EYE_PULLBACK = 150;
  function selectViewpoint(viewpoint) {
    const pullbackX = viewpoint.group.position.x < COURT_SIZE / 2 ? -FP_EYE_PULLBACK : FP_EYE_PULLBACK;
    const eyePosition = new THREE.Vector3(viewpoint.group.position.x + pullbackX, viewpoint.eyeHeight, viewpoint.group.position.z);
    const lookAt = new THREE.Vector3(COURT_SIZE / 2, 0, COURT_SIZE / 2);
    flyCameraTo(eyePosition, lookAt, 500, () => enterFirstPersonMode(eyePosition, lookAt, viewpoint.canWalk));
    viewpoint.group.visible = false;
    viewpoint.labelDiv.style.display = 'none';
    hiddenViewpoint = viewpoint;
  }

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
  // Puck-drag and viewpoint-click both take priority over first-person
  // look-around (checked last, only if neither hit) - so players and the
  // other R1/R2 viewpoint stay clickable even while locked onto one.
  function onPointerDownLeft(event) {
    if (event.button !== 0 || altHeld || shiftHeld) {
      return;
    }
    updatePointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(draggablePlayers, true)[0];
    if (hit) {
      draggingPlayer = hit.object.parent.userData.player3d;
      pointerDownAt = { x: event.clientX, y: event.clientY };
      controls.enabled = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const viewpointHit = raycaster.intersectObjects(
      selectableViewpoints.filter((v) => v.group.visible).map((v) => v.group),
      true,
    )[0];
    if (viewpointHit) {
      pendingViewpoint = selectableViewpoints.find((v) => v.group === viewpointHit.object.parent);
      pointerDownAt = { x: event.clientX, y: event.clientY };
      return;
    }
    if (firstPersonMode) {
      fpDragging = true;
      fpLastPointer = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture(event.pointerId);
    }
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDownLeft, { capture: true });

  // Alt+left-click sets the orbit anchor for the gesture that follows:
  // Alt+clicking a puck re-targets `controls.target` onto it, Alt+
  // clicking the net retargets to a fixed net-height anchor at court
  // center (camera position unchanged - no fly/hide, unlike R1/R2), Alt+
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
    let endTarget;
    if (hit) {
      endTarget = hit.object.parent.position.clone();
    } else if (raycaster.intersectObject(verticalNet, true).length) {
      endTarget = NET_ORBIT_ANCHOR.clone();
    } else {
      endTarget = DEFAULT_CONTROLS_TARGET.clone();
    }
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
    if (draggingPlayer) {
      const player = draggingPlayer;
      player.lastMoveDistance = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
      player.onDragEnd?.(player);
      player._fireClick();
      renderer.domElement.releasePointerCapture(event.pointerId);
      renderer.domElement.style.cursor = '';
      draggingPlayer = null;
      controls.enabled = true;
      return;
    }
    if (pendingViewpoint) {
      const moveDistance = Math.hypot(event.clientX - pointerDownAt.x, event.clientY - pointerDownAt.y);
      if (moveDistance <= VIEWPOINT_CLICK_THRESHOLD) {
        selectViewpoint(pendingViewpoint);
      }
      pendingViewpoint = null;
    }
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

  // Lifts every player's label above its puck more as the camera's pitch
  // gets shallower/more grazing (ROADMAP 3.9) - ~0 extra at a top-down
  // angle (a zero offset already reads fine looking straight down), up to
  // `MAX_LABEL_LIFT` world units at a fully horizontal angle (the R1/R2
  // first-person viewpoints are the most extreme case this fixes).
  const MAX_LABEL_LIFT = 50;
  const cameraDirectionScratch = new THREE.Vector3();
  function updateLabelHeights() {
    camera.getWorldDirection(cameraDirectionScratch);
    const grazing = 1 - Math.abs(cameraDirectionScratch.y);
    const offsetY = grazing * MAX_LABEL_LIFT;
    for (const group of draggablePlayers) {
      group.userData.player3d.updateLabelHeight(offsetY);
    }
  }

  // CSS2DObject labels are a separate DOM overlay with no shared depth
  // test against the WebGL scene - a label whose puck is actually behind
  // a post/the net (from the camera's current position) would otherwise
  // always render on top, "showing through" it. Raycasts from the camera
  // to each label's world position and hides it if a post/net-mesh
  // occludes that line of sight first. Reasserted every frame - see the
  // reassert-after-labelRenderer.render() note near animate() below,
  // same reasoning as the R1/R2 hidden-viewpoint label fix (CSS2DRenderer
  // recomputes `style.display` itself on every render() call).
  const labelOcclusionRaycaster = new THREE.Raycaster();
  const labelWorldPosScratch = new THREE.Vector3();
  const occludedPlayers = [];
  const occludedViewpoints = [];
  function isOccluded(targetPosition) {
    const offset = targetPosition.clone().sub(camera.position);
    const distance = offset.length();
    if (distance < 1) {
      return false;
    }
    labelOcclusionRaycaster.set(camera.position, offset.normalize());
    labelOcclusionRaycaster.far = distance - 5;
    return labelOcclusionRaycaster.intersectObjects(labelOccluders, false).length > 0;
  }
  function updateLabelOcclusion() {
    occludedPlayers.length = 0;
    for (const group of draggablePlayers) {
      const player = group.userData.player3d;
      player.labelObject.getWorldPosition(labelWorldPosScratch);
      if (isOccluded(labelWorldPosScratch)) {
        occludedPlayers.push(player);
      }
    }
    occludedViewpoints.length = 0;
    for (const viewpoint of selectableViewpoints) {
      if (!viewpoint.group.visible) {
        continue;
      }
      labelWorldPosScratch.copy(viewpoint.group.position).setY(viewpoint.group.position.y + viewpoint.labelHeight);
      if (isOccluded(labelWorldPosScratch)) {
        occludedViewpoints.push(viewpoint);
      }
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
  let lastFrameMs = null;
  function animate(nowMs) {
    rafId = requestAnimationFrame(animate);
    const dt = lastFrameMs === null ? 0 : (nowMs - lastFrameMs) / 1000;
    lastFrameMs = nowMs;
    updateCameraTween(nowMs);
    applyWasdMovement(dt);
    if (firstPersonMode) {
      updateFirstPersonCamera();
    } else {
      controls.update();
    }
    updateLabelScaling();
    updateLabelHeights();
    updateLabelOcclusion();
    updateSelectionGlow(nowMs);
    updateViewCubeOrientation();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    // CSS2DRenderer recomputes each CSS2DObject's own `style.display`
    // (frustum-culling-based) on every render() call above, which can
    // override a hidden R1/R2 label's display back to visible once it's
    // back in view (e.g. looking up brings it back into frustum) -
    // reassert it every frame, after that render, so it stays hidden for
    // the entire time its viewpoint is the active one, and likewise for
    // any label updateLabelOcclusion just determined is behind a post/
    // the net this frame.
    if (hiddenViewpoint) {
      hiddenViewpoint.labelDiv.style.display = 'none';
    }
    for (const player of occludedPlayers) {
      player.setLabelOccluded(true);
    }
    for (const viewpoint of occludedViewpoints) {
      viewpoint.labelDiv.style.display = 'none';
    }
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
    window.removeEventListener('keydown', onWasdKeydown);
    window.removeEventListener('keyup', onWasdKeyup);
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
    netMeshTexture.dispose();
    antennaTexture.dispose();
  }

  return {
    benchPosition,
    benchPositionReplaced,
    setBenchSide,
    drawSeparatorLine,
    drawLinkLine,
    drawRowLinkLine,
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
    setInvertPitch3D,
    destroy,
  };
}
