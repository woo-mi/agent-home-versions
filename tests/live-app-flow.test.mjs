import test from "node:test";
import assert from "node:assert/strict";
import { createLiveAppFlow, CRM_TOOLS } from "../chief-of-staff/live-app-flow.mjs";

function fakeClock() {
  let now = 0;
  let nextId = 0;
  const tasks = new Map();
  return {
    setTimeout(callback, delay) {
      const id = ++nextId;
      tasks.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { tasks.delete(id); },
    tick(duration) {
      const end = now + duration;
      while (true) {
        const next = [...tasks].filter(([, task]) => task.at <= end)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        const [id, task] = next;
        tasks.delete(id);
        now = task.at;
        task.callback();
      }
      now = end;
    },
    get pending() { return tasks.size; },
  };
}

const tool = (flow, id) => flow.snapshot().tools.find((entry) => entry.id === id);
const TEST_DELAYS = { connection: 100, confirmation: 80, build: 200 };

test("starts with an offer and defensive immutable CRM snapshots", () => {
  const changes = [];
  const flow = createLiveAppFlow({ onChange: (state) => changes.push(state) });
  const initial = flow.snapshot();
  assert.deepEqual(initial, {
    stage: "offered",
    tools: [
      { id: "hubspot", label: "HubSpot", status: "idle" },
      { id: "salesforce", label: "Salesforce", status: "idle" },
    ],
    activeCount: 0,
    connectedCount: 0,
  });
  assert.equal(changes.length, 0);
  assert.throws(() => { initial.stage = "complete"; }, TypeError);
  assert.throws(() => { initial.tools[0].status = "connected"; }, TypeError);
  assert.throws(() => { initial.tools.push({ id: "extra" }); }, TypeError);
  assert.throws(() => { CRM_TOOLS[0].label = "Other"; }, TypeError);
  assert.notEqual(initial, flow.snapshot());
  assert.notEqual(initial.tools[0], flow.snapshot().tools[0]);
  flow.build();
  assert.equal(initial.stage, "offered", "Past snapshots must not change");
  flow.destroy();
});

test("defer is resumable and building first reveals the CRM chooser", () => {
  const clock = fakeClock();
  const changes = [];
  const flow = createLiveAppFlow({ clock, onChange: (state) => changes.push(state.stage) });
  assert.equal(flow.connect("hubspot"), false);
  assert.equal(flow.skip(), false);
  assert.equal(flow.defer(), true);
  assert.equal(flow.snapshot().stage, "deferred");
  assert.equal(flow.defer(), false);
  assert.equal(flow.connect("hubspot"), false);
  assert.equal(flow.build(), true);
  assert.equal(flow.snapshot().stage, "choosing");
  assert.equal(flow.build(), false);
  assert.equal(flow.defer(), true);
  assert.equal(flow.build(), true);
  assert.equal(clock.pending, 0);
  assert.deepEqual(changes, ["deferred", "choosing", "deferred", "choosing"]);
});

test("default timing preserves connecting, confirming, building, and completion phases", () => {
  const clock = fakeClock();
  const changes = [];
  const flow = createLiveAppFlow({ clock, onChange: (state) => changes.push(state) });
  flow.build();
  assert.equal(flow.connect("hubspot"), true);
  assert.equal(tool(flow, "hubspot").status, "connecting");
  assert.equal(flow.snapshot().activeCount, 1);
  assert.equal(flow.snapshot().connectedCount, 0);
  clock.tick(2599);
  assert.equal(tool(flow, "hubspot").status, "connecting");
  clock.tick(1);
  assert.equal(tool(flow, "hubspot").status, "confirming");
  assert.equal(flow.snapshot().stage, "choosing");
  clock.tick(1799);
  assert.equal(flow.snapshot().connectedCount, 0);
  assert.equal(flow.snapshot().activeCount, 1);
  clock.tick(1);
  assert.equal(tool(flow, "hubspot").status, "connected");
  assert.equal(flow.snapshot().activeCount, 0);
  assert.equal(flow.snapshot().connectedCount, 1);
  assert.equal(flow.snapshot().stage, "building");
  clock.tick(3799);
  assert.equal(flow.snapshot().stage, "building");
  clock.tick(1);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(tool(flow, "salesforce").status, "idle");
  assert.equal(clock.pending, 0);
  assert.deepEqual(changes.map(({ stage }) => stage), ["choosing", "choosing", "choosing", "building", "complete"]);
});

test("parallel sources finish independently and building waits for both confirmations", () => {
  const clock = fakeClock();
  const flow = createLiveAppFlow({
    clock,
    delays: { connection: (id) => id === "hubspot" ? 300 : 100, confirmation: 80, build: 200 },
  });
  flow.build();
  flow.connect("hubspot");
  flow.connect("salesforce");
  assert.equal(flow.snapshot().activeCount, 2);
  assert.equal(clock.pending, 2);
  clock.tick(180);
  assert.equal(tool(flow, "salesforce").status, "connected");
  assert.equal(tool(flow, "hubspot").status, "connecting");
  assert.equal(flow.snapshot().stage, "choosing");
  assert.equal(flow.snapshot().connectedCount, 1);
  assert.equal(flow.snapshot().activeCount, 1);
  clock.tick(199);
  assert.equal(tool(flow, "hubspot").status, "confirming");
  assert.equal(flow.snapshot().stage, "choosing");
  clock.tick(1);
  assert.equal(flow.snapshot().stage, "building");
  assert.equal(flow.snapshot().connectedCount, 2);
  assert.equal(flow.snapshot().activeCount, 0);
  assert.equal(clock.pending, 1);
  clock.tick(200);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(clock.pending, 0);
});

test("duplicate and unknown clicks never create timers or restart a build", () => {
  const clock = fakeClock();
  let changes = 0;
  const flow = createLiveAppFlow({ clock, delays: TEST_DELAYS, onChange: () => { changes += 1; } });
  flow.build();
  assert.equal(flow.connect("unknown"), false);
  flow.connect("hubspot");
  assert.equal(flow.connect("hubspot"), false);
  assert.equal(flow.defer(), false);
  assert.equal(flow.skip(), false);
  assert.equal(changes, 2);
  assert.equal(clock.pending, 1);
  clock.tick(100);
  assert.equal(flow.connect("hubspot"), false);
  clock.tick(80);
  assert.equal(flow.snapshot().stage, "building");
  assert.equal(flow.connect("hubspot"), false);
  assert.equal(flow.connect("unknown"), false);
  assert.equal(flow.build(), false);
  clock.tick(199);
  assert.equal(flow.snapshot().stage, "building");
  clock.tick(1);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(flow.connect("hubspot"), false);
  assert.equal(changes, 5);
  assert.equal(clock.pending, 0);
});

test("skip preserves disconnected tools and later connection resumes the flow", () => {
  const clock = fakeClock();
  const flow = createLiveAppFlow({ clock, delays: TEST_DELAYS });
  flow.build();
  assert.equal(flow.skip(), true);
  assert.equal(flow.skip(), false);
  assert.equal(flow.snapshot().stage, "skipped");
  assert.equal(flow.snapshot().connectedCount, 0);
  assert.ok(flow.snapshot().tools.every(({ status }) => status === "idle"));
  clock.tick(10000);
  assert.equal(flow.snapshot().stage, "skipped");
  assert.equal(clock.pending, 0);
  assert.equal(flow.build(), true);
  assert.equal(flow.skip(), true);
  assert.equal(flow.connect("salesforce"), true);
  assert.equal(flow.snapshot().stage, "choosing");
  assert.equal(flow.skip(), false);
  clock.tick(380);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(flow.snapshot().connectedCount, 1);
});

test("adding a new source cancels an in-progress build and restarts after new data arrives", () => {
  const clock = fakeClock();
  const flow = createLiveAppFlow({ clock, delays: TEST_DELAYS });
  flow.build();
  flow.connect("hubspot");
  clock.tick(280);
  assert.equal(flow.snapshot().stage, "building");
  assert.equal(flow.connect("salesforce"), true);
  assert.equal(clock.pending, 1, "Old build timer must be canceled");
  assert.equal(flow.snapshot().stage, "choosing");
  clock.tick(100);
  assert.equal(flow.snapshot().stage, "choosing", "Old build must not complete while new source confirms");
  assert.equal(tool(flow, "salesforce").status, "confirming");
  clock.tick(80);
  assert.equal(flow.snapshot().stage, "building");
  assert.equal(flow.snapshot().connectedCount, 2);
  clock.tick(199);
  assert.equal(flow.snapshot().stage, "building");
  clock.tick(1);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(clock.pending, 0);
});

test("a newly connected source rebuilds an already-completed prototype", () => {
  const clock = fakeClock();
  const flow = createLiveAppFlow({ clock, delays: TEST_DELAYS });
  flow.build();
  flow.connect("salesforce");
  clock.tick(380);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(flow.connect("salesforce"), false);
  assert.equal(flow.connect("hubspot"), true);
  assert.equal(flow.snapshot().stage, "choosing");
  clock.tick(180);
  assert.equal(flow.snapshot().stage, "building");
  clock.tick(200);
  assert.equal(flow.snapshot().stage, "complete");
  assert.equal(flow.snapshot().connectedCount, 2);
});

test("destroy clears timers and prevents changes in every asynchronous phase", () => {
  for (const duration of [0, 100, 180]) {
    const clock = fakeClock();
    let changes = 0;
    const flow = createLiveAppFlow({ clock, delays: TEST_DELAYS, onChange: () => { changes += 1; } });
    flow.build();
    flow.connect("hubspot");
    clock.tick(duration);
    const last = flow.snapshot();
    const count = changes;
    assert.equal(clock.pending, 1);
    flow.destroy();
    flow.destroy();
    assert.equal(clock.pending, 0);
    assert.equal(flow.build(), false);
    assert.equal(flow.defer(), false);
    assert.equal(flow.skip(), false);
    assert.equal(flow.connect("salesforce"), false);
    clock.tick(10000);
    assert.equal(changes, count);
    assert.deepEqual(flow.snapshot(), last);
  }
});

test("callbacks can connect a second source or destroy without leaving timers", () => {
  const clock = fakeClock();
  const flow = createLiveAppFlow({
    clock,
    delays: TEST_DELAYS,
    onChange(state) {
      if (state.tools[0].status === "connecting" && state.tools[1].status === "idle") flow.connect("salesforce");
      if (state.stage === "building") flow.destroy();
    },
  });
  flow.build();
  flow.connect("hubspot");
  assert.equal(flow.snapshot().activeCount, 2);
  assert.equal(clock.pending, 2);
  clock.tick(180);
  assert.equal(flow.snapshot().stage, "building");
  assert.equal(flow.snapshot().connectedCount, 2);
  assert.equal(clock.pending, 0);
  clock.tick(200);
  assert.equal(flow.snapshot().stage, "building");
});
