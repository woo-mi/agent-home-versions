// This prototype simulates authorization and source review entirely in memory.
export const TOOLS = Object.freeze([
  { id: "notion", label: "Notion", reviewLabel: "Review workspace pages" },
  { id: "gmail", label: "Gmail", reviewLabel: "Review inbox priorities" },
  { id: "calendar", label: "Calendar", reviewLabel: "Review upcoming meetings" },
  { id: "slack", label: "Slack", reviewLabel: "Review team updates" },
  { id: "gong", label: "Gong", reviewLabel: "Review sales calls" },
].map(Object.freeze));

const DEFAULT_DELAYS = Object.freeze({ authorization: 1600, review: 4200, confirmation: 1700 });

// Each delay accepts milliseconds or a function(toolId) for deterministic demos/tests.
// onChange fires after changes; call snapshot() explicitly for the initial state.
export function createConnectionFlow({ onChange, clock = globalThis, delays = {} } = {}) {
  const tools = TOOLS.map((entry) => ({ ...entry, status: "idle", reviewStatus: "idle" }));
  const timers = new Set();
  const confirmations = [];
  let confirmation = null;
  let activityCount = 0;
  let activityStarted = false;
  let skipped = false;
  let destroyed = false;

  function snapshot() {
    const connectedCount = tools.filter(({ status }) => status === "connected").length;
    const pendingCount = tools.filter(({ status, reviewStatus }) => status === "connecting" || reviewStatus === "reviewing").length;
    return Object.freeze({
      tools: Object.freeze(tools.map((entry) => Object.freeze({ ...entry }))),
      confirmation: confirmation?.text ?? null,
      activityCount,
      activityStarted,
      connectedCount,
      pendingCount,
      complete: connectedCount > 0 && pendingCount === 0 && confirmation === null && confirmations.length === 0,
      skipped,
    });
  }

  function emit() {
    if (!destroyed && typeof onChange === "function") onChange(snapshot());
  }

  function schedule(kind, toolId, callback) {
    const custom = delays[kind];
    const duration = typeof custom === "function" ? custom(toolId) : custom;
    const delay = Number.isFinite(duration) && duration >= 0 ? duration : DEFAULT_DELAYS[kind];
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      if (!destroyed) callback();
    }, delay);
    timers.add(timer);
  }

  function showNextConfirmation() {
    if (confirmation || confirmations.length === 0) return;
    confirmation = confirmations.shift();
    schedule("confirmation", confirmation.id, () => {
      confirmation = null;
      activityCount += 1;
      showNextConfirmation();
      emit();
    });
  }

  function connect(id) {
    if (destroyed) return false;
    const entry = tools.find((candidate) => candidate.id === id);
    if (!entry || entry.status !== "idle") return false;
    skipped = false;
    activityStarted = true;
    entry.status = "connecting";
    schedule("authorization", id, () => {
      entry.status = "connected";
      entry.reviewStatus = "reviewing";
      schedule("review", id, () => {
        entry.reviewStatus = "complete";
        emit();
      });
      confirmations.push({ id, text: `${entry.label} connected.` });
      showNextConfirmation();
      emit();
    });
    // Register timers before notifying so callbacks may safely connect or destroy.
    emit();
    return true;
  }

  function skip() {
    if (destroyed || skipped) return false;
    skipped = true;
    emit();
    return true;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
  }

  return Object.freeze({ connect, skip, snapshot, destroy });
}
