// Customizable font family/sizes for the player labels, BENCH label, and
// "R#" rotation tracker, persisted in localStorage and shared between
// index.html and setup.html.

const STORAGE_KEY = 'volleyballViz.fontSettings';

export const DEFAULT_FONT_SETTINGS = {
  fontFamily: 'Verdana, Arial, sans-serif',
  playerLabelSize: 34,
  benchLabelSize: 24,
  rotationTrackerSize: 56,
};

// Human-readable labels for the settings UI, in display order.
export const FONT_SETTING_LABELS = {
  fontFamily: 'Font Family',
  playerLabelSize: 'Player Label Size',
  benchLabelSize: 'Bench Label Size',
  rotationTrackerSize: 'Rotation Tracker Size',
};

export function getFontSettings() {
  return { ...DEFAULT_FONT_SETTINGS, ...readSaved() };
}

export function saveFontSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetFontSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

// Applies the saved (or default) font settings as inline CSS custom
// properties on the root element, overriding style.css's :root values.
export function applyFontSettings() {
  const settings = getFontSettings();
  document.documentElement.style.setProperty('--diagram-font-family', settings.fontFamily);
  document.documentElement.style.setProperty('--player-label-size', `${settings.playerLabelSize}px`);
  document.documentElement.style.setProperty('--bench-label-size', `${settings.benchLabelSize}px`);
  document.documentElement.style.setProperty('--rotation-tracker-size', `${settings.rotationTrackerSize}px`);
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
