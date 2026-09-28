// 3D analog of player.js's `Player` class - a duck-typed drop-in with the
// SAME public shape (`.role`, `.x`/`.y`, `.lastMoveDistance`,
// `setPosition`/`animateTo`, the `setX(bool)` highlight setters,
// `onClick`/`onDoubleClick`) so main.js can drive either renderer through
// identical code (see renderer.js/renderer3d.js's `createCourtPlayer`/
// `createBenchPlayer`). Backed by a Three.js puck (Group of an outline +
// fill cylinder + a CSS2DObject text label) instead of an SVG `<g>`.
// Click/drag/raycasting itself is owned by renderer3d.js (which calls
// `_fireClick`/`_fireDoubleClick` here) - unlike 2D, a mesh has no native
// DOM click event to hook `onClick` onto directly.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const PLAYER_RADIUS_3D = 45;
export const PUCK_HEIGHT = 20;

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

    this.group = new THREE.Group();
    this.group.position.set(x, PUCK_HEIGHT / 2, y);
    this.group.userData.player3d = this;

    this.baseFillColor = role === 'L' ? colors.liberoFill : colors.playerFill;

    this.outline = new THREE.Mesh(
      new THREE.CylinderGeometry(PLAYER_RADIUS_3D + 4, PLAYER_RADIUS_3D + 4, PUCK_HEIGHT * 0.8, 32),
      new THREE.MeshStandardMaterial({ color: colors.playerOutline, emissive: 0x000000, emissiveIntensity: 0 }),
    );
    this.outline.position.y = -1;
    this.group.add(this.outline);

    this.fill = new THREE.Mesh(
      new THREE.CylinderGeometry(PLAYER_RADIUS_3D, PLAYER_RADIUS_3D, PUCK_HEIGHT, 32),
      new THREE.MeshStandardMaterial({ color: this.baseFillColor }),
    );
    this.group.add(this.fill);

    const labelDiv = document.createElement('div');
    labelDiv.style.transformOrigin = 'center';
    this.labelTextEl = document.createElement('div');
    this.labelTextEl.textContent = label;
    this.labelTextEl.style.color = colors.playerOutline;
    this.labelTextEl.style.fontFamily = fontSettings.fontFamily;
    this.labelTextEl.style.fontSize = `${fontSettings.playerLabelSize}px`;
    this.labelTextEl.style.fontWeight = 'bold';
    this.labelTextEl.style.textAlign = 'center';
    this.labelTextEl.style.userSelect = 'none';
    labelDiv.appendChild(this.labelTextEl);
    // Second, smaller line showing this player's current zone (ROADMAP
    // 3.7) - hidden by default, only shown while the toggle is on and
    // never for the benched player (see main.js's runOverlapCheck).
    this.zoneLabelEl = document.createElement('div');
    this.zoneLabelEl.style.color = colors.playerOutline;
    this.zoneLabelEl.style.fontFamily = fontSettings.fontFamily;
    this.zoneLabelEl.style.fontSize = `${fontSettings.playerLabelSize * 0.55}px`;
    this.zoneLabelEl.style.textAlign = 'center';
    this.zoneLabelEl.style.userSelect = 'none';
    this.zoneLabelEl.style.display = 'none';
    labelDiv.appendChild(this.zoneLabelEl);
    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(0, 0, 0);
    this.group.add(labelObject);
    this.labelObject = labelObject;

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
  // darken, matching 2D's CSS cascade (`.overlapping`/`.bench-warning`
  // circle rules override `.back-row`'s, since they're both `fill` on the
  // same element and the browser applies the later rule). Outline:
  // guide-selected (blue) > guide-related (black) > selectable (green) >
  // default - same priority 2D's CSS specificity/order produces in
  // practice (the two flows are mutually exclusive in this app anyway).
  _refreshVisual() {
    let fillColor = this.baseFillColor;
    if (this._backRow) {
      // Darker than 2D's equivalent 80% mix (`.back-row circle` in
      // style.css) - a puck's lighting/shading already reads as "flatter"
      // than a flat SVG fill, so back-row needed a stronger darken here
      // to stand out by the same amount.
      fillColor = new THREE.Color(fillColor).multiplyScalar(0.65);
    }
    if (this._overlapping || this._benchWarning) {
      fillColor = this._colors.violationFill;
    }
    this.fill.material.color.set(fillColor);

    let outlineColor = this._colors.playerOutline;
    if (this._selectable) {
      outlineColor = this._colors.selectableOutline;
    }
    if (this._guideRelated) {
      outlineColor = this._colors.guideRelatedOutline;
    }
    if (this._guideSelected) {
      outlineColor = this._colors.selectedOutline;
    }
    this.outline.material.color.set(outlineColor);
  }

  // Emissive glow/pulse (Phase 2.11) - only meaningful while guide-
  // selected; driven every frame by renderer3d.js's animate loop rather
  // than from `_refreshVisual` since the pulse needs a continuously
  // advancing timestamp.
  updateGlow(nowMs, glowIntensity, pulseMaxIntensity, pulseDurationMs) {
    if (!this._guideSelected) {
      if (this.outline.material.emissiveIntensity !== 0) {
        this.outline.material.emissiveIntensity = 0;
      }
      return;
    }
    this.outline.material.emissive.set(this._colors.selectedOutline);
    if (this._locked) {
      const phase = (nowMs % pulseDurationMs) / pulseDurationMs;
      const t = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      this.outline.material.emissiveIntensity = glowIntensity + (pulseMaxIntensity - glowIntensity) * t;
    } else {
      this.outline.material.emissiveIntensity = glowIntensity;
    }
  }

  updateLabelScale(scale) {
    this.labelTextEl.style.transform = scale === null ? '' : `scale(${scale})`;
  }

  // Lifts the label above the puck by `offsetY` world units (ROADMAP
  // 3.9) - at a steep/top-down camera angle a label right at the puck's
  // own height already reads fine as "on it", but at a shallow/grazing
  // angle (e.g. the R1/R2 first-person viewpoints) that same zero offset
  // makes the label appear to merge into/hover confusingly at the puck's
  // base instead of clearly sitting above it - renderer3d.js computes
  // `offsetY` once per frame from the camera's current pitch.
  updateLabelHeight(offsetY) {
    this.labelObject.position.y = offsetY;
  }

  // Hides this label when a post/the net blocks the camera's line of
  // sight to it - see renderer3d.js's updateLabelOcclusion.
  setLabelOccluded(occluded) {
    this.labelObject.element.style.display = occluded ? 'none' : '';
  }

  dispose() {
    this.outline.geometry.dispose();
    this.outline.material.dispose();
    this.fill.geometry.dispose();
    this.fill.material.dispose();
  }
}
