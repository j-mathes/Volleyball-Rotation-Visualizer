import { COURT_SIZE, ATTACK_LINE_Y, SIDE_MARGIN, BENCH_WIDTH, BENCH_CENTER } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

// Rotates (x, y) by `angle` degrees around (cx, cy) - used to compute the
// rotated bounding box for setViewBox, matching setViewportRotation's
// rotation of the actual content around the same center point.
function rotatePoint(x, y, angle, cx, cy) {
  const rad = (angle * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

// Sizes the SVG's viewBox to fit the court plus its blue padding and the
// sideline bench strip reserved for the Libero, rotated by `angle` degrees
// around the court's center to match setViewportRotation - the bench
// strip's extra width makes the un-rotated bounding box asymmetric, so the
// rotated box is computed from its actual corners rather than assuming a
// simple width/height swap.
export function setViewBox(svg, angle = 0) {
  const minX = -(SIDE_MARGIN + BENCH_WIDTH);
  const minY = -SIDE_MARGIN;
  const maxX = COURT_SIZE + SIDE_MARGIN;
  const maxY = COURT_SIZE + SIDE_MARGIN;
  const cx = COURT_SIZE / 2;
  const cy = COURT_SIZE / 2;
  const corners = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]]
    .map(([x, y]) => rotatePoint(x, y, angle, cx, cy));
  const left = Math.min(...corners.map((p) => p.x));
  const top = Math.min(...corners.map((p) => p.y));
  const width = Math.max(...corners.map((p) => p.x)) - left;
  const height = Math.max(...corners.map((p) => p.y)) - top;
  svg.setAttribute('viewBox', `${left} ${top} ${width} ${height}`);
}

// Creates the group every other draw* function in this module appends
// into, so the whole diagram (court, bench, tracker, players) can be
// rotated as one unit via setViewportRotation - the net-orientation toggle
// (0 deg/net-top, 90 deg/net-right, -90 deg/net-left).
export function createViewport(svg) {
  const viewport = el('g', { class: 'viewport' });
  svg.appendChild(viewport);
  return viewport;
}

// Rotates the whole diagram around the court's center point.
export function setViewportRotation(viewport, angle = 0) {
  viewport.setAttribute('transform', `rotate(${angle}, ${COURT_SIZE / 2}, ${COURT_SIZE / 2})`);
}

// Draws a subtle panel and dashed divider marking the sideline area where
// the Libero waits when not swapped onto the court. `angle` counter-
// rotates the BENCH label so it stays upright regardless of the viewport's
// rotation - see setViewportRotation.
export function drawBenchZone(container, angle = 0) {
  const panelHeight = 220;
  const panel = el('rect', {
    x: -(SIDE_MARGIN + BENCH_WIDTH),
    y: BENCH_CENTER.y - panelHeight / 2,
    width: BENCH_WIDTH,
    height: panelHeight,
    rx: 12,
    fill: 'rgba(255, 255, 255, 0.12)',
  });
  container.appendChild(panel);

  const divider = el('line', {
    x1: -SIDE_MARGIN,
    y1: -SIDE_MARGIN,
    x2: -SIDE_MARGIN,
    y2: COURT_SIZE + SIDE_MARGIN,
    stroke: 'var(--line-colour)',
    'stroke-width': 3,
    'stroke-dasharray': '10,10',
    opacity: 0.6,
  });
  container.appendChild(divider);

  const labelX = -(SIDE_MARGIN + BENCH_WIDTH / 2);
  const labelY = BENCH_CENTER.y - panelHeight / 2 - 16;
  const label = el('text', {
    x: labelX,
    y: labelY,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'font-family': 'var(--diagram-font-family)',
    'font-size': 'var(--bench-label-size)',
    transform: `rotate(${-angle}, ${labelX}, ${labelY})`,
  });
  label.textContent = 'BENCH';
  container.appendChild(label);
}

// Creates the "R#" rotation-number tracker above the bench area and
// returns the text element so callers can update it as rotations happen.
// `angle` counter-rotates the text so it stays upright - see drawBenchZone.
export function createRotationTracker(container, angle = 0) {
  const boxWidth = 150;
  const boxHeight = 90;
  const boxTop = 0; // aligns with the top of the court (net line)
  const centerY = boxTop + boxHeight / 2;

  const box = el('rect', {
    x: BENCH_CENTER.x - boxWidth / 2,
    y: boxTop,
    width: boxWidth,
    height: boxHeight,
    rx: 18,
    fill: 'var(--accent)',
  });
  container.appendChild(box);

  const text = el('text', {
    x: BENCH_CENTER.x,
    y: centerY,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'var(--diagram-font-family)',
    'font-weight': 'bold',
    'font-size': 'var(--rotation-tracker-size)',
    transform: `rotate(${-angle}, ${BENCH_CENTER.x}, ${centerY})`,
  });
  text.textContent = 'R1';
  container.appendChild(text);
  return text;
}

// Group that holds dashed red lines marking the specific gap between two
// players in violation. Returned so callers can clear/repopulate it.
export function createViolationLinesLayer(container) {
  const group = el('g', { class: 'violation-lines' });
  container.appendChild(group);
  return group;
}

// Group that holds thin solid green lines linking a selected player to its
// corresponding players. Appended before any player icons so the links
// always render underneath them. Returned so callers can clear/repopulate it.
export function createLinkLinesLayer(container) {
  const group = el('g', { class: 'link-lines' });
  container.appendChild(group);
  return group;
}

// Group that holds dashed black lines marking the fault-line boundary a
// player is currently pressed up against while "Lock to Legal Positions"
// is on. Kept separate from the violation-lines layer so it can be
// updated on every drag move without interfering with that layer's own
// clear/repopulate cycle. Returned so callers can clear/repopulate it.
export function createClampLinesLayer(container) {
  const group = el('g', { class: 'clamp-lines' });
  container.appendChild(group);
  return group;
}

// Draws the static court lines (net, side/end lines, attack line) into the
// given container and returns it for convenience.
export function drawCourt(container) {
  const court = el('rect', {
    x: 0,
    y: 0,
    width: COURT_SIZE,
    height: COURT_SIZE,
    fill: 'var(--court-fill)',
    stroke: 'var(--line-colour)',
    'stroke-width': 6,
  });
  container.appendChild(court);

  const net = el('line', {
    x1: -40,
    y1: 0,
    x2: COURT_SIZE + 40,
    y2: 0,
    stroke: 'var(--line-colour)',
    'stroke-width': 10,
  });
  container.appendChild(net);

  const attackLine = el('line', {
    x1: 0,
    y1: ATTACK_LINE_Y,
    x2: COURT_SIZE,
    y2: ATTACK_LINE_Y,
    stroke: 'var(--line-colour)',
    'stroke-width': 6,
    'stroke-dasharray': '16,14',
  });
  container.appendChild(attackLine);

  return container;
}
