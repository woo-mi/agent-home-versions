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
    const tabs = { apps: byId('tab-apps'), agents: byId('tab-agents') };
    const panels = { apps: byId('apps-panel'), agents: byId('agents-panel') };
    let currentMode = 'build';

    function updateSendButton() {
      sendButton.disabled = prompt.value.trim().length === 0;
    }

    function selectMode(mode) {
      currentMode = mode;
      Object.entries(modes).forEach(([name, button]) => {
        button.setAttribute('aria-pressed', String(name === mode));
      });
      pageTitle.textContent = mode === 'build'
        ? 'What do you want to build, Woomi?'
        : 'What do you want to ask, Woomi?';
      prompt.placeholder = mode === 'build'
        ? 'Describe the app you want to build'
        : 'Ask Wisdom about your data';
      document.querySelector('label[for="prompt"]').textContent = prompt.placeholder;
    }

    function selectTab(tab, focus = false) {
      Object.entries(tabs).forEach(([name, button]) => {
        const selected = name === tab;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        panels[name].hidden = !selected;
      });
      if (focus) tabs[tab].focus();
    }

    Object.entries(modes).forEach(([mode, button]) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        selectMode(mode);
      });
    });

    const tabNames = Object.keys(tabs);
    document.querySelectorAll('[data-tab-target]').forEach((button) => {
      button.addEventListener('click', () => selectTab(button.dataset.tabTarget));
    });
    Object.entries(tabs).forEach(([tab, button]) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        selectTab(tab);
      });
      button.addEventListener('keydown', (event) => {
        let nextTab;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const direction = event.key === 'ArrowRight' ? 1 : -1;
          const index = tabNames.indexOf(tab);
          nextTab = tabNames[(index + direction + tabNames.length) % tabNames.length];
        } else if (event.key === 'Home') {
          nextTab = tabNames[0];
        } else if (event.key === 'End') {
          nextTab = tabNames[tabNames.length - 1];
        }
        if (nextTab) {
          event.preventDefault();
          selectTab(nextTab, true);
        }
      });
    });

    prompt.addEventListener('input', updateSendButton);
    prompt.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
        event.preventDefault();
        if (prompt.value.trim()) form.requestSubmit();
      }
    });

    byId('setup-button').addEventListener('click', (event) => {
      event.preventDefault();
      selectMode('build');
      prompt.value = 'Set up a chief of staff that sends me a daily recap across sales, finance, and ops, comparing results to plan and highlighting risks and anything waiting on me.';
      updateSendButton();
      prompt.focus();
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
      selectTab('agents');
      updateSendButton();
      prompt.focus();
    });

    selectMode('build');
    selectTab('agents');
    updateSendButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePrototype, { once: true });
  } else {
    initializePrototype();
  }
})();
