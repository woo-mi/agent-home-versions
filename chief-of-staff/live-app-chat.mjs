import { createLiveAppFlow, CRM_TOOLS } from './live-app-flow.mjs?v=a1829340';

const TIMING = { offerPause: 650, toolsPause: 650 };
const CRM_PROMPT = 'Connect your CRM so I can bring in your opportunities, sales stages, and regional performance.';

export function createLiveAppChat({ history, update, streamMessage, stopStreaming, later, follow }) {
  const byId = (id) => document.getElementById(id);
  const offer = byId('live-app-offer');
  const buildButton = byId('build-live-app');
  const deferButton = byId('defer-live-app');
  const deferred = byId('live-app-deferred');
  const conversation = byId('live-app-conversation');
  const prompt = byId('crm-prompt');
  const box = byId('crm-box');
  const skipButton = byId('skip-crm');
  const activity = byId('crm-activity');
  const activityLabel = byId('crm-activity-label');
  const calls = byId('crm-activity-calls');
  const result = byId('crm-result');
  const complete = byId('live-app-complete');
  const rows = new Map();
  let flow;
  let previousStage = '';
  let version = 0;
  let hasStarted = false;

  for (const tool of CRM_TOOLS) {
    const row = document.createElement('div');
    row.className = 'connection-row';
    const name = document.createElement('span');
    name.className = 'connection-name';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `live-app-icons.svg#${tool.id}`);
    icon.append(use);
    name.append(icon, document.createTextNode(tool.label));
    const button = document.createElement('button');
    button.className = 'connect-button';
    button.type = 'button';
    const stateIcon = document.createElement('span');
    stateIcon.className = 'state-icon';
    stateIcon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    button.append(stateIcon, label);
    button.addEventListener('click', () => connect(tool.id));
    row.append(name, button);
    byId('crm-rows').append(row);
    rows.set(tool.id, { button, label });
  }

  function render(state) {
    const stageChanged = state.stage !== previousStage;
    previousStage = state.stage;
    update(() => {
      buildButton.disabled = hasStarted;
      buildButton.textContent = hasStarted ? 'Selected' : 'Build';
      deferButton.disabled = hasStarted || state.stage === 'deferred';
      deferred.hidden = state.stage !== 'deferred';
      for (const tool of state.tools) {
        const { button, label } = rows.get(tool.id);
        const pending = tool.status === 'connecting' || tool.status === 'confirming';
        button.dataset.state = pending ? 'connecting' : tool.status;
        button.disabled = tool.status !== 'idle';
        label.textContent = tool.status === 'idle' ? 'Connect' : pending ? 'Connecting…' : 'Connected';
        button.setAttribute('aria-label', tool.status === 'idle' ? `Connect ${tool.label}` : pending ? `Connecting ${tool.label}` : `${tool.label} connected`);
      }
      skipButton.disabled = state.activeCount > 0 || state.connectedCount > 0 || state.stage === 'skipped';
      skipButton.textContent = state.connectedCount ? 'CRM connected' : state.stage === 'skipped' ? 'Skipped for now' : 'Skip for now';
      const activeTools = state.tools.filter(({ status }) => status !== 'idle');
      activity.hidden = activeTools.length === 0;
      activity.dataset.busy = String(state.activeCount > 0 || state.stage === 'building');
      const label = state.tools.some(({ status }) => status === 'connecting') ? 'Connecting through MCP…'
        : state.activeCount ? 'Confirming…'
        : state.stage === 'building' ? 'Reading CRM data and building your app…'
        : 'CRM context ready';
      if (activityLabel.textContent !== label) activityLabel.textContent = label;
      const items = activeTools.map((tool) => {
        const item = document.createElement('li');
        item.className = 'activity-call';
        const name = document.createElement('span');
        name.className = 'call-name';
        name.textContent = tool.label;
        const status = document.createElement('span');
        status.className = 'call-status';
        status.dataset.state = tool.status === 'connected' ? 'complete' : 'pending';
        status.textContent = tool.status === 'connecting' ? 'Connecting through MCP…' : tool.status === 'confirming' ? 'Confirming…' : 'Connected';
        item.append(name, status);
        return item;
      });
      calls.replaceChildren(...items);
      if (state.activeCount) {
        stopStreaming(result);
        stopStreaming(complete);
        result.hidden = true;
        complete.hidden = true;
      }
    });
    if (!stageChanged) return;
    if (state.stage === 'skipped') {
      streamMessage(result, 'We can come back to your CRM later. Connect HubSpot or Salesforce when you’re ready to build the app with your sales data.');
    } else if (state.stage === 'building') {
      streamMessage(result, 'Succeed. The agent reads the CRM data and builds the app…');
    } else if (state.stage === 'complete') {
      streamMessage(complete, 'The setup for your Weekly Sales Pipeline Review App is complete.');
    }
  }

  function start() {
    follow();
    if (!hasStarted) {
      hasStarted = true;
      const currentVersion = version;
      update(() => { history.append(conversation); conversation.hidden = false; });
      flow.build();
      streamMessage(prompt, CRM_PROMPT, () => later(() => {
        if (currentVersion === version) update(() => { box.hidden = false; });
      }, TIMING.toolsPause));
      return true;
    }
    flow.build();
    return false;
  }

  function connect(id) {
    start();
    return flow.connect(id);
  }

  function showOffer() {
    const currentVersion = version;
    later(() => {
      if (version === currentVersion) update(() => { offer.hidden = false; });
    }, TIMING.offerPause);
  }

  function reset() {
    version += 1;
    flow?.destroy();
    previousStage = '';
    hasStarted = false;
    history.before(conversation);
    for (const element of [prompt, result, complete]) stopStreaming(element);
    for (const element of [offer, deferred, conversation, prompt, box, activity, result, complete]) element.hidden = true;
    result.textContent = '';
    complete.textContent = '';
    activity.open = false;
    flow = createLiveAppFlow({ onChange: render });
    render(flow.snapshot());
  }

  buildButton.addEventListener('click', start);
  deferButton.addEventListener('click', () => flow.defer());
  skipButton.addEventListener('click', () => flow.skip());
  reset();
  return {
    showOffer, start, connect, reset,
    hideOffer: () => { version += 1; offer.hidden = true; },
    hasStarted: () => hasStarted,
    skip: () => flow.skip(),
    defer: () => flow.defer(),
    snapshot: () => flow.snapshot(),
    destroy: () => { version += 1; flow.destroy(); },
  };
}
