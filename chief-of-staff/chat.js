import { createConnectionFlow, TOOLS } from './connection-flow.mjs?v=fc65af86';

/* Conversation timing: brief pause → complete sentence → pause → next sentence.
 * Every sentence appears together; only the new sentence fades into place.
 * Connection/status labels remain immediate so clicks always feel responsive. */
const TIMING = Object.freeze({
  openingPause: 700,
  paragraphPause: 750,
  toolsPause: 650,
  sentencePauseBase: 420,
  sentencePausePerWord: 24,
  sentencePauseMaximum: 1100,
  replyPause: 1300,
  replyLengthPause: 6,
  maxReplyLengthPause: 900,
  nextStreamPause: 200,
});

const byId = (id) => document.getElementById(id);
const scroller = byId('conversation-scroll');
const history = byId('chat-history');
const prompt = byId('chat-prompt');
const sendButton = byId('chat-send');
const form = byId('chat-form');
const connectionBox = byId('connection-box');
const connectionStatus = byId('connection-status');
const skipButton = byId('skip-connections');
const introMessages = [...document.querySelectorAll('.intro-message')];
const introTexts = introMessages.map((element) => element.textContent);
const reviewMessage = byId('review-message');
const reviewText = reviewMessage.textContent;
const feedback = byId('connection-feedback');
const confirmation = byId('connection-confirmation');
const activity = byId('activity');
const activityLabel = byId('activity-label');
const activityCalls = byId('activity-calls');
const recommendation = byId('recommendation');
const readyMessage = byId('ready-message');
const suggestionMessage = byId('suggestion-message');
const statusMessage = byId('status-message');
const sidebar = byId('chat-sidebar');
const shell = document.querySelector('.chat-shell');
const sidebarToggle = byId('sidebar-toggle');
const backdrop = byId('sidebar-backdrop');
const mobileQuery = matchMedia('(max-width: 760px)');
const appTimers = new Set();
const streams = new Map();
const streamQueue = [];
let activeStream = null;
const rows = new Map();
let flow;
let generation = 0;
let responses = [];
let responding = false;
let currentMode = 'build';
let sidebarOpen = false;
let sidebarReturnFocus = sidebarToggle;
let recommendationKey = '';
let recommendationVersion = 0;
let recommendationContent;
let introductionVersion = 0;
let introductionComplete = false;

