import { COURT_SIZE } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const PLAYER_RADIUS = 45;

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

// Converts a pointer event's client coordinates into the user-space
// coordinates of `target` (the element whose local coordinate system a
// child's transform="translate(x,y)" is interpreted in) - not always the
// root <svg>, since a player's parent may currently be the rotated court
// viewport (see main.js's createViewport/setContainer), whose own
// rotation must be undone too or dragging would move on the wrong axis.
function toSvgPoint(svg, target, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(target.getScreenCTM().inverse());
}

// Rotates (x, y) by `deltaDeg` around the court's center point - used by
// setContainer to compensate for a change in the player's containing
// group's rotation (e.g. moving between the +-90 deg rotated viewport and
// a fixed, non-rotating bench layer), so its on-screen position doesn't
// visibly jump the instant it's reparented.
function rotateAroundCourtCenter(x, y, deltaDeg) {
  if (deltaDeg === 0) {
    return { x, y };
  }
  const center = COURT_SIZE / 2;
  const rad = (deltaDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - center;
  const dy = y - center;
  return {
    x: center + dx * cos - dy * sin,
    y: center + dx * sin + dy * cos,
  };
}

export class Player {
  // `root` is the actual <svg> element (needed for pointer-to-user-space
  // coordinate math); `container` is where this player's group is appended
  // - normally the rotatable viewport group (see court.js's createViewport)
  // rather than `root` directly. `angle` counter-rotates the label text so
  // it stays upright regardless of the viewport's rotation.
  constructor(root, container, role, label, x, y, onDragEnd, onDragMove, angle = 0) {
    this.svg = root;
    this.role = role;
    this.x = x;
    this.y = y;
    // Rotation (deg) of whatever group this.group currently lives in -
    // kept in sync by setViewAngle/setContainer, so setContainer can
    // compensate for a change in rotation when reparenting.
    this.containerAngle = angle;
    this.onDragEnd = onDragEnd;
    this.onDragMove = onDragMove;
    this.dragging = false;

    this.group = el('g', { class: role === 'L' ? 'player libero' : 'player' });
    this.circle = el('circle', { cx: 0, cy: 0, r: PLAYER_RADIUS });
    this.text = el('text', { x: 0, y: 2, transform: `rotate(${-angle}, 0, 2)` });
    this.text.textContent = label;
    this.group.appendChild(this.circle);
    this.group.appendChild(this.text);
    container.appendChild(this.group);

    this._applyTransform();
    this._attachDragHandlers();
  }

  _applyTransform() {
    this.group.setAttribute('transform', `translate(${this.x}, ${this.y})`);
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._applyTransform();
  }

  // Moves this player's SVG group into a different container - e.g.
  // switching between the rotating court viewport and a fixed bench
  // layer when swapping the Libero in/out - and updates the label's
  // counter-rotation to match that container's angle (0 for a bench
  // layer, which never rotates). Compensates position for any rotation
  // difference between the old and new container so the player doesn't
  // visibly jump the instant it's reparented (before any animateTo tween).
  setContainer(container, angle) {
    if (angle !== this.containerAngle) {
      const compensated = rotateAroundCourtCenter(this.x, this.y, this.containerAngle - angle);
      this.x = compensated.x;
      this.y = compensated.y;
      this._applyTransform();
    }
    container.appendChild(this.group);
    this.setViewAngle(angle);
  }

  // Re-applies the label's counter-rotation after the view-angle toggle
  // changes, so it stays upright regardless of the viewport's rotation.
  // Also tracks the container's current angle for setContainer's rotation
  // compensation, since a player can stay put while its container's own
  // rotation changes (e.g. an on-court player during the view toggle).
  setViewAngle(angle) {
    this.containerAngle = angle;
    this.text.setAttribute('transform', `rotate(${-angle}, 0, 2)`);
  }

  // Registers a click/double-click handler on this player's icon, so
  // callers never need to reach into the private `.group` SVG element
  // directly.
  onClick(handler) {
    this.group.addEventListener('click', handler);
  }

  onDoubleClick(handler) {
    this.group.addEventListener('dblclick', handler);
  }

  setOverlapping(isOverlapping) {
    this.group.classList.toggle('overlapping', isOverlapping);
  }

  // Darkens this player's fill while it currently occupies a back-row zone.
  setBackRow(isBackRow) {
    this.group.classList.toggle('back-row', isBackRow);
  }

  // Highlighted while a benched player is selectable as a Libero swap target.
  setSelectable(isSelectable) {
    this.group.classList.toggle('selectable', isSelectable);
  }

  // Highlighted while this player is the one chosen to preview overlap guides.
  setGuideSelected(isSelected) {
    this.group.classList.toggle('guide-selected', isSelected);
  }

  // Pulses the selection highlight while the selection is locked to this player.
  setSelectionLocked(isLocked) {
    this.group.classList.toggle('locked', isLocked);
  }

  // Highlighted while this player is a neighbor whose guide line is
  // currently shown against the selected player.
  setGuideRelated(isRelated) {
    this.group.classList.toggle('guide-related', isRelated);
  }

  // Highlighted when this (benched) player has been dragged onto the court,
  // which would mean 7 players on court at once.
  setBenchWarning(isWarning) {
    this.group.classList.toggle('bench-warning', isWarning);
  }

  // Animates to (x, y) over `duration` ms, returning a Promise that
  // resolves when the animation completes.
  animateTo(x, y, duration = 500) {
    const startX = this.x;
    const startY = this.y;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

  _attachDragHandlers() {
    let offsetX = 0;
    let offsetY = 0;
    let downPoint = null;
    // How far (in SVG units) the pointer moved during the last press, so
    // click handlers can tell a real drag apart from a plain tap.
    this.lastMoveDistance = 0;

    const onPointerMove = (event) => {
      const point = toSvgPoint(this.svg, this.group.parentNode, event.clientX, event.clientY);
      this.setPosition(point.x - offsetX, point.y - offsetY);
      if (this.onDragMove) {
        this.onDragMove(this);
      }
    };

    const onPointerUp = (event) => {
      this.dragging = false;
      this.group.classList.remove('dragging');
      this.group.releasePointerCapture(event.pointerId);
      this.group.removeEventListener('pointermove', onPointerMove);
      this.group.removeEventListener('pointerup', onPointerUp);
      const upPoint = toSvgPoint(this.svg, this.group.parentNode, event.clientX, event.clientY);
      this.lastMoveDistance = Math.hypot(upPoint.x - downPoint.x, upPoint.y - downPoint.y);
      // Bring this player to the front of the paint order, so that once two
      // overlapping circles are both on screen, grabbing/clicking this one
      // again keeps hitting it instead of whichever player happens to sit
      // on top by default DOM order. Deferred until after this event
      // finishes, since reordering the node beforehand suppresses the
      // browser's synthesized 'click' event.
      setTimeout(() => this.group.parentNode.appendChild(this.group), 0);
      if (this.onDragEnd) {
        this.onDragEnd(this);
      }
    };

    this.group.addEventListener('pointerdown', (event) => {
      this.dragging = true;
      this.group.classList.add('dragging');
      this.group.setPointerCapture(event.pointerId);
      const point = toSvgPoint(this.svg, this.group.parentNode, event.clientX, event.clientY);
      downPoint = point;
      offsetX = point.x - this.x;
      offsetY = point.y - this.y;
      this.group.addEventListener('pointermove', onPointerMove);
      this.group.addEventListener('pointerup', onPointerUp);
    });
  }
}
