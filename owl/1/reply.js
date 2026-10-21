(() => {
  const thread = document.querySelector('[data-pencil-id="BiA9g"]');
  const scroller = document.querySelector('[data-pencil-id="Fr1yZ"]');
  const header = document.querySelector('[data-pencil-id="Qgz9s"]');
  const dock = document.querySelector('.composer-dock');
  const composer = document.getElementById('chat-composer');
  const input = document.getElementById('message-input');
  const send = document.getElementById('message-send');
  const reply = document.getElementById('section-reply');
  const context = document.getElementById('reply-context');
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
    if (name === 'KPI row' || node.dataset.pencilId === 'AKrJi') return [...node.children];
    const bars = [...node.querySelectorAll('[data-pencil-name^="Bar "]')];
    if (bars.length) return bars;
    if (node.dataset.pencilId === 'Sojeh') return [node.querySelector('[data-pencil-name="dot bubble"]')];
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
  }

  function clearContext() {
    selected = undefined;
    context.hidden = true;
    composer.dataset.replying = 'false';
    input.placeholder = defaultPlaceholder;
    input.setAttribute('aria-label', 'Message');
    source.textContent = '';
    reply.setAttribute('aria-pressed', 'false');
    updateInput();
  }

  function beginReply(node) {
    document.dispatchEvent(new Event('codex-navigate'));
    selected = { node, text: sectionText(node) };
    source.textContent = selected.text;
    source.title = selected.text;
    source.setAttribute('aria-label', `Go to original message: ${selected.text}`);
    context.hidden = false;
    composer.dataset.replying = 'true';
    input.placeholder = 'Reply…';
    input.setAttribute('aria-label', 'Reply');
    input.focus({ preventScroll: true });
    showReply(node);
    queueHide();
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
    clearContext();
    live.textContent = 'Reply canceled.';
    input.focus({ preventScroll: true });
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
      clearContext();
      live.textContent = 'Reply canceled.';
    }
  });
  composer.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    document.dispatchEvent(new Event('codex-navigate'));
    const quoted = selected;
    const turn = document.createElement('div');
    turn.className = 'reply-sent';
    turn.dataset.pencilId = `reply-${++sentCount}`;
    turn.dataset.pencilName = 'User turn';
    turn.dataset.replySent = 'true';
    if (quoted) {
      const quote = document.createElement('button');
      quote.type = 'button';
      quote.className = 'reply-sent-quote';
      quote.textContent = quoted.text;
      quote.title = quoted.text;
      quote.setAttribute('aria-label', `Go to original message: ${quoted.text}`);
      quote.addEventListener('click', () => jumpToSource(quoted.node));
      turn.append(quote);
    }
    const bubble = document.createElement('div');
    bubble.className = 'reply-sent-bubble';
    bubble.dataset.replyText = 'true';
    bubble.textContent = text;
    turn.append(bubble);
    thread.append(turn);
    input.value = '';
    clearContext();
    hideReply();
    document.dispatchEvent(new CustomEvent('owl-message-sent', { detail: { node: turn } }));
    live.textContent = quoted ? 'Reply sent.' : 'Message sent.';
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
  for (const event of ['owl-sidebar-change', 'owl-profile-change']) document.addEventListener(event, hideReply);
  window.addEventListener('resize', positionReply);
  let inputWidth = 0;
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - inputWidth) < 0.5) return;
    inputWidth = entry.contentRect.width;
    updateInput();
  }).observe(input);
  new ResizeObserver(() => {
    const atEnd = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 3;
    scroller.style.setProperty('padding-bottom', `${Math.ceil(dock.getBoundingClientRect().height) + 16}px`, 'important');
    if (atEnd) scroller.scrollTop = scroller.scrollHeight;
    positionReply();
  }).observe(dock);
  updateInput();
})();
