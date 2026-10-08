import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatScroll } from '../chief-of-staff/chat-scroll.mjs';

function surface({ height = 1000, viewport = 400, top = 600 } = {}) {
  const listeners = new Map();
  const content = {};
  const scroller = {
    scrollHeight: height, clientHeight: viewport, scrollTop: top, clientTop: 0,
    firstElementChild: content,
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    dispatch(name, event = {}) {
      for (const listener of listeners.get(name) || []) listener({ target: scroller, ...event });
    },
    getBoundingClientRect: () => ({ top: 50, bottom: 450 }),
    get listenerCount() { return [...listeners.values()].reduce((sum, group) => sum + group.size, 0); },
  };
  let time = 0;
  let nextFrame = 0;
  const frames = new Map();
  const positions = [];
  const clock = {
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    step() {
      time += 16;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(time);
      positions.push(scroller.scrollTop);
      scroller.dispatch('scroll');
    },
    settle() {
      for (let count = 0; frames.size && count < 200; count += 1) this.step();
      assert.equal(frames.size, 0, 'Animation should settle without an endless frame loop');
    },
    get pending() { return frames.size; },
  };
  let observer;
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.observed = []; observer = this; }
    observe(element) { this.observed.push(element); }
    disconnect() { this.observed = []; }
    notify() { this.callback(); }
  }
  const motionListeners = new Set();
  const reducedMotion = {
    matches: false,
    addEventListener(name, listener) { motionListeners.add(listener); },
    removeEventListener(name, listener) { motionListeners.delete(listener); },
    change(value) { this.matches = value; for (const listener of motionListeners) listener(); },
  };
  const controller = createChatScroll(scroller, { clock, ResizeObserver, reducedMotion });
  return { scroller, clock, positions, controller, observer, reducedMotion };
}

test('appended paragraphs coalesce into one smooth monotonic animation with a live target', () => {
  const { controller, scroller, clock, positions } = surface();
  controller.update(() => { scroller.scrollHeight += 200; });
  assert.equal(scroller.scrollTop, 600, 'Appending should not jump instantly');
  assert.equal(clock.pending, 1);
  clock.step();
  assert.ok(scroller.scrollTop > 600 && scroller.scrollTop < 800);
  controller.update(() => { scroller.scrollHeight += 100; });
  controller.update(() => { scroller.scrollHeight += 100; });
  assert.equal(clock.pending, 1, 'Repeated updates must retarget, not restart parallel animations');
  clock.settle();
  assert.equal(scroller.scrollTop, 1000);
  assert.ok(positions.every((position, index) => index === 0 || position >= positions[index - 1]));
  assert.ok(positions.every((position) => position <= 1000), 'No overshoot');
  controller.destroy();
});

test('upward wheel input immediately stops following and returning to the bottom resumes it', () => {
  const { controller, scroller, clock, observer } = surface();
  controller.update(() => { scroller.scrollHeight += 300; });
  clock.step();
  scroller.dispatch('wheel', { deltaY: -80 });
  scroller.scrollTop = 500;
  scroller.dispatch('scroll');
  controller.update(() => { scroller.scrollHeight += 300; });
  observer.notify();
  assert.equal(clock.pending, 0);
  assert.equal(scroller.scrollTop, 500, 'New content must not move the reader');
  scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
  scroller.dispatch('scroll');
  controller.update(() => { scroller.scrollHeight += 100; });
  clock.settle();
  assert.equal(scroller.scrollTop, 1300);
  controller.destroy();
});

test('an explicit send follows the latest even after the user has scrolled away', () => {
  const { controller, scroller, clock } = surface({ top: 150 });
  controller.update(() => { scroller.scrollHeight += 200; });
  assert.equal(clock.pending, 0);
  controller.update(() => { scroller.scrollHeight += 100; }, true);
  clock.settle();
  assert.equal(scroller.scrollTop, 900);
  controller.destroy();
});

test('an instant layout change settles following without leaving a resize animation', () => {
  const { controller, scroller, clock, observer } = surface();
  controller.update(() => { scroller.scrollHeight += 200; });
  clock.step();
  controller.update(() => { scroller.scrollHeight += 120; });
  controller.settle();
  assert.equal(scroller.scrollTop, 920);
  assert.equal(clock.pending, 0);
  observer.notify();
  scroller.dispatch('scroll');
  assert.equal(clock.pending, 0, 'The panel resize must not restart motion');
  controller.update(() => { scroller.scrollHeight += 100; });
  assert.equal(clock.pending, 1, 'Later chat replies should still scroll naturally');
  clock.settle();
  assert.equal(scroller.scrollTop, 1020);
  controller.destroy();
});

