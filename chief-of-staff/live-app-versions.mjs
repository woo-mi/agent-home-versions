import { createVersionMenu } from './version-menu.mjs?v=76591447';

/** Compare app designs without restarting the conversation or either preview. */
export function createLiveAppVersions({ previews, onClose }) {
  const frames = Object.entries(previews).map(([version, source]) => ({
    version, source, element: document.getElementById(version === 'v1' ? 'live-app-preview' : 'live-app-preview-v2'),
  }));
  const menu = createVersionMenu({
    controlId: 'app-version-control',
    triggerId: 'app-version-trigger',
    menuId: 'app-version-menu',
    onSelect: (version) => select(version, true),
  });

  function select(version, updateUrl = false) {
    if (!previews[version]) return;
    for (const frame of frames) {
      const inactive = frame.version !== version;
      frame.element.classList.toggle('app-preview-inactive', inactive);
      frame.element.inert = inactive;
      frame.element.setAttribute('aria-hidden', String(inactive));
    }
    menu.setSelection(version, `App ${version}`, `App version ${version}`);
    if (updateUrl) {
      const url = new URL(location.href);
      if (version === 'v1') url.searchParams.delete('app');
      else url.searchParams.set('app', version);
      window.history.replaceState(null, '', url);
    }
  }

  for (const { element } of frames) element.addEventListener('load', () => {
    element.contentDocument?.addEventListener('pointerdown', menu.close);
    element.contentDocument?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.handleEscape(event)) {
        event.preventDefault();
        onClose();
      }
    });
  });

  select(new URLSearchParams(location.search).get('app') === 'v2' ? 'v2' : 'v1');
  return {
    handleEscape: menu.handleEscape,
    setVisible: menu.setVisible,
    prepare() {
      // Both documents stay mounted so their scroll positions survive comparison.
      for (const { element, source } of frames) {
        if (!element.hasAttribute('src')) element.src = source;
      }
    },
  };
}
