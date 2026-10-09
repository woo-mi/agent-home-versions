(() => {
  'use strict';

  function initializePrototype() {
    const byId = (id) => document.getElementById(id);
    const form = byId('prompt-form');
    const prompt = byId('prompt');
    const sendButton = byId('send-button');
    const pageTitle = byId('page-title');
    const statusMessage = byId('status-message');
    const dialog = byId('prototype-dialog');
    const modes = { ask: byId('mode-ask'), build: byId('mode-build') };
    const panels = { apps: byId('apps-panel'), agents: byId('agents-panel') };
    let currentMode = 'build';
    const navigationToggle = byId('home-navigation-toggle');
    navigationToggle.addEventListener('click', () => {
      const expanded = document.body.classList.toggle('navigation-expanded');
      const label = expanded ? 'Close navigation' : 'Open navigation';
      navigationToggle.setAttribute('aria-expanded', String(expanded));
      navigationToggle.setAttribute('aria-label', label);
      navigationToggle.title = label;
    });

    function updateSendButton() {
      sendButton.disabled = prompt.value.trim().length === 0;
    }

    function selectMode(mode) {
      currentMode = mode;
      Object.entries(modes).forEach(([name, button]) => {
        button.setAttribute('aria-pressed', String(name === mode));
      });
      pageTitle.textContent = mode === 'build'
        ? 'What should we work on in Agents, Woomi?'
        : 'What do you want to ask, Woomi?';
      prompt.placeholder = mode === 'build'
        ? 'Describe the app you want to build'
        : 'Ask Wisdom about your data';
      document.querySelector('label[for="prompt"]').textContent = prompt.placeholder;
    }

    function selectPanel(selectedPanel) {
      Object.entries(panels).forEach(([name, panel]) => {
        panel.hidden = name !== selectedPanel;
      });
    }

    Object.entries(modes).forEach(([mode, button]) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        selectMode(mode);
      });
    });

    document.querySelectorAll('[data-tab-target]').forEach((button) => {
      button.addEventListener('click', () => selectPanel(button.dataset.tabTarget));
    });

    prompt.addEventListener('input', updateSendButton);
    prompt.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
        event.preventDefault();
        if (prompt.value.trim()) form.requestSubmit();
      }
    });

    byId('create-app').addEventListener('click', (event) => {
      event.preventDefault();
      selectMode('build');
      prompt.focus();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!prompt.value.trim()) return;
      byId('dialog-title').textContent = currentMode === 'build' ? 'Your build request' : 'Your question';
      byId('dialog-description').textContent = 'This prototype captures your request. No app is built and no data is sent.';
      byId('request-preview').textContent = prompt.value;
      statusMessage.textContent = '';
      if (!dialog.open) dialog.showModal();
    });

    byId('dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => sendButton.focus());

    document.querySelectorAll('[data-preview]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const label = button.dataset.preview || button.getAttribute('aria-label') || button.textContent.trim();
        statusMessage.textContent = `${label} is not connected in this prototype.`;
      });
    });

    byId('new-button').addEventListener('click', (event) => {
      event.preventDefault();
      prompt.value = '';
      statusMessage.textContent = '';
      selectMode('build');
      selectPanel('agents');
      updateSendButton();
      prompt.focus();
    });

    selectMode('build');
    selectPanel('agents');
    updateSendButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePrototype, { once: true });
  } else {
    initializePrototype();
  }
})();
