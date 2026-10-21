(() => {
  /* Reply storyboard: open the 189px preview, then grow upward with content.
     Height settles over 220ms without overshoot; at 696px the messages scroll. */
  const PANEL = { initialHeight: 189, maxHeight: 696, bottomGap: 7, topGap: 12 };
  const thread = document.querySelector('[data-pencil-id="BiA9g"]');
  const scroller = document.querySelector('[data-pencil-id="Fr1yZ"]');
  const header = document.querySelector('[data-pencil-id="Qgz9s"]');
  const dock = document.querySelector('.composer-dock');
  const composer = document.getElementById('chat-composer');
  const input = document.getElementById('message-input');
  const send = document.getElementById('message-send');
  const reply = document.getElementById('section-reply');
  const panel = document.getElementById('reply-panel');
  const panelHeader = panel.querySelector('.reply-panel-header');
  const panelScroll = document.getElementById('reply-panel-scroll');
  const panelMessages = document.getElementById('reply-panel-messages');
  const panelComposer = document.getElementById('reply-panel-composer');
  const turns = document.getElementById('reply-turns');
  const timestamp = document.getElementById('reply-timestamp');
  const source = document.getElementById('reply-source');
  const cancel = document.getElementById('reply-cancel');
  const live = document.getElementById('reply-live');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const defaultPlaceholder = input.placeholder;
  let activeTarget;
  let selected;
  let hideTimer;
  let positionFrame;
  let pointer;
  let sentCount = 0;
  let resizeFrame;
  let mainDraft = '';
  let followReplies = true;
  const conversations = new Map();
  reply.setAttribute('aria-controls', 'reply-panel');

  function panelLimit() {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const clearance = Math.min(header.getBoundingClientRect().bottom + PANEL.topGap, height * 0.3);
    return Math.max(0, Math.min(PANEL.maxHeight, height - PANEL.bottomGap - clearance));
  }

  function resizePanel() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (!selected) return;
      const scrollStyle = getComputedStyle(panelScroll);
      const contentHeight = panelMessages.getBoundingClientRect().height;
      const desired = panelHeader.offsetHeight + panelComposer.offsetHeight + contentHeight +
        parseFloat(scrollStyle.paddingTop) + parseFloat(scrollStyle.paddingBottom) + 2;
      const limit = panelLimit();
      panel.style.maxHeight = `${limit}px`;
      panel.style.height = `${Math.min(limit, Math.max(PANEL.initialHeight, Math.ceil(desired)))}px`;
    });
  }

  function sourceTimestamp(node) {
    let label = '';
    for (const item of thread.querySelectorAll('[data-pencil-name="Stamp"], [id^="codex-message-"]')) {
      if (item.dataset.pencilName === 'Stamp') label = item.textContent.trim();
      if (item === node || item.contains(node)) break;
    }
    return label || 'Original message';
  }

  function appendReply(text) {
    const bubble = document.createElement('div');
    bubble.className = 'reply-panel-turn';
    bubble.setAttribute('aria-label', `You: ${text}`);
    bubble.textContent = text;
    turns.append(bubble);
  }

  function sectionText(node) {
    const copy = node.querySelector('[data-pencil-name="Copy"]');
    return (copy || node).textContent.replace(/\s+/g, ' ').trim();
  }

  const targets = [...thread.querySelectorAll('[id^="codex-message-"]')].flatMap(node => {
    const name = node.dataset.pencilName || '';
    if (name === 'User turn' || node.dataset.replySent) return [];
    if (name !== 'App') {
      const rows = [...node.querySelectorAll('[data-pencil-name^="Row "]')];
      if (rows.length) return rows;
    }
    if (name === 'KPI row' || node.dataset.pencilId === 'w6dBNz') return [...node.children];
    const bars = [...node.querySelectorAll('[data-pencil-name^="Bar "]')];
    if (bars.length) return bars;
    if (node.dataset.pencilId === 'HYbJD') return [node.querySelector('[data-pencil-name="dot bubble"]')];
    return [node];
  }).filter(Boolean);

  function hideReply() {
    clearTimeout(hideTimer);
    activeTarget?.classList.remove('reply-target-active');
    activeTarget = undefined;
    reply.hidden = true;
  }

  function positionReply() {
    if (!activeTarget) return;
    const box = activeTarget.getBoundingClientRect();
    const area = scroller.getBoundingClientRect();
    const top = header.getBoundingClientRect().bottom + 4;
    const bottom = dock.getBoundingClientRect().top - 4;
    if (box.bottom <= top || box.top >= bottom || area.width <= 0) {
      hideReply();
      return;
    }
    let x = box.right + 8;
    let y = (Math.max(box.top, top) + Math.min(box.bottom, bottom)) / 2 - 16;
    if (x + 32 > area.right - 8) {
      if (box.left - area.left >= 40) {
        x = box.left - 32;
      } else {
        x = Math.min(box.right - 32, area.right - 40);
        y = Math.max(box.top + 4, top);
      }
    }
    reply.style.left = `${Math.max(area.left + 8, x)}px`;
    reply.style.top = `${Math.max(top, Math.min(bottom - 32, y))}px`;
  }

  function showReply(target) {
    clearTimeout(hideTimer);
    if (activeTarget !== target) activeTarget?.classList.remove('reply-target-active');
    activeTarget = target;
    target.classList.add('reply-target-active');
    reply.hidden = false;
    reply.setAttribute('aria-label', `Reply to: ${sectionText(target).slice(0, 120)}`);
    reply.setAttribute('aria-pressed', String(selected?.node === target));
    positionReply();
  }

  function queueHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (reply.matches(':hover, :focus-visible') || activeTarget?.matches(':hover, :focus-visible')) return;
      hideReply();
    }, 140);
  }

  function jumpToSource(node) {
    document.dispatchEvent(new Event('codex-navigate'));
    const top = node.getBoundingClientRect().top + scroller.scrollTop - header.getBoundingClientRect().bottom - 16;
    scroller.scrollTo({ top: Math.max(0, top), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    node.focus({ preventScroll: true });
    node.classList.add('reply-source-highlight');
    setTimeout(() => node.classList.remove('reply-source-highlight'), 1200);
  }

  function updateInput() {
    input.style.height = '20px';
    input.style.height = `${input.value ? Math.min(120, Math.max(20, input.scrollHeight)) : 20}px`;
    send.disabled = !input.value.trim();
    if (selected) {
      selected.draft = input.value;
      resizePanel();
    }
  }

  function closeReply(focus = true) {
    if (!selected) return;
    selected.draft = input.value;
    selected = undefined;
    cancelAnimationFrame(resizeFrame);
    panel.hidden = true;
    dock.dataset.replyOpen = 'false';
    dock.append(composer);
    composer.dataset.replying = 'false';
    input.value = mainDraft;
    input.placeholder = defaultPlaceholder;
    input.setAttribute('aria-label', 'Message');
    send.setAttribute('aria-label', 'Send message');
    reply.setAttribute('aria-pressed', 'false');
    reply.setAttribute('aria-expanded', 'false');
    hideReply();
    updateInput();
    if (focus) input.focus({ preventScroll: true });
  }

  function beginReply(node) {
    document.dispatchEvent(new Event('codex-navigate'));
    if (selected?.node === node) {
      input.focus({ preventScroll: true });
      return;
    }
    if (selected) selected.draft = input.value;
    else mainDraft = input.value;
    if (!conversations.has(node)) conversations.set(node, {
      node, text: sectionText(node), timestamp: sourceTimestamp(node), replies: [], draft: ''
    });
    selected = conversations.get(node);
    source.textContent = selected.text;
    source.title = selected.text;
    source.setAttribute('aria-label', `Go to original message: ${selected.text}`);
    timestamp.textContent = selected.timestamp;
    turns.replaceChildren();
    selected.replies.forEach(appendReply);
    panel.dataset.state = selected.replies.length ? 'conversation' : 'preview';
    panel.style.height = `${Math.min(PANEL.initialHeight, panelLimit())}px`;
    panel.style.maxHeight = `${panelLimit()}px`;
    panel.hidden = false;
    dock.dataset.replyOpen = 'true';
    panelComposer.append(composer);
    composer.dataset.replying = 'true';
    input.value = selected.draft;
    input.placeholder = defaultPlaceholder;
    input.setAttribute('aria-label', 'Reply');
    send.setAttribute('aria-label', 'Send reply');
    reply.setAttribute('aria-expanded', 'true');
    followReplies = true;
    input.focus({ preventScroll: true });
    hideReply();
    live.textContent = `Replying to: ${selected.text}`;
    updateInput();
  }

  targets.forEach(node => {
    node.classList.add('reply-target');
    node.tabIndex = 0;
    node.setAttribute('aria-keyshortcuts', 'Enter');
    node.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      showReply(node);
    });
    node.addEventListener('pointerleave', event => {
      if (event.relatedTarget && reply.contains(event.relatedTarget)) return;
      queueHide();
    });
    node.addEventListener('focus', () => showReply(node));
    node.addEventListener('blur', queueHide);
    node.addEventListener('keydown', event => {
      if (event.target !== node) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        beginReply(node);
      } else if (event.key === 'Escape' && activeTarget === node) {
        event.preventDefault();
        event.stopPropagation();
        hideReply();
      }
    });
    node.addEventListener('pointerup', event => {
      if (event.pointerType === 'touch' && !event.target.closest('button, input, textarea, a, select')) showReply(node);
    });
  });

  reply.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  reply.addEventListener('pointerleave', queueHide);
  reply.addEventListener('blur', queueHide);
  reply.addEventListener('click', () => { if (activeTarget) beginReply(activeTarget); });
  source.addEventListener('click', () => { if (selected) jumpToSource(selected.node); });
  cancel.addEventListener('click', () => {
    closeReply();
    live.textContent = 'Reply conversation closed. Your draft is saved.';
  });
  input.addEventListener('input', updateInput);
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    } else if (event.key === 'Escape' && selected) {
      event.preventDefault();
      event.stopPropagation();
      closeReply();
      live.textContent = 'Reply conversation closed. Your draft is saved.';
    }
  });
  composer.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (selected) {
      selected.replies.push(text);
      selected.draft = '';
      appendReply(text);
      panel.dataset.state = 'conversation';
      input.value = '';
      followReplies = true;
      updateInput();
      panelScroll.scrollTop = panelScroll.scrollHeight;
      live.textContent = 'Reply sent.';
      input.focus({ preventScroll: true });
      return;
    }
    document.dispatchEvent(new Event('codex-navigate'));
    const turn = document.createElement('div');
    turn.className = 'reply-sent';
    turn.dataset.pencilId = `reply-${++sentCount}`;
    turn.dataset.pencilName = 'User turn';
    turn.dataset.replySent = 'true';
    const bubble = document.createElement('div');
    bubble.className = 'reply-sent-bubble';
    bubble.dataset.replyText = 'true';
    bubble.textContent = text;
    turn.append(bubble);
    thread.append(turn);
    input.value = '';
    updateInput();
    hideReply();
    document.dispatchEvent(new CustomEvent('owl-message-sent', { detail: { node: turn } }));
    live.textContent = 'Message sent.';
    input.focus({ preventScroll: true });
    requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; });
  });

  scroller.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  scroller.addEventListener('scroll', () => {
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => {
      if (!activeTarget) return;
      if (pointer && !activeTarget.matches(':focus-visible') && document.activeElement !== reply) {
        const hit = document.elementFromPoint(pointer.x, pointer.y);
        if (hit && !reply.contains(hit)) {
          const target = hit.closest('.reply-target');
          if (target) showReply(target);
          else hideReply();
        }
      }
      positionReply();
    });
  }, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (!reply.contains(event.target) && !event.target.closest('.reply-target')) hideReply();
  });
  document.addEventListener('owl-sidebar-change', () => { hideReply(); resizePanel(); });
  document.addEventListener('owl-profile-change', () => { closeReply(false); hideReply(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected && !event.defaultPrevented) {
      event.preventDefault();
      closeReply();
    }
  });
  window.addEventListener('resize', () => { positionReply(); resizePanel(); });
  window.visualViewport?.addEventListener('resize', resizePanel);
  let inputWidth = 0;
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - inputWidth) < 0.5) return;
    inputWidth = entry.contentRect.width;
    updateInput();
  }).observe(input);
  new ResizeObserver(() => {
    if (!selected) {
      const atEnd = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 3;
      scroller.style.setProperty('padding-bottom', `${Math.ceil(dock.getBoundingClientRect().height) + 16}px`, 'important');
      if (atEnd) scroller.scrollTop = scroller.scrollHeight;
    }
    positionReply();
  }).observe(dock);
  const contentObserver = new ResizeObserver(resizePanel);
  contentObserver.observe(panelMessages);
  contentObserver.observe(panelComposer);
  new ResizeObserver(() => {
    if (selected && followReplies) panelScroll.scrollTop = panelScroll.scrollHeight;
  }).observe(panelScroll);
  panelScroll.addEventListener('wheel', event => {
    if (event.deltaY < 0) followReplies = false;
  }, { passive: true });
  panelScroll.addEventListener('keydown', event => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) followReplies = false;
  });
  panelScroll.addEventListener('scroll', () => {
    followReplies = panelScroll.scrollHeight - panelScroll.scrollTop - panelScroll.clientHeight < 3;
  }, { passive: true });
  updateInput();
})();
