// 3D analog of player.js's `Player` class - a duck-typed drop-in with the
// SAME public shape (`.role`, `.x`/`.y`, `.lastMoveDistance`,
// `setPosition`/`animateTo`, the `setX(bool)` highlight setters,
// `onClick`/`onDoubleClick`) so main.js can drive either renderer through
// identical code (see renderer.js/renderer3d.js's `createCourtPlayer`/
// `createBenchPlayer`). Backed by a Three.js puck (outline + fill
// cylinder) or - per the player-icon setting - a standing mannequin, plus
// a CSS2DObject text label, instead of an SVG `<g>`.
// Click/drag/raycasting itself is owned by renderer3d.js (which calls
// `_fireClick`/`_fireDoubleClick` here) - unlike 2D, a mesh has no native
// DOM click event to hook `onClick` onto directly.
// All icon meshes are added directly to `this.group` (not a nested
// sub-group) because renderer3d.js resolves a raycast hit to its player
// via `hit.object.parent.userData.player3d`.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { getPuckRadius } from './puckSizeSettings.js';
import { getPlayerIcon, getMannequinSpec } from './playerIconSettings.js';

// Mutable (not const) - see player.js's PLAYER_RADIUS for why/how this
// stays live across puck-size setting changes.
export let PLAYER_RADIUS_3D = getPuckRadius();
export const PUCK_HEIGHT = 20;

export function setPlayerRadius3D(radius) {
  PLAYER_RADIUS_3D = radius;
}

// The group's origin sits PUCK_HEIGHT / 2 above the floor (so a puck is
// centered on it); mannequin geometry is built relative to the floor.
const FLOOR_Y = -PUCK_HEIGHT / 2;
const UP = new THREE.Vector3(0, 1, 0);
const projectionScratch = new THREE.Vector3();

// Normalized-device Y (+1 top of screen) of `origin + local`.
function projectedNdcY(origin, local, camera) {
  return projectionScratch.copy(local).add(origin).project(camera).y;
}

// Tapered cylinder between two points.
function limb(from, to, radiusFrom, radiusTo, margin, material) {
  const axis = to.clone().sub(from);
  const length = axis.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTo + margin, radiusFrom + margin, length + margin * 2, 12),
    material,
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, axis.normalize());
  return mesh;
}

function ball(center, radius, margin, material, scale) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius + margin, 16, 12), material);
  mesh.position.copy(center);
  if (scale) {
    mesh.scale.copy(scale);
  }
  return mesh;
}

// Flat stadium-shaped sole matching the 2D footprint outline exactly,
// standing on the floor.
function sole(width, length, height, margin, material) {
  const w = width + margin * 2;
  const l = length + margin * 2;
  const r = w / 2;
  const straight = l / 2 - r;
  const shape = new THREE.Shape();
  shape.moveTo(-r, -straight);
  shape.lineTo(-r, straight);
  shape.absarc(0, straight, r, Math.PI, 0, true);
  shape.lineTo(r, -straight);
  shape.absarc(0, -straight, r, 0, Math.PI, true);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height + margin, bevelEnabled: false, curveSegments: 12 });
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

// Middle joint (knee/elbow) of a two-segment limb reaching from `start` to
// `end`, bending toward `bendDirection`.
function jointBetween(start, end, lengthA, lengthB, bendDirection) {
  const toEnd = end.clone().sub(start);
  const reach = Math.min(toEnd.length(), (lengthA + lengthB) * 0.999);
  const direction = toEnd.normalize();
  const along = (lengthA * lengthA - lengthB * lengthB + reach * reach) / (2 * reach);
  const bend = Math.sqrt(Math.max(lengthA * lengthA - along * along, 0));
  const perpendicular = bendDirection.clone().sub(direction.clone().multiplyScalar(bendDirection.dot(direction))).normalize();
  return start.clone().add(direction.multiplyScalar(along)).add(perpendicular.multiplyScalar(bend));
}

