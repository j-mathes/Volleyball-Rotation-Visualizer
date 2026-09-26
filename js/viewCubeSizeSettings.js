// Persists the ViewCube widget's size (Phase 2.12's 3D view-navigation
// cube). Scoped to the 3D scene only (see js/renderer3d.js) - there's no 2D
// equivalent.
const STORAGE_KEY = 'volleyballViz.viewCubeSize3D';
export const DEFAULT_VIEW_CUBE_SIZE_3D = 'medium';
const VALID_SIZES = ['small', 'medium', 'large'];

export function getViewCubeSize3D() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return VALID_SIZES.includes(raw) ? raw : DEFAULT_VIEW_CUBE_SIZE_3D;
}

export function saveViewCubeSize3D(size) {
  localStorage.setItem(STORAGE_KEY, size);
}
