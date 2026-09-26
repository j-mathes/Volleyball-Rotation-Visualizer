// Persists which side of the 3D court the bench/Libero substitution area
// sits on. Scoped to the 3D scene only (see js/renderer3d.js) - the 2D
// renderer.js interface already derives bench side automatically per
// net-orientation view angle, so it doesn't need this setting.
const STORAGE_KEY = 'volleyballViz.benchSide3D';
export const DEFAULT_BENCH_SIDE_3D = 'left';

export function getBenchSide3D() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'left' || raw === 'right' ? raw : DEFAULT_BENCH_SIDE_3D;
}

export function saveBenchSide3D(side) {
  localStorage.setItem(STORAGE_KEY, side);
}
