// Customizable stroke-width settings for guide/violation/link lines and
// the player circle outline, persisted in localStorage and shared between
// index.html (which reads/applies them) and setup.html (which edits them).

const STORAGE_KEY = 'volleyballViz.lineSettings';

export const DEFAULT_LINE_SETTINGS = {
  playerOutlineWidth: 5,
  guideLineWidth: 3,
  violationLineWidth: 4,
  linkLineWidth: 3,
};

// Human-readable labels for the settings UI, in display order.
export const LINE_SETTING_LABELS = {
  playerOutlineWidth: 'Player Outline',
  guideLineWidth: 'Guide Line',
  violationLineWidth: 'Violation Line',
  linkLineWidth: 'Player Link Line',
};

export function getLineSettings() {
  return { ...DEFAULT_LINE_SETTINGS, ...readSaved() };
}

export function saveLineSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetLineSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

// Applies the player outline width as a CSS custom property, overriding
// style.css's :root value. The other widths are read directly by main.js
// when it draws each guide/violation/link line.
export function applyLineSettings() {
  const settings = getLineSettings();
  document.documentElement.style.setProperty('--player-outline-width', settings.playerOutlineWidth);
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
