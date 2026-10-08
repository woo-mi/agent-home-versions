import { createVersionMenu } from './version-menu.mjs?v=76591447';

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
    if (version !== 'v1' && version !== 'v2') return;
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
  select(new URLSearchParams(location.search).get('chat') === 'v2' ? 'v2' : 'v1');

  return {
    handleEscape: menu.handleEscape,
    setVisible(visible) {
      menu.setVisible(visible);
      positionControl();
    },
  };
}
