import { ROLE_LABELS } from './config.js';

const STORAGE_KEY = 'volleyballViz.playerLabels';

// Custom per-role display labels (e.g. jersey numbers instead of "OH1"),
// persisted in localStorage so they survive reloads and are shared between
// index.html and setup.html. Falls back to config.js's default role labels
// for any role that hasn't been customized (or if storage is empty/corrupt).
export function getPlayerLabels() {
  const saved = readSavedLabels();
  return { ...ROLE_LABELS, ...saved };
}

export function savePlayerLabels(labels) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
}

export function resetPlayerLabels() {
  localStorage.removeItem(STORAGE_KEY);
}

function readSavedLabels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
