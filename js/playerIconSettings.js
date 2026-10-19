// Persists which player icon style is active ('puck' or 'mannequin' - 3D
// mannequin figures / 2D footprints) plus the 2D-only footprint
// enlargement factor, and owns the shared geometry for both styles: the
// mannequin's true-to-scale dimensions and the icon "extents" the overlap
// rules measure against (overlap.js) - kept renderer-independent so 2D
// and 3D always agree on what counts as an overlap.
import { getPuckSize, getPuckRadius } from './puckSizeSettings.js';

const ICON_KEY = 'volleyballViz.playerIcon';
const FOOTPRINT_SCALE_KEY = 'volleyballViz.footprintScale2D';
const VALID_ICONS = ['puck', 'mannequin'];
export const DEFAULT_PLAYER_ICON = 'puck';
export const MIN_FOOTPRINT_SCALE = 0.5;
export const MAX_FOOTPRINT_SCALE = 4;
const LINK_DOT_SCALE_KEY = 'volleyballViz.linkDotScale2D';
export const MIN_LINK_DOT_SCALE = 0.25;
export const MAX_LINK_DOT_SCALE = 4;

export function getPlayerIcon() {
  const raw = localStorage.getItem(ICON_KEY);
  return VALID_ICONS.includes(raw) ? raw : DEFAULT_PLAYER_ICON;
}

export function savePlayerIcon(icon) {
  localStorage.setItem(ICON_KEY, icon);
}

// 2D footprints only - purely cosmetic: overlap checking always uses the
// true-scale extents so 2D and 3D agree.
export function getFootprintScale2D() {
  const value = Number(localStorage.getItem(FOOTPRINT_SCALE_KEY));
  return Number.isFinite(value) && value >= MIN_FOOTPRINT_SCALE && value <= MAX_FOOTPRINT_SCALE ? value : 1;
}

export function saveFootprintScale2D(scale) {
  localStorage.setItem(FOOTPRINT_SCALE_KEY, String(scale));
}

// Multiplier on the default size of the attach-point dots drawn at the
// ends of 2D link lines in footprint mode (1 = default).
export function getLinkDotScale2D() {
  const value = Number(localStorage.getItem(LINK_DOT_SCALE_KEY));
  return Number.isFinite(value) && value >= MIN_LINK_DOT_SCALE && value <= MAX_LINK_DOT_SCALE ? value : 1;
}

export function saveLinkDotScale2D(scale) {
  localStorage.setItem(LINK_DOT_SCALE_KEY, String(scale));
}

// World units are centimeters (the court is 900 units = 9 m wide). The
// puck size setting doubles as the mannequin height: 5'2", 5'9", 6'2".
export const MANNEQUIN_HEIGHTS = { small: 157.48, medium: 175.26, large: 187.96 };

// Relaxed athletic stance: feet slightly narrower than the shoulders,
// right foot staggered ahead of the left by 3/4 of a foot length. Players
// always face the net, so the footprint never rotates. Everything is
// expressed relative to the stance's bounding-box center (the player's
// x/y anchor): x grows to the player's right, y grows away from the net.
export function getMannequinSpec(size = getPuckSize()) {
  const height = MANNEQUIN_HEIGHTS[size] ?? MANNEQUIN_HEIGHTS.medium;
  const footLength = height * 0.15;
  const footWidth = footLength * 0.4;
  const footSpacing = height * 0.21;
  const stagger = footLength * 0.75;
  return {
    height,
    footLength,
    footWidth,
    footSpacing,
    stagger,
    // Axis-aligned extents of both feet together.
    width: footSpacing + footWidth,
    depth: footLength + stagger,
  };
}

function computeExtents() {
  if (getPlayerIcon() === 'mannequin') {
    const spec = getMannequinSpec();
    return { halfWidth: spec.width / 2, halfDepth: spec.depth / 2 };
  }
  const radius = getPuckRadius();
  return { halfWidth: radius, halfDepth: radius };
}

// Cached (not recomputed per call) since overlap checks run on every
// drag move - call refreshPlayerExtents() after changing the icon style
// or size setting.
let extents = computeExtents();

// Half-width (x) / half-depth (y) of the current icon's footprint around
// a player's anchor - a puck's radius, or the mannequin's feet extents.
export function getPlayerExtents() {
  return extents;
}

export function refreshPlayerExtents() {
  extents = computeExtents();
}
