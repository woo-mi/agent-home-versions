/* Local-only interactions for the MVP NEW prototype. */
(() => {
  'use strict';

  function start() {
    const byId = (id) => document.getElementById(id);
    const ui = Object.fromEntries([
      'chat-scroll', 'messages', 'message-form', 'message-input', 'message-send',
      'attach-button', 'attachment-input', 'attachments', 'thinking-button',
      'thinking-menu', 'mic-button', 'sidebar-toggle', 'sidebar-backdrop',
      'sidebar', 'sidebar-close', 'toast',
    ].map((id) => [id, byId(id)]));
    const sources = new Map();
    const timers = new Set();
    const mobile = window.matchMedia('(max-width: 900px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let attachmentNames = [];
    let sourceSequence = 0;
    let toastTimer;
    let mode = 'Thinking';
    let listening = false;
    let sidebarOpen = false;
    let currentView = 'text-only';
    const viewStates = new Map();

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
      const minimum = 17;
      input.style.height = `${minimum}px`;
      const cssMaximum = Number.parseFloat(window.getComputedStyle(input).maxHeight);
      const maximum = Math.min(140, Number.isFinite(cssMaximum) ? cssMaximum : 140);
      const height = Math.min((input.value ? Math.max(input.scrollHeight, minimum) : minimum), maximum);
      input.style.height = `${height}px`;
      input.style.overflowY = input.scrollHeight > maximum ? 'auto' : 'hidden';
    }

    function updateSendButtons() {
      if (ui['message-send']) {
        ui['message-send'].disabled = !ui['message-input']?.value.trim() && !attachmentNames.length;
      }
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
      const id = node.dataset.sourceId || `report-${++sourceSequence}`;
      node.dataset.sourceId = id;
      sources.set(id, { text: sourceText(node), node });
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

    function responseFor(question) {
      const report = [...sources.values()].filter((entry) => !entry.node.dataset.demoMessage);
      const words = question.toLowerCase().match(/[a-z0-9]+/g) || [];
      const usefulWords = words.filter((word) => word.length > 3 || /sql|api|seo|mql/.test(word));
      const match = report.map((entry) => ({
        ...entry,
        score: usefulWords.reduce((score, word) => score + (entry.text.toLowerCase().includes(word) ? 1 : 0), 0)
      })).sort((a, b) => b.score - a.score)[0];
      if (match?.score) return `From the displayed report: ${match.text}`;
      return 'I can help you review the findings shown above. Ask about a metric in the report to explore it further. This preview uses the displayed report only.';
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
        message.classList.add('message-source');
        ui.messages.append(message);
        registerSource(message);
        scrollToBottom(ui['chat-scroll']);
      }, reducedMotion.matches ? 0 : 320);
      timers.add(timer);
    }

    function closeMenu() {
      if (ui['thinking-menu']) ui['thinking-menu'].hidden = true;
      ui['thinking-button']?.setAttribute('aria-expanded', 'false');
    }

    function syncSidebarButton() {
      const expanded = mobile.matches ? sidebarOpen : !document.body.classList.contains('sidebar-collapsed');
      const button = ui['sidebar-close'];
      button?.setAttribute('aria-expanded', String(expanded));
      button?.setAttribute('aria-controls', 'sidebar');
      button?.setAttribute('aria-label', expanded ? 'Collapse sidebar' : 'Expand sidebar');
      if (button) button.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
    }

    function setSidebarOpen(open, focus = false) {
      sidebarOpen = mobile.matches && open;
      document.body.classList.toggle('sidebar-open', sidebarOpen);
      ui.sidebar?.classList.toggle('is-open', sidebarOpen);
      if (ui['sidebar-backdrop']) ui['sidebar-backdrop'].hidden = !sidebarOpen;
      if (ui.sidebar) {
        ui.sidebar.inert = false;
        ui.sidebar.removeAttribute('aria-hidden');
        if (sidebarOpen) {
          ui.sidebar.setAttribute('role', 'dialog');
          ui.sidebar.setAttribute('aria-modal', 'true');
        } else {
          ui.sidebar.removeAttribute('aria-modal');
          ui.sidebar.removeAttribute('role');
        }
      }
      document.querySelector('.main').inert = sidebarOpen;
      const versions = document.querySelector('.prototype-versions');
      if (versions) versions.inert = sidebarOpen;
      syncSidebarButton();
      if (focus) ui['sidebar-close']?.focus();
    }

    function setDesktopCollapsed(collapsed) {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      ui.sidebar?.classList.toggle('is-collapsed', collapsed);
      ui.sidebar.inert = false;
      ui.sidebar.removeAttribute('aria-hidden');
      syncSidebarButton();
    }

    function syncSidebar() {
      setSidebarOpen(false);
      if (mobile.matches) setDesktopCollapsed(false);
      syncSidebarButton();
    }

    function renderView(view, label) {
      if (view === currentView) return;
      const definition = window.MVPViews?.[view];
      if (view !== 'text-only' && !definition) return;
      closeMenu();
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
      viewStates.set(currentView, {
        nodes: [...ui.messages.childNodes],
        scrollTop: ui['chat-scroll'].scrollTop,
        draft: ui['message-input'].value,
        attachments: [...attachmentNames]
      });
      const previous = viewStates.get(view);
      if (previous) ui.messages.replaceChildren(...previous.nodes);
      else ui.messages.innerHTML = definition.html;
      currentView = view;
      ui.messages.dataset.view = view;
      sources.clear();
      ui.messages.querySelectorAll('.message-source').forEach(registerSource);
      ui['message-input'].value = previous?.draft || '';
      attachmentNames = previous?.attachments || [];
      renderAttachments();
      autosize(ui['message-input']);
      updateSendButtons();
      ui['chat-scroll'].scrollTop = previous?.scrollTop || 0;
      document.title = `MVP NEW · ${label || definition?.label || 'Text only'}`;
    }

    function resetConversation() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
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
    ui['message-input']?.addEventListener('input', () => {
      autosize(ui['message-input']);
      updateSendButtons();
    });
    ui['message-input']?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendMain();
      }
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

    ui['sidebar-toggle']?.setAttribute('aria-controls', 'sidebar');
    ui['sidebar-toggle']?.addEventListener('click', () => {
      if (mobile.matches) setSidebarOpen(!sidebarOpen, true);
      else {
        setDesktopCollapsed(!document.body.classList.contains('sidebar-collapsed'));
      }
    });
    ui['sidebar-close']?.addEventListener('click', () => {
      if (mobile.matches) setSidebarOpen(!sidebarOpen, true);
      else setDesktopCollapsed(!document.body.classList.contains('sidebar-collapsed'));
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

    const recentSearch = byId('recent-search-button');
    if (recentSearch) {
      const filter = document.createElement('input');
      filter.type = 'search';
      filter.className = 'recent-filter';
      filter.id = 'recent-filter';
      filter.placeholder = 'Search recent chats';
      filter.setAttribute('aria-label', 'Search recent chats');
      filter.hidden = true;
      recentSearch.closest('h2').after(filter);
      recentSearch.setAttribute('aria-controls', 'recent-filter');
      recentSearch.setAttribute('aria-expanded', 'false');
      recentSearch.addEventListener('click', () => {
        filter.hidden = !filter.hidden;
        recentSearch.setAttribute('aria-expanded', String(!filter.hidden));
        if (!filter.hidden) filter.focus();
        else {
          filter.value = '';
          filter.dispatchEvent(new Event('input'));
        }
      });
      filter.addEventListener('input', () => {
        ui.sidebar.querySelectorAll('[data-recent]').forEach(item => {
          item.hidden = !item.textContent.toLowerCase().includes(filter.value.toLowerCase());
        });
      });
      filter.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          recentSearch.click();
          recentSearch.focus();
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (!ui['thinking-menu']?.contains(event.target) && !ui['thinking-button']?.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (document.querySelector('.prototype-version-trigger')?.getAttribute('aria-expanded') === 'true') return;
        if (ui['thinking-menu'] && !ui['thinking-menu'].hidden) {
          closeMenu();
          ui['thinking-button']?.focus();
        } else if (sidebarOpen) setSidebarOpen(false, true);
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
    mobile.addEventListener('change', syncSidebar);
    document.querySelectorAll('.message-source').forEach(registerSource);
    renderAttachments();
    autosize(ui['message-input']);
    updateSendButtons();
    syncSidebar();
    window.addEventListener('mvp-view-change', event => renderView(event.detail.view, event.detail.label));
    const initialView = window.MVPVersions?.getCurrent();
    if (initialView) renderView(initialView.view, initialView.label);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
