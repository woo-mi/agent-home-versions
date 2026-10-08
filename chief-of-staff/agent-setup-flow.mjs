export const DEFAULT_AGENT_SCHEDULE = Object.freeze({
  day: 'Friday',
  time: '07:00',
  timezone: 'America/Los_Angeles',
  channel: '#sales-pipeline',
});

const DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

/** Copy and validate form values; omitted fields use the prototype defaults. */
export function normalizeAgentSchedule(configuration = {}) {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return null;
  const schedule = Object.fromEntries(Object.entries(DEFAULT_AGENT_SCHEDULE).map(([key, fallback]) => [
    key, configuration[key] === undefined ? fallback : configuration[key],
  ]));
  if (!DAYS.has(schedule.day) || typeof schedule.time !== 'string'
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return null;
  if (typeof schedule.timezone !== 'string' || !schedule.timezone.trim()) return null;
  try {
    // Intl validates the zone itself, independently of the viewer's local zone.
    new Intl.DateTimeFormat('en-US', { timeZone: schedule.timezone });
  } catch {
    return null;
  }
  if (typeof schedule.channel !== 'string' || !schedule.channel.trim()
    || schedule.channel.length > 100 || /[\r\n]/.test(schedule.channel)) return null;
  schedule.channel = schedule.channel.trim();
  return Object.freeze(schedule);
}

/** Simulated agent setup, offered after enough time viewing the completed app. */
export function createAgentSetupFlow({
  onChange = () => {},
  clock = globalThis,
  reviewDelay = 5000,
  setupDelay = 2200,
} = {}) {
  const now = () => typeof clock.now === 'function' ? clock.now() : Date.now();
  const duration = (value, fallback) => Number.isFinite(value) && value >= 0 ? value : fallback;
  const setupDuration = duration(setupDelay, 2200);
  let remainingReview = duration(reviewDelay, 5000);
  let reviewStartedAt = null;
  let reviewTimer = null;
  let reviewVersion = 0;
  let setupTimer = null;
  let stage = 'waiting';
  let schedule;
  let viewing = false;
  let destroyed = false;

  function snapshot() {
    return Object.freeze({ stage, ...(schedule ? { schedule: Object.freeze({ ...schedule }) } : {}) });
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

  function setup(configuration) {
    if (destroyed || !['offered', 'deferred'].includes(stage)) return false;
    const selected = normalizeAgentSchedule(configuration);
    if (!selected) return false;
    schedule = selected;
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
