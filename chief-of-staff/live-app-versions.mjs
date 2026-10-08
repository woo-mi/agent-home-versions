/** Compare app designs without restarting the conversation or either preview. */
export function createLiveAppVersions({ previews, onClose }) {
  const control = document.getElementById('app-version-control');
  const trigger = document.getElementById('app-version-trigger');
  const menu = document.getElementById('app-version-menu');
  const label = document.getElementById('app-version-label');
  const options = [...menu.querySelectorAll('[data-app-version]')];
  const frames = Object.entries(previews).map(([version, source]) => ({
    version, source, element: document.getElementById(version === 'v1' ? 'live-app-preview' : 'live-app-preview-v2'),
  }));
  let selected = new URLSearchParams(location.search).get('app') === 'v2' ? 'v2' : 'v1';

  function setMenu(open, focusIndex = options.findIndex((option) => option.dataset.appVersion === selected)) {
    control.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (open) options[focusIndex].focus({ preventScroll: true });
  }

  function select(version, updateUrl = false) {
    if (!previews[version]) return;
    selected = version;
    for (const frame of frames) {
      const inactive = frame.version !== version;
      frame.element.classList.toggle('app-preview-inactive', inactive);
      frame.element.inert = inactive;
      frame.element.setAttribute('aria-hidden', String(inactive));
    }
    label.textContent = version;
    trigger.setAttribute('aria-label', `App version ${version}`);
    for (const option of options) option.setAttribute('aria-checked', String(option.dataset.appVersion === version));
    if (updateUrl) {
      const url = new URL(location.href);
      if (version === 'v1') url.searchParams.delete('app');
      else url.searchParams.set('app', version);
      window.history.replaceState(null, '', url);
    }
  }

  function handleEscape(event) {
    if (event.key !== 'Escape' || menu.hidden) return false;
    event.preventDefault();
    setMenu(false);
    trigger.focus({ preventScroll: true });
    return true;
  }

  trigger.addEventListener('click', () => setMenu(menu.hidden));
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setMenu(true, event.key === 'ArrowUp' ? options.length - 1 : 0);
    }
  });
  for (const option of options) option.addEventListener('click', () => {
    select(option.dataset.appVersion, true);
    setMenu(false);
    trigger.focus({ preventScroll: true });
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
      options[next].focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setMenu(false);
      trigger.focus({ preventScroll: true });
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!control.contains(event.target)) setMenu(false);
  });
  control.addEventListener('focusout', (event) => {
    if (!control.contains(event.relatedTarget)) setMenu(false);
  });
  for (const { element } of frames) element.addEventListener('load', () => {
    element.contentDocument?.addEventListener('pointerdown', () => setMenu(false));
    element.contentDocument?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !handleEscape(event)) {
        event.preventDefault();
        onClose();
      }
    });
  });

  select(selected);
  return {
    handleEscape,
    setVisible(open) {
      if (!open) setMenu(false);
      control.hidden = !open;
    },
    prepare() {
      // Both documents stay mounted so their scroll positions survive comparison.
      for (const { element, source } of frames) {
        if (!element.hasAttribute('src')) element.src = source;
      }
    },
  };
}
