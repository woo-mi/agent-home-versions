(() => {
  const root = document.documentElement;
  const panel = document.getElementById('profile-panel');
  const close = document.getElementById('profile-close');
  const backdrop = document.getElementById('right-panel-backdrop');
  const triggers = ['profile-identity-toggle', 'profile-toggle'].map(id => document.getElementById(id));
  const tabs = [...panel.querySelectorAll('[role="tab"]')];
  const content = panel.querySelector('.right-panel-scroll');
  const conversation = document.querySelector('[data-pencil-id="Fr1yZ"]');
  const header = document.querySelector('[data-pencil-id="Qgz9s"]');
  const compact = matchMedia('(max-width: 1100px)');
  const previousInert = new Map();
  let opener = triggers[0];
  let layoutFrame;

  function selectTab(tab, focus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    content.scrollTop = 0;
    if (focus) tab.focus({ preventScroll: true });
  }

  function syncModal() {
    const modal = !panel.hidden && compact.matches;
    backdrop.hidden = !modal;
    panel.setAttribute('aria-modal', String(modal));
    if (modal) {
      [...document.body.children].filter(node => node !== panel && node !== backdrop &&
        !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName)).forEach(node => {
        if (!previousInert.has(node)) previousInert.set(node, node.inert);
        node.inert = true;
      });
    } else {
      previousInert.forEach((inert, node) => { node.inert = inert; });
      previousInert.clear();
    }
  }

  function setOpen(open, restoreFocus = true) {
    cancelAnimationFrame(layoutFrame);
    document.dispatchEvent(new Event('owl-profile-change'));
    const atEnd = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 3;
    const clearance = header.getBoundingClientRect().bottom;
    const anchor = [...conversation.querySelectorAll('[id^="codex-message-"]')]
      .find(node => node.getBoundingClientRect().bottom > clearance);
    const anchorTop = anchor?.getBoundingClientRect().top;

    panel.hidden = !open;
    root.dataset.rightPanelOpen = String(open);
    triggers.forEach(trigger => trigger.setAttribute('aria-expanded', String(open)));
    triggers[0].setAttribute('aria-label', open ? 'Close Chief of Staff panel' : 'Open Chief of Staff panel');
    syncModal();
    if (open) {
      selectTab(document.getElementById('right-panel-tab-connections'));
      panel.focus({ preventScroll: true });
    } else if (restoreFocus) {
      opener.focus({ preventScroll: true });
    }
    const restorePosition = () => {
      if (atEnd) conversation.scrollTop = conversation.scrollHeight;
      else if (anchor) conversation.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
    };
    restorePosition();
    layoutFrame = requestAnimationFrame(restorePosition);
  }

  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    opener = trigger;
    setOpen(panel.hidden);
  }));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  const history = document.getElementById('right-panel-history');
  history.addEventListener('click', event => {
    const entry = event.target.closest('[data-history-message]');
    if (!entry) return;
    setOpen(false, false);
    requestAnimationFrame(() => {
      // Let the composer resize after closing before starting the conversation jump.
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('owl-history-navigate', {
          detail: { messageId: entry.dataset.historyMessage }
        }));
      });
    });
  });
  document.addEventListener('owl-message-sent', event => {
    const node = event.detail?.node;
    if (!node?.id || history.querySelector(`[data-history-message="${node.id}"]`)) return;
    const row = document.createElement('li');
    row.className = 'right-panel-activity-row';
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.className = 'right-panel-history-link right-panel-activity-label';
    entry.dataset.historyMessage = node.id;
    entry.textContent = node.querySelector('[data-reply-text]')?.textContent.trim() || 'New message';
    row.append(entry);
    history.querySelector('.right-panel-activity-list').prepend(row);
  });
  document.addEventListener('owl-sidebar-change', () => {
    if (!panel.hidden) setOpen(false, false);
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  document.addEventListener('keydown', event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab' && compact.matches) {
      const controls = [...panel.querySelectorAll('button, [tabindex="0"]')]
        .filter(node => node.tabIndex >= 0 && !node.closest('[hidden]') && !node.disabled);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  compact.addEventListener('change', () => {
    syncModal();
    if (!panel.hidden && compact.matches && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
  });
  panel.querySelectorAll('.right-panel-switch').forEach(toggle => {
    const status = toggle.closest('.right-panel-tool')?.querySelector('.right-panel-schedule-time');
    const enabledStatus = status?.textContent;
    toggle.addEventListener('click', () => {
      const enabled = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(enabled));
      if (status) status.textContent = enabled ? enabledStatus : 'Disabled';
    });
  });
})();
