// Named snapshots of the full on-court state (player positions, zone/role
// mapping, Libero swap), persisted in localStorage and shared between
// index.html (which captures/applies them - see main.js's
// captureCurrentState/applyState) and setup.html (which manages the list).
//
// State shape: { version, zoneToRole: {1: 'S', ...}, liberoReplacedRole,
// positions: { S: {x, y}, ... } }

import { SETTER_ROLE, ROTATION_NUMBER_BY_SETTER_ZONE } from './config.js';

const SETUPS_KEY = 'volleyballViz.savedSetups';
const PENDING_KEY = 'volleyballViz.pendingSetup';

export function isValidState(state) {
  return !!state
    && typeof state === 'object'
    && state.zoneToRole && typeof state.zoneToRole === 'object'
    && state.positions && typeof state.positions === 'object';
}

// The traditional volleyball "rotation number" for a saved state, derived
// from which zone the Setter occupies (same rule as RotationState).
export function getRotationNumber(state) {
  const setterZone = Object.keys(state.zoneToRole).map(Number).find((zone) => state.zoneToRole[zone] === SETTER_ROLE);
  return setterZone ? ROTATION_NUMBER_BY_SETTER_ZONE[setterZone] : null;
}

export function getSavedSetups() {
  try {
    const raw = localStorage.getItem(SETUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(setups) {
  localStorage.setItem(SETUPS_KEY, JSON.stringify(setups));
}

export function saveSetup(name, state) {
  const setups = getSavedSetups();
  const entry = { id: crypto.randomUUID(), name, savedAt: Date.now(), state };
  setups.push(entry);
  persist(setups);
  return entry;
}

export function deleteSetup(id) {
  persist(getSavedSetups().filter((setup) => setup.id !== id));
}

// Set by setup.html's "Load" button; read (and cleared) the next time
// index.html loads, so the visualizer picks it up automatically.
export function setPendingSetup(state) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(state));
}

export function takePendingSetup() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
