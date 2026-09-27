// Whether dragging the mouse up while locked onto an R1/R2 first-person
// viewpoint pitches the view up (inverted) or down (default - mouse up =
// look down, per user preference). Scoped to the 3D scene only (see
// js/renderer3d.js).
const STORAGE_KEY = 'volleyballViz.invertPitch3D';

export function getInvertPitch3D() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function saveInvertPitch3D(invert) {
  localStorage.setItem(STORAGE_KEY, invert ? 'true' : 'false');
}
