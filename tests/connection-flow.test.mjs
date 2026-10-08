import test from "node:test";
import assert from "node:assert/strict";
import { createConnectionFlow, TOOLS } from "../chief-of-staff/connection-flow.mjs";

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

test("starts with five connectable tools and defensive immutable snapshots", () => {
  const flow = createConnectionFlow();
  const initial = flow.snapshot();
  assert.deepEqual(initial.tools.map(({ id }) => id), ["notion", "gmail", "calendar", "slack", "gong"]);
  assert.ok(initial.tools.every(({ status, reviewStatus }) => status === "idle" && reviewStatus === "idle"));
  assert.equal(initial.confirmation, null);
  assert.equal(initial.activityCount, 0);
  assert.equal(initial.activityStarted, false);
  assert.equal(initial.connectedCount, 0);
  assert.equal(initial.pendingCount, 0);
  assert.equal(initial.complete, false);
  assert.equal(initial.skipped, false);
  assert.throws(() => { initial.tools[0].status = "connected"; }, TypeError);
  assert.throws(() => { initial.tools.push({ id: "extra" }); }, TypeError);
  assert.throws(() => { TOOLS[0].label = "Other"; }, TypeError);
  assert.notEqual(initial, flow.snapshot());
  assert.notEqual(initial.tools[0], flow.snapshot().tools[0]);
  flow.destroy();
});

test("authorization, source review, and transient confirmation have separate lifecycles", () => {
  const clock = fakeClock();
  const events = [];
  const flow = createConnectionFlow({ clock, onChange: (state) => events.push(state) });
  assert.equal(events.length, 0);
  assert.equal(flow.connect("notion"), true);
  assert.equal(tool(flow, "notion").status, "connecting");
  assert.equal(flow.snapshot().activityStarted, true);
  assert.equal(flow.snapshot().pendingCount, 1);
  clock.tick(1599);
  assert.equal(tool(flow, "notion").status, "connecting");
  clock.tick(1);
  assert.equal(tool(flow, "notion").status, "connected");
  assert.equal(tool(flow, "notion").reviewStatus, "reviewing");
  assert.equal(flow.snapshot().confirmation, "Notion connected.");
  assert.equal(flow.snapshot().connectedCount, 1);
  assert.equal(flow.snapshot().pendingCount, 1);
  clock.tick(1700);
  assert.equal(flow.snapshot().confirmation, null);
  assert.equal(flow.snapshot().activityCount, 1);
  assert.equal(flow.snapshot().complete, false);
  clock.tick(2500);
  assert.equal(tool(flow, "notion").reviewStatus, "complete");
  assert.equal(flow.snapshot().pendingCount, 0);
  assert.equal(flow.snapshot().complete, true);
  assert.equal(events.length, 4);
});

test("parallel out-of-order authorization queues every confirmation exactly once", () => {
  const clock = fakeClock();
  const shown = [];
  let prior = null;
  const flow = createConnectionFlow({
    clock,
    delays: { authorization: (id) => ({ notion: 300, gmail: 100, calendar: 200, slack: 400, gong: 500 })[id], review: 50, confirmation: 1000 },
    onChange(state) {
      if (state.confirmation && state.confirmation !== prior) shown.push(state.confirmation);
      prior = state.confirmation;
    },
  });
  for (const { id } of TOOLS) flow.connect(id);
  assert.equal(flow.snapshot().pendingCount, 5);
  clock.tick(100);
  assert.equal(flow.snapshot().confirmation, "Gmail connected.");
  clock.tick(450);
  assert.equal(flow.snapshot().connectedCount, 5);
  assert.equal(flow.snapshot().pendingCount, 0);
  assert.equal(flow.snapshot().complete, false, "Queued confirmations must settle before completion");
  assert.equal(flow.snapshot().activityCount, 0);
  clock.tick(4550);
  assert.deepEqual(shown, ["Gmail connected.", "Calendar connected.", "Notion connected.", "Slack connected.", "Gong connected."]);
  assert.equal(flow.snapshot().activityCount, 5);
  assert.equal(flow.snapshot().confirmation, null);
  assert.equal(flow.snapshot().complete, true);
  assert.equal(clock.pending, 0);
});