// A simple-primitive mannequin in a relaxed athletic stance: knees
// slightly bent, slight forward lean, hands held in front, feet just
// narrower than the shoulders with the right foot staggered ahead of the
// left (see playerIconSettings.js's getMannequinSpec), facing -z (the
// net). `margin` inflates every part - used for the selection glow shells.
export function buildMannequinMeshes(spec, margin, bodyMaterial, shoeMaterial) {
  const H = spec.height;
  const P = (x, y, z) => new THREE.Vector3(x, FLOOR_Y + y, z);
  const meshes = [];
  const shoeHeight = H * 0.034;
  const hipY = H * 0.5;
  const hipHalfWidth = H * 0.055;
  const legSegment = (H * 0.53 - shoeHeight) / 2;
  const forward = new THREE.Vector3(0, 0, -1);

  for (const side of [-1, 1]) {
    const footX = (side * spec.footSpacing) / 2;
    const footZ = (-side * spec.stagger) / 2;
    const shoe = sole(spec.footWidth, spec.footLength, shoeHeight, margin, shoeMaterial);
    shoe.position.set(footX, FLOOR_Y, footZ);
    meshes.push(shoe);

    const ankle = P(footX, shoeHeight * 0.9, footZ + spec.footLength * 0.1);
    const hip = P(side * hipHalfWidth, hipY, 0);
    const knee = jointBetween(ankle, hip, legSegment, legSegment, forward);
    meshes.push(limb(ankle, knee, H * 0.027, H * 0.034, margin, bodyMaterial));
    meshes.push(limb(knee, hip, H * 0.034, H * 0.046, margin, bodyMaterial));
    meshes.push(ball(knee, H * 0.034, margin, bodyMaterial));
    meshes.push(ball(hip, H * 0.046, margin, bodyMaterial));
  }

  const lean = (10 * Math.PI) / 180;
  const torsoDirection = new THREE.Vector3(0, Math.cos(lean), -Math.sin(lean));
  const hipCenter = P(0, hipY + H * 0.01, 0);
  const shoulderCenter = hipCenter.clone().add(torsoDirection.clone().multiplyScalar(H * 0.31));
  const torso = limb(hipCenter, shoulderCenter, H * 0.085, H * 0.11, margin, bodyMaterial);
  torso.scale.z = 0.62;
  meshes.push(torso);

  const headCenter = shoulderCenter.clone().add(torsoDirection.clone().multiplyScalar(H * 0.115));
  meshes.push(limb(shoulderCenter, headCenter, H * 0.035, H * 0.035, margin, bodyMaterial));
  meshes.push(ball(headCenter, H * 0.062, margin, bodyMaterial, new THREE.Vector3(1, 1.15, 1.05)));

  for (const side of [-1, 1]) {
    const shoulder = shoulderCenter.clone().add(new THREE.Vector3(side * H * 0.125, -H * 0.012, 0));
    const hand = P(side * H * 0.16, H * 0.56, -H * 0.17);
    const elbow = jointBetween(shoulder, hand, H * 0.17, H * 0.15, new THREE.Vector3(0, -0.25, 1));
    meshes.push(ball(shoulder, H * 0.04, margin, bodyMaterial));
    meshes.push(limb(shoulder, elbow, H * 0.03, H * 0.025, margin, bodyMaterial));
    meshes.push(limb(elbow, hand, H * 0.025, H * 0.02, margin, bodyMaterial));
    meshes.push(ball(elbow, H * 0.025, margin, bodyMaterial));
    meshes.push(ball(hand, H * 0.028, margin, bodyMaterial));
  }
  return meshes;
}

