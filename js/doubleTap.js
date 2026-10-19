// iOS doesn't reliably synthesize `dblclick` on SVG/canvas (especially with
// `touch-action: none`), so touch double-taps are detected from pointer
// timing here. Native `dblclick` is still accepted for mouse, but dropped
// if a touch double-tap just fired, so a browser that sends both can't
// toggle twice.
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_PX = 12;
const DOUBLE_TAP_PX = 30;
const NATIVE_DEDUPE_MS = 500;

// `onDouble(key, event)` receives whatever `key` identified the tapped
// target (e.g. a player), so one detector can serve many targets.
export function createDoubleTapDetector(onDouble) {
  let downAt = null;
  let lastTap = null;
  let lastFiredAt = -Infinity;

  function pointerDown(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary) {
      return;
    }
    downAt = { x: event.clientX, y: event.clientY };
  }

  function pointerUp(event, key = null) {
    if (event.pointerType !== 'touch' || !event.isPrimary || !downAt) {
      return;
    }
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > TAP_MOVE_PX) {
      lastTap = null;
      return;
    }
    const now = performance.now();
    const isDouble = lastTap
      && lastTap.key === key
      && now - lastTap.time <= DOUBLE_TAP_MS
      && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= DOUBLE_TAP_PX;
    if (isDouble) {
      lastTap = null;
      lastFiredAt = now;
      onDouble(key, event);
      return;
    }
    lastTap = { key, time: now, x: event.clientX, y: event.clientY };
  }

  function nativeDoubleClick(event, key = null) {
    const now = performance.now();
    if (now - lastFiredAt < NATIVE_DEDUPE_MS) {
      return;
    }
    lastFiredAt = now;
    onDouble(key, event);
  }

  return { pointerDown, pointerUp, nativeDoubleClick };
}
