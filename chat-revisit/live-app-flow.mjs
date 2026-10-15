// CRM authorization and app creation are simulated entirely in memory.
export const CRM_TOOLS = Object.freeze([
  { id: "hubspot", label: "HubSpot" },
  { id: "salesforce", label: "Salesforce" },
].map(Object.freeze));

const DEFAULT_DELAYS = Object.freeze({ connection: 2600, confirmation: 1800, build: 3800 });
const CONNECTABLE_STAGES = new Set(["choosing", "skipped", "building", "complete"]);

// Delay values accept milliseconds or a function(toolId). The initial state is
// available through snapshot(); onChange fires only after an actual change.
export function createLiveAppFlow({ onChange, clock = globalThis, delays = {} } = {}) {
  const tools = CRM_TOOLS.map((entry) => ({ ...entry, status: "idle" }));
  const timers = new Set();
  let stage = "offered";
  let buildTimer = null;
  let destroyed = false;

  function snapshot() {
    return Object.freeze({
      stage,
      tools: Object.freeze(tools.map((entry) => Object.freeze({ ...entry }))),
      activeCount: tools.filter(({ status }) => status === "connecting" || status === "confirming").length,
      connectedCount: tools.filter(({ status }) => status === "connected").length,
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
    return timer;
  }

  function cancelBuild() {
    if (buildTimer === null) return;
    clock.clearTimeout(buildTimer);
    timers.delete(buildTimer);
    buildTimer = null;
  }

  function startBuildWhenReady() {
    const { activeCount, connectedCount } = snapshot();
    if (activeCount > 0 || connectedCount === 0 || buildTimer !== null) return;
    stage = "building";
    buildTimer = schedule("build", undefined, () => {
      buildTimer = null;
      stage = "complete";
      emit();
    });
  }

  function build() {
    if (destroyed || !["offered", "deferred", "skipped"].includes(stage)) return false;
    stage = "choosing";
    emit();
    return true;
  }

  function defer() {
    if (destroyed || !["offered", "choosing"].includes(stage)) return false;
    if (tools.some(({ status }) => status !== "idle")) return false;
    stage = "deferred";
    emit();
    return true;
  }

  function connect(id) {
    if (destroyed || !CONNECTABLE_STAGES.has(stage)) return false;
    const entry = tools.find((candidate) => candidate.id === id);
    if (!entry || entry.status !== "idle") return false;
    cancelBuild();
    stage = "choosing";
    entry.status = "connecting";
    schedule("connection", id, () => {
      entry.status = "confirming";
      schedule("confirmation", id, () => {
        entry.status = "connected";
        startBuildWhenReady();
        emit();
      });
      emit();
    });
    // Register timers before notifying, so callbacks can connect or destroy.
    emit();
    return true;
  }

  function skip() {
    if (destroyed || stage !== "choosing" || snapshot().activeCount > 0) return false;
    stage = "skipped";
    emit();
    return true;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
    buildTimer = null;
  }

  return Object.freeze({ build, defer, connect, skip, snapshot, destroy });
}
