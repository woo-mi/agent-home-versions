(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const shell = byId('app-shell');
  const input = byId('message-input');
  const form = byId('message-form');
  const send = byId('send-button');
  const history = byId('message-history');
  const empty = byId('empty-state');
  const panelToggle = byId('panel-toggle');
  const openNavigation = byId('open-navigation');
  const closeNavigation = byId('close-navigation');
  const backdrop = byId('sidebar-backdrop');
  const mobile = window.matchMedia('(max-width: 700px)');
  const status = byId('status-message');
  let statusTimeout;

  function announce(message) {
    window.clearTimeout(statusTimeout);
    status.textContent = message;
    status.hidden = false;
    statusTimeout = window.setTimeout(() => { status.hidden = true; }, 3000);
  }

  function setNavigation(open) {
    if (mobile.matches) {
      shell.classList.toggle('mobile-navigation-open', open);
      shell.classList.remove('navigation-collapsed');
      backdrop.hidden = !open;
    } else {
      shell.classList.toggle('navigation-collapsed', !open);
      shell.classList.remove('mobile-navigation-open');
      backdrop.hidden = true;
    }
    openNavigation.setAttribute('aria-expanded', String(open));
    closeNavigation.setAttribute('aria-expanded', String(open));
  }

  function syncSend() {
    send.disabled = input.value.trim().length === 0;
  }

  function resetConversation() {
    input.value = '';
    history.replaceChildren();
    history.hidden = true;
    empty.hidden = false;
    shell.classList.remove('conversation-hidden');
    panelToggle.setAttribute('aria-expanded', 'true');
    panelToggle.setAttribute('aria-label', 'Hide conversation panel');
    panelToggle.title = 'Hide conversation panel';
    status.hidden = true;
    syncSend();
    if (mobile.matches) setNavigation(false);
    input.focus();
  }

  input.addEventListener('input', syncSend);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
      event.preventDefault();
      if (!send.disabled) form.requestSubmit();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    const bubble = document.createElement('p');
    bubble.className = 'user-message';
    bubble.textContent = message;
    history.append(bubble);
    history.hidden = false;
    empty.hidden = true;
    input.value = '';
    syncSend();
    history.scrollTop = history.scrollHeight;
    input.focus();
  });

  openNavigation.addEventListener('click', () => setNavigation(true));
  closeNavigation.addEventListener('click', () => { setNavigation(false); openNavigation.focus(); });
  backdrop.addEventListener('click', () => { setNavigation(false); openNavigation.focus(); });
  panelToggle.addEventListener('click', () => {
    const hidden = shell.classList.toggle('conversation-hidden');
    const label = hidden ? 'Show conversation panel' : 'Hide conversation panel';
    panelToggle.setAttribute('aria-expanded', String(!hidden));
    panelToggle.setAttribute('aria-label', label);
    panelToggle.title = label;
  });

  byId('cancel-button').addEventListener('click', resetConversation);
  byId('nav-new-chat').addEventListener('click', resetConversation);
  byId('create-button').addEventListener('click', () => {
    announce('Agent creation is not connected in this prototype.');
  });
  document.querySelectorAll('[data-preview]').forEach((button) => {
    button.addEventListener('click', () => announce(`${button.dataset.preview} is not connected in this prototype.`));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      status.hidden = true;
      if (shell.classList.contains('mobile-navigation-open')) {
        setNavigation(false);
        openNavigation.focus();
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      resetConversation();
    }
  });
  mobile.addEventListener('change', () => setNavigation(!mobile.matches));
  setNavigation(!mobile.matches);
  syncSend();
})();