const names = (entries) => {
  const labels = entries.map((entry) => typeof entry === 'string' ? entry : entry.label);
  return labels.length < 3 ? labels.join(' and ') : `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
};
const connectedTools = (state) => state.tools.filter(({ status }) => status === 'connected');
const countLabel = (count) => `${count} tool${count === 1 ? '' : 's'}`;

function updateConversation(change, forceScroll = false) {
  const previousHeight = scroller.scrollHeight;
  const nearBottom = previousHeight - scroller.scrollTop - scroller.clientHeight < 90;
  change();
  if (forceScroll || (nearBottom && scroller.scrollHeight > previousHeight)) scroller.scrollTop = scroller.scrollHeight;
}

function later(callback, delay) {
  const currentGeneration = generation;
  const timer = setTimeout(() => {
    appTimers.delete(timer);
    if (currentGeneration === generation) callback();
  }, delay);
  appTimers.add(timer);
}

function reveal(element) {
  element.hidden = false;
}

function stopStreaming(element) {
  const token = streams.get(element);
  if (token && activeStream === token) {
    activeStream = null;
    later(startNextStream, TIMING.nextStreamPause);
  }
  streams.delete(element);
  element.removeAttribute('aria-busy');
  delete element.dataset.streaming;
}

function startNextStream() {
  if (activeStream) return;
  while (streamQueue.length) {
    const next = streamQueue.shift();
    if (streams.get(next.element) !== next.token) continue;
    activeStream = next.token;
    next.start();
    return;
  }
}

function sentencePause(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.min(TIMING.sentencePauseMaximum, TIMING.sentencePauseBase + words * TIMING.sentencePausePerWord);
}

function streamMessage(element, text, onComplete = () => {}) {
  stopStreaming(element);
  const token = {};
  streams.set(element, token);
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)]
    .map(({ segment }) => segment);
  let position = 0;
  function nextSentence() {
    if (streams.get(element) !== token) return;
    const sentence = sentences[position++] || '';
    const sentenceElement = document.createElement('span');
    sentenceElement.className = 'sentence-reveal';
    sentenceElement.textContent = sentence;
    updateConversation(() => { element.append(sentenceElement); });
    if (position >= sentences.length) {
      stopStreaming(element);
      onComplete(sentence);
      return;
    }
    later(nextSentence, sentencePause(sentence));
  }
  streamQueue.push({ element, token, start: () => {
    updateConversation(() => {
      if (element.classList.contains('typing-message')) {
        element.className = 'agent-message';
        element.removeAttribute('role');
        element.removeAttribute('aria-label');
      }
      element.replaceChildren();
      element.setAttribute('aria-busy', 'true');
      element.dataset.streaming = 'true';
      reveal(element);
    });
    nextSentence();
  } });
  startNextStream();
}

function finishIntroduction() {
  if (!introductionComplete) {
    introductionVersion += 1;
    introductionComplete = true;
    introMessages.forEach((element, index) => {
      stopStreaming(element);
      element.textContent = introTexts[index];
      reveal(element);
    });
  }
  reveal(connectionBox);
}

function startIntroduction() {
  const version = ++introductionVersion;
  introductionComplete = false;
  function nextParagraph(index) {
    if (version !== introductionVersion) return;
    streamMessage(introMessages[index], introTexts[index], (lastSentence) => {
      if (version !== introductionVersion) return;
      if (index < introMessages.length - 1) {
        later(() => nextParagraph(index + 1), sentencePause(lastSentence));
      } else {
        later(() => {
          if (version !== introductionVersion) return;
          introductionComplete = true;
          updateConversation(() => reveal(connectionBox));
        }, TIMING.toolsPause);
      }
    });
  }
  later(() => nextParagraph(0), TIMING.openingPause);
}

function makeToolRows() {
  const container = byId('connection-rows');
  for (const tool of TOOLS) {
    const row = document.createElement('div');
    row.className = 'connection-row';
    const name = document.createElement('span');
    name.className = 'connection-name';
    const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    logo.classList.add('tool-logo');
    logo.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `chat-icons.svg#${tool.id}`);
    logo.append(use);
    name.append(logo, document.createTextNode(tool.label));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'connect-button';
    button.dataset.tool = tool.id;
    const icon = document.createElement('span');
    icon.className = 'state-icon';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'state-label';
    button.append(icon, label);
    button.addEventListener('click', () => flow.connect(tool.id));
    row.append(name, button);
    container.append(row);
    rows.set(tool.id, { button, label });
  }
}

function activityCall(label, status, complete) {
  const item = document.createElement('li');
  item.className = 'activity-call';
  const name = document.createElement('span');
  name.className = 'call-name';
  name.textContent = label;
  const value = document.createElement('span');
  value.className = 'call-status';
  value.textContent = status;
  value.dataset.state = complete ? 'complete' : 'pending';
  item.dataset.state = value.dataset.state;
  item.append(name, value);
  return item;
}

