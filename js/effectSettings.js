// Customizable glow/pulse effect settings for the selectable/guide-
// selected/locked player highlights, persisted in localStorage and shared
// between index.html and setup.html.

const STORAGE_KEY = 'volleyballViz.effectSettings';

export const DEFAULT_EFFECT_SETTINGS = {
  glowBlurRadius: 6,
  pulseMaxBlurRadius: 14,
  pulseDurationMs: 1200,
};

// Human-readable labels for the settings UI, in display order.
export const EFFECT_SETTING_LABELS = {
  glowBlurRadius: 'Glow Blur Radius (px)',
  pulseMaxBlurRadius: 'Pulse Max Blur (px)',
  pulseDurationMs: 'Pulse Duration (ms)',
};

export function getEffectSettings() {
  return { ...DEFAULT_EFFECT_SETTINGS, ...readSaved() };
}

export function saveEffectSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetEffectSettings() {
  localStorage.removeItem(STORAGE_KEY);
}

// Applies the saved (or default) effect settings as inline CSS custom
// properties on the root element, overriding style.css's :root values.
export function applyEffectSettings() {
  const settings = getEffectSettings();
  document.documentElement.style.setProperty('--glow-blur-radius', `${settings.glowBlurRadius}px`);
  document.documentElement.style.setProperty('--pulse-max-blur-radius', `${settings.pulseMaxBlurRadius}px`);
  document.documentElement.style.setProperty('--pulse-duration', `${settings.pulseDurationMs}ms`);
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
