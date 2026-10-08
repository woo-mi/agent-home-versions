import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentSetupFlow, DEFAULT_AGENT_SCHEDULE, normalizeAgentSchedule } from '../chief-of-staff/agent-setup-flow.mjs';

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
  clock.tick(5000);
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
  clock.tick(5000);
  assert.equal(initial.stage, 'waiting');
});

test('offers once after exactly five seconds of viewing and not while the app is hidden', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  clock.tick(60000);
  assert.equal(flow.snapshot().stage, 'waiting');
  assert.equal(flow.setViewing(true), true);
  clock.tick(4999);
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
  clock.tick(1500);
  flow.setViewing(false);
  assert.equal(clock.pending, 0);
  clock.tick(80000);
  assert.equal(flow.snapshot().stage, 'waiting');
  flow.setViewing(true);
  clock.tick(1000);
  flow.setViewing(false);
  clock.tick(90000);
  flow.setViewing(true);
  clock.tick(2499);
  assert.equal(flow.snapshot().stage, 'waiting');
  clock.tick(1);
  assert.deepEqual(changes, ['offered']);
  assert.equal(clock.pending, 0);
});

test('repeated view events do not duplicate or restart the review timer', () => {
  const { clock, flow, changes } = createHarness();
  assert.equal(flow.setViewing(false), false);
  flow.setViewing(true);
  clock.tick(2500);
  for (let count = 0; count < 5; count += 1) assert.equal(flow.setViewing(true), false);
  assert.equal(clock.pending, 1);
  clock.tick(2499);
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

test('setup without arguments preserves the default schedule in immutable snapshots', () => {
  const harness = createHarness();
  const { clock, flow } = harness;
  reachOffer(harness);
  assert.equal('schedule' in flow.snapshot(), false);
  assert.equal(flow.setup(), true);
  const pending = flow.snapshot();
  assert.deepEqual(pending, { stage: 'setting-up', schedule: {
    day: 'Friday', time: '07:00', timezone: 'America/Los_Angeles', channel: '#sales-pipeline',
  } });
  assert.equal(Object.getPrototypeOf(pending.schedule), Object.prototype);
  assert.throws(() => { pending.schedule.day = 'Monday'; }, TypeError);
  assert.throws(() => { DEFAULT_AGENT_SCHEDULE.day = 'Monday'; }, TypeError);
  assert.notEqual(pending.schedule, DEFAULT_AGENT_SCHEDULE);
  assert.notEqual(pending.schedule, flow.snapshot().schedule);
  clock.tick(2200);
  assert.deepEqual(flow.snapshot(), { stage: 'complete', schedule: DEFAULT_AGENT_SCHEDULE });
  assert.equal(pending.stage, 'setting-up');
});

test('a submitted schedule is copied, retained through completion, and cannot be overwritten', () => {
  const events = [];
  const harness = createHarness({ onChange: (state) => events.push(state) });
  const { clock, flow } = harness;
  reachOffer(harness);
  const configuration = { day: 'Tuesday', time: '14:30', timezone: 'Europe/London', channel: '#revenue-ops' };
  const expected = { ...configuration };
  assert.equal(flow.setup(configuration), true);
  configuration.day = 'Sunday';
  configuration.time = '00:00';
  configuration.timezone = 'UTC';
  configuration.channel = '#changed';
  assert.equal(flow.setup(configuration), false);
  assert.equal(clock.pending, 1);
  assert.deepEqual(flow.snapshot().schedule, expected);
  assert.deepEqual(events[1].schedule, expected);
  clock.tick(2200);
  assert.equal(flow.setup(configuration), false);
  assert.deepEqual(flow.snapshot(), { stage: 'complete', schedule: expected });
  assert.deepEqual(events.map(({ stage }) => stage), ['offered', 'setting-up', 'complete']);
  assert.notEqual(events[1].schedule, events[2].schedule);
});

test('invalid schedules do not consume an offer or start a setup timer', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  const invalid = [
    null, [], 'Friday',
    { day: 'Funday' }, { day: 'friday' },
    { time: '24:00' }, { time: '12:60' }, { time: '7:00' }, { time: 700 },
    { timezone: 'Not/A_Timezone' }, { timezone: '' }, { timezone: null },
    { channel: '   ' }, { channel: '#sales\n#other' }, { channel: 42 },
  ];
  for (const configuration of invalid) {
    assert.equal(normalizeAgentSchedule(configuration), null);
    assert.equal(flow.setup(configuration), false);
    assert.deepEqual(flow.snapshot(), { stage: 'offered' });
    assert.equal(clock.pending, 0);
  }
  assert.deepEqual(changes, ['offered']);
  assert.equal(flow.setup({ day: 'Monday', time: '00:00', timezone: 'UTC' }), true);
  assert.equal(clock.pending, 1);
});

test('schedule validation supports every weekday, valid boundary times, and partial defaults', () => {
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
    assert.deepEqual(normalizeAgentSchedule({ day, time: '23:59', timezone: 'UTC', channel: ' #sales ' }), {
      day, time: '23:59', timezone: 'UTC', channel: '#sales',
    });
  }
  assert.deepEqual(normalizeAgentSchedule(), DEFAULT_AGENT_SCHEDULE);
  assert.deepEqual(normalizeAgentSchedule({ time: '00:00' }), { ...DEFAULT_AGENT_SCHEDULE, time: '00:00' });
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
  clock.tick(2000);
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

test('editing a completed schedule retains committed values until the save finishes', () => {
  const events = [];
  const harness = createHarness({ onChange: state => events.push(state) });
  const { clock, flow } = harness;
  reachOffer(harness);
  flow.setup();
  clock.tick(2200);
  const beforeEdit = flow.snapshot();
  const edited = { day: 'Monday', time: '09:30', timezone: 'America/New_York', channel: '#revenue-leadership' };
  const expected = { ...edited };
  assert.equal(flow.updateSchedule(edited), true);
  edited.day = 'Sunday';
  edited.channel = '#changed-after-submission';
  const pending = flow.snapshot();
  assert.deepEqual(pending, { stage: 'updating', schedule: DEFAULT_AGENT_SCHEDULE });
  assert.equal(clock.pending, 1);
  clock.tick(899);
  assert.deepEqual(flow.snapshot(), pending);
  clock.tick(1);
  const saved = flow.snapshot();
  assert.deepEqual(saved, { stage: 'complete', schedule: expected });
  assert.equal(clock.pending, 0);
  assert.deepEqual(beforeEdit, { stage: 'complete', schedule: DEFAULT_AGENT_SCHEDULE });
  assert.deepEqual(pending, { stage: 'updating', schedule: DEFAULT_AGENT_SCHEDULE });
  assert.throws(() => { saved.schedule.day = 'Tuesday'; }, TypeError);
  assert.throws(() => { saved.stage = 'updating'; }, TypeError);
  assert.notEqual(saved.schedule, flow.snapshot().schedule);
  assert.deepEqual(events.map(({ stage }) => stage), ['offered', 'setting-up', 'complete', 'updating', 'complete']);
  assert.deepEqual(events[3].schedule, DEFAULT_AGENT_SCHEDULE);
  assert.deepEqual(events[4].schedule, expected);
});

test('unchanged and invalid edits leave the committed schedule and timer untouched', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  flow.setup();
  clock.tick(2200);
  const committed = flow.snapshot();
  for (const configuration of [
    undefined, {}, { ...DEFAULT_AGENT_SCHEDULE }, { ...DEFAULT_AGENT_SCHEDULE, channel: ' #sales-pipeline ' },
    null, [], 'Friday', { day: 'Funday' }, { time: '24:00' },
    { timezone: 'Not/A_Timezone' }, { channel: '   ' },
  ]) {
    assert.equal(flow.updateSchedule(configuration), false);
    assert.deepEqual(flow.snapshot(), committed);
    assert.equal(clock.pending, 0);
  }
  assert.deepEqual(changes, ['offered', 'setting-up', 'complete']);
});

test('editing is allowed only after setup completes and cannot interrupt a pending save', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  const first = { ...DEFAULT_AGENT_SCHEDULE, day: 'Monday' };
  const second = { ...DEFAULT_AGENT_SCHEDULE, day: 'Tuesday' };
  assert.equal(flow.updateSchedule(first), false);
  reachOffer(harness);
  assert.equal(flow.updateSchedule(first), false);
  flow.defer();
  assert.equal(flow.updateSchedule(first), false);
  flow.setup();
  assert.equal(flow.updateSchedule(first), false);
  clock.tick(2200);
  assert.equal(flow.updateSchedule(first), true);
  clock.tick(400);
  assert.equal(flow.updateSchedule(first), false);
  assert.equal(flow.updateSchedule(second), false);
  assert.equal(flow.setup(second), false);
  assert.equal(flow.defer(), false);
  assert.equal(clock.pending, 1);
  clock.tick(500);
  assert.deepEqual(flow.snapshot(), { stage: 'complete', schedule: first });
  assert.equal(flow.setup(second), false);
  assert.equal(flow.updateSchedule(second), true);
  clock.tick(900);
  assert.deepEqual(flow.snapshot(), { stage: 'complete', schedule: second });
  assert.deepEqual(changes.slice(-4), ['updating', 'complete', 'updating', 'complete']);
});

