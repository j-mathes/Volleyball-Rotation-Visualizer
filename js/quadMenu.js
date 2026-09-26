// Generic right-click quad-menu mechanics (ROADMAP Phase 3.3) - owns
// opening/closing/positioning the menu and showing/hiding the two
// 3D-only sections, but knows nothing about what any individual button
// does. main.js wires up the actual button behavior; this module is
// reusable "any popup menu with up to 4 sections" plumbing, mirroring
// how court.js/renderer.js stay app-logic-free.
export function createQuadMenu(menuEl, viewCameraSectionEl, sceneSetupSectionEl) {
  function close() {
    menuEl.hidden = true;
  }

  // Opens the menu with its top-left corner at (x, y), clamped so it
  // never overflows past the right/bottom edge of the viewport.
  function open(x, y, is3D) {
    viewCameraSectionEl.hidden = !is3D;
    sceneSetupSectionEl.hidden = !is3D;
    menuEl.hidden = false;
    menuEl.style.left = '0px';
    menuEl.style.top = '0px';
    const rect = menuEl.getBoundingClientRect();
    menuEl.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
    menuEl.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  }

  function isOpen() {
    return !menuEl.hidden;
  }

  // Closes on a click outside the menu, or Escape - standard context-menu
  // dismissal conventions.
  document.addEventListener('click', (event) => {
    if (isOpen() && !menuEl.contains(event.target)) {
      close();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (isOpen() && event.key === 'Escape') {
      close();
    }
  });

  return { open, close, isOpen };
}
