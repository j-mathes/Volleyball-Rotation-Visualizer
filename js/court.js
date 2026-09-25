import { COURT_SIZE, ATTACK_LINE_Y, SIDE_MARGIN, BENCH_WIDTH, BENCH_CENTER } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

// Sizes the SVG's viewBox to fit the court plus its blue padding and the
// sideline bench strip reserved for the Libero.
export function setViewBox(svg) {
  const minX = -(SIDE_MARGIN + BENCH_WIDTH);
  const minY = -SIDE_MARGIN;
  const width = COURT_SIZE + SIDE_MARGIN * 2 + BENCH_WIDTH;
  const height = COURT_SIZE + SIDE_MARGIN * 2;
  svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
}

// Draws a subtle panel and dashed divider marking the sideline area where
// the Libero waits when not swapped onto the court.
export function drawBenchZone(svg) {
  const panelHeight = 220;
  const panel = el('rect', {
    x: -(SIDE_MARGIN + BENCH_WIDTH),
    y: BENCH_CENTER.y - panelHeight / 2,
    width: BENCH_WIDTH,
    height: panelHeight,
    rx: 12,
    fill: 'rgba(255, 255, 255, 0.12)',
  });
  svg.appendChild(panel);

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
  svg.appendChild(divider);

  const label = el('text', {
    x: -(SIDE_MARGIN + BENCH_WIDTH / 2),
    y: BENCH_CENTER.y - panelHeight / 2 - 16,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'font-family': 'Verdana',
    'font-size': 24,
  });
  label.textContent = 'BENCH';
  svg.appendChild(label);
}

// Creates the "R#" rotation-number tracker above the bench area and
// returns the text element so callers can update it as rotations happen.
export function createRotationTracker(svg) {
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
  svg.appendChild(box);

  const text = el('text', {
    x: BENCH_CENTER.x,
    y: centerY,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': 'Verdana',
    'font-weight': 'bold',
    'font-size': 56,
  });
  text.textContent = 'R1';
  svg.appendChild(text);
  return text;
}

// Group that holds dashed red lines marking the specific gap between two
// players in violation. Returned so callers can clear/repopulate it.
export function createViolationLinesLayer(svg) {
  const group = el('g', { class: 'violation-lines' });
  svg.appendChild(group);
  return group;
}

// Group that holds thin solid green lines linking a selected player to its
// corresponding players. Appended before any player icons so the links
// always render underneath them. Returned so callers can clear/repopulate it.
export function createLinkLinesLayer(svg) {
  const group = el('g', { class: 'link-lines' });
  svg.appendChild(group);
  return group;
}

// Draws the static court lines (net, side/end lines, attack line) into the
// given <svg> element and returns it for convenience.
export function drawCourt(svg) {
  const court = el('rect', {
    x: 0,
    y: 0,
    width: COURT_SIZE,
    height: COURT_SIZE,
    fill: 'var(--court-fill)',
    stroke: 'var(--line-colour)',
    'stroke-width': 6,
  });
  svg.appendChild(court);

  const net = el('line', {
    x1: -40,
    y1: 0,
    x2: COURT_SIZE + 40,
    y2: 0,
    stroke: 'var(--line-colour)',
    'stroke-width': 10,
  });
  svg.appendChild(net);

  const attackLine = el('line', {
    x1: 0,
    y1: ATTACK_LINE_Y,
    x2: COURT_SIZE,
    y2: ATTACK_LINE_Y,
    stroke: 'var(--line-colour)',
    'stroke-width': 6,
    'stroke-dasharray': '16,14',
  });
  svg.appendChild(attackLine);

  return svg;
}
