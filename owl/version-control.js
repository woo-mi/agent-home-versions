(() => {
  const versions = [
    { id: 'v0', label: 'v0 - the latest', path: 'v0-the-latest' },
    { id: 'v1', label: 'v1', path: 'one-thread' },
    { id: 'v2', label: 'v2 - tick notion', path: 'v2-tick-notion' },
    { id: 'v3', label: 'v3 - tick codex', path: 'v3-tick-codex' }
  ];
  const current = versions.find(version => version.id === document.body.dataset.prototypeVersion);
  if (!current) return;

  const control = document.createElement('nav');
  control.className = 'prototype-versions';
  control.setAttribute('aria-label', 'Prototype versions');
  control.innerHTML = `
    <button class="prototype-version-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="prototype-version-menu" aria-label="Switch prototype version, ${current.label}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-9 5 9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>
      <span>${current.label}</span>
      <svg class="prototype-version-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m4 7 6 6 6-6"/></svg>
    </button>
    <ul id="prototype-version-menu" class="prototype-version-menu" role="menu" aria-label="Prototype versions" hidden>
      ${versions.map(version => `<li role="none"><a class="prototype-version-option" role="menuitem" tabindex="-1" href="../${version.path}/"${version.id === current.id ? ' aria-current="page"' : ''}>${version.label}</a></li>`).join('')}
    </ul>`;
  document.body.append(control);

  const trigger = control.querySelector('button');
  const menu = control.querySelector('[role="menu"]');
  const options = [...menu.querySelectorAll('a')];
  const setOpen = (open, restoreFocus = false) => {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) options[versions.indexOf(current)].focus({ preventScroll: true });
    else if (restoreFocus) trigger.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', () => setOpen(menu.hidden));
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      options[event.key === 'ArrowDown' ? 0 : options.length - 1].focus({ preventScroll: true });
    }
  });
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    if (event.key === ' ' && index !== -1) {
      event.preventDefault();
      options[index].click();
      return;
    }
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      options[next].focus({ preventScroll: true });
    }
    if (event.key === 'Tab') setOpen(false, true);
  });
  options.forEach(option => option.addEventListener('click', event => {
    if (option.getAttribute('aria-current') === 'page') {
      event.preventDefault();
      setOpen(false, true);
    }
  }));
  document.addEventListener('pointerdown', event => {
    if (!control.contains(event.target)) setOpen(false);
  });
  document.addEventListener('focusin', event => {
    if (!control.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
})();
