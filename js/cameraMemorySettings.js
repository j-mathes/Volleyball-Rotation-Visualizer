// Persists whether the 3D camera's position/orbit-target should be
// remembered across a 2D<->3D view-mode switch within the same session
// (see main.js's switchViewMode) - 3D-only, no 2D equivalent. Defaults to
// ON, unlike most other boolean toggles in this app.
const STORAGE_KEY = 'volleyballViz.rememberCameraPosition3D';
export const DEFAULT_REMEMBER_CAMERA_POSITION_3D = true;

export function getRememberCameraPosition3D() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? DEFAULT_REMEMBER_CAMERA_POSITION_3D : raw === 'true';
}

export function saveRememberCameraPosition3D(value) {
  localStorage.setItem(STORAGE_KEY, String(value));
}
