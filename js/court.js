import { COURT_SIZE, ATTACK_LINE_Y, SIDE_MARGIN, SIDE_PADDING, BENCH_WIDTH, BENCH_STRIP_HEIGHT, BENCH_CENTER, ROTATION_TRACKER_CENTER_X } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

// Sizes the SVG's viewBox to fit the fixed bench/tracker strip plus the
// court's own rotating bounding box below it, padded horizontally (see
// SIDE_PADDING) to match the original layout's total width/scale. This is
// constant regardless of the net-orientation view angle: only the court
// (a square) rotates (see createViewport/setViewportRotation), and a
// square's axis-aligned bounding box is unchanged by a 90 deg turn, so its
// on-screen size never varies between orientations.
export function setViewBox(svg) {
  const minX = -SIDE_MARGIN - SIDE_PADDING;
  const minY = -SIDE_MARGIN - BENCH_STRIP_HEIGHT;
  const width = COURT_SIZE + SIDE_MARGIN * 2 + SIDE_PADDING * 2;
  const height = COURT_SIZE + SIDE_MARGIN * 2 + BENCH_STRIP_HEIGHT;
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
}

// Creates the group the court/overlap-line/player-related draw* functions
// append into, so that content can be rotated as one unit via
// setViewportRotation - the net-orientation toggle (0 deg/net-top,
// 90 deg/net-right, -90 deg/net-left). The bench strip (see
// createFixedLayer) is deliberately NOT part of this group, so it always
// stays upright at the top of the screen regardless of the angle.
export function createViewport(svg) {
  const viewport = el('g', { class: 'viewport' });
  svg.appendChild(viewport);
  return viewport;
}

// Rotates the whole viewport around the court's center point.
export function setViewportRotation(viewport, angle = 0) {
  viewport.setAttribute('transform', `rotate(${angle}, ${COURT_SIZE / 2}, ${COURT_SIZE / 2})`);
}

// Creates a non-rotating group for the bench panel and rotation tracker,
// appended before (i.e. visually under) the viewport so an on-court-bound
// player mid-swap still paints on top of the bench panel it's leaving.
export function createFixedLayer(svg) {
  const layer = el('g', { class: 'fixed-layer' });
  svg.appendChild(layer);
  return layer;
}

// Draws the bench panel, its divider from the court below, and the
// "BENCH" label into the fixed (non-rotating) layer - always at the top
// of the screen regardless of the net-orientation view angle.
export function drawBenchZone(container) {
  const panelY = -SIDE_MARGIN - BENCH_STRIP_HEIGHT + 10;
  const panelHeight = BENCH_STRIP_HEIGHT - 20;

  const panel = el('rect', {
    x: BENCH_CENTER.x - BENCH_WIDTH / 2,
    y: panelY,
    width: BENCH_WIDTH,
    height: panelHeight,
    rx: 12,
    fill: 'rgba(255, 255, 255, 0.12)',
  });
  container.appendChild(panel);

  const divider = el('line', {
    x1: -SIDE_MARGIN - SIDE_PADDING,
    y1: -SIDE_MARGIN,
    x2: COURT_SIZE + SIDE_MARGIN + SIDE_PADDING,
    y2: -SIDE_MARGIN,
    stroke: 'var(--line-colour)',
    'stroke-width': 3,
    'stroke-dasharray': '10,10',
    opacity: 0.6,
  });
  container.appendChild(divider);

  const label = el('text', {
    x: BENCH_CENTER.x,
    y: panelY + 30,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'font-family': 'var(--diagram-font-family)',
    'font-size': 'var(--bench-label-size)',
  });
  label.textContent = 'BENCH';
  container.appendChild(label);
}

// Creates the "R#" rotation-number tracker in the fixed bench strip and
// returns the text element so callers can update it as rotations happen.
// Always upright, since the fixed layer never rotates.
export function createRotationTracker(container) {
  const boxWidth = 150;
  const boxHeight = 90;
  const centerX = ROTATION_TRACKER_CENTER_X;
  const centerY = BENCH_CENTER.y; // vertically centered in the strip, same as the bench panel
  const boxX = centerX - boxWidth / 2;
  const boxY = centerY - boxHeight / 2;

  const box = el('rect', {
    x: boxX,
    y: boxY,
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
