// Persisted net-orientation view angle (0/net-top, 90/net-right,
// -90/net-left) - see court.js's createViewport/setViewportRotation for
// how the angle rotates the whole diagram.

const STORAGE_KEY = 'volleyballViz.viewAngle';
const DEFAULT_VIEW_ANGLE = 0;
const VALID_ANGLES = [0, 90, -90];

export function getViewAngle() {
  const raw = Number(localStorage.getItem(STORAGE_KEY));
  return VALID_ANGLES.includes(raw) ? raw : DEFAULT_VIEW_ANGLE;
}

export function saveViewAngle(angle) {
  localStorage.setItem(STORAGE_KEY, String(angle));
}
