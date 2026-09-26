// Persists which rendering mode (2D SVG vs. 3D Three.js scene) the main
// visualizer is currently showing - shared between index.html's toggle
// and (indirectly) setup.html, which links to the 3D-only settings below.
const STORAGE_KEY = 'volleyballViz.viewMode';
export const DEFAULT_VIEW_MODE = '2d';

export function getViewMode() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === '2d' || raw === '3d' ? raw : DEFAULT_VIEW_MODE;
}

export function saveViewMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
}