test('settling a layout leaves a reader who scrolled up in place', () => {
  const { controller, scroller, clock, observer } = surface({ top: 150 });
  controller.update(() => { scroller.scrollHeight += 200; });
  controller.settle();
  observer.notify();
  assert.equal(scroller.scrollTop, 150);
  assert.equal(clock.pending, 0);
  controller.destroy();
});

test('animation also settles when the scrolling surface rounds to whole pixels', () => {
  const { controller, scroller, clock } = surface();
  let roundedTop = scroller.scrollTop;
  Object.defineProperty(scroller, 'scrollTop', {
    get: () => roundedTop,
    set: (value) => { roundedTop = Math.round(value); },
  });
  controller.update(() => { scroller.scrollHeight += 200; });
  clock.settle();
  assert.equal(scroller.scrollTop, 800);
  controller.destroy();
});

test('a removed paragraph and later card preserve following through the native scroll clamp', () => {
  const { controller, scroller, clock } = surface();
  let actualTop = scroller.scrollTop;
  Object.defineProperty(scroller, 'scrollTop', {
    get() {
      actualTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, actualTop));
      return actualTop;
    },
    set(value) { actualTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, value)); },
  });
  controller.update(() => { scroller.scrollHeight += 100; });
  clock.settle();
  assert.equal(scroller.scrollTop, 700);
  controller.follow();
  controller.update(() => { scroller.scrollHeight -= 100; });
  assert.equal(scroller.scrollTop, 600, 'The browser clamps when the deferred paragraph disappears');
  controller.update(() => { scroller.scrollHeight += 250; });
  // The native clamp's scroll event may arrive after the next card was appended.
  scroller.dispatch('scroll');
  clock.settle();
  assert.equal(scroller.scrollTop, 850, 'A layout clamp must not be mistaken for the reader scrolling away');
  controller.update(() => {
    scroller.scrollHeight -= 250;
    assert.equal(scroller.scrollTop, 600);
    scroller.scrollHeight += 300;
    controller.update(() => { scroller.scrollHeight += 100; });
  });
  scroller.dispatch('scroll');
  clock.settle();
  assert.equal(scroller.scrollTop, 1000, 'Nested rendering belongs to the same controller-owned layout change');
  controller.destroy();
});

test('a real scroll applied before an update still pauses following before its scroll event arrives', () => {
  const { controller, scroller, clock } = surface();
  scroller.scrollTop = 300;
  controller.update(() => { scroller.scrollHeight += 200; });
  scroller.dispatch('scroll');
  assert.equal(clock.pending, 0);
  assert.equal(scroller.scrollTop, 300);
  controller.destroy();
});

test('keyboard scrolling cancels animation while text editing does not', () => {
  const { controller, scroller, clock } = surface();
  controller.update(() => { scroller.scrollHeight += 300; });
  scroller.dispatch('keydown', { key: 'ArrowUp', target: { tagName: 'TEXTAREA' } });
  assert.equal(clock.pending, 1);
  scroller.dispatch('keydown', { key: 'PageUp' });
  assert.equal(clock.pending, 0);
  controller.update(() => { scroller.scrollHeight += 100; });
  assert.equal(clock.pending, 0);
  controller.destroy();
});

test('touch input owns scrolling until it ends, then follows only when back at the bottom', () => {
  const { controller, scroller, clock, observer } = surface();
  controller.update(() => { scroller.scrollHeight += 200; });
  scroller.dispatch('touchstart');
  scroller.scrollTop = 400;
  scroller.dispatch('scroll');
  observer.notify();
  assert.equal(clock.pending, 0);
  scroller.dispatch('touchend');
  assert.equal(clock.pending, 0);
  scroller.dispatch('touchstart');
  scroller.scrollTop = 800;
  scroller.dispatch('scroll');
  scroller.dispatch('touchend');
  controller.update(() => { scroller.scrollHeight += 100; });
  clock.settle();
  assert.equal(scroller.scrollTop, 900);
  controller.destroy();
});

test('reduced motion jumps directly and changing the preference cancels an active animation', () => {
  const { controller, scroller, clock, reducedMotion } = surface();
  controller.update(() => { scroller.scrollHeight += 200; });
  assert.equal(clock.pending, 1);
  reducedMotion.change(true);
  assert.equal(scroller.scrollTop, 800);
  assert.equal(clock.pending, 0);
  controller.update(() => { scroller.scrollHeight += 100; });
  assert.equal(scroller.scrollTop, 900);
  assert.equal(clock.pending, 0);
  controller.destroy();
});

