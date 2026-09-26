// Whether the 3D preview's billboarded player labels shrink/grow with
// camera distance (matching the pucks' own perspective scaling) or stay a
// fixed screen size regardless of distance (the CSS2DRenderer default).
// Scoped to the 3D scene only (see js/scene3d.js).
const STORAGE_KEY = 'volleyballViz.labelScaleMode3D';
export const DEFAULT_LABEL_SCALE_MODE_3D = 'scale';

export function getLabelScaleMode3D() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'scale' || raw === 'fixed' ? raw : DEFAULT_LABEL_SCALE_MODE_3D;
}

export function saveLabelScaleMode3D(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
}
