(() => {
  const navigator = document.querySelector('.notion-tick-nav');
  const trigger = document.getElementById('notion-tick-trigger');
  const panel = document.getElementById('notion-activity-panel');
  const hoverDelay = 400;
  const movementTolerance = 6;
  let openTimer;
  let closeTimer;
  let hoverPoint;
  let hoverDismissed = false;

  const cancelOpen = () => {
    clearTimeout(openTimer);
    openTimer = undefined;
  };
  const cancelClose = () => clearTimeout(closeTimer);
  const setOpen = open => {
    cancelOpen();
    cancelClose();
    navigator.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };
  const close = () => {
    if (panel.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    setOpen(false);
  };
  const waitForHover = event => {
    cancelOpen();
    hoverPoint = { x: event.clientX, y: event.clientY };
    openTimer = setTimeout(() => {
      openTimer = undefined;
      if (!hoverDismissed && navigator.matches(':hover')) setOpen(true);
    }, hoverDelay);
  };

  navigator.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    cancelClose();
    hoverDismissed = false;
    if (panel.hidden) waitForHover(event);
  });
  navigator.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !panel.hidden || hoverDismissed) return;
    // Ignore tiny hand movements; wait again when the pointer is still exploring.
    if (!hoverPoint || Math.hypot(event.clientX - hoverPoint.x, event.clientY - hoverPoint.y) > movementTolerance) {
      waitForHover(event);
    }
  });
  navigator.addEventListener('pointerleave', event => {
    if (event.relatedTarget && navigator.contains(event.relatedTarget)) return;
    cancelOpen();
    hoverPoint = undefined;
    hoverDismissed = false;
    cancelClose();
    closeTimer = setTimeout(() => {
      if (!navigator.matches(':hover') && !navigator.contains(document.activeElement)) setOpen(false);
    }, 160);
  });
  navigator.addEventListener('focusin', cancelClose);
  navigator.addEventListener('focusout', event => {
    if (!navigator.contains(event.relatedTarget)) setOpen(false);
  });

  // Keyboard activation and taps open the same panel without a hover dependency.
  trigger.addEventListener('click', () => {
    hoverDismissed = false;
    setOpen(true);
    panel.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => {
    if (!navigator.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (!panel.hidden || openTimer !== undefined)) {
      event.preventDefault();
      hoverDismissed = true;
      close();
    }
  });
})();
