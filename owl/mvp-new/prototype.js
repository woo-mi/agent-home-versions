/* Local-only interactions for the MVP NEW prototype. */
(() => {
  'use strict';

  function start() {
    const byId = (id) => document.getElementById(id);
    const ui = Object.fromEntries([
      'chat-scroll', 'messages', 'message-form', 'message-input', 'message-send',
      'attach-button', 'attachment-input', 'attachments', 'thinking-button',
      'thinking-menu', 'mic-button', 'sidebar-toggle', 'sidebar-backdrop',
      'sidebar', 'sidebar-close', 'chief-button', 'chief-popover', 'toast',
      'reply-panel', 'reply-heading', 'reply-close', 'reply-context',
      'reply-messages', 'reply-form', 'reply-input', 'reply-send'
    ].map((id) => [id, byId(id)]));
    const sources = new Map();
    const threads = new Map();
    const timers = new Set();
    const mobile = window.matchMedia('(max-width: 760px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeSource = null;
    let attachmentNames = [];
    let sourceSequence = 0;
    let toastTimer;
    let mode = 'Thinking';
    let listening = false;
    let sidebarOpen = false;
    let lastReplyTrigger = null;

    function announce(message) {
      if (!ui.toast) return;
      clearTimeout(toastTimer);
      ui.toast.textContent = message;
      ui.toast.hidden = false;
      ui.toast.classList.add('is-visible');
      toastTimer = window.setTimeout(() => {
        ui.toast.classList.remove('is-visible');
        ui.toast.hidden = true;
      }, 3400);
    }

    function autosize(input) {
      if (!input) return;
      input.style.height = 'auto';
      const cssMaximum = Number.parseFloat(window.getComputedStyle(input).maxHeight);
      const maximum = Math.min(140, Number.isFinite(cssMaximum) ? cssMaximum : 140);
      const height = Math.min(Math.max(input.scrollHeight, 24), maximum);
      input.style.height = `${height}px`;
      input.style.overflowY = input.scrollHeight > maximum ? 'auto' : 'hidden';
    }

    function updateSendButtons() {
      if (ui['message-send']) {
        ui['message-send'].disabled = !ui['message-input']?.value.trim() && !attachmentNames.length;
      }
      if (ui['reply-send']) ui['reply-send'].disabled = !ui['reply-input']?.value.trim();
    }

    function scrollToBottom(container) {
      if (!container) return;
      requestAnimationFrame(() => container.scrollTo({
        top: container.scrollHeight,
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      }));
    }

    function sourceText(node) {
      const copy = node.querySelector('.message-copy');
      if (copy) return copy.textContent.trim();
      const clone = node.cloneNode(true);
      clone.querySelectorAll('button, .message-meta, .sr-only').forEach((element) => element.remove());
      return clone.textContent.trim();
    }

    function registerSource(node) {
      if (node.dataset.interactionReady) return;
      node.dataset.interactionReady = 'true';
      const id = node.dataset.sourceId || `report-${++sourceSequence}`;
      node.dataset.sourceId = id;
      sources.set(id, { text: sourceText(node), node });
      let button = node.querySelector('.reply-trigger');
      if (!button) {
        const original = document.querySelector('.reply-trigger');
        button = original ? original.cloneNode(true) : document.createElement('button');
        button.type = 'button';
        button.className = 'reply-trigger';
        if (!original) button.textContent = '↩';
        node.append(button);
      }
      button.type = 'button';
      button.setAttribute('aria-label', 'Reply to this finding');
      button.setAttribute('aria-controls', 'reply-panel');
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openReply(id, button);
      });
    }

    function makeMessage(role, value, files = []) {
      const article = document.createElement('article');
      article.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
      article.dataset.demoMessage = 'true';
      const meta = document.createElement('div');
      meta.className = 'message-meta';
      const author = document.createElement('span');
      author.className = 'message-author';
      author.textContent = role === 'user' ? 'You' : 'Owl';
      const time = document.createElement('time');
      time.className = 'message-time';
      const now = new Date();
      time.dateTime = now.toISOString();
      time.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      meta.append(author, time);
      const copy = document.createElement('div');
      copy.className = 'message-copy';
      copy.textContent = value;
      article.append(meta, copy);
      if (files.length) {
        const list = document.createElement('ul');
        list.className = 'message-attachments';
        files.forEach((name) => {
          const item = document.createElement('li');
          item.textContent = name;
          list.append(item);
        });
        article.append(list);
      }
      return article;
    }

    function responseFor(question, sourceId) {
      const source = sourceId ? sources.get(sourceId) : null;
      if (source) return `From the displayed report: ${source.text}`;
      const report = [...sources.values()].filter((entry) => !entry.node.dataset.demoMessage);
      const words = question.toLowerCase().match(/[a-z0-9]+/g) || [];
      const usefulWords = words.filter((word) => word.length > 3 || /sql|api|seo|mql/.test(word));
      const match = report.map((entry) => ({
        ...entry,
        score: usefulWords.reduce((score, word) => score + (entry.text.toLowerCase().includes(word) ? 1 : 0), 0)
      })).sort((a, b) => b.score - a.score)[0];
      if (match?.score) return `From the displayed report: ${match.text}`;
      return 'I can help you review the findings shown above. Ask about a metric in the report, or select Reply beside a finding to discuss it in context. This preview uses the displayed report only.';
    }

    function renderAttachments() {
      if (!ui.attachments) return;
      ui.attachments.replaceChildren();
      attachmentNames.forEach((name, index) => {
        const chip = document.createElement('span');
        chip.className = 'attachment-chip';
        const label = document.createElement('span');
        label.textContent = name;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${name}`);
        remove.addEventListener('click', () => {
          attachmentNames.splice(index, 1);
          renderAttachments();
          updateSendButtons();
          ui['message-input']?.focus();
        });
        chip.append(label, remove);
        ui.attachments.append(chip);
      });
      ui.attachments.hidden = !attachmentNames.length;
    }

    function sendMain(event) {
      event?.preventDefault();
      const value = ui['message-input']?.value.trim() || '';
      if ((!value && !attachmentNames.length) || !ui.messages) return;
      ui.messages.append(makeMessage('user', value, attachmentNames));
      attachmentNames = [];
      renderAttachments();
      ui['message-input'].value = '';
      autosize(ui['message-input']);
      updateSendButtons();
      scrollToBottom(ui['chat-scroll']);
      ui['message-input'].focus();
      const response = value ? responseFor(value) : 'The filenames are attached to this conversation. This local preview does not read or upload file contents.';
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        const message = makeMessage('assistant', response);
        message.classList.add('reply-target');
        ui.messages.append(message);
        registerSource(message);
        scrollToBottom(ui['chat-scroll']);
      }, reducedMotion.matches ? 0 : 320);
      timers.add(timer);
    }

    function threadFor(id) {
      if (!threads.has(id)) threads.set(id, { draft: '', messages: [] });
      return threads.get(id);
    }

    function sizeReplyPanel() {
      if (!ui['reply-panel'] || !activeSource) return;
      const thread = threadFor(activeSource);
      const contentGrowth = thread.messages.reduce((size, message) => size + 50 + Math.min(110, Math.ceil(message.text.length / 55) * 18), 0);
      const desired = 189 + contentGrowth + Math.max(0, (ui['reply-input']?.offsetHeight || 24) - 24);
      const viewportLimit = Math.max(96, window.innerHeight - (mobile.matches ? 140 : 112));
      const height = Math.min(desired, 696, viewportLimit);
      ui['reply-panel'].style.setProperty('--reply-panel-height', `${height}px`);
      ui['reply-panel'].style.height = `${height}px`;
      ui['reply-panel'].style.maxHeight = `${Math.min(696, viewportLimit)}px`;
      ui['reply-panel'].classList.toggle('has-messages', thread.messages.length > 0);
    }

    function renderReplyThread() {
      if (!activeSource || !ui['reply-messages']) return;
      ui['reply-messages'].replaceChildren();
      threadFor(activeSource).messages.forEach((entry) => {
        const message = makeMessage(entry.role, entry.text);
        message.classList.add('reply-message');
        ui['reply-messages'].append(message);
      });
      sizeReplyPanel();
      scrollToBottom(ui['reply-messages']);
    }

    function saveReplyDraft() {
      if (activeSource && ui['reply-input']) threadFor(activeSource).draft = ui['reply-input'].value;
    }

    function openReply(id, button) {
      if (!ui['reply-panel'] || !sources.has(id)) return;
      saveReplyDraft();
      activeSource = id;
      lastReplyTrigger = button;
      document.querySelectorAll('.reply-trigger').forEach((trigger) => {
        const selected = trigger === button;
        trigger.classList.toggle('is-active', selected);
        trigger.setAttribute('aria-expanded', String(selected));
      });
      document.querySelectorAll('.reply-target').forEach((target) => target.classList.toggle('is-selected', target.dataset.sourceId === id));
      ui['reply-panel'].hidden = false;
      ui['reply-panel'].setAttribute('role', 'dialog');
      ui['reply-panel'].setAttribute('aria-modal', 'false');
      ui['reply-panel'].setAttribute('aria-labelledby', 'reply-heading');
      ui['reply-panel'].dataset.sourceId = id;
      if (ui['reply-heading']) ui['reply-heading'].textContent = 'Reply to Owl';
      if (ui['reply-context']) ui['reply-context'].textContent = sources.get(id).text;
      if (ui['reply-input']) ui['reply-input'].value = threadFor(id).draft;
      autosize(ui['reply-input']);
      renderReplyThread();
      updateSendButtons();
      requestAnimationFrame(() => {
        ui['reply-panel'].classList.add('is-open');
        ui['reply-input']?.focus({ preventScroll: true });
      });
    }

    function closeReply(restoreFocus = true) {
      saveReplyDraft();
      if (ui['reply-panel']) {
        ui['reply-panel'].classList.remove('is-open');
        ui['reply-panel'].hidden = true;
      }
      document.querySelectorAll('.reply-trigger').forEach((button) => {
        button.classList.remove('is-active');
        button.setAttribute('aria-expanded', 'false');
      });
      document.querySelectorAll('.reply-target.is-selected').forEach((target) => target.classList.remove('is-selected'));
      activeSource = null;
      if (restoreFocus && lastReplyTrigger?.isConnected) lastReplyTrigger.focus({ preventScroll: true });
    }

    function sendReply(event) {
      event?.preventDefault();
      const value = ui['reply-input']?.value.trim();
      if (!activeSource || !value) return;
      const id = activeSource;
      const thread = threadFor(id);
      thread.messages.push({ role: 'user', text: value });
      thread.draft = '';
      ui['reply-input'].value = '';
      autosize(ui['reply-input']);
      renderReplyThread();
      updateSendButtons();
      ui['reply-input'].focus();
      const response = responseFor(value, id);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        thread.messages.push({ role: 'assistant', text: response });
        if (activeSource === id) renderReplyThread();
      }, reducedMotion.matches ? 0 : 380);
      timers.add(timer);
    }

    function closeMenu() {
      if (ui['thinking-menu']) ui['thinking-menu'].hidden = true;
      ui['thinking-button']?.setAttribute('aria-expanded', 'false');
    }

    function closeChief() {
      if (ui['chief-popover']) ui['chief-popover'].hidden = true;
      ui['chief-button']?.setAttribute('aria-expanded', 'false');
    }

    function setSidebarOpen(open, focus = false) {
      sidebarOpen = open;
      document.body.classList.toggle('sidebar-open', open);
      ui.sidebar?.classList.toggle('is-open', open);
      if (ui['sidebar-backdrop']) ui['sidebar-backdrop'].hidden = !open;
      ui['sidebar-toggle']?.setAttribute('aria-expanded', String(mobile.matches ? open : !document.body.classList.contains('sidebar-collapsed')));
      if (ui.sidebar && mobile.matches) {
        ui.sidebar.setAttribute('aria-hidden', String(!open));
        ui.sidebar.inert = !open;
        if (open) {
          ui.sidebar.setAttribute('role', 'dialog');
          ui.sidebar.setAttribute('aria-modal', 'true');
        } else {
          ui.sidebar.removeAttribute('aria-modal');
          ui.sidebar.removeAttribute('role');
        }
      }
      if (focus) (open ? ui['sidebar-close'] || ui.sidebar?.querySelector('button, a') : ui['sidebar-toggle'])?.focus();
    }

    function setDesktopCollapsed(collapsed) {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      ui.sidebar?.classList.toggle('is-collapsed', collapsed);
      ui['sidebar-toggle']?.setAttribute('aria-expanded', String(!collapsed));
      if (ui.sidebar) {
        ui.sidebar.inert = collapsed;
        ui.sidebar.setAttribute('aria-hidden', String(collapsed));
      }
    }

    function syncSidebar() {
      setSidebarOpen(false);
      if (!mobile.matches && ui.sidebar) {
        ui.sidebar.removeAttribute('aria-modal');
        ui.sidebar.removeAttribute('role');
        setDesktopCollapsed(document.body.classList.contains('sidebar-collapsed'));
      }
      sizeReplyPanel();
    }

    function resetConversation() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      closeReply(false);
      threads.clear();
      ui.messages?.querySelectorAll('[data-demo-message]').forEach((message) => {
        sources.delete(message.dataset.sourceId);
        message.remove();
      });
      if (ui['message-input']) ui['message-input'].value = '';
      attachmentNames = [];
      renderAttachments();
      autosize(ui['message-input']);
      updateSendButtons();
      setSidebarOpen(false);
      ui['message-input']?.focus();
      announce('New conversation started. The reference report is ready.');
    }

    ui['message-form']?.addEventListener('submit', sendMain);
    ui['reply-form']?.addEventListener('submit', sendReply);
    [[ui['message-input'], sendMain], [ui['reply-input'], sendReply]].forEach(([input, submit]) => {
      input?.addEventListener('input', () => {
        autosize(input);
        if (input === ui['reply-input']) {
          saveReplyDraft();
          sizeReplyPanel();
        }
        updateSendButtons();
      });
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          submit();
        }
      });
    });

    ui['attach-button']?.addEventListener('click', () => ui['attachment-input']?.click());
    ui['attachment-input']?.addEventListener('change', (event) => {
      attachmentNames.push(...Array.from(event.target.files || [], (file) => file.name));
      event.target.value = '';
      renderAttachments();
      updateSendButtons();
      ui['message-input']?.focus();
    });

    ui['thinking-button']?.setAttribute('aria-expanded', 'false');
    ui['thinking-button']?.setAttribute('aria-controls', 'thinking-menu');
    ui['thinking-button']?.addEventListener('click', () => {
      if (!ui['thinking-menu']) return;
      closeChief();
      const open = ui['thinking-menu'].hidden;
      ui['thinking-menu'].hidden = !open;
      ui['thinking-button'].setAttribute('aria-expanded', String(open));
      if (open) ui['thinking-menu'].querySelector('[data-mode]')?.focus();
    });
    ui['thinking-menu']?.querySelectorAll('[data-mode]').forEach((option) => {
      option.addEventListener('click', () => {
        mode = option.dataset.mode.toLowerCase() === 'fast' ? 'Fast' : 'Thinking';
        const button = ui['thinking-button'];
        const label = button?.querySelector('[data-mode-label], .mode-label, .thinking-label, span');
        if (label) label.textContent = mode;
        else if (button) {
          const textNode = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          if (textNode) textNode.textContent = ` ${mode} `;
          else {
            const span = document.createElement('span');
            span.dataset.modeLabel = '';
            span.textContent = mode;
            button.append(span);
          }
        }
        button?.setAttribute('aria-label', `Response mode: ${mode}`);
        ui['thinking-menu'].querySelectorAll('[data-mode]').forEach((item) => {
          const selected = item === option;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-checked', String(selected));
        });
        closeMenu();
        button?.focus();
      });
    });
    ui['thinking-menu']?.addEventListener('keydown', (event) => {
      const options = [...ui['thinking-menu'].querySelectorAll('[data-mode]')];
      const current = options.indexOf(document.activeElement);
      let next = current;
      if (event.key === 'ArrowDown') next = (current + 1) % options.length;
      else if (event.key === 'ArrowUp') next = (current - 1 + options.length) % options.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = options.length - 1;
      else return;
      event.preventDefault();
      options[next]?.focus();
    });

    ui['mic-button']?.setAttribute('aria-pressed', 'false');
    ui['mic-button']?.addEventListener('click', () => {
      listening = !listening;
      ui['mic-button'].classList.toggle('is-listening', listening);
      ui['mic-button'].setAttribute('aria-pressed', String(listening));
      ui['mic-button'].setAttribute('aria-label', listening ? 'Stop microphone preview' : 'Start microphone preview');
      announce(listening ? 'Listening preview — no audio is being recorded.' : 'Microphone preview stopped.');
    });

    ui['reply-close']?.addEventListener('click', () => closeReply());
    ui['sidebar-toggle']?.setAttribute('aria-controls', 'sidebar');
    ui['sidebar-toggle']?.addEventListener('click', () => {
      if (mobile.matches) setSidebarOpen(!sidebarOpen, true);
      else {
        setDesktopCollapsed(!document.body.classList.contains('sidebar-collapsed'));
      }
    });
    ui['sidebar-close']?.addEventListener('click', () => {
      if (mobile.matches) setSidebarOpen(false, true);
      else {
        setDesktopCollapsed(true);
        ui['sidebar-toggle']?.focus();
      }
    });
    ui['sidebar-backdrop']?.addEventListener('click', () => setSidebarOpen(false, true));
    ui.sidebar?.querySelectorAll('[data-nav]').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const name = item.dataset.nav || item.textContent.trim();
        const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
        if (normalized === 'newchat' || normalized === 'newconversation') resetConversation();
        else if (normalized === 'owl') {
          setSidebarOpen(false);
          scrollToBottom(ui['chat-scroll']);
          ui['message-input']?.focus();
        } else announce(`${item.textContent.trim() || name} is outside this preview.`);
      });
    });
    ui.sidebar?.querySelectorAll('[data-recent]').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const label = item.dataset.recent || item.textContent.trim();
        if (ui['message-input']) ui['message-input'].value = label;
        autosize(ui['message-input']);
        updateSendButtons();
        setSidebarOpen(false);
        ui['message-input']?.focus();
      });
    });

    ui['chief-button']?.setAttribute('aria-expanded', 'false');
    ui['chief-button']?.setAttribute('aria-controls', 'chief-popover');
    ui['chief-button']?.addEventListener('click', () => {
      if (!ui['chief-popover']) return;
      closeMenu();
      const open = ui['chief-popover'].hidden;
      ui['chief-popover'].hidden = !open;
      ui['chief-button'].setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => {
      if (!ui['thinking-menu']?.contains(event.target) && !ui['thinking-button']?.contains(event.target)) closeMenu();
      if (!ui['chief-popover']?.contains(event.target) && !ui['chief-button']?.contains(event.target)) closeChief();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (ui['thinking-menu'] && !ui['thinking-menu'].hidden) {
          closeMenu();
          ui['thinking-button']?.focus();
        } else if (ui['chief-popover'] && !ui['chief-popover'].hidden) {
          closeChief();
          ui['chief-button']?.focus();
        } else if (sidebarOpen) setSidebarOpen(false, true);
        else if (activeSource) closeReply();
      }
      if (event.key === 'Tab' && mobile.matches && sidebarOpen && ui.sidebar) {
        const focusable = [...ui.sidebar.querySelectorAll('button:not([disabled]), a[href], input, [tabindex="0"]')].filter((node) => node.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
    window.addEventListener('resize', sizeReplyPanel);
    mobile.addEventListener('change', syncSidebar);
    document.querySelectorAll('.reply-target').forEach(registerSource);
    ui['reply-messages']?.setAttribute('aria-live', 'polite');
    ui['reply-messages']?.setAttribute('aria-relevant', 'additions');
    renderAttachments();
    autosize(ui['message-input']);
    updateSendButtons();
    syncSidebar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
