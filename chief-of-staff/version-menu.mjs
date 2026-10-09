/** Shared version picker behavior; the caller owns selection state and routing. */
export function createVersionMenu({ controlId, triggerId, menuId, onSelect }) {
  const control = document.getElementById(controlId);
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById(menuId);
  const label = trigger.querySelector('[data-version-label]');
  const options = [...menu.querySelectorAll('button[data-version]')];
  let selected = options.find((option) => option.getAttribute('aria-checked') === 'true')?.dataset.version
    ?? options[0]?.dataset.version;

  function close() {
    control.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  }

  function open(focusIndex = options.findIndex((option) => option.dataset.version === selected)) {
    if (control.hidden || !options.length) return;
    control.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    options[Math.max(0, focusIndex)].focus({ preventScroll: true });
  }

  function setSelection(version, text = version, accessibleLabel = text) {
    if (!options.some((option) => option.dataset.version === version)) return;
    selected = version;
    label.textContent = text;
    trigger.setAttribute('aria-label', accessibleLabel);
    for (const option of options) {
      option.setAttribute('aria-checked', String(option.dataset.version === version));
    }
  }

  function handleEscape(event) {
    if (event.key !== 'Escape' || menu.hidden) return false;
    event.preventDefault();
    close();
    trigger.focus({ preventScroll: true });
    return true;
  }

  trigger.addEventListener('click', () => {
    if (menu.hidden) open();
    else close();
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowUp' ? options.length - 1 : 0);
    }
  });
  for (const option of options) option.addEventListener('click', () => {
    onSelect(option.dataset.version);
    close();
    if (!control.hidden) trigger.focus({ preventScroll: true });
  });
  menu.addEventListener('keydown', (event) => {
    const index = options.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      options[next]?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      close();
      // Native Tab continues from the trigger to the next (or previous) control.
      trigger.focus({ preventScroll: true });
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!control.contains(event.target)) close();
  });
  control.addEventListener('focusout', (event) => {
    if (!control.contains(event.relatedTarget)) close();
  });

  return {
    control,
    trigger,
    setSelection,
    handleEscape,
    close,
    setVisible(visible) {
      if (!visible) close();
      control.hidden = !visible;
    },
  };
}
