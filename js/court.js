import { COURT_SIZE, ATTACK_LINE_Y } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
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