function suggestionFor(state) {
  const ids = new Set(connectedTools(state).map(({ id }) => id));
  if (ids.has('calendar')) {
    return {
      title: 'Sales Pipeline Review',
      text: 'I noticed you have a Sales Pipeline Review every Monday. Would you like me to build an app to help you track pipeline health and prepare for that meeting?',
      plan: ['Monday meeting overview and agenda', 'A pipeline health section with sample metrics', 'Preparation notes and follow-up actions'],
    };
  }
  if (ids.has('gmail')) {
    return {
      title: 'Inbox Priorities',
      text: 'Would you like me to build an app that brings together important emails, follow-ups, and decisions waiting on you?',
      plan: ['Priority email overview', 'Follow-ups waiting for your reply', 'A daily summary of decisions to make'],
    };
  }
  if (ids.has('slack')) {
    return {
      title: 'Team Updates',
      text: 'Would you like me to build an app that brings together team updates, open questions, and decisions from Slack?',
      plan: ['Team updates by topic', 'Open questions and decisions', 'A daily recap of what needs your attention'],
    };
  }
  if (ids.has('notion')) {
    return {
      title: 'Workspace Brief',
      text: 'Would you like me to build an app that turns your Notion pages into a concise brief of projects, priorities, and next steps?',
      plan: ['Project and priority overview', 'Key workspace notes', 'A concise list of next steps'],
    };
  }
  return {
    title: 'Sales Call Brief',
    text: 'Would you like me to build an app that brings together Gong call highlights, customer questions, and follow-up actions?',
    plan: ['Sales call highlights', 'Customer questions and themes', 'Follow-up actions to review'],
  };
}

function showRecommendation(key, ready, suggestion) {
  if (recommendationKey === key) return;
  recommendationKey = key;
  recommendationContent = { ready, suggestion };
  const version = ++recommendationVersion;
  stopStreaming(readyMessage);
  stopStreaming(suggestionMessage);
  readyMessage.hidden = true;
  suggestionMessage.hidden = true;
  reveal(recommendation);
  streamMessage(readyMessage, ready, () => {
    later(() => {
      if (version !== recommendationVersion) return;
      streamMessage(suggestionMessage, suggestion);
    }, TIMING.paragraphPause);
  });
}

function finishRecommendation() {
  if (!recommendationKey || recommendation.hidden) return;
  recommendationVersion += 1;
  stopStreaming(readyMessage);
  stopStreaming(suggestionMessage);
  readyMessage.textContent = recommendationContent.ready;
  suggestionMessage.textContent = recommendationContent.suggestion;
  reveal(readyMessage);
  reveal(suggestionMessage);
}

