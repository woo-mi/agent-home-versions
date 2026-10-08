import { createVersionMenu } from './version-menu.mjs?v=76591447';

const VERSIONS = new Set(['v0', 'v1', 'v2']);

/** Compare chat widths while keeping the same conversation and draft. */
export function createChatVersions({ update }) {
  const composer = document.getElementById('chat-form');
  const menu = createVersionMenu({
    controlId: 'chat-version-control',
    triggerId: 'chat-version-trigger',
    menuId: 'chat-version-menu',
    onSelect: (version) => select(version, true),
  });

  function positionControl() {
    if (menu.control.hidden) return;
    const bounds = composer.getBoundingClientRect();
    const overlaps = innerWidth - 16 - menu.trigger.offsetWidth < bounds.right + 12;
    // On narrower desktops the control uses the existing gap above the input.
    menu.control.style.bottom = `${overlaps ? innerHeight - bounds.top + 12 : 16}px`;
  }

  function select(version, updateUrl = false) {
    if (!VERSIONS.has(version)) return;
    update(() => { document.body.dataset.chatVersion = version; });
    menu.setSelection(version, `Chat ${version}`, `Chat layout ${version}`);
    if (updateUrl) {
      const url = new URL(location.href);
      if (version === 'v1') url.searchParams.delete('chat');
      else url.searchParams.set('chat', version);
      window.history.replaceState(null, '', url);
    }
    positionControl();
  }

  const observer = new ResizeObserver(positionControl);
  observer.observe(composer);
  observer.observe(menu.trigger);
  window.addEventListener('resize', positionControl);
  const requestedVersion = new URLSearchParams(location.search).get('chat');
  select(VERSIONS.has(requestedVersion) ? requestedVersion : 'v1');

  return {
    handleEscape: menu.handleEscape,
    setVisible(visible) {
      menu.setVisible(visible);
      positionControl();
    },
  };
}
