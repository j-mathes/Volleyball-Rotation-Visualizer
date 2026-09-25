const SVG_NS = 'http://www.w3.org/2000/svg';
const PLAYER_RADIUS = 45;

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

// Converts a pointer event's client coordinates into the SVG's user-space
// coordinates, accounting for the viewBox/CTM.
function toSvgPoint(svg, clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

export class Player {
  constructor(svg, role, label, x, y, onDragEnd, onDragMove) {
    this.svg = svg;
    this.role = role;
    this.x = x;
    this.y = y;
    this.onDragEnd = onDragEnd;
    this.onDragMove = onDragMove;
    this.dragging = false;

    this.group = el('g', { class: 'player' });
    this.circle = el('circle', { cx: 0, cy: 0, r: PLAYER_RADIUS });
    this.text = el('text', { x: 0, y: 2 });
    this.text.textContent = label;
    this.group.appendChild(this.circle);
    this.group.appendChild(this.text);
    svg.appendChild(this.group);

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

  setOverlapping(isOverlapping) {
    this.group.classList.toggle('overlapping', isOverlapping);
  }

  // Highlighted while a benched player is selectable as a Libero swap target.
  setSelectable(isSelectable) {
    this.group.classList.toggle('selectable', isSelectable);
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

    const onPointerMove = (event) => {
      const point = toSvgPoint(this.svg, event.clientX, event.clientY);
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
      if (this.onDragEnd) {
        this.onDragEnd(this);
      }
    };

    this.group.addEventListener('pointerdown', (event) => {
      this.dragging = true;
      this.group.classList.add('dragging');
      this.group.setPointerCapture(event.pointerId);
      const point = toSvgPoint(this.svg, event.clientX, event.clientY);
      offsetX = point.x - this.x;
      offsetY = point.y - this.y;
      this.group.addEventListener('pointermove', onPointerMove);
      this.group.addEventListener('pointerup', onPointerUp);
    });
  }
}
