// Persists the player "puck" icon size (2D circle radius / 3D cylinder
// radius) - a single app-wide size, independent of rendering mechanism
// (same philosophy as every other *Settings.js module). "Large" matches
// the app's original, pre-this-feature fixed radius (45) exactly, so
// anyone who never touches this setting sees no visual change.
const STORAGE_KEY = 'volleyballViz.puckSize';
export const DEFAULT_PUCK_SIZE = 'medium';
const VALID_SIZES = ['small', 'medium', 'large'];
export const PUCK_SIZE_RADII = { small: 28, medium: 36, large: 45 };

export function getPuckSize() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return VALID_SIZES.includes(raw) ? raw : DEFAULT_PUCK_SIZE;
}

export function savePuckSize(size) {
  localStorage.setItem(STORAGE_KEY, size);
}

// Resolves a size name ('small'/'medium'/'large') to its radius, reading
// the persisted size by default so callers don't each need to call
// getPuckSize() themselves first.
export function getPuckRadius(size = getPuckSize()) {
  return PUCK_SIZE_RADII[size] ?? PUCK_SIZE_RADII[DEFAULT_PUCK_SIZE];
}

// Player label text (fontSettings.js's playerLabelSize) was sized for the
// original fixed "large" puck - scaling it by radius-relative-to-large
// keeps the label proportional to whichever puck size is active instead
// of staying a fixed pixel size while the puck itself shrinks/grows.
// Sets a CSS custom property (read by style.css's `.player text` rule and
// by player3d.js's inline label font-size) rather than recomputing pixel
// values per-caller, so both 2D and 3D - and any future puck-size change,
// live or on load - pick it up automatically from one place.
export function applyPuckSizeScale(size = getPuckSize()) {
  const scale = getPuckRadius(size) / PUCK_SIZE_RADII.large;
  document.documentElement.style.setProperty('--puck-size-scale', scale);
}