export class Player3D {
  constructor(scene, raycastTargets, role, label, x, y, onDragEnd, onDragMove, colors, fontSettings) {
    this.role = role;
    this.onDragEnd = onDragEnd;
    this.onDragMove = onDragMove;
    // Set by renderer3d.js's moveToCourt/moveToBench - governs which drag
    // clamp range applies (own court half vs. bench strip) and whether
    // the "already 7 on court" bench-warning check runs.
    this.isBenched = false;
    // Set by renderer3d.js after each drag release, mirroring how a real
    // DOM pointerup's client-coordinate delta is measured in player.js.
    this.lastMoveDistance = 0;
    this._colors = colors;
    this._clickHandler = null;
    this._dblClickHandler = null;
    this._overlapping = false;
    this._backRow = false;
    this._benchWarning = false;
    this._selectable = false;
    this._guideRelated = false;
    this._guideSelected = false;
    this._locked = false;
    this._labelScale = null;
    this._labelOffsetPx = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, PUCK_HEIGHT / 2, y);
    this.group.userData.player3d = this;

    this.baseFillColor = role === 'L' ? colors.liberoFill : colors.playerFill;

    const labelDiv = document.createElement('div');
    labelDiv.style.transformOrigin = 'center';
    // Wraps both label lines - only styled/transformed in mannequin mode
    // (see _applyLabelMode), where the label hovers above the head.
    this.labelWrapEl = document.createElement('div');
    this.labelTextEl = document.createElement('div');
    this.labelTextEl.textContent = label;
    this.labelTextEl.style.color = colors.playerOutline;
    this.labelTextEl.style.fontFamily = fontSettings.fontFamily;
    this.labelTextEl.style.fontSize = `calc(${fontSettings.playerLabelSize}px * var(--puck-size-scale, 1))`;
    this.labelTextEl.style.fontWeight = 'bold';
    this.labelTextEl.style.textAlign = 'center';
    this.labelTextEl.style.userSelect = 'none';
    this.labelWrapEl.appendChild(this.labelTextEl);
    // Second, smaller line showing this player's current zone (ROADMAP
    // 3.7) - hidden by default, only shown while the toggle is on and
    // never for the benched player (see main.js's runOverlapCheck).
    this.zoneLabelEl = document.createElement('div');
    this.zoneLabelEl.style.color = colors.playerOutline;
    this.zoneLabelEl.style.fontFamily = fontSettings.fontFamily;
    this.zoneLabelEl.style.fontSize = `calc(${fontSettings.playerLabelSize * 0.55}px * var(--puck-size-scale, 1))`;
    this.zoneLabelEl.style.textAlign = 'center';
    this.zoneLabelEl.style.userSelect = 'none';
    this.zoneLabelEl.style.display = 'none';
    this.labelWrapEl.appendChild(this.zoneLabelEl);
    labelDiv.appendChild(this.labelWrapEl);
    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(0, 0, 0);
    this.group.add(labelObject);
    this.labelObject = labelObject;

    this._iconObjects = [];
    this._iconMaterials = [];
    this._hull = null;
    this._buildIcon();

    scene.add(this.group);
    raycastTargets.push(this.group);

