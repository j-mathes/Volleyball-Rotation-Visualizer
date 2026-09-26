// Customizable CSS custom properties (see :root in style.css), persisted
// in localStorage and shared between index.html and setup.html.

const STORAGE_KEY = 'volleyballViz.colors';

export const DEFAULT_COLORS = {
  'court-fill': '#e2836b',
  'court-bg': '#189a94',
  'line-colour': '#ffffff',
  'player-fill': '#efa581',
  'player-outline': '#f5f5f5',
  'player-overlap': '#e74c3c',
  'player-selectable': '#22c55e',
  'guide-line': '#000000',
  'guide-selected': '#3498db',
  'link-line': '#16a34a',
  'panel-bg': '#f5f7fa',
  accent: '#2c3e50',
  'libero-fill': '#efa581',
  'bench-fill': '#ffffff',
  'bench-fill-opacity': 0.12,
};

// Human-readable labels for the settings UI, in display order.
export const COLOR_LABELS = {
  'court-fill': 'Court',
  'court-bg': 'Court Background',
  'line-colour': 'Court Lines & Text',
  'player-fill': 'Player',
  'player-outline': 'Player Outline',
  'player-overlap': 'Overlap / Violation',
  'player-selectable': 'Libero Swap Highlight',
  'guide-line': 'Guide Line',
  'guide-selected': 'Selected Player Highlight',
  'link-line': 'Player Link Line',
  'panel-bg': 'Side Panel Background',
  accent: 'Accent',
  'libero-fill': 'Libero',
  'bench-fill': 'Bench Area',
  'bench-fill-opacity': 'Bench Area Opacity (0-1)',
};

// Common preset swatches shown as a quick-pick grid next to each color
// picker in setup.html - the native `<input type="color">` next to them
// still covers any other RGB/hex value.
export const PRESET_SWATCHES = [
  '#ffffff', '#f5f5f5', '#cccccc', '#888888', '#444444', '#000000',
  '#e74c3c', '#e2836b', '#f39c12', '#f1c40f', '#2ecc71', '#22c55e',
  '#16a34a', '#189a94', '#3498db', '#2980b9', '#2c3e50', '#8e44ad',
  '#e84393', '#efa581',
];

export function getColors() {
  return { ...DEFAULT_COLORS, ...readSavedColors() };
}

export function saveColors(colors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

export function resetColors() {
  localStorage.removeItem(STORAGE_KEY);
}

// Applies the saved (or default) colors as inline custom properties on the
// root element, overriding style.css's :root values. Call as early as
// possible on every page so elements render with the right colors from
// the first paint.
export function applyColors() {
  const colors = getColors();
  for (const [name, value] of Object.entries(colors)) {
    document.documentElement.style.setProperty(`--${name}`, value);
  }
}

function readSavedColors() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
