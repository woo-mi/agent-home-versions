import { createAgentSetupFlow } from './agent-setup-flow.mjs?v=97966219';

const QUESTION = 'Would you like a weekly pipeline update every Friday, so you have time to review it before Monday’s meeting?';
const DELIVERY_QUESTION = 'What time should I deliver it, and where should it go?';

function displayTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** Screen 6 follows the app walkthrough without replacing the current conversation. */
export function createAgentSetupChat({ history, update, streamMessage, stopStreaming, later, onOpenReport, onScheduleChange = () => {} }) {
  const byId = (id) => document.getElementById(id);
  const conversation = byId('agent-setup-conversation');
  const question = byId('agent-setup-question');
  const deliveryQuestion = byId('agent-schedule-question');
  const form = byId('agent-schedule-form');
  const createButton = byId('create-weekly-update');
  const createLabel = byId('create-weekly-update-label');
  const result = byId('agent-setup-result');
  const report = byId('agent-report-card');
  const fields = Object.fromEntries(['day', 'time', 'timezone', 'channel'].map((key) => [key, byId(`agent-schedule-${key}`)]));
  let flow;
  let version = 0;
  let previousStage = '';
  let panelOpen = false;
  let settingsShown = false;
  let settingsVersion = 0;
  let savedLabel = 'Created';

  const readSchedule = () => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));

  function updateSummary() {
    const schedule = readSchedule();
    byId('agent-schedule-summary').textContent = `Every ${schedule.day} at ${displayTime(schedule.time)}`;
    byId('agent-delivery-summary').textContent = `Delivered to Slack · ${schedule.channel}`;
  }

  function showSettings() {
    if (settingsShown) return;
    settingsShown = true;
    const currentVersion = version;
    const currentSettings = ++settingsVersion;
    update(() => { history.append(deliveryQuestion, form); });
    streamMessage(deliveryQuestion, DELIVERY_QUESTION, () => later(() => {
      if (currentVersion === version && currentSettings === settingsVersion) update(() => { form.hidden = false; });
    }, 650));
  }

  function render(state) {
    const changed = state.stage !== previousStage;
    const savedUpdate = changed && previousStage === 'updating' && state.stage === 'complete';
    if (savedUpdate) savedLabel = 'Saved';
    previousStage = state.stage;
    update(() => {
      const pending = state.stage === 'setting-up' || state.stage === 'updating';
      const complete = state.stage === 'complete';
      const draft = readSchedule();
      const dirty = complete && Object.keys(fields).some((key) => draft[key] !== state.schedule[key]);
      createButton.disabled = pending || (complete && !dirty);
      createButton.dataset.state = complete && !dirty ? 'connected' : pending ? 'connecting' : 'idle';
      createButton.setAttribute('aria-busy', String(pending));
      createLabel.textContent = state.stage === 'updating' ? 'Saving…' : complete ? (dirty ? 'Save changes' : savedLabel) : pending ? 'Creating…' : 'Create weekly update';
      for (const field of form.querySelectorAll('select')) field.disabled = pending;
      if (state.stage === 'setting-up') {
        stopStreaming(result);
        result.hidden = true;
      }
    });
    if (!changed) return;
    if (state.stage === 'offered') {
      const currentVersion = version;
      update(() => { history.append(conversation); conversation.hidden = false; });
      streamMessage(question, QUESTION, () => later(() => {
        if (version === currentVersion && flow.snapshot().stage === 'offered') showSettings();
      }, 1000));
    } else if (state.stage === 'deferred') {
      if (form.hidden) {
        settingsVersion += 1;
        settingsShown = false;
        stopStreaming(deliveryQuestion);
        update(() => { deliveryQuestion.hidden = true; });
      }
      update(() => { history.append(result); });
      streamMessage(result, 'No problem. We can set this up whenever you’re ready.');
    } else if (state.stage === 'complete') {
      const currentVersion = version;
      const schedule = state.schedule;
      onScheduleChange(schedule);
      const confirmation = `Your pipeline update is ${savedUpdate ? 'now ' : ''}scheduled for ${schedule.day}s at ${displayTime(schedule.time)} (${schedule.timezone}) in ${schedule.channel}, ahead of your Monday review.`;
      if (savedUpdate) {
        stopStreaming(result);
        update(() => {
          result.textContent = confirmation;
          result.hidden = false;
          if (report.hidden) { history.append(report); report.hidden = false; }
        });
        return;
      }
      update(() => { history.append(result); });
      streamMessage(result, confirmation, () => later(() => {
        if (version === currentVersion && flow.snapshot().stage === 'complete' && report.hidden) {
          update(() => { history.append(report); report.hidden = false; });
        }
      }, 650));
    }
  }

  function syncViewing() {
    flow.setViewing(panelOpen && !document.hidden);
  }

  function setup() {
    if (form.hidden) {
      showSettings();
      return false;
    }
    if (!form.reportValidity()) return false;
    return flow.snapshot().stage === 'complete' ? flow.updateSchedule(readSchedule()) : flow.setup(readSchedule());
  }

  function reset() {
    version += 1;
    flow?.destroy();
    panelOpen = false;
    settingsShown = false;
    settingsVersion += 1;
    previousStage = '';
    savedLabel = 'Created';
    history.before(conversation);
    conversation.append(question, deliveryQuestion, form, result, report);
    for (const element of [question, deliveryQuestion, result]) {
      stopStreaming(element);
      element.textContent = '';
    }
    for (const element of [conversation, question, deliveryQuestion, form, result, report]) element.hidden = true;
    form.reset();
    updateSummary();
    flow = createAgentSetupFlow({ onChange: render });
    render(flow.snapshot());
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); setup(); });
  form.addEventListener('change', () => { updateSummary(); render(flow.snapshot()); });
  byId('open-agent-report').addEventListener('click', () => {
    if (['complete', 'updating'].includes(flow.snapshot().stage)) onOpenReport();
  });
  document.addEventListener('visibilitychange', syncViewing);
  reset();
  return {
    reset,
    setViewing(open) { panelOpen = open; syncViewing(); },
    setup,
    defer: () => flow.defer(),
    snapshot: () => flow.snapshot(),
    destroy() { version += 1; panelOpen = false; flow.destroy(); },
  };
}