    this._refreshVisual();
  }

  get x() {
    return this.group.position.x;
  }

  get y() {
    return this.group.position.z;
  }

  setPosition(x, y) {
    this.group.position.x = x;
    this.group.position.z = y;
  }

  // Re-labels this puck (Phase 2.13 - jersey-number customization edited
  // on setup.html), matching player.js not having a public "setLabel" but
  // main.js instead recreating players on label changes - here it's cheap
  // enough to just support directly.
  setLabel(label) {
    this.labelTextEl.textContent = label;
  }

  _clearIcon() {
    for (const object of this._iconObjects) {
      this.group.remove(object);
      object.geometry.dispose();
    }
    this._iconMaterials.forEach((material) => material.dispose());
    this._iconObjects = [];
    this._iconMaterials = [];
    if (this._hull) {
      this.group.remove(this._hull.group);
      this._hull.meshes.forEach((mesh) => mesh.geometry.dispose());
      this._hull.materials.forEach((material) => material.dispose());
      this._hull = null;
    }
  }

  _addIconObject(object) {
    this.group.add(object);
    this._iconObjects.push(object);
  }

  // Builds the puck or mannequin for the current icon-style/size
  // settings (puckSizeSettings.js / playerIconSettings.js).
  _buildIcon() {
    this._clearIcon();
    this._mannequin = getPlayerIcon() === 'mannequin';

    if (this._mannequin) {
      const spec = getMannequinSpec();
      this._spec = spec;
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.baseFillColor });
      const shoeMaterial = new THREE.MeshStandardMaterial({ color: this._colors.playerOutline });
      this._iconMaterials.push(bodyMaterial, shoeMaterial);
      this._fillMaterial = bodyMaterial;
      buildMannequinMeshes(spec, 0, bodyMaterial, shoeMaterial).forEach((mesh) => this._addIconObject(mesh));

      // Invisible but raycastable box around the whole figure - thin
      // limbs alone are too fiddly to click/grab.
      const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
      this._iconMaterials.push(proxyMaterial);
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(spec.height * 0.32, spec.height, spec.height * 0.28), proxyMaterial);
      proxy.position.y = FLOOR_Y + spec.height / 2;
      this._addIconObject(proxy);

      // Points on the figure's outline (relative to the group origin) -
      // the label must clear the highest of these ON SCREEN, which
      // (unlike the head) are the feet when looking down from above.
      const headY = FLOOR_Y + spec.height * 0.93;
      const headReach = spec.height * 0.07;
      this._silhouetteSamples = [
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.Vector3((sx * spec.width) / 2, FLOOR_Y, (sz * spec.depth) / 2))),
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.Vector3(sx * headReach, headY, sz * headReach))),
        ...[-1, 1].map((side) => new THREE.Vector3(side * spec.height * 0.15, FLOOR_Y + spec.height * 0.82, -spec.height * 0.05)),
        ...[-1, 1].map((side) => new THREE.Vector3(side * spec.height * 0.17, FLOOR_Y + spec.height * 0.56, -spec.height * 0.17)),
      ];
      this._labelAnchorY = FLOOR_Y + spec.height + 6;
      this._labelAnchor = new THREE.Vector3(0, this._labelAnchorY, 0);
    } else {
      this.outline = new THREE.Mesh(
        new THREE.CylinderGeometry(PLAYER_RADIUS_3D + 4, PLAYER_RADIUS_3D + 4, PUCK_HEIGHT * 0.8, 32),
        new THREE.MeshStandardMaterial({ color: this._colors.playerOutline, emissive: 0x000000, emissiveIntensity: 0 }),
      );
      this.outline.position.y = -1;
      this.fill = new THREE.Mesh(
        new THREE.CylinderGeometry(PLAYER_RADIUS_3D, PLAYER_RADIUS_3D, PUCK_HEIGHT, 32),
        new THREE.MeshStandardMaterial({ color: this.baseFillColor }),
      );
      this._iconMaterials.push(this.outline.material, this.fill.material);
      this._fillMaterial = this.fill.material;
      this._addIconObject(this.outline);
      this._addIconObject(this.fill);
    }
    this._applyLabelMode();
  }

  // Lazily builds the two inflated back-face shells that form the
  // mannequin's selection/highlight glow (an inverted-hull outline) -
  // only players that actually get highlighted pay for the extra meshes.
  _ensureHull() {
    if (this._hull) {
      return this._hull;
    }
    const innerMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false });
    const outerMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false });
    const group = new THREE.Group();
    const meshes = [
      ...buildMannequinMeshes(this._spec, 2.5, innerMaterial, innerMaterial),
      ...buildMannequinMeshes(this._spec, 6, outerMaterial, outerMaterial),
    ];
    for (const mesh of meshes) {
      mesh.raycast = () => {};
      group.add(mesh);
    }
    this.group.add(group);
    this._hull = { group, meshes, inner: innerMaterial, outer: outerMaterial, materials: [innerMaterial, outerMaterial] };
    return this._hull;
  }

  // Re-applies the label's text/positioning styles for the current icon
  // style: a puck's label is centered on it; a mannequin's hovers above
  // the head, bottom-anchored, with a halo for contrast against the court.
  _applyLabelMode() {
    const wrap = this.labelWrapEl.style;
    const halo = this._mannequin ? '0 0 4px rgba(0, 0, 0, 0.85), 0 0 2px rgba(0, 0, 0, 0.85)' : '';
    this.labelTextEl.style.textShadow = halo;
    this.zoneLabelEl.style.textShadow = halo;
    wrap.position = this._mannequin ? 'absolute' : '';
    wrap.left = this._mannequin ? '0' : '';
    wrap.bottom = this._mannequin ? '0' : '';
    wrap.whiteSpace = this._mannequin ? 'nowrap' : '';
    wrap.transformOrigin = this._mannequin ? '50% 100%' : '';
    this._applyLabelTransform();
  }

  _applyLabelTransform() {
    const scale = this._labelScale;
    if (this._mannequin) {
      this.labelTextEl.style.transform = '';
      this.labelWrapEl.style.transform = `translate(-50%, ${-this._labelOffsetPx}px)${scale === null ? '' : ` scale(${scale})`}`;
    } else {
      this.labelWrapEl.style.transform = '';
      this.labelTextEl.style.transform = scale === null ? '' : `scale(${scale})`;
    }
  }

  // Rebuilds the icon for the current icon-style/size settings - called
  // on every existing player by main.js when either setting changes.
  refreshIcon() {
    this._buildIcon();
    this._refreshVisual();
  }

  // Mirrors Player (2D)'s setShowZone(zone|null) - see its comment.
  setShowZone(zone) {
    this.zoneLabelEl.style.display = zone === null ? 'none' : '';
    if (zone !== null) {
      this.zoneLabelEl.textContent = `(Z${zone})`;
    }
  }

  animateTo(x, y, duration = 500) {
    const startX = this.x;
    const startY = this.y;
    const startTime = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
        this.setPosition(startX + (x - startX) * eased, startY + (y - startY) * eased);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  onClick(handler) {
    this._clickHandler = handler;
  }

  onDoubleClick(handler) {
    this._dblClickHandler = handler;
  }

  // Called by renderer3d.js on every drag-release (tap or drag) over this
  // puck, and on every double-click - mirrors the 2D Player's native DOM
  // 'click'/'dblclick' events, which fire the same way regardless of tap
  // vs. drag (main.js's own handlers use `lastMoveDistance` to tell them
  // apart, identically for both renderers).
  _fireClick() {
    this._clickHandler?.();
  }

  _fireDoubleClick() {
    this._dblClickHandler?.();
  }

  setOverlapping(isOverlapping) {
    this._overlapping = isOverlapping;
    this._refreshVisual();
  }

  setBackRow(isBackRow) {
    this._backRow = isBackRow;
    this._refreshVisual();
  }

  setBenchWarning(isWarning) {
    this._benchWarning = isWarning;
    this._refreshVisual();
  }

  setSelectable(isSelectable) {
    this._selectable = isSelectable;
    this._refreshVisual();
  }

  setGuideSelected(isSelected) {
    this._guideSelected = isSelected;
    this._refreshVisual();
  }

  setSelectionLocked(isLocked) {
    this._locked = isLocked;
    this._refreshVisual();
  }

  setGuideRelated(isRelated) {
    this._guideRelated = isRelated;
    this._refreshVisual();
  }

  // Fill: violation/bench-warning (red) takes priority over the back-row
  // color, matching 2D's CSS cascade. Outline (a puck's rim, or a
  // mannequin's glow shell): guide-selected (blue) > guide-related
  // (black) > selectable (green) > default - same priority 2D's CSS
  // specificity/order produces in practice (the two flows are mutually
  // exclusive in this app anyway).
  _refreshVisual() {
    let fillColor = this.baseFillColor;
    if (this._backRow) {
      fillColor = this.role === 'L'
        // Darker than 2D's equivalent 80% mix - lighting already reads
        // flatter than a flat SVG fill.
        ? new THREE.Color(fillColor).multiplyScalar(0.65)
        : this._colors.playerFillBack;
    }
    if (this._overlapping || this._benchWarning) {
      fillColor = this._colors.violationFill;
    }
    this._fillMaterial.color.set(fillColor);

    let outlineColor = this._colors.playerOutline;
    if (this._selectable) {
      outlineColor = this._colors.selectableOutline;
    }
    if (this._guideRelated) {
      outlineColor = this._colors.guideRelatedOutline;
    }
    if (this._guideSelected) {
      outlineColor = this._locked ? this._colors.lockedOutline : this._colors.selectedOutline;
    }

    if (!this._mannequin) {
      this.outline.material.color.set(outlineColor);
      return;
    }
    const highlighted = this._selectable || this._guideRelated || this._guideSelected;
    if (highlighted) {
      const hull = this._ensureHull();
      hull.inner.color.set(outlineColor);
      hull.outer.color.set(outlineColor);
      hull.inner.opacity = this._guideSelected ? 0.8 : 0.9;
      hull.outer.opacity = this._guideSelected ? 0.3 : 0.25;
    }
    if (this._hull) {
      this._hull.group.visible = highlighted;
    }
  }

  // Puck selection glow (emissive rim), driven every frame by
  // renderer3d.js's animate loop. A mannequin's glow shells are steady and
  // fully handled in _refreshVisual.
  updateGlow(glowIntensity) {
    if (this._mannequin) {
      return;
    }
    const emissive = this.outline.material;
    if (!this._guideSelected) {
      if (emissive.emissiveIntensity !== 0) {
        emissive.emissiveIntensity = 0;
      }
      return;
    }
    emissive.emissive.set(this._locked ? this._colors.lockedOutline : this._colors.selectedOutline);
    emissive.emissiveIntensity = glowIntensity;
  }

  updateLabelScale(scale) {
    this._labelScale = scale;
    this._applyLabelTransform();
  }

  // Positions the label each frame (renderer3d.js passes the camera).
  // Puck: lifted above it by `lift` world units (ROADMAP 3.9) - ~0 at a
  // steep angle, more at a grazing one. Mannequin: anchored just above
  // the head, then pushed up the SCREEN (whatever the court orientation)
  // by exactly as much as it takes to clear the highest point of the
  // figure's projected outline - nothing in a side view (the head is
  // topmost), the full silhouette height looking straight down.
  updateLabelPlacement(lift, camera, viewportHeight) {
    if (!this._mannequin) {
      this.labelObject.position.y = lift;
      this._labelOffsetPx = 0;
      this._applyLabelTransform();
      return;
    }
    this.labelObject.position.y = this._labelAnchorY;
    const anchorNdcY = projectedNdcY(this.group.position, this._labelAnchor, camera);
    let topNdcY = anchorNdcY;
    for (const sample of this._silhouetteSamples) {
      topNdcY = Math.max(topNdcY, projectedNdcY(this.group.position, sample, camera));
    }
    this._labelOffsetPx = ((topNdcY - anchorNdcY) * viewportHeight) / 2 + 2;
    this._applyLabelTransform();
  }

  // Hides this label when a post/the net blocks the camera's line of
  // sight to it - see renderer3d.js's updateLabelOcclusion.
  setLabelOccluded(occluded) {
    this.labelObject.element.style.display = occluded ? 'none' : '';
  }

  dispose() {
    this._clearIcon();
  }
}