test('content and viewport resize follow naturally without resuming a paused reader', () => {
  const { controller, scroller, clock, observer } = surface();
  assert.equal(observer.observed.length, 2);
  scroller.clientHeight = 300;
  observer.notify();
  clock.settle();
  assert.equal(scroller.scrollTop, 700);
  scroller.dispatch('wheel', { deltaY: -100 });
  scroller.scrollTop = 500;
  scroller.dispatch('scroll');
  scroller.scrollHeight += 300;
  observer.notify();
  assert.equal(scroller.scrollTop, 500);
  assert.equal(clock.pending, 0);
  controller.destroy();
});

test('explicit navigation reveals an earlier card without pulling back to new messages', () => {
  const { controller, scroller, clock } = surface();
  controller.scrollToElement({ getBoundingClientRect: () => ({ top: -250, bottom: -50, height: 200 }) });
  clock.settle();
  assert.equal(scroller.scrollTop, 300);
  controller.update(() => { scroller.scrollHeight += 200; });
  assert.equal(clock.pending, 0);
  assert.equal(scroller.scrollTop, 300);
  controller.destroy();
});

test('explicit navigation reveals controls between floating header and composer overlays', () => {
  const { controller, scroller, clock } = surface({ top: 200 });
  const style = { scrollPaddingTop: '46px', scrollPaddingBottom: '120px' };
  scroller.ownerDocument = { defaultView: { getComputedStyle: () => style } };
  controller.scrollToElement({ getBoundingClientRect: () => ({ top: 300, bottom: 380, height: 80 }) });
  clock.settle();
  assert.equal(scroller.scrollTop, 250, 'Reveal a card that would otherwise sit behind the composer');
  controller.scrollToElement({ getBoundingClientRect: () => ({ top: 70, bottom: 150, height: 80 }) });
  clock.settle();
  assert.equal(scroller.scrollTop, 224, 'An earlier card must clear the floating header');
  style.scrollPaddingBottom = '170px';
  controller.scrollToElement({ getBoundingClientRect: () => ({ top: 160, bottom: 380, height: 220 }) });
  clock.settle();
  assert.equal(scroller.scrollTop, 288, 'A card taller than the remaining view aligns its start below the header');
  controller.update(() => { scroller.scrollHeight += 100; });
  assert.equal(clock.pending, 0, 'Explicit navigation must keep new messages from pulling the reader away');
  controller.destroy();
});

test('opening tool activity preserves the reader position without canceling ordinary clicks', () => {
  const { controller, scroller, clock, observer } = surface();
  controller.update(() => { scroller.scrollHeight += 200; });
  clock.step();
  const readingPosition = scroller.scrollTop;
  scroller.dispatch('click', { target: { closest: () => null } });
  assert.equal(clock.pending, 1, 'Ordinary clicks should not cancel following');
  const details = { open: true };
  const summary = { closest: (selector) => selector === 'details' ? details : null };
  const child = { closest: (selector) => selector === 'summary' ? summary : null };
  scroller.dispatch('click', { target: child });
  assert.equal(clock.pending, 1, 'Closing activity should not interrupt following');
  details.open = false;
  scroller.dispatch('click', { target: child });
  assert.equal(clock.pending, 0, 'Opening activity should cancel before its native expansion');
  details.open = true;
  scroller.scrollHeight += 300;
  observer.notify();
  assert.equal(clock.pending, 0);
  assert.equal(scroller.scrollTop, readingPosition);
  controller.destroy();
});

test('reset and destroy cancel scheduled work and remove observers and listeners', () => {
  const { controller, scroller, clock, observer, reducedMotion } = surface();
  controller.update(() => { scroller.scrollHeight += 200; });
  scroller.scrollHeight = 300;
  controller.reset();
  assert.equal(scroller.scrollTop, 0);
  assert.equal(clock.pending, 0);
  controller.update(() => { scroller.scrollHeight = 600; });
  assert.equal(clock.pending, 1, 'Reset re-enables following for a new conversation');
  controller.destroy();
  controller.destroy();
  assert.equal(clock.pending, 0);
  assert.equal(scroller.listenerCount, 0);
  assert.equal(observer.observed.length, 0);
  reducedMotion.change(true);
  observer.notify();
  controller.follow();
  assert.equal(scroller.scrollTop, 0);
  assert.equal(clock.pending, 0);
});
