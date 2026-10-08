import { createAgentSetupFlow } from './agent-setup-flow.mjs?v=e93380d4';

const QUESTION = 'Would you like a weekly pipeline update every Friday, so you have time to review it before Monday’s meeting?';

/** Screen 6 follows the app walkthrough without replacing the current conversation. */
export function createAgentSetupChat({ history, update, streamMessage, stopStreaming, later }) {
  const byId = (id) => document.getElementById(id);
  const conversation = byId('agent-setup-conversation');
  const question = byId('agent-setup-question');
  const offer = byId('agent-setup-offer');
  const setupButton = byId('set-up-agent');
  const setupLabel = byId('set-up-agent-label');
  const deferButton = byId('defer-agent-setup');
  const result = byId('agent-setup-result');
  let flow;
  let version = 0;
  let previousStage = '';
  let panelOpen = false;

  function render(state) {
    const changed = state.stage !== previousStage;
    previousStage = state.stage;
    update(() => {
      const pending = state.stage === 'setting-up';
      const complete = state.stage === 'complete';
      setupButton.disabled = pending || complete;
      setupButton.dataset.state = complete ? 'connected' : pending ? 'connecting' : 'idle';
      setupButton.setAttribute('aria-busy', String(pending));
      setupLabel.textContent = complete ? 'Completed' : pending ? 'Setting up…' : 'Set up';
      deferButton.hidden = state.stage !== 'offered';
      if (pending) {
        stopStreaming(result);
        result.hidden = true;
      }
    });
    if (!changed) return;
    if (state.stage === 'offered') {
      const currentVersion = version;
      update(() => { history.append(conversation); conversation.hidden = false; });
      streamMessage(question, QUESTION, () => later(() => {
        if (version === currentVersion) update(() => { offer.hidden = false; });
      }, 650));
    } else if (state.stage === 'deferred') {
      update(() => { history.append(result); });
      streamMessage(result, 'No problem. We can set this up whenever you’re ready.');
    } else if (state.stage === 'complete') {
      update(() => { history.append(result); });
      streamMessage(result, 'Your weekly pipeline update is set for every Friday, so you can review it before Monday’s meeting.');
    }
  }

  function syncViewing() {
    flow.setViewing(panelOpen && !document.hidden);
  }

  function reset() {
    version += 1;
    flow?.destroy();
    panelOpen = false;
    previousStage = '';
    history.before(conversation);
    conversation.append(result);
    for (const element of [question, result]) {
      stopStreaming(element);
      element.textContent = '';
    }
    for (const element of [conversation, question, offer, result]) element.hidden = true;
    flow = createAgentSetupFlow({ onChange: render });
    render(flow.snapshot());
  }

  setupButton.addEventListener('click', () => flow.setup());
  deferButton.addEventListener('click', () => {
    if (flow.defer()) setupButton.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', syncViewing);
  reset();
  return {
    reset,
    setViewing(open) { panelOpen = open; syncViewing(); },
    setup: () => flow.setup(),
    defer: () => flow.defer(),
    snapshot: () => flow.snapshot(),
    destroy() { version += 1; panelOpen = false; flow.destroy(); },
  };
}