test("each later connection reopens activity and receives its own confirmation", () => {
  const clock = fakeClock();
  const flow = createConnectionFlow({ clock });
  flow.connect("notion");
  clock.tick(6000);
  assert.equal(flow.snapshot().complete, true);
  flow.connect("gmail");
  assert.equal(flow.snapshot().complete, false);
  assert.equal(flow.snapshot().activityCount, 1);
  clock.tick(1600);
  assert.equal(flow.snapshot().confirmation, "Gmail connected.");
  clock.tick(4200);
  assert.equal(flow.snapshot().activityCount, 2);
  assert.equal(flow.snapshot().complete, true);
});

test("skip works with zero or partial connections without canceling pending work", () => {
  const clock = fakeClock();
  const flow = createConnectionFlow({ clock });
  flow.skip();
  assert.equal(flow.snapshot().skipped, true);
  assert.equal(flow.snapshot().activityStarted, false);
  assert.equal(flow.snapshot().complete, false);
  flow.connect("slack");
  assert.equal(flow.snapshot().skipped, false);
  flow.skip();
  clock.tick(1600);
  assert.equal(flow.snapshot().skipped, true);
  assert.equal(flow.snapshot().confirmation, "Slack connected.");
  clock.tick(4200);
  assert.equal(tool(flow, "slack").reviewStatus, "complete");
  assert.equal(flow.snapshot().complete, true);
  flow.connect("calendar");
  assert.equal(flow.snapshot().skipped, false);
  flow.destroy();
});

test("duplicate and unknown connections do not add timers, confirmations, or callbacks", () => {
  const clock = fakeClock();
  let changes = 0;
  const flow = createConnectionFlow({ clock, onChange: () => { changes += 1; } });
  assert.equal(flow.connect("unknown"), false);
  flow.connect("gmail");
  assert.equal(flow.connect("gmail"), false);
  assert.equal(clock.pending, 1);
  assert.equal(changes, 1);
  clock.tick(1600);
  assert.equal(flow.connect("gmail"), false);
  clock.tick(10000);
  assert.equal(flow.snapshot().activityCount, 1);
  assert.equal(changes, 4);
  assert.equal(clock.pending, 0);
});

test("destroy clears authorization, review, and confirmation timers and prevents callbacks", () => {
  const clock = fakeClock();
  let changes = 0;
  const flow = createConnectionFlow({ clock, onChange: () => { changes += 1; } });
  flow.connect("notion");
  clock.tick(1600);
  flow.connect("gmail");
  assert.equal(clock.pending, 3);
  const last = flow.snapshot();
  const count = changes;
  flow.destroy();
  flow.destroy();
  assert.equal(clock.pending, 0);
  assert.equal(flow.connect("slack"), false);
  flow.skip();
  clock.tick(20000);
  assert.equal(changes, count);
  assert.deepEqual(flow.snapshot(), last);
});

test("callbacks can connect another tool or destroy the flow without orphaned timers", () => {
  const clock = fakeClock();
  let changes = 0;
  const flow = createConnectionFlow({
    clock,
    onChange(state) {
      changes += 1;
      if (state.tools[0].status === "connecting" && state.tools[1].status === "idle") flow.connect("gmail");
      if (state.connectedCount === 2) flow.destroy();
    },
  });
  flow.connect("notion");
  assert.equal(flow.snapshot().pendingCount, 2);
  clock.tick(1600);
  assert.equal(flow.snapshot().connectedCount, 2);
  assert.equal(clock.pending, 0);
  const count = changes;
  clock.tick(20000);
  assert.equal(changes, count);
});
