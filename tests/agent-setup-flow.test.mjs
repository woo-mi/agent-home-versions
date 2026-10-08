import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentSetupFlow } from '../chief-of-staff/agent-setup-flow.mjs';

function fakeClock() {
  let current = 0;
  let nextId = 0;
  const tasks = new Map();
  return {
    now: () => current,
    setTimeout(callback, delay) {
      const id = ++nextId;
      tasks.set(id, { callback, at: current + delay });
      return id;
    },
    clearTimeout(id) { tasks.delete(id); },
    tick(duration) {
      const end = current + duration;
      while (true) {
        const next = [...tasks].filter(([, task]) => task.at <= end)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        const [id, task] = next;
        tasks.delete(id);
        current = task.at;
        task.callback();
      }
      current = end;
    },
    get pending() { return tasks.size; },
  };
}

function createHarness(options = {}) {
  const clock = fakeClock();
  const changes = [];
  const flow = createAgentSetupFlow({ clock, onChange: (state) => changes.push(state.stage), ...options });
  return { clock, changes, flow };
}

function reachOffer({ clock, flow }) {
  flow.setViewing(true);
  clock.tick(12000);
  assert.equal(flow.snapshot().stage, 'offered');
}

test('starts waiting without timers or notifications and returns defensive plain snapshots', () => {
  const { clock, changes, flow } = createHarness();
  const initial = flow.snapshot();
  assert.deepEqual(initial, { stage: 'waiting' });
  assert.equal(Object.getPrototypeOf(initial), Object.prototype);
  assert.notEqual(initial, flow.snapshot());
  assert.throws(() => { initial.stage = 'complete'; }, TypeError);
  assert.equal(flow.defer(), false);
  assert.equal(flow.setup(), false);
  assert.equal(clock.pending, 0);
  assert.deepEqual(changes, []);
  flow.setViewing(true);
  clock.tick(12000);
  assert.equal(initial.stage, 'waiting');
});

test('offers once after twelve seconds of viewing and not while the app is hidden', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  clock.tick(60000);
  assert.equal(flow.snapshot().stage, 'waiting');
  assert.equal(flow.setViewing(true), true);
  clock.tick(11999);
  assert.equal(flow.snapshot().stage, 'waiting');
  clock.tick(1);
  assert.deepEqual(changes, ['offered']);
  assert.equal(clock.pending, 0);
  flow.setViewing(false);
  flow.setViewing(true);
  clock.tick(60000);
  assert.deepEqual(changes, ['offered']);
  assert.equal(clock.pending, 0);
});

test('pause and resume retain cumulative viewing time across several visits', () => {
  const { clock, flow, changes } = createHarness();
  flow.setViewing(true);
  clock.tick(4000);
  flow.setViewing(false);
  assert.equal(clock.pending, 0);
  clock.tick(80000);
  assert.equal(flow.snapshot().stage, 'waiting');
  flow.setViewing(true);
  clock.tick(3000);
  flow.setViewing(false);
  clock.tick(90000);
  flow.setViewing(true);
  clock.tick(4999);
  assert.equal(flow.snapshot().stage, 'waiting');
  clock.tick(1);
  assert.deepEqual(changes, ['offered']);
  assert.equal(clock.pending, 0);
});

test('repeated view events do not duplicate or restart the review timer', () => {
  const { clock, flow, changes } = createHarness();
  assert.equal(flow.setViewing(false), false);
  flow.setViewing(true);
  clock.tick(6000);
  for (let count = 0; count < 5; count += 1) assert.equal(flow.setViewing(true), false);
  assert.equal(clock.pending, 1);
  clock.tick(5999);
  assert.equal(flow.snapshot().stage, 'waiting');
  clock.tick(1);
  assert.deepEqual(changes, ['offered']);
});

test('a deferred offer is resumable and does not repeat after another visit', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  assert.equal(flow.defer(), true);
  assert.equal(flow.defer(), false);
  flow.setViewing(false);
  flow.setViewing(true);
  clock.tick(30000);
  assert.equal(flow.snapshot().stage, 'deferred');
  assert.equal(clock.pending, 0);
  assert.equal(flow.setup(), true);
  clock.tick(2200);
  assert.deepEqual(changes, ['offered', 'deferred', 'setting-up', 'complete']);
});

test('setup is idempotent and finishes after its own delay even when the panel closes', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  assert.equal(flow.setup(), true);
  assert.equal(flow.setup(), false);
  assert.equal(flow.defer(), false);
  clock.tick(1000);
  flow.setViewing(false);
  flow.setViewing(true);
  flow.setViewing(false);
  assert.equal(clock.pending, 1);
  clock.tick(1199);
  assert.equal(flow.snapshot().stage, 'setting-up');
  clock.tick(1);
  assert.equal(flow.snapshot().stage, 'complete');
  assert.equal(flow.setup(), false);
  assert.equal(flow.defer(), false);
  assert.equal(clock.pending, 0);
  assert.deepEqual(changes, ['offered', 'setting-up', 'complete']);
});

test('destroy before viewing prevents all future transitions', () => {
  const { clock, flow, changes } = createHarness();
  flow.destroy();
  flow.destroy();
  assert.equal(flow.setViewing(true), false);
  assert.equal(flow.setup(), false);
  assert.equal(flow.defer(), false);
  clock.tick(100000);
  assert.equal(clock.pending, 0);
  assert.equal(flow.snapshot().stage, 'waiting');
  assert.deepEqual(changes, []);
});

test('destroy during review clears its timer and suppresses the offer', () => {
  const { clock, flow, changes } = createHarness();
  flow.setViewing(true);
  clock.tick(5000);
  flow.destroy();
  assert.equal(clock.pending, 0);
  clock.tick(100000);
  assert.equal(flow.setViewing(false), false);
  assert.equal(flow.setViewing(true), false);
  assert.equal(flow.snapshot().stage, 'waiting');
  assert.deepEqual(changes, []);
});

test('destroy during setup clears its timer and suppresses completion', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  flow.setup();
  clock.tick(1000);
  flow.destroy();
  assert.equal(clock.pending, 0);
  clock.tick(100000);
  assert.equal(flow.snapshot().stage, 'setting-up');
  assert.deepEqual(changes, ['offered', 'setting-up']);
});

test('onChange can destroy setup immediately without leaking a timer', () => {
  const clock = fakeClock();
  const changes = [];
  const flow = createAgentSetupFlow({ clock, onChange: ({ stage }) => {
    changes.push(stage);
    if (stage === 'setting-up') flow.destroy();
  } });
  reachOffer({ clock, flow });
  flow.setup();
  assert.equal(clock.pending, 0);
  clock.tick(100000);
  assert.deepEqual(changes, ['offered', 'setting-up']);
});

test('custom zero delays still deliver each stage once', () => {
  const { clock, flow, changes } = createHarness({ reviewDelay: 0, setupDelay: 0 });
  flow.setViewing(true);
  clock.tick(0);
  assert.equal(flow.snapshot().stage, 'offered');
  flow.setup();
  assert.equal(flow.snapshot().stage, 'setting-up');
  clock.tick(0);
  assert.deepEqual(changes, ['offered', 'setting-up', 'complete']);
  assert.equal(clock.pending, 0);
});
