import { COURT_SIZE, ATTACK_LINE_Y, SIDE_MARGIN, BENCH_WIDTH, BENCH_STRIP_HEIGHT, BENCH_CENTER_CLASSIC, BENCH_PANEL_HEIGHT_CLASSIC, ROTATION_TRACKER_CENTER_X_CLASSIC, ROTATION_TRACKER_CENTER_X_TOP } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

// Sizes the SVG's viewBox. The width always matches the classic (bench-
// on-the-left, Net Top) layout's total width, so the court renders at the
// same on-screen size at every net-orientation view angle - a square's
// axis-aligned bounding box is unchanged by a 90 deg turn, so only the
// height needs to grow (to fit the fixed top-of-court bench strip - see
// createTopBenchLayer) when the angle isn't 0.
export function setViewBox(svg, angle = 0) {
  const minX = -(SIDE_MARGIN + BENCH_WIDTH);
  const width = COURT_SIZE + SIDE_MARGIN * 2 + BENCH_WIDTH;
  const minY = angle === 0 ? -SIDE_MARGIN : -SIDE_MARGIN - BENCH_STRIP_HEIGHT;
  const height = angle === 0 ? COURT_SIZE + SIDE_MARGIN * 2 : COURT_SIZE + SIDE_MARGIN * 2 + BENCH_STRIP_HEIGHT;
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
}

// Creates the group the court/overlap-line/player-related draw* functions
// append into, so that content can be rotated as one unit via
// setViewportRotation - the net-orientation toggle (0 deg/net-top,
// 90 deg/net-right, -90 deg/net-left). The bench layers (see
// createClassicBenchLayer/createTopBenchLayer) are deliberately NOT part
// of this group, so they always stay upright regardless of the angle.
export function createViewport(svg) {
  const viewport = el('g', { class: 'viewport' });
  svg.appendChild(viewport);
  return viewport;
}

// Rotates the whole viewport around the court's center point.
export function setViewportRotation(viewport, angle = 0) {
  viewport.setAttribute('transform', `rotate(${angle}, ${COURT_SIZE / 2}, ${COURT_SIZE / 2})`);
}

// Classic (bench-on-the-left) layout, shown only at Net Top (angle 0) -
// the original, pre-orientation-toggle design. Returns { layer,
// trackerText } so callers can toggle its visibility and update the
// tracker text as rotations happen.
export function createClassicBenchLayer(svg) {
  const layer = el('g', { class: 'classic-bench-layer' });
  svg.appendChild(layer);

  const panelHeight = BENCH_PANEL_HEIGHT_CLASSIC;
  const panel = el('rect', {
    x: -(SIDE_MARGIN + BENCH_WIDTH),
    y: BENCH_CENTER_CLASSIC.y - panelHeight / 2,
    width: BENCH_WIDTH,
    height: panelHeight,
    rx: 12,
    fill: 'var(--bench-fill)',
    'fill-opacity': 'var(--bench-fill-opacity)',
  });
  layer.appendChild(panel);

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
  layer.appendChild(divider);

  const label = el('text', {
    x: BENCH_CENTER_CLASSIC.x,
    y: BENCH_CENTER_CLASSIC.y - panelHeight / 2 - 16,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'font-family': 'var(--diagram-font-family)',
    'font-size': 'var(--bench-label-size)',
  });
  label.textContent = 'BENCH';
  layer.appendChild(label);

  const trackerText = drawRotationTrackerBox(layer, ROTATION_TRACKER_CENTER_X_CLASSIC, 45);
  return { layer, trackerText };
}

// Top-of-court layout, shown only at Net Left/Right (+-90 deg) - a fixed,
// non-rotating strip above the court, since the classic left-side bench
// would otherwise swing to a different screen side depending on rotation
// direction. `benchCenter` (config.js's BENCH_CENTER_TOP_RIGHT/LEFT)
// positions the bench panel itself; the "R#" tracker always uses the
// fixed ROTATION_TRACKER_CENTER_X_TOP regardless, so it never moves.
// Returns { layer, trackerText }, same as createClassicBenchLayer.
export function createTopBenchLayer(svg, benchCenter) {
  const layer = el('g', { class: 'top-bench-layer' });
  svg.appendChild(layer);

  const panelY = -SIDE_MARGIN - BENCH_STRIP_HEIGHT + 10;
  const panelHeight = BENCH_STRIP_HEIGHT - 20;
  const panel = el('rect', {
    x: benchCenter.x - BENCH_WIDTH / 2,
    y: panelY,
    width: BENCH_WIDTH,
    height: panelHeight,
    rx: 12,
    fill: 'var(--bench-fill)',
    'fill-opacity': 'var(--bench-fill-opacity)',
  });
  layer.appendChild(panel);

  const divider = el('line', {
    x1: -(SIDE_MARGIN + BENCH_WIDTH),
    y1: -SIDE_MARGIN,
    x2: COURT_SIZE + SIDE_MARGIN,
    y2: -SIDE_MARGIN,
    stroke: 'var(--line-colour)',
    'stroke-width': 3,
    'stroke-dasharray': '10,10',
    opacity: 0.6,
  });
  layer.appendChild(divider);

  const label = el('text', {
    x: benchCenter.x,
    y: panelY + 30,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'font-family': 'var(--diagram-font-family)',
    'font-size': 'var(--bench-label-size)',
  });
  label.textContent = 'BENCH';
  layer.appendChild(label);

  const trackerText = drawRotationTrackerBox(layer, ROTATION_TRACKER_CENTER_X_TOP, benchCenter.y);
  return { layer, trackerText };
}

// Draws the "R#" rotation-number tracker box centered at (centerX,
// centerY) and returns its text element so callers can update it as
// rotations happen.
function drawRotationTrackerBox(container, centerX, centerY) {
  const boxWidth = 150;
  const boxHeight = 90;

  const box = el('rect', {
    x: centerX - boxWidth / 2,
    y: centerY - boxHeight / 2,
    width: boxWidth,
    height: boxHeight,
    rx: 18,
    fill: 'var(--accent)',
  });
  container.appendChild(box);

  const text = el('text', {
    x: centerX,
    y: centerY,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'var(--diagram-font-family)',
    'font-weight': 'bold',
    'font-size': 'var(--rotation-tracker-size)',
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
