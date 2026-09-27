// Customizable font family/sizes for the player labels and BENCH label,
// persisted in localStorage and shared between index.html and
// setup.html.

const STORAGE_KEY = 'volleyballViz.fontSettings';

export const DEFAULT_FONT_SETTINGS = {
  fontFamily: 'Verdana, Arial, sans-serif',
  playerLabelSize: 34,
  benchLabelSize: 24,
};

// Human-readable labels for the settings UI, in display order.
export const FONT_SETTING_LABELS = {
  fontFamily: 'Font Family',
  playerLabelSize: 'Player Label Size',
  benchLabelSize: 'Bench Label Size',
};

// Curated subset of fonts that render reasonably (and are widely available)
// across Windows/macOS/Linux, offered as a pick list on the setup page
// instead of free text entry. Each value is a full font-family stack with
// a generic fallback.
export const FONT_FAMILY_OPTIONS = [
  { label: 'Verdana (default)', value: 'Verdana, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Arial Black', value: '"Arial Black", Impact, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];

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
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
