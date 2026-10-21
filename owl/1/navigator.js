(() => {
  const scroller = document.querySelector('[data-pencil-id="Fr1yZ"]');
  const header = document.querySelector('[data-pencil-id="Qgz9s"]');
  function messageBlocks(container) {
    return [...container.children].flatMap(node => {
      if (['Stamp', 'NEW divider'].includes(node.dataset.pencilName)) return [];
      // Flatten conversation groups and anonymous export wrappers, not message cards.
      if (node.dataset.pencilName === 'Frame 141' || node.dataset.pencilId === 'NykT2' ||
        (!node.dataset.pencilId && node.children.length === 1)) {
        return messageBlocks(node);
      }
      return [node];
    });
  }

  function readableText(node) {
    const text = [node, ...node.querySelectorAll('*')]
      .filter(element => !element.closest('svg, script, style') &&
        [...element.childNodes].some(child => child.nodeType === 3 && child.textContent.trim()))
      .map(element => element.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return text.length ? text : [node.dataset.pencilName || 'Chief of staff'];
  }

  function messageFromNode(node) {
    const text = readableText(node);
    const message = {
      id: node.dataset.pencilId,
      name: node.dataset.pencilName || 'Chief of staff',
      text
    };
    if (node.dataset.replySent === 'true') {
      const reply = node.querySelector('[data-reply-text]');
      const quote = node.querySelector('.reply-sent-quote');
      message.text = [reply?.textContent.replace(/\s+/g, ' ').trim() || text.at(-1)];
      message.replyContext = quote?.textContent.replace(/\s+/g, ' ').trim() || '';
    }
    return message;
  }

  const conversationContent = document.querySelector('[data-pencil-id="BiA9g"]');
  const nodes = messageBlocks(conversationContent);
  const messages = nodes.map(messageFromNode);
  const timeline = document.getElementById('codex-timeline');
  const preview = document.getElementById('codex-preview');
  const title = document.getElementById('codex-preview-title');
  const excerpt = document.getElementById('codex-preview-excerpt');
  const jumpButton = document.getElementById('codex-preview-jump');
  const bookmark = document.getElementById('codex-preview-bookmark');
  const status = document.getElementById('codex-timeline-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = messages.length - 1;
  let hovered = -1;
  let previewIndex = -1;
  let openTimer;
  let closeTimer;
  let scrollFrame;
  let railFrame;
  let railPointer;
  let jumpTimer;
  let jumpingUntil = 0;
  let suppressFocus = false;
  let escapeDismissedIndex = -1;
  let bookmarks = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem('owl-1-bookmarks') || '[]');
    if (Array.isArray(saved)) bookmarks = new Set(saved.filter(id => messages.some(message => message.id === id)));
  } catch (_) {}

  const cancelOpen = () => { clearTimeout(openTimer); openTimer = undefined; };

  function createTick(message, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'codex-timeline-stop';
    button.setAttribute('aria-label', `Message ${index + 1} of ${messages.length}: ${message.text[0]}`);
    button.setAttribute('aria-controls', 'codex-preview');
    button.dataset.messageId = `codex-message-${message.id}`;
    button.setAttribute('aria-expanded', 'false');
    button.tabIndex = index === selected ? 0 : -1;
    button.innerHTML = '<span class="codex-timeline-tick" aria-hidden="true"></span>';
    nodes[index].id = `codex-message-${message.id}`;
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      railPointer = { x: event.clientX, y: event.clientY };
      previewOnHover(index);
    });
    button.addEventListener('focus', () => {
      if (suppressFocus) return;
      ensureTickVisible(index);
      showPreview(index);
    });
    button.addEventListener('click', () => {
      escapeDismissedIndex = -1;
      showPreview(index);
      jumpTo(index);
    });
    timeline.append(button);
    return button;
  }

  const buttons = messages.map(createTick);

  function appendSentMessage(node) {
    if (!node || node.parentElement !== conversationContent || node.dataset?.replySent !== 'true' ||
      node.dataset.pencilName !== 'User turn' || !node.dataset.pencilId ||
      nodes.includes(node) || messages.some(message => message.id === node.dataset.pencilId)) return;

    hidePreview();
    railPointer = undefined;
    escapeDismissedIndex = -1;
    jumpingUntil = 0;
    clearTimeout(jumpTimer);
    nodes.push(node);
    const message = messageFromNode(node);
    const index = messages.push(message) - 1;
    buttons.push(createTick(message, index));
    buttons.forEach((button, i) => {
      button.setAttribute('aria-label', `Message ${i + 1} of ${messages.length}: ${messages[i].text[0]}`);
    });
    setSelected(index);
    ensureTickVisible(index);
    scroller.scrollTop = scroller.scrollHeight;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(syncPosition);
    status.textContent = `Message ${index + 1} of ${messages.length}: ${message.text[0]}`;
  }

  function previewOnHover(index) {
    if (escapeDismissedIndex === index) return;
    escapeDismissedIndex = -1;
    clearTimeout(closeTimer);
    cancelOpen();
    hovered = index;
    paintTicks();
    openTimer = setTimeout(() => showPreview(index), 80);
  }

  function ensureTickVisible(index) {
    const tick = buttons[index].getBoundingClientRect();
    const rail = timeline.getBoundingClientRect();
    const inset = Math.min(20, timeline.clientHeight / 4);
    if (tick.top < rail.top + inset) timeline.scrollTop += tick.top - rail.top - inset;
    else if (tick.bottom > rail.bottom - inset) timeline.scrollTop += tick.bottom - rail.bottom + inset;
  }

  function paintTicks() {
    buttons.forEach((button, index) => {
      const distance = Math.abs(index - hovered);
      const active = hovered >= 0 ? index === hovered : index === selected;
      const width = hovered >= 0 ? ([30, 23, 16, 11, 8][distance] || 6) : (active ? 18 : 6);
      const edge = Math.min(index, messages.length - 1 - index);
      button.style.setProperty('--tick-width', `${width}px`);
      button.style.setProperty('--tick-color', active ? '#202123' : '#d1d3d4');
      button.style.setProperty('--tick-opacity', active || (hovered >= 0 && distance < 4) ? '1' : edge === 0 ? '.35' : edge === 1 ? '.65' : '1');
      if (index === selected) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    });
  }

  function previewCopy(index) {
    const message = messages[index];
    if ('replyContext' in message) return { title: message.text[0], excerpt: message.replyContext || message.text[0] };
    if (message.text[0]?.includes('prep me on the net new ARR thing for Marcus')) {
      return {
        title: 'Prep me on net new ARR for Marcus',
        excerpt: 'Sales shows $3.1M. Finance shows $2.4M.\nOne governed Net New ARR metric gives\nMarcus a consistent answer.'
      };
    }
    if (message.name === 'User turn') return { title: message.text[0], excerpt: messages[index + 1]?.text.join(' · ') || message.text[0] };
    const generic = /^(dot bubble|KPI row|Options|Frame \d+)/.test(message.name) ||
      ['Thread', 'App', 'Dashboard layout'].includes(message.name);
    if (!generic) return { title: message.name, excerpt: message.text.join(' · ') };
    if (message.text.length > 1) return { title: message.text[0], excerpt: message.text.slice(1).join(' · ') };
    return { title: message.name.includes('event') ? 'Today’s schedule' : message.name.includes('status') ? 'Workspace update' : 'Chief of staff', excerpt: message.text[0] };
  }

  function positionPreview() {
    if (previewIndex < 0) return;
    const tick = buttons[previewIndex].getBoundingClientRect();
    const rail = timeline.getBoundingClientRect();
    if (tick.bottom <= rail.top || tick.top >= rail.bottom) {
      concealPreview();
      return;
    }
    const height = preview.offsetHeight;
    const bottomLimit = innerHeight - 64;
    const top = Math.max(12, Math.min(bottomLimit - height, tick.top + tick.height / 2 - height / 2));
    preview.style.top = `${top}px`;
  }

  function showPreview(index) {
    if (escapeDismissedIndex === index) return;
    cancelOpen();
    clearTimeout(closeTimer);
    hovered = previewIndex = index;
    const copy = previewCopy(index);
    title.textContent = copy.title;
    excerpt.textContent = copy.excerpt;
    jumpButton.setAttribute('aria-label', `Jump to message ${index + 1}: ${messages[index].text[0]}`);
    bookmark.setAttribute('aria-pressed', String(bookmarks.has(messages[index].id)));
    bookmark.setAttribute('aria-label', bookmarks.has(messages[index].id) ? 'Remove bookmark' : 'Bookmark message');
    buttons.forEach((button, i) => button.setAttribute('aria-expanded', String(i === index)));
    preview.inert = false;
    preview.setAttribute('aria-hidden', 'false');
    preview.dataset.open = 'true';
    positionPreview();
    paintTicks();
  }

  function concealPreview() {
    preview.dataset.open = 'false';
    preview.setAttribute('aria-hidden', 'true');
    preview.inert = true;
    buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
  }

  function hidePreview() {
    cancelOpen();
    clearTimeout(closeTimer);
    if (preview.contains(document.activeElement)) {
      suppressFocus = true;
      buttons[previewIndex >= 0 ? previewIndex : selected].focus({ preventScroll: true });
      suppressFocus = false;
    }
    hovered = -1;
    concealPreview();
    paintTicks();
  }

  function inNavigator(target) {
    return target && (timeline.contains(target) || preview.contains(target));
  }

  function scheduleClose(event) {
    if (inNavigator(event.relatedTarget)) return;
    cancelOpen();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      const keyboardFocus = inNavigator(document.activeElement) && document.activeElement.matches(':focus-visible');
      if (!timeline.matches(':hover') && !preview.matches(':hover') && !keyboardFocus) hidePreview();
    }, 120);
  }

  function setSelected(index) {
    selected = index;
    buttons.forEach((button, i) => { button.tabIndex = i === index ? 0 : -1; });
    paintTicks();
    // Follow the conversation without interrupting someone browsing the rail.
    if (!inNavigator(document.activeElement) && !timeline.matches(':hover') && !preview.matches(':hover')) {
      ensureTickVisible(index);
    }
  }

  function clearance() { return header.getBoundingClientRect().bottom + 16; }

  function jumpTo(index) {
    document.dispatchEvent(new Event('codex-navigate'));
    setSelected(index);
    jumpingUntil = performance.now() + (reducedMotion.matches ? 0 : 800);
    clearTimeout(jumpTimer);
    jumpTimer = setTimeout(syncPosition, reducedMotion.matches ? 0 : 820);
    const top = nodes[index].getBoundingClientRect().top + scroller.scrollTop - clearance();
    scroller.scrollTo({ top: Math.max(0, top), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    status.textContent = `Message ${index + 1} of ${messages.length}: ${messages[index].text[0]}`;
  }

  function syncPosition() {
    if (performance.now() < jumpingUntil) return;
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 3) {
      setSelected(messages.length - 1);
      return;
    }
    let index = 0;
    nodes.forEach((node, i) => { if (node.getBoundingClientRect().top <= clearance() + 2) index = i; });
    setSelected(index);
  }

  function keyboardNavigation(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      escapeDismissedIndex = previewIndex >= 0 ? previewIndex : selected;
      suppressFocus = true;
      buttons[previewIndex >= 0 ? previewIndex : selected].focus({ preventScroll: true });
      suppressFocus = false;
      hidePreview();
      return;
    }
    const directions = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(event.key in directions) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    escapeDismissedIndex = -1;
    const focusedIndex = buttons.indexOf(document.activeElement);
    let next = focusedIndex >= 0 ? focusedIndex : previewIndex >= 0 && hovered >= 0 ? previewIndex : selected;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = messages.length - 1;
    else next = Math.max(0, Math.min(messages.length - 1, next + directions[event.key]));
    buttons.forEach((button, index) => { button.tabIndex = index === next ? 0 : -1; });
    ensureTickVisible(next);
    buttons[next].focus({ preventScroll: true });
    showPreview(next);
  }

  timeline.addEventListener('keydown', keyboardNavigation);
  preview.addEventListener('keydown', keyboardNavigation);
  timeline.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') railPointer = { x: event.clientX, y: event.clientY };
  });
  timeline.addEventListener('scroll', () => {
    cancelAnimationFrame(railFrame);
    railFrame = requestAnimationFrame(() => {
      const keyboardFocus = inNavigator(document.activeElement) && document.activeElement.matches(':focus-visible');
      if (railPointer && !keyboardFocus) {
        const rail = timeline.getBoundingClientRect();
        if (railPointer.x >= rail.left && railPointer.x < rail.right && railPointer.y >= rail.top && railPointer.y < rail.bottom) {
          const index = buttons.findIndex(button => {
            const tick = button.getBoundingClientRect();
            return railPointer.y >= tick.top && railPointer.y < tick.bottom;
          });
          if (index >= 0 && index !== hovered) previewOnHover(index);
        }
      }
      positionPreview();
    });
  }, { passive: true });
  timeline.addEventListener('wheel', event => event.stopPropagation(), { passive: true });
  timeline.addEventListener('pointerleave', event => {
    railPointer = undefined;
    escapeDismissedIndex = -1;
    scheduleClose(event);
  });
  preview.addEventListener('pointerleave', scheduleClose);
  preview.addEventListener('pointerenter', () => { cancelOpen(); clearTimeout(closeTimer); });
  preview.addEventListener('focusin', () => clearTimeout(closeTimer));
  timeline.addEventListener('focusout', scheduleClose);
  preview.addEventListener('focusout', scheduleClose);
  jumpButton.addEventListener('click', () => jumpTo(previewIndex));
  bookmark.addEventListener('click', () => {
    const id = messages[previewIndex].id;
    bookmarks.has(id) ? bookmarks.delete(id) : bookmarks.add(id);
    try { localStorage.setItem('owl-1-bookmarks', JSON.stringify([...bookmarks])); } catch (_) {}
    bookmark.setAttribute('aria-pressed', String(bookmarks.has(id)));
    bookmark.setAttribute('aria-label', bookmarks.has(id) ? 'Remove bookmark' : 'Bookmark message');
    status.textContent = bookmarks.has(id) ? 'Message bookmarked.' : 'Bookmark removed.';
  });
  scroller.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(syncPosition);
  }, { passive: true });
  document.addEventListener('owl-message-sent', event => appendSentMessage(event.detail?.node));
  document.addEventListener('owl-history-navigate', event => {
    const index = nodes.findIndex(node => node.id === event.detail?.messageId);
    if (index < 0) return;
    hidePreview();
    jumpTo(index);
    const node = nodes[index];
    if (!node.hasAttribute('tabindex')) node.tabIndex = -1;
    node.focus({ preventScroll: true });
  });
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    scroller.addEventListener(event, () => {
      jumpingUntil = 0;
      clearTimeout(jumpTimer);
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(syncPosition);
    }, { passive: true });
  }
  document.addEventListener('pointerdown', event => {
    if (!inNavigator(event.target)) hidePreview();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (preview.dataset.open === 'true' || openTimer !== undefined)) {
      event.preventDefault();
      escapeDismissedIndex = previewIndex >= 0 ? previewIndex : selected;
      hidePreview();
    }
  });
  window.addEventListener('resize', () => {
    const focusedIndex = buttons.indexOf(document.activeElement);
    if (focusedIndex >= 0) ensureTickVisible(focusedIndex);
    else if (!timeline.matches(':hover') && !preview.matches(':hover')) ensureTickVisible(selected);
    positionPreview();
  });
  new ResizeObserver(positionPreview).observe(preview);
  paintTicks();
  document.fonts.ready.then(syncPosition);
})();
