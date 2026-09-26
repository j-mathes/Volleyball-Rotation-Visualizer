// Single source of truth for every keyboard/mouse control the app
// supports, shared by the quad-menu's "Keyboard & Mouse" section
// (js/quadMenu.js, clickable subset only) and the full reference page
// (reference.html/js/reference.js, everything, read-only). `appliesTo` is
// '2d', '3d', or 'both'. `action`, when present, is a key into the
// callback map main.js builds in `wireQuadMenu()` - entries without one
// are informational only (nothing to "click" - e.g. describing what a
// mouse gesture does).
export const KEYBOARD_SHORTCUTS = [
  { key: 'P / Home', label: 'Reset to the default camera view', appliesTo: '3d', action: 'resetView' },
  { key: 'T', label: 'Snap to Top view', appliesTo: '3d', action: 'viewTop' },
  { key: 'F', label: 'Snap to Endline view', appliesTo: '3d', action: 'viewEndline' },
  { key: 'L', label: 'Snap to Left view', appliesTo: '3d', action: 'viewLeft' },
  { key: 'Z', label: 'Zoom extents (frames the whole court, or the selected player if one is picked)', appliesTo: '3d', action: 'zoomExtents' },
  { key: 'V', label: 'Toggle the ViewCube\u2019s view-picker menu', appliesTo: '3d', action: null },
];

export const MOUSE_CONTROLS = [
  { input: 'Left-click + drag', label: 'Select and move a player', appliesTo: 'both' },
  { input: 'Double-click a player', label: 'Lock/unlock the current selection', appliesTo: 'both' },
  { input: 'Right-click', label: 'Open this menu', appliesTo: 'both' },
  { input: 'Alt + left-click drag', label: 'Orbit the camera', appliesTo: '3d' },
  { input: 'Scroll wheel', label: 'Zoom the camera', appliesTo: '3d' },
];