function render(state) {
  updateConversation(() => {
    for (const tool of state.tools) {
      const { button, label } = rows.get(tool.id);
      button.dataset.state = tool.status;
      button.disabled = tool.status !== 'idle';
      label.textContent = tool.status === 'idle' ? 'Connect' : tool.status === 'connecting' ? 'Connecting…' : 'Connected';
      button.setAttribute('aria-label', tool.status === 'idle' ? `Connect ${tool.label}` : tool.status === 'connecting' ? `Connecting ${tool.label}` : `${tool.label} connected`);
    }
    skipButton.textContent = state.connectedCount ? 'Continue with connected tools' : 'Skip for now';
    skipButton.disabled = state.skipped || state.connectedCount === TOOLS.length;
    if (state.connectedCount && reviewMessage.hidden) {
      reviewMessage.textContent = reviewText;
      reveal(reviewMessage);
    }
    feedback.hidden = !state.activityStarted;
    confirmation.hidden = !state.confirmation;
    if (confirmation.textContent !== (state.confirmation || '')) confirmation.textContent = state.confirmation || '';
    activity.hidden = !state.activityStarted;
    activity.dataset.busy = String(state.pendingCount > 0);
    activity.dataset.complete = String(state.connectedCount > 0 && state.pendingCount === 0);
    activity.dataset.folded = String(state.activityCount);
    activityLabel.textContent = state.pendingCount
      ? state.connectedCount ? 'Getting context from your tools…' : 'Connecting your tools…'
      : `Reviewed ${state.connectedCount} connected tool${state.connectedCount === 1 ? '' : 's'}`;
    const calls = [];
    for (const tool of state.tools.filter(({ status }) => status !== 'idle')) {
      calls.push(activityCall(`Connect ${tool.label}`, tool.status === 'connected' ? 'Connected' : 'Connecting…', tool.status === 'connected'));
      calls.push(activityCall(`${tool.label} · ${tool.reviewLabel}`, tool.reviewStatus === 'idle' ? 'Waiting' : tool.reviewStatus === 'reviewing' ? 'Reviewing…' : 'Complete', tool.reviewStatus === 'complete'));
    }
    // Replacing only the list keeps the user's expanded/collapsed choice intact.
    activityCalls.replaceChildren(...calls);

    if (state.pendingCount) {
      connectionStatus.textContent = state.connectedCount
        ? `${countLabel(state.connectedCount)} connected. I’m getting context while the remaining steps finish.`
        : 'Connecting your tools. You can connect another source while this one gets ready.';
    } else if (state.connectedCount) {
      connectionStatus.textContent = `${countLabel(state.connectedCount)} connected. You can add more context whenever you like.`;
    } else {
      connectionStatus.textContent = state.skipped ? 'We can start without connected tools. Tell me what you’d like to focus on.' : '';
    }
    connectionStatus.hidden = !connectionStatus.textContent;

    if (state.complete) {
      const idea = suggestionFor(state);
      showRecommendation(`connected:${idea.title}`, "Now that you're set up, here are a few things I can take care of for you.", idea.text);
    } else if (state.skipped && !state.activityStarted) {
      showRecommendation('skipped', 'We can start with what you tell me.', 'What would make your day easier—a daily brief, help organizing priorities, or something else? You can connect your tools whenever you’re ready.');
    } else {
      if (recommendationKey) recommendationVersion += 1;
      recommendationKey = '';
      stopStreaming(readyMessage);
      stopStreaming(suggestionMessage);
      recommendation.hidden = true;
    }
  });
}

function showConnections() {
  updateConversation(finishIntroduction);
  connectionBox.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  const focusTarget = [...rows.values()].find(({ button }) => !button.disabled)?.button || connectionBox;
  focusTarget.focus({ preventScroll: true });
}

