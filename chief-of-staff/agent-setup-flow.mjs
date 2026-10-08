/** Simulated agent setup, offered after enough time viewing the completed app. */
export function createAgentSetupFlow({
  onChange = () => {},
  clock = globalThis,
  reviewDelay = 12000,
  setupDelay = 2200,
} = {}) {
  const now = () => typeof clock.now === 'function' ? clock.now() : Date.now();
  const duration = (value, fallback) => Number.isFinite(value) && value >= 0 ? value : fallback;
  const setupDuration = duration(setupDelay, 2200);
  let remainingReview = duration(reviewDelay, 12000);
  let reviewStartedAt = null;
  let reviewTimer = null;
  let reviewVersion = 0;
  let setupTimer = null;
  let stage = 'waiting';
  let viewing = false;
  let destroyed = false;

  function snapshot() {
    return Object.freeze({ stage });
  }

  function emit() {
    if (!destroyed) onChange(snapshot());
  }

  function offer() {
    if (destroyed || stage !== 'waiting') return;
    remainingReview = 0;
    reviewStartedAt = null;
    stage = 'offered';
    emit();
  }

  function setViewing(value) {
    const next = Boolean(value);
    if (destroyed || viewing === next) return false;
    viewing = next;
    if (stage !== 'waiting') return true;

    if (viewing) {
      reviewStartedAt = now();
      const version = ++reviewVersion;
      reviewTimer = clock.setTimeout(() => {
        if (destroyed || version !== reviewVersion || !viewing || stage !== 'waiting') return;
        reviewTimer = null;
        offer();
      }, remainingReview);
    } else {
      reviewVersion += 1;
      if (reviewTimer !== null) clock.clearTimeout(reviewTimer);
      reviewTimer = null;
      if (reviewStartedAt !== null) {
        remainingReview = Math.max(0, remainingReview - Math.max(0, now() - reviewStartedAt));
      }
      reviewStartedAt = null;
      // Count elapsed viewing even when a queued timeout has not run yet.
      if (remainingReview === 0) offer();
    }
    return true;
  }

  function defer() {
    if (destroyed || stage !== 'offered') return false;
    stage = 'deferred';
    emit();
    return true;
  }

  function setup() {
    if (destroyed || !['offered', 'deferred'].includes(stage)) return false;
    stage = 'setting-up';
    // Register before notifying so an onChange callback can safely destroy it.
    setupTimer = clock.setTimeout(() => {
      setupTimer = null;
      if (destroyed || stage !== 'setting-up') return;
      stage = 'complete';
      emit();
    }, setupDuration);
    emit();
    return true;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    reviewVersion += 1;
    if (reviewTimer !== null) clock.clearTimeout(reviewTimer);
    if (setupTimer !== null) clock.clearTimeout(setupTimer);
    reviewTimer = null;
    setupTimer = null;
    reviewStartedAt = null;
    viewing = false;
  }

  return Object.freeze({ snapshot, setViewing, defer, setup, destroy });
}
