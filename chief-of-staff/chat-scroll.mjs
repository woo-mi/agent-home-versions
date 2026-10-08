/** Follow new chat content with one animation, while leaving manual scrolling alone.
 * Keep the scroller's CSS scroll-behavior:auto and overflow-anchor:none; this
 * controller owns following so native smooth scrolling/anchoring cannot compete.
 * clock, reducedMotion, and ResizeObserver are injectable for deterministic tests.
 */
export function createChatScroll(scroller, {
  content = scroller.firstElementChild,
  clock = globalThis,
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),
  ResizeObserver: Observer = globalThis.ResizeObserver,
} = {}) {
  const bottom = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const atBottom = () => Math.abs(bottom() - scroller.scrollTop) <= 2;
  const reduceMotion = () => typeof reducedMotion === 'boolean' ? reducedMotion : Boolean(reducedMotion?.matches);
  let following = atBottom();
  let frame = null;
  let previousTime = null;
  let expectedTop = scroller.scrollTop;
  let elementTarget = null;
  let touching = false;
  let destroyed = false;
  let updateDepth = 0;

  function stopFrame() {
    if (frame !== null) clock.cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
  }

  function writeTop(top) {
    scroller.scrollTop = Math.max(0, Math.min(bottom(), top));
    expectedTop = scroller.scrollTop;
  }

  function cancel() {
    stopFrame();
    following = false;
    elementTarget = null;
  }

  function target() {
    return elementTarget === null ? bottom() : Math.max(0, Math.min(bottom(), elementTarget));
  }

  function finish() {
    if (elementTarget !== null) {
      elementTarget = null;
      following = atBottom();
    }
    previousTime = null;
  }

  function animate(timestamp) {
    frame = null;
    if (destroyed || touching || (!following && elementTarget === null)) return;
    const destination = target();
    const remaining = destination - scroller.scrollTop;
    if (reduceMotion() || Math.abs(remaining) <= 0.5) {
      writeTop(destination);
      finish();
      return;
    }
    const elapsed = previousTime === null ? 16 : Math.max(0, Math.min(40, timestamp - previousTime));
    previousTime = timestamp;
    // A live destination avoids restarting native smooth scroll on every chunk.
    // Exponential easing approaches it monotonically, without overshoot/bounce.
    const current = scroller.scrollTop;
    writeTop(current + remaining * (1 - Math.exp(-elapsed / 90)));
    if (scroller.scrollTop === current && elapsed > 0) {
      // Some surfaces round scrollTop; finish the last few pixels, not a loop.
      writeTop(destination);
      finish();
      return;
    }
    frame = clock.requestAnimationFrame(animate);
  }

  function refresh() {
    if (destroyed || touching || (!following && elementTarget === null)) return;
    if (reduceMotion()) {
      stopFrame();
      writeTop(target());
      finish();
    } else if (frame === null && Math.abs(target() - scroller.scrollTop) > 0.5) {
      frame = clock.requestAnimationFrame(animate);
    }
  }

  function follow() {
    if (destroyed) return;
    following = true;
    elementTarget = null;
    refresh();
  }

  function settle() {
    if (destroyed) return;
    stopFrame();
    if (!touching && (following || elementTarget !== null)) {
      writeTop(target());
      finish();
    }
  }

  function update(change, force = false) {
    // Observe already-applied user scrolling before claiming the DOM mutation.
    // Nested updates belong to the same mutation, not a new user scroll.
    if (updateDepth === 0) onScroll();
    updateDepth += 1;
    try {
      return change();
    } finally {
      updateDepth -= 1;
      if (!destroyed) {
        // Flush layout before recording native clamping after content shrinks.
        // Its delayed scroll event may arrive after a subsequent card is added.
        bottom();
        expectedTop = scroller.scrollTop;
        if (force) follow();
        else refresh();
      }
    }
  }

  function onScroll() {
    if (destroyed || Math.abs(scroller.scrollTop - expectedTop) <= 0.5) return;
    // Programmatic frames are ignored; scrollbar/keyboard/touch motion takes over.
    stopFrame();
    elementTarget = null;
    following = atBottom();
    expectedTop = scroller.scrollTop;
  }

  function onWheel(event) {
    if (!event.deltaY) return;
    cancel();
    following = bottom() === 0 || (event.deltaY > 0 && atBottom());
  }

  function onKey(event) {
    const targetElement = event.target;
    if (targetElement?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(targetElement?.tagName)) return;
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (!keys.includes(event.key)) return;
    if (event.key === ' ' && /^(BUTTON|A)$/.test(targetElement?.tagName)) return;
    const upward = ['ArrowUp', 'PageUp', 'Home'].includes(event.key) || (event.key === ' ' && event.shiftKey);
    cancel();
    following = bottom() === 0 || (!upward && atBottom());
  }

  function onTouchStart() {
    touching = true;
    cancel();
  }

  function onTouchEnd() {
    touching = false;
    following = atBottom();
    refresh();
  }

  function onClick(event) {
    const summary = event.target?.closest?.('summary');
    const details = summary?.closest('details');
    // The click fires before native expansion changes the content height.
    // Keep the reader beside the activity they deliberately opened.
    if (details && !details.open) cancel();
  }

  function reset({ top = 0, follow: shouldFollow = true } = {}) {
    if (destroyed) return;
    cancel();
    touching = false;
    writeTop(top);
    following = shouldFollow;
  }

  function scrollToElement(element) {
    if (destroyed || !element) return;
    const viewport = scroller.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const style = scroller.ownerDocument?.defaultView?.getComputedStyle(scroller);
    const insetTop = parseFloat(style?.scrollPaddingTop) || 0;
    const insetBottom = parseFloat(style?.scrollPaddingBottom) || 0;
    const viewportTop = viewport.top + (scroller.clientTop || 0) + insetTop;
    const viewportBottom = viewport.top + (scroller.clientTop || 0) + scroller.clientHeight - insetBottom;
    const viewportHeight = Math.max(0, viewportBottom - viewportTop);
    let offset = 0;
    if (bounds.top < viewportTop || bounds.height > viewportHeight) offset = bounds.top - viewportTop;
    else if (bounds.bottom > viewportBottom) offset = bounds.bottom - viewportBottom;
    cancel();
    elementTarget = scroller.scrollTop + offset;
    if (Math.abs(target() - scroller.scrollTop) <= 0.5) finish();
    else refresh();
  }

  const listeners = [
    ['scroll', onScroll], ['wheel', onWheel], ['keydown', onKey],
    ['touchstart', onTouchStart], ['touchend', onTouchEnd], ['touchcancel', onTouchEnd],
    ['click', onClick],
  ];
  for (const [name, handler] of listeners) scroller.addEventListener(name, handler, { passive: true });
  reducedMotion?.addEventListener?.('change', refresh);
  const observer = Observer ? new Observer(refresh) : null;
  observer?.observe(scroller);
  if (content && content !== scroller) observer?.observe(content);

  function destroy() {
    if (destroyed) return;
    cancel();
    destroyed = true;
    observer?.disconnect();
    reducedMotion?.removeEventListener?.('change', refresh);
    for (const [name, handler] of listeners) scroller.removeEventListener(name, handler);
  }

  return Object.freeze({ update, follow, refresh, settle, cancel, reset, scrollToElement, destroy });
}
