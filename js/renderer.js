// Thin 2D (SVG) rendering interface - the only module that talks to
// court.js/player.js/raw SVG DOM specifics for the main visualizer.
// main.js drives the app purely through the object createCourtRenderer()
// returns (create/move players, draw guide/link lines) without ever
// touching an SVG element itself.
// js/renderer3d.js implements this same interface for the 3D view mode.
import { setViewBox, drawCourt, createViolationLinesLayer, createLinkLinesLayer, createClampLinesLayer, createViewport, createClassicBenchLayer } from './court.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { BENCH_POSITION_CLASSIC, BENCH_POSITION_REPLACED_CLASSIC, COURT_SIZE, ZONE_POSITIONS } from './config.js';
import { getLineSettings } from './lineSettings.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgLine(attrs) {
  const el = document.createElementNS(SVG_NS, 'line');
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

// Builds the court/viewport, the bench layout, and the violation/link/
// clamp overlay-line layers into `svg`, then returns the interface
// main.js uses for everything rendering-related.
export function createCourtRenderer(svg) {
  const lineSettings = getLineSettings();

  setViewBox(svg);
  const viewport = createViewport(svg);
  drawCourt(viewport);
  const violationLinesLayer = createViolationLinesLayer(viewport);
  const linkLinesLayer = createLinkLinesLayer(viewport);
  const clampLinesLayer = createClampLinesLayer(viewport);
  // Appended after the viewport (i.e. painted on top of the court floor),
  // so a player mid-swap-animation - still positioned over the court while
  // reparented into the bench layer - stays visible instead of
  // disappearing behind the floor.
  const classicBench = createClassicBenchLayer(svg);

  function benchLayer() {
    return classicBench.layer;
  }
  function benchPosition() {
    return BENCH_POSITION_CLASSIC;
  }
  function benchPositionReplaced() {
    return BENCH_POSITION_REPLACED_CLASSIC;
  }

  // Draws a dashed line marking a positional boundary, spanning the full
  // court from end line to end line: a horizontal (left/right) rule is
  // shown as a vertical line, and vice versa. Red marks an actual
  // violation, gray marks a guide preview of a still-legal boundary - same
  // line, same anchor logic, only the color differs. When one of the two
  // players is the currently selected one, the line always anchors on the
  // OTHER (non-selected) player - that's the deliberate reference point
  // while previewing a selection, regardless of tiny incidental drift in
  // either player's position. Otherwise (no selection involved in this
  // pair), the anchor falls back to whichever player is closer to its own
  // zone's base position (the one that stayed put), since either could be
  // the one that moved. `target` selects which overlay layer it's drawn
  // into ('violation', the default, or 'clamp').
  function drawSeparatorLine(posA, posB, zoneA, zoneB, axis, isViolation, selectedZone, target = 'violation') {
    let anchorIsA;
    if (selectedZone === zoneA) {
      anchorIsA = false;
    } else if (selectedZone === zoneB) {
      anchorIsA = true;
    } else {
      const displacement = (pos, zone) => {
        const base = ZONE_POSITIONS[zone];
        return (pos.x - base.x) ** 2 + (pos.y - base.y) ** 2;
      };
      const dispA = displacement(posA, zoneA);
      const dispB = displacement(posB, zoneB);
      anchorIsA = dispA <= dispB;
    }

    const attrs = {
      stroke: isViolation ? 'var(--player-overlap)' : 'var(--guide-line)',
      'stroke-width': isViolation ? lineSettings.violationLineWidth : lineSettings.guideLineWidth,
      'stroke-dasharray': '10,8',
    };
    if (axis === 'horizontal') {
      const x = anchorIsA ? posA.x - PLAYER_RADIUS : posB.x + PLAYER_RADIUS;
      attrs.x1 = x;
      attrs.x2 = x;
      attrs.y1 = 0;
      attrs.y2 = COURT_SIZE;
    } else {
      const y = anchorIsA ? posA.y - PLAYER_RADIUS : posB.y + PLAYER_RADIUS;
      attrs.x1 = 0;
      attrs.x2 = COURT_SIZE;
      attrs.y1 = y;
      attrs.y2 = y;
    }
    (target === 'clamp' ? clampLinesLayer : violationLinesLayer).appendChild(svgLine(attrs));
  }

  // Draws a thin green line connecting the centers of two players -
  // visualizes which players correspond to the selected one, independent
  // of whether they're actually in violation. Solid for a front-row
  // target, dotted for a back-row one.
  function drawLinkLine(posA, posB, isBackRowTarget) {
    const attrs = {
      x1: posA.x,
      y1: posA.y,
      x2: posB.x,
      y2: posB.y,
      stroke: 'var(--link-line)',
      'stroke-width': lineSettings.linkLineWidth,
    };
    if (isBackRowTarget) {
      attrs['stroke-dasharray'] = '4,5';
    }
    linkLinesLayer.appendChild(svgLine(attrs));
  }

  function clearViolationLines() {
    violationLinesLayer.innerHTML = '';
  }
  function clearLinkLines() {
    linkLinesLayer.innerHTML = '';
  }
  function clearClampLines() {
    clampLinesLayer.innerHTML = '';
  }

  // Creates a player icon on the court viewport.
  function createCourtPlayer(role, label, x, y, onDragEnd, onDragMove) {
    return new Player(svg, viewport, role, label, x, y, onDragEnd, onDragMove);
  }
  // Creates a player icon on the (fixed, upright) bench layout.
  function createBenchPlayer(role, label, x, y, onDragEnd, onDragMove) {
    return new Player(svg, benchLayer(), role, label, x, y, onDragEnd, onDragMove);
  }
  function moveToCourt(player) {
    player.setContainer(viewport);
  }
  function moveToBench(player) {
    player.setContainer(benchLayer());
  }

  // Fires `handler` when the court background (not a player icon) is
  // clicked - used to deselect the currently previewed player.
  function onBackgroundClick(handler) {
    svg.addEventListener('click', (event) => {
      if (!event.target.closest('.player')) {
        handler(event);
      }
    });
  }

  // Right-click is reserved for the quad-menu (see ROADMAP Phase 3.3) -
  // this suppresses the browser's native context menu and forwards the
  // event on; there's no 2D-only camera to conflict with, unlike 3D.
  function onContextMenu(handler) {
    svg.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      handler(event);
    });
  }

  // Called by main.js before switching to a different renderer (see
  // main.js's `switchViewMode`) - without this, a fresh
  // `createCourtRenderer` call the next time 2D is selected again would
  // append a whole SECOND viewport/bench-layer/player tree alongside this
  // one (court.js's `createViewport`/bench-layer helpers just append,
  // they don't clear first), since hiding the `<svg>` via `display: none`
  // doesn't remove its existing content.
  function destroy() {
    svg.innerHTML = '';
  }

  return {
    benchPosition,
    benchPositionReplaced,
    drawSeparatorLine,
    drawLinkLine,
    clearViolationLines,
    clearLinkLines,
    clearClampLines,
    createCourtPlayer,
    createBenchPlayer,
    moveToCourt,
    moveToBench,
    onBackgroundClick,
    onContextMenu,
    destroy,
  };
}