test('destroy during a schedule update cancels saving and retains the committed schedule', () => {
  const harness = createHarness();
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  flow.setup();
  clock.tick(2200);
  flow.updateSchedule({ day: 'Monday' });
  clock.tick(450);
  flow.destroy();
  flow.destroy();
  assert.equal(clock.pending, 0);
  assert.equal(flow.updateSchedule({ day: 'Tuesday' }), false);
  clock.tick(100000);
  assert.deepEqual(flow.snapshot(), { stage: 'updating', schedule: DEFAULT_AGENT_SCHEDULE });
  assert.deepEqual(changes, ['offered', 'setting-up', 'complete', 'updating']);
});

test('onChange can destroy a schedule update immediately without leaking a save timer', () => {
  const clock = fakeClock();
  const changes = [];
  const flow = createAgentSetupFlow({ clock, onChange: ({ stage }) => {
    changes.push(stage);
    if (stage === 'updating') flow.destroy();
  } });
  reachOffer({ clock, flow });
  flow.setup();
  clock.tick(2200);
  assert.equal(flow.updateSchedule({ day: 'Monday' }), true);
  assert.equal(clock.pending, 0);
  clock.tick(100000);
  assert.deepEqual(flow.snapshot(), { stage: 'updating', schedule: DEFAULT_AGENT_SCHEDULE });
  assert.deepEqual(changes, ['offered', 'setting-up', 'complete', 'updating']);
});

test('a custom update delay saves once without changing setup timing', () => {
  const harness = createHarness({ updateDelay: 0 });
  const { clock, flow, changes } = harness;
  reachOffer(harness);
  flow.setup();
  clock.tick(2199);
  assert.equal(flow.snapshot().stage, 'setting-up');
  clock.tick(1);
  assert.equal(flow.updateSchedule({ day: 'Sunday' }), true);
  assert.equal(flow.snapshot().stage, 'updating');
  clock.tick(0);
  assert.deepEqual(flow.snapshot(), { stage: 'complete', schedule: { ...DEFAULT_AGENT_SCHEDULE, day: 'Sunday' } });
  assert.equal(clock.pending, 0);
  assert.deepEqual(changes, ['offered', 'setting-up', 'complete', 'updating', 'complete']);
});
