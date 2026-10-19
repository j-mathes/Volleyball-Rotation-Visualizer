// Generic right-click quad-menu mechanics (ROADMAP Phase 3.3) - owns
// opening/closing/positioning the menu and showing/hiding whatever's
// marked `.quad-3d-only` (a whole section, or just one group within an
// otherwise-both-modes section), but knows nothing about what any
// individual button does. main.js wires up the actual button behavior;
// this module is reusable "any popup menu with up to 4 sections"
// plumbing, mirroring how court.js/renderer.js stay app-logic-free.
export function createQuadMenu(menuEl, triggerEl = null) {
  const lineH = menuEl.querySelector('.quad-line-h');
  const lineV = menuEl.querySelector('.quad-line-v');
  const sections = menuEl.querySelectorAll('.quad-section');
  const only3DEls = menuEl.querySelectorAll('.quad-3d-only');
  // Phones don't have room for the radial layout - see `.quad-sheet` in
  // style.css.
  const sheetQuery = window.matchMedia('(max-width: 600px), (max-height: 500px) and (pointer: coarse)');
  menuEl.querySelector('.quad-close')?.addEventListener('click', () => close());

  function close() {
    menuEl.hidden = true;
  }

  // Top sections grow upward from the anchor and bottom ones downward, so a
  // short viewport (phone landscape) would clip them; cap each side's
  // share of the viewport height and let the section scroll instead.
  function capSectionHeights(margin) {
    let topH = 0;
    let bottomH = 0;
    for (const section of sections) {
      section.style.maxHeight = '';
      section.style.overflowY = '';
      if (section.hidden) {
        continue;
      }
      const h = section.getBoundingClientRect().height;
      if (section.classList.contains('quad-tl') || section.classList.contains('quad-tr')) {
        topH = Math.max(topH, h);
      } else {
        bottomH = Math.max(bottomH, h);
      }
    }
    const total = window.innerHeight - 2 * margin;
    if (topH + bottomH <= total) {
      return;
    }
    const topCap = Math.floor(total * (topH / (topH + bottomH)));
    const bottomCap = total - topCap;
    for (const section of sections) {
      const isTop = section.classList.contains('quad-tl') || section.classList.contains('quad-tr');
      section.style.maxHeight = `${isTop ? topCap : bottomCap}px`;
      section.style.overflowY = 'auto';
    }
  }

  // Opens the menu centered exactly at (x, y) - the cursor - with each
  // quad-section expanding outward from that point into its own corner
  // (3ds Max quad-menu convention), rather than a single box anchored at
  // one corner. Measures the visible sections first to (a) keep every
  // one fully on-screen even if the cursor is near a viewport edge, and
  // (b) size the crosshair lines to exactly span the visible content.
  function open(x, y, is3D) {
    only3DEls.forEach((el) => { el.hidden = !is3D; });
    menuEl.hidden = false;
    const sheet = sheetQuery.matches;
    menuEl.classList.toggle('quad-sheet', sheet);
    if (sheet) {
      menuEl.style.left = '';
      menuEl.style.top = '';
      sections.forEach((section) => {
        section.style.maxHeight = '';
        section.style.overflowY = '';
      });
      return;
    }
    menuEl.style.left = `${x}px`;
    menuEl.style.top = `${y}px`;

    const margin = 8;
    capSectionHeights(margin);

    let maxLeftW = 0;
    let maxRightW = 0;
    let maxTopH = 0;
    let maxBottomH = 0;
    for (const section of sections) {
      if (section.hidden) {
        continue;
      }
      const rect = section.getBoundingClientRect();
      const isLeft = section.classList.contains('quad-tl') || section.classList.contains('quad-bl');
      const isTop = section.classList.contains('quad-tl') || section.classList.contains('quad-tr');
      if (isLeft) {
        maxLeftW = Math.max(maxLeftW, rect.width);
      } else {
        maxRightW = Math.max(maxRightW, rect.width);
      }
      if (isTop) {
        maxTopH = Math.max(maxTopH, rect.height);
      } else {
        maxBottomH = Math.max(maxBottomH, rect.height);
      }
    }

    const clampedX = Math.min(Math.max(x, maxLeftW + margin), window.innerWidth - maxRightW - margin);
    const clampedY = Math.min(Math.max(y, maxTopH + margin), window.innerHeight - maxBottomH - margin);
    menuEl.style.left = `${clampedX}px`;
    menuEl.style.top = `${clampedY}px`;

    lineH.style.left = `${-maxLeftW}px`;
    lineH.style.width = `${maxLeftW + maxRightW}px`;
    lineV.style.top = `${-maxTopH}px`;
    lineV.style.height = `${maxTopH + maxBottomH}px`;
  }

  function isOpen() {
    return !menuEl.hidden;
  }

  // Closes on a press outside the menu (pointerdown, not click - iOS
  // doesn't bubble `click` to `document` from non-interactive elements like
  // the canvas), or Escape. The trigger button is excluded so tapping it
  // while open toggles instead of close-then-reopen.
  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !menuEl.contains(event.target) && !triggerEl?.contains(event.target)) {
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
