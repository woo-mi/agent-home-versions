import { createVersionMenu } from './version-menu.mjs?v=76591447';

/** Compare app designs without restarting the conversation or any preview. */
export function createLiveAppVersions({ previews, onClose }) {
  let active = true;
  let selectedVersion = 'v3';
  let chatVersion = 'v1';
  const frames = Object.entries(previews).map(([version, source]) => ({
    version, source, element: document.getElementById(version === 'v1' ? 'live-app-preview' : `live-app-preview-${version}`),
  }));
  const menu = createVersionMenu({
    controlId: 'app-version-control',
    triggerId: 'app-version-trigger',
    menuId: 'app-version-menu',
    onSelect: (version) => select(version, true),
  });

  function select(version, updateUrl = false) {
    if (!previews[version]) return;
    selectedVersion = version;
    const previewVersion = chatVersion === 'v0' && version === 'v1' ? 'v0' : version;
    document.getElementById('live-app-panel').dataset.appVersion = previewVersion;
    for (const frame of frames) {
      const inactive = !active || frame.version !== previewVersion;
      frame.element.classList.toggle('app-preview-inactive', inactive);
      frame.element.inert = inactive;
      frame.element.setAttribute('aria-hidden', String(inactive));
    }
    menu.setSelection(version, `App ${version}`, `App version ${version}`);
    if (updateUrl) {
      const url = new URL(location.href);
      if (version === 'v3') url.searchParams.delete('app');
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

  const requestedVersion = new URLSearchParams(location.search).get('app');
  select(['v1', 'v2', 'v3'].includes(requestedVersion) ? requestedVersion : 'v3');
  return {
    handleEscape: menu.handleEscape,
    setVisible: menu.setVisible,
    setActive(value) { active = value; select(selectedVersion); },
    setChatVersion(value) { chatVersion = value; select(selectedVersion); },
    prepare() {
      // Previews stay mounted so their scroll positions survive comparison.
      for (const { element, source } of frames) {
        if (!element.hasAttribute('src')) element.src = source;
      }
    },
  };
}
