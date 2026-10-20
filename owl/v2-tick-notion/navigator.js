(() => {
  const navigator = document.querySelector('.notion-tick-nav');
  const trigger = document.getElementById('notion-tick-trigger');
  const panel = document.getElementById('notion-activity-panel');
  let closeTimer;

  const cancelClose = () => clearTimeout(closeTimer);
  const setOpen = open => {
    cancelClose();
    navigator.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  };
  const close = () => {
    if (panel.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    setOpen(false);
  };

  navigator.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') setOpen(true);
  });
  navigator.addEventListener('pointerleave', event => {
    if (event.relatedTarget && navigator.contains(event.relatedTarget)) return;
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
    setOpen(true);
    panel.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => {
    if (!navigator.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      close();
    }
  });
})();