function chooseAction(message) {
  const normalized = message.toLowerCase().trim();
  if (/^(?:skip(?: for now)?|not now|maybe later|continue without (?:tools|connections))[.!]?$/.test(normalized)) {
    flow.skip();
    return { kind: 'skip' };
  }
  if (/\bconnect\b/.test(normalized) && !/\b(?:don't|do not|not)\s+connect\b/.test(normalized)) {
    const requested = /\bconnect\s+(?:all|everything|my tools)\b/.test(normalized)
      ? TOOLS : TOOLS.filter(({ id }) => new RegExp(`\\b${id}\\b`).test(normalized));
    if (requested.length) {
      showConnections();
      requested.forEach(({ id }) => flow.connect(id));
      return { kind: 'connect', ids: requested.map(({ id }) => id) };
    }
  }
  if (!recommendation.hidden && flow.snapshot().complete && /^(?:(?:yes|sure|okay|ok)\b|(?:please\s+)?(?:build|create|make)\b|let[’']s\s+(?:build|create|make)\b)/.test(normalized)) {
    return { kind: 'plan' };
  }
  return { kind: 'message', mode: currentMode };
}

function replyFor(request) {
  const state = flow.snapshot();
  const connected = connectedTools(state);
  if (request.action.kind === 'connect') {
    const requested = state.tools.filter(({ id }) => request.action.ids.includes(id));
    const authorizing = requested.filter(({ status }) => status === 'connecting');
    if (authorizing.length) return `I’m connecting ${names(authorizing)}. Each tool will show its status here, then I’ll review its simulated context.`;
    return `${names(requested)} ${requested.length === 1 ? 'is' : 'are'} connected.${state.pendingCount ? ' I’m still getting context from your tools.' : ' Their simulated context is ready to use.'}`;
  }
  if (request.action.kind === 'skip') {
    if (state.pendingCount) return `We can continue while ${countLabel(state.pendingCount)} ${state.pendingCount === 1 ? 'finishes' : 'finish'} connecting or being reviewed. ${connected.length ? `I’ll use the context from ${names(connected)} as it becomes ready.` : 'Tell me what you’d like to focus on while those steps finish.'}`;
    return connected.length
      ? `We can continue with ${names(connected)}. ${suggestionFor(state).text}`
      : 'We can start without connected tools. Tell me what you’re working on and what needs your attention. You can connect a tool whenever you’re ready.';
  }
  if (request.action.kind === 'plan') {
    const idea = suggestionFor(state);
    return `Here’s a preview plan for a ${idea.title} app:\n\n${idea.plan.map((item) => `• ${item}`).join('\n')}\n\nContext: ${names(connected)}. This is a prototype plan; nothing has been created or scheduled.`;
  }
  if (/\b(?:what|which)\b.*\b(?:connected|tools|sources)\b/i.test(request.text)) {
    return `${connected.length ? `${names(connected)} ${connected.length === 1 ? 'is' : 'are'} connected.` : 'No tools are connected yet.'}${state.pendingCount ? ` ${countLabel(state.pendingCount)} ${state.pendingCount === 1 ? 'is' : 'are'} still connecting or being reviewed.` : ''} ${connected.length ? 'You can add more context using the Connect buttons.' : 'Choose a Connect button or type “connect all” to try the simulated flow.'}`;
  }
  const acknowledged = request.text.length > 180 ? `${request.text.slice(0, 177)}…` : request.text;
  if (state.pendingCount) return `Got it: “${acknowledged}”\n\nI’m still getting context from your tools. Your request is here while those steps finish; then we can shape a brief or app around it.`;
  if (connected.length) return `Got it: “${acknowledged}”\n\nWith ${names(connected)} connected, we can use that simulated context to ${request.action.mode === 'ask' ? 'explore priorities and next steps' : 'shape an app around your priorities'}. ${suggestionFor(state).text}`;
  return `Got it: “${acknowledged}”\n\nI don’t have tool context yet. Tell me which priorities or updates matter most, or connect a tool so we can try a more focused brief.`;
}

function beginNextReply() {
  if (responding || responses.length === 0) return;
  responding = true;
  const request = responses[0];
  updateConversation(() => {
    request.element.hidden = false;
    request.element.className = 'typing-message';
    request.element.setAttribute('role', 'status');
    request.element.setAttribute('aria-label', 'Owl is thinking');
    const dot = document.createElement('span');
    dot.setAttribute('aria-hidden', 'true');
    request.element.append(dot);
  });
  later(() => {
    streamMessage(request.element, replyFor(request), () => {
      responses.shift();
      responding = false;
      beginNextReply();
    });
  }, TIMING.replyPause + Math.min(request.text.length * TIMING.replyLengthPause, TIMING.maxReplyLengthPause));
}

function setMode(mode) {
  currentMode = mode;
  byId('mode-ask').setAttribute('aria-pressed', String(mode === 'ask'));
  byId('mode-build').setAttribute('aria-pressed', String(mode === 'build'));
  prompt.placeholder = mode === 'ask' ? 'Ask Owl about your priorities' : 'Describe the app you want to build';
  document.querySelector('label[for="chat-prompt"]').textContent = prompt.placeholder;
}

function updateSendButton() {
  sendButton.disabled = !prompt.value.trim();
}

function resetConversation() {
  generation += 1;
  flow?.destroy();
  for (const element of streams.keys()) stopStreaming(element);
  streamQueue.length = 0;
  activeStream = null;
  for (const timer of appTimers) clearTimeout(timer);
  appTimers.clear();
  responses = [];
  responding = false;
  recommendationVersion += 1;
  recommendationKey = '';
  recommendationContent = undefined;
  history.replaceChildren();
  prompt.value = '';
  statusMessage.textContent = '';
  [...introMessages, connectionBox, connectionStatus, reviewMessage, feedback, recommendation].forEach((element) => {
    element.hidden = true;
  });
  activity.open = false;
  setMode('build');
  updateSendButton();
  const currentGeneration = generation;
  flow = createConnectionFlow({ onChange: (state) => {
    if (generation === currentGeneration) render(state);
  } });
  render(flow.snapshot());
  scroller.scrollTop = 0;
  startIntroduction();
}

function setSidebar(open, restoreFocus = true) {
  const wasOpen = sidebarOpen;
  sidebarOpen = mobileQuery.matches && open;
  if (sidebarOpen && !wasOpen) sidebarReturnFocus = document.activeElement;
  document.body.classList.toggle('sidebar-open', sidebarOpen);
  backdrop.hidden = !sidebarOpen;
  sidebarToggle.setAttribute('aria-expanded', String(sidebarOpen));
  sidebar.inert = mobileQuery.matches && !sidebarOpen;
  shell.inert = sidebarOpen;
  if (mobileQuery.matches && !sidebarOpen) sidebar.setAttribute('aria-hidden', 'true');
  else sidebar.removeAttribute('aria-hidden');
  if (sidebarOpen && !wasOpen) byId('close-sidebar').focus();
  else if (wasOpen && restoreFocus) sidebarReturnFocus?.focus({ preventScroll: true });
}

makeToolRows();
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = prompt.value.trim();
  if (!text) return;
  updateConversation(finishIntroduction);
  updateConversation(finishRecommendation);
  const userMessage = document.createElement('p');
  userMessage.className = 'user-message';
  userMessage.textContent = text;
  const reply = document.createElement('div');
  reply.hidden = true;
  updateConversation(() => history.append(userMessage, reply), true);
  const action = chooseAction(text);
  responses.push({ text, action, element: reply });
  prompt.value = '';
  updateSendButton();
  statusMessage.textContent = '';
  prompt.focus({ preventScroll: true });
  beginNextReply();
  scroller.scrollTop = scroller.scrollHeight;
});
prompt.addEventListener('input', updateSendButton);
prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.isComposing && (!event.shiftKey || event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    if (prompt.value.trim()) form.requestSubmit();
  }
});
skipButton.addEventListener('click', () => flow.skip());
byId('show-connections').addEventListener('click', () => {
  setSidebar(false, false);
  showConnections();
});
byId('new-chat').addEventListener('click', () => {
  setSidebar(false, false);
  resetConversation();
  prompt.focus({ preventScroll: true });
});
for (const mode of ['ask', 'build']) byId(`mode-${mode}`).addEventListener('click', () => setMode(mode));
document.querySelectorAll('[data-preview]').forEach((button) => {
  button.addEventListener('click', () => {
    statusMessage.textContent = `${button.dataset.preview} is a static preview in this prototype.`;
    setSidebar(false);
  });
});
for (const id of ['domain', 'reasoning']) byId(id).addEventListener('change', (event) => {
  statusMessage.textContent = `${event.target.value} selected for this prototype.`;
});
sidebarToggle.addEventListener('click', () => setSidebar(!sidebarOpen));
byId('close-sidebar').addEventListener('click', () => setSidebar(false));
backdrop.addEventListener('click', () => setSidebar(false));
sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setSidebar(false, false)));
document.addEventListener('keydown', (event) => {
  if (!sidebarOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setSidebar(false);
  } else if (event.key === 'Tab') {
    const focusable = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')].filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
      event.preventDefault();
      first?.focus();
    }
  }
});
mobileQuery.addEventListener('change', () => setSidebar(false));
window.addEventListener('pagehide', () => {
  flow.destroy();
  for (const timer of appTimers) clearTimeout(timer);
  appTimers.clear();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    resetConversation();
    setSidebar(false);
  }
});
resetConversation();
setSidebar(false);
