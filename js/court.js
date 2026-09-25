import { COURT_SIZE, ATTACK_LINE_Y, SIDE_MARGIN, BENCH_WIDTH, BENCH_POSITION } from './config.js';

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
// the Libero waits when not substituted onto the court.
export function drawBenchZone(svg) {
  const panelHeight = 220;
  const panel = el('rect', {
    x: -(SIDE_MARGIN + BENCH_WIDTH),
    y: BENCH_POSITION.y - panelHeight / 2,
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
    y: BENCH_POSITION.y - panelHeight / 2 - 16,
    fill: 'var(--line-colour)',
    'text-anchor': 'middle',
    'font-family': 'Verdana',
    'font-size': 24,
  });
  label.textContent = 'BENCH';
  svg.appendChild(label);
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
