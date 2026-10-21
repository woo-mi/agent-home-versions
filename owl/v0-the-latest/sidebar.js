(() => {
  const root = document.documentElement;
  const app = document.querySelector('[data-pencil-id="uEFHe"]');
  const sidebar = document.getElementById('app-sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  const conversation = document.querySelector('[data-pencil-id="Fr1yZ"]');
  const header = document.querySelector('[data-pencil-id="Qgz9s"]');
  const compact = matchMedia('(max-width: 900px)');
  const previousInert = new Map();
  let layoutFrame;

  function syncDrawer(open) {
    backdrop.hidden = !open;
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      const outside = [...app.children, ...document.body.children]
        .filter(node => node !== sidebar && node !== app && node !== backdrop &&
          !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName));
      outside.forEach(node => {
        if (!previousInert.has(node)) previousInert.set(node, node.inert);
        node.inert = true;
      });
    } else {
      sidebar.setAttribute('role', 'navigation');
      sidebar.removeAttribute('aria-modal');
      previousInert.forEach((inert, node) => { node.inert = inert; });
      previousInert.clear();
    }
  }

  function setCollapsed(collapsed, preservePosition = true) {
    cancelAnimationFrame(layoutFrame);
    const atEnd = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 3;
    const clearance = header.getBoundingClientRect().bottom;
    const anchor = [...conversation.querySelectorAll('[id^="codex-message-"]')]
      .find(node => node.getBoundingClientRect().bottom > clearance);
    const anchorTop = anchor?.getBoundingClientRect().top;
    if (preservePosition) document.dispatchEvent(new Event('owl-sidebar-change'));

    root.dataset.sidebarCollapsed = String(collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    toggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    syncDrawer(compact.matches && !collapsed);

    if (preservePosition) {
      const restorePosition = () => {
        if (atEnd) conversation.scrollTop = conversation.scrollHeight;
        else if (anchor) conversation.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
      };
      restorePosition();
      layoutFrame = requestAnimationFrame(restorePosition);
    }
  }

  toggle.addEventListener('click', () => {
    setCollapsed(root.dataset.sidebarCollapsed !== 'true');
  });
  const closeDrawer = () => {
    setCollapsed(true);
    toggle.focus({ preventScroll: true });
  };
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => {
    if (backdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
    } else if (event.key === 'Tab') {
      // The prototype's navigation labels are static; the toggle is its only control.
      event.preventDefault();
      toggle.focus({ preventScroll: true });
    }
  });
  compact.addEventListener('change', () => setCollapsed(compact.matches));
  setCollapsed(root.dataset.sidebarCollapsed === 'true', false);
})();
