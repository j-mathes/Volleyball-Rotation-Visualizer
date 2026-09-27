// Single source of truth for every keyboard/mouse control the app
// supports, shared by the quad-menu's "Keys" section (js/quadMenu.js,
// clickable subset only, using `shortLabel`) and the full reference page
// (reference.html/js/reference.js, everything, using `label`, read-only).
// `appliesTo` is '2d', '3d', or 'both'. `action`, when present, is a key
// into the callback map main.js builds in `wireQuadMenu()` - entries
// without one are informational only (nothing to "click" - e.g.
// describing what a mouse gesture does).
export const KEYBOARD_SHORTCUTS = [
  { key: 'P / Home', shortLabel: 'Reset', label: 'Reset to the default camera view', appliesTo: '3d', action: 'resetView' },
  { key: 'T', shortLabel: 'Top', label: 'Snap to Top view', appliesTo: '3d', action: 'viewTop' },
  { key: 'E', shortLabel: 'Endline', label: 'Snap to Endline view', appliesTo: '3d', action: 'viewEndline' },
  { key: 'N', shortLabel: 'Net', label: 'Snap to Net view', appliesTo: '3d', action: 'viewNet' },
  { key: 'L', shortLabel: 'Left', label: 'Snap to Left view', appliesTo: '3d', action: 'viewLeft' },
  { key: 'R', shortLabel: 'Right', label: 'Snap to Right view', appliesTo: '3d', action: 'viewRight' },
  { key: 'Z', shortLabel: 'Extents', label: 'Zoom extents (frames the whole court, or the selected player if one is picked)', appliesTo: '3d', action: 'zoomExtents' },
  { key: 'V', shortLabel: 'View Menu', label: 'Toggle the ViewCube\u2019s view-picker menu', appliesTo: '3d', action: null },
  { key: ']', shortLabel: 'Rotate CW', label: 'Rotate clockwise (standard side-out rotation)', appliesTo: 'both', action: 'rotateCw' },
  { key: '[', shortLabel: 'Rotate CCW', label: 'Rotate counter-clockwise (undo)', appliesTo: 'both', action: 'rotateCcw' },
  { key: '0', shortLabel: 'Reset to Base', label: 'Reset every player to their zone\u2019s base position', appliesTo: 'both', action: 'resetToBase' },
  { key: 'S', shortLabel: 'Swap Libero', label: 'Swap the Libero in/out', appliesTo: 'both', action: 'swapLibero' },
  { key: 'G', shortLabel: 'Overlap Guides', label: 'Toggle Show Overlap Guides', appliesTo: 'both', action: 'toggleGuides' },
  { key: 'J', shortLabel: 'Player Links', label: 'Toggle Show Player Links', appliesTo: 'both', action: 'toggleLinks' },
  { key: 'C', shortLabel: 'Lock to Legal', label: 'Toggle Lock to Legal Positions', appliesTo: 'both', action: 'toggleClamp' },
];

export const MOUSE_CONTROLS = [
  { input: 'Left-click + drag', label: 'Select and move a player', appliesTo: 'both' },
  { input: 'Double-click a player', label: 'Lock/unlock the current selection', appliesTo: 'both' },
  { input: 'Right-click', label: 'Open this menu', appliesTo: 'both' },
  { input: 'Alt + left-click drag', label: 'Orbit the camera', appliesTo: '3d' },
  { input: 'Shift + left-click drag', label: 'Pan the camera', appliesTo: '3d' },
  { input: 'Scroll wheel', label: 'Zoom the camera', appliesTo: '3d' },
];
