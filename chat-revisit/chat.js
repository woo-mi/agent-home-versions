import { createConnectionFlow, TOOLS } from './connection-flow.mjs?v=fc65af86';
import { createChatScroll } from './chat-scroll.mjs?v=d7e6a4ef';
import { createLiveAppChat } from './live-app-chat.mjs?v=eebd70c3';
import { createLiveAppPreview } from './live-app-preview.mjs?v=7eea3c12';
import { createAgentSetupChat } from './agent-setup-chat.mjs?v=1c4929c3';
import { createReportViews } from './report-views.mjs?v=3e53c1e2';
import { createRevisitConversation } from './revisit-conversation.mjs?v=33c5fb55';

/* Conversation timing: brief pause → complete paragraph → pause → next paragraph.
 * Each paragraph appears as one chunk, including all its sentences.
 * Connection/status labels remain immediate so clicks always feel responsive. */
const TIMING = Object.freeze({
  openingPause: 700,
  paragraphPause: 750,
  toolsPause: 650,
  chunkPauseBase: 650,
  chunkPausePerWord: 24,
  chunkPauseMaximum: 1600,
  replyPause: 1300,
  replyLengthPause: 6,
  maxReplyLengthPause: 900,
  nextStreamPause: 200,
});

const byId = (id) => document.getElementById(id);
const scroller = byId('conversation-scroll');
const chatScroll = createChatScroll(scroller, { content: byId('conversation-content') });
const history = byId('chat-history');
const prompt = byId('chat-prompt');
const sendButton = byId('chat-send');
const form = byId('chat-form');
const revisitThread = byId('revisit-thread');
const onboardingThread = byId('onboarding-thread');
const meetingButton = byId('open-for-meeting');
const revisitReportButton = byId('open-revisit-report');
const attachmentInput = byId('chat-attachment');
const appFrame = byId('live-app-preview-v3');
const reportFrame = byId('report-preview');
let revisitMode = Boolean(revisitThread);
let attachments = [];
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
const chatHeader = shell.querySelector('.chat-header');
const chatFooter = shell.querySelector('.chat-footer');
function syncChatOverlays() {
  // Reserve scrolling space without giving either floating control a backdrop.
  // Own the size mutation so native scroll clamping keeps the current follow state.
  chatScroll.update(() => {
    shell.style.setProperty('--chat-header-height', `${chatHeader.getBoundingClientRect().height}px`);
    shell.style.setProperty('--chat-footer-height', `${chatFooter.getBoundingClientRect().height}px`);
  });
}
const chatOverlayObserver = new ResizeObserver(syncChatOverlays);
chatOverlayObserver.observe(chatHeader);
chatOverlayObserver.observe(chatFooter);
syncChatOverlays();
const sidebarToggle = byId('sidebar-toggle');
const desktopNavigationToggle = byId('chat-navigation-toggle');
const backdrop = byId('sidebar-backdrop');
const liveAppPanel = byId('live-app-panel');
const panelToolbar = byId('live-app-panel-toolbar');
const panelToggle = byId('close-live-app');
const availablePanels = new Set();
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
let panelKind = 'app';

const names = (entries) => {
  const labels = entries.map((entry) => typeof entry === 'string' ? entry : entry.label);
  return labels.length < 3 ? labels.join(' and ') : `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
};
const connectedTools = (state) => state.tools.filter(({ status }) => status === 'connected');
const countLabel = (count) => `${count} tool${count === 1 ? '' : 's'}`;

function updateConversation(change, forceScroll = false) {
  chatScroll.update(() => {
    change();
    const content = byId('conversation-content');
    const connectingLabel = 'Connecting...';
    for (const label of content.querySelectorAll('.connection-box [data-state="connecting"] .state-label')) {
      if (label.textContent !== connectingLabel) label.textContent = connectingLabel;
    }
    content.querySelector('.conversation-tail')?.classList.remove('conversation-tail');
    const blocks = [...content.querySelectorAll('.agent-message, .user-message, .connection-box, .activity, .live-app-offer, .agent-schedule-form')];
    blocks.findLast((element) => element.getClientRects().length > 0)?.classList.add('conversation-tail');
  }, forceScroll);
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

function chunkPause(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.min(TIMING.chunkPauseMaximum, TIMING.chunkPauseBase + words * TIMING.chunkPausePerWord);
}

function streamMessage(element, text, onComplete = () => {}) {
  stopStreaming(element);
  const token = {};
  streams.set(element, token);
  // Preserve paragraph separators and single newlines inside lists.
  const chunks = text.match(/[\s\S]+?(?:(?:\r?\n[\t ]*){2,}|$)/g) || [''];
  let position = 0;
  function nextChunk() {
    if (streams.get(element) !== token) return;
    const chunk = chunks[position++];
    const chunkElement = document.createElement('span');
    chunkElement.className = 'chunk-reveal';
    chunkElement.textContent = chunk;
    updateConversation(() => { element.append(chunkElement); });
    if (position >= chunks.length) {
      stopStreaming(element);
      onComplete(chunk);
      return;
    }
    later(nextChunk, chunkPause(chunk));
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
    nextChunk();
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
    streamMessage(introMessages[index], introTexts[index], (lastChunk) => {
      if (version !== introductionVersion) return;
      if (index < introMessages.length - 1) {
        later(() => nextParagraph(index + 1), chunkPause(lastChunk));
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
      streamMessage(suggestionMessage, suggestion, () => {
        if (version === recommendationVersion && key.startsWith('connected:')) liveApps.showOffer();
      });
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
  if (recommendationKey.startsWith('connected:')) liveApps.showOffer();
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

    if (liveApps.hasStarted()) return;
    if (state.complete) {
      showRecommendation('connected:sales-pipeline', "Now that you're set up, here are a few things I can take care of for you.", 'I noticed you have a Sales Pipeline Review every Monday. Would you like me to build an app to help you track pipeline health and prepare for that meeting?');
    } else if (state.skipped && !state.activityStarted) {
      showRecommendation('skipped', 'We can start with what you tell me.', 'What would make your day easier—a daily brief, help organizing priorities, or something else? You can connect your tools whenever you’re ready.');
    } else {
      if (recommendationKey) recommendationVersion += 1;
      recommendationKey = '';
      stopStreaming(readyMessage);
      stopStreaming(suggestionMessage);
      recommendation.hidden = true;
      liveApps.hideOffer();
    }
  });
}

function showConnections() {
  updateConversation(finishIntroduction);
  chatScroll.scrollToElement(connectionBox);
  const focusTarget = [...rows.values()].find(({ button }) => !button.disabled)?.button || connectionBox;
  focusTarget.focus({ preventScroll: true });
}

function chooseAction(message) {
  if (revisitMode) return { kind: 'revisit-message', mode: currentMode };
  const normalized = message.toLowerCase().trim();
  const agentStage = agentSetup.snapshot().stage;
  if (agentStage === 'offered' || agentStage === 'deferred') {
    if (/^(?:not now|maybe later|skip(?: for now)?)[.!]?$/.test(normalized)) return { kind: 'agent-defer' };
    if (/^(?:(?:yes|sure|okay|ok)(?:,?\s+please)?|(?:please\s+)?(?:set\s+up(?:\s+agent)?|create weekly update|schedule(?: it| weekly update)?))[.!]?$/.test(normalized)) return { kind: 'agent-setup' };
  }
  if (/\bconnect\b/.test(normalized) && !/\b(?:don't|do not|not)\s+connect\b/.test(normalized)) {
    const requested = ['hubspot', 'salesforce'].filter((id) => normalized.includes(id));
    if (requested.length) return { kind: 'crm-connect', ids: requested };
  }
  if (/^(?:skip(?: for now)?|not now|maybe later|continue without (?:tools|connections))[.!]?$/.test(normalized)) {
    if (liveApps.hasStarted()) return { kind: liveApps.snapshot().activeCount ? 'crm-status' : 'crm-skip' };
    if (!byId('live-app-offer').hidden) return { kind: 'live-app-defer' };
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
    if (liveApps.hasStarted() && liveApps.snapshot().stage !== 'skipped') return { kind: 'crm-status' };
    return { kind: 'live-app-build' };
  }
  return { kind: 'message', mode: currentMode };
}

function replyFor(request) {
  if (request.action.kind === 'revisit-message') {
    const message = request.text.toLowerCase();
    if (request.attachments?.length) {
      return `I’ve added ${names(request.attachments)} to this prototype conversation. File contents aren’t processed in this mock.\n\nTell me which details you’d like to compare with the pipeline review.`;
    }
    if (/\b(?:meeting|agenda|prepare|prep)\b/.test(message)) {
      return 'For your meeting, start with what changed since the last review, then cover the deals that need attention and the next action for each owner.\n\nUse Open on the pipeline app to review it alongside this conversation.';
    }
    if (/\b(?:risk|slip|block|attention)\w*\b/.test(message)) {
      return 'I’d focus the review on deals that slipped, opportunities without a clear next step, and changes in pipeline coverage.\n\nFor each one, confirm the owner, the blocker, and the next customer commitment. The meeting view keeps those details next to the pipeline metrics.';
    }
    if (/\b(?:change|changed|delta|since|pipeline|forecast)\b/.test(message)) {
      return 'The update above brings together the latest pipeline changes and the items to review before your meeting.\n\nOpen the meeting view to compare pipeline health, movement between stages, and deals that need a follow-up. I can help you turn those findings into a concise agenda.';
    }
    return 'Let’s use the pipeline review as our starting point. I can help you understand what changed, prepare the meeting agenda, or decide which deals to follow up on.\n\nTell me which part you’d like to dig into.';
  }
  const state = flow.snapshot();
  const connected = connectedTools(state);
  if (request.action.kind === 'crm-status') {
    const crm = liveApps.snapshot();
    if (crm.activeCount) return 'Your CRM connection is still in progress. I’ll finish confirming access, then prepare the Weekly Sales Pipeline Review App.';
    if (crm.stage === 'building') return 'I’m reading your CRM context and preparing the Weekly Sales Pipeline Review App.';
    if (crm.stage === 'complete') return 'The setup for your Weekly Sales Pipeline Review App is complete. Your connected CRM context is ready.';
    return 'Choose HubSpot or Salesforce above so I can bring your sales context into the app.';
  }
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
  prompt.placeholder = revisitMode ? 'Get quick answers and dig in with follow-ups' : mode === 'ask' ? 'Ask Owl about your priorities' : 'Describe the app you want to build';
  document.querySelector('label[for="chat-prompt"]').textContent = prompt.placeholder;
}

function updateSendButton() {
  sendButton.disabled = !prompt.value.trim() && attachments.length === 0;
}

function updateViewRoute(view, replace = false) {
  const url = new URL(location.href);
  if (view) url.searchParams.set('view', view);
  else url.searchParams.delete('view');
  if (url.href === location.href) return;
  window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', url);
}

function resetConversation({ revisit = false, syncRoute = true, completeRevisit = false } = {}) {
  const changedMode = revisitMode !== revisit;
  revisitMode = revisit && Boolean(revisitThread);
  document.body.classList.toggle('revisit-active', revisitMode);
  if (revisitThread) revisitThread.hidden = !revisitMode;
  if (onboardingThread) onboardingThread.hidden = revisitMode;
  availablePanels.clear();
  setLiveAppOpen(false, false, 'app', false);
  if (changedMode) {
    appFrame.removeAttribute('src');
    reportFrame.removeAttribute('src');
  }
  reportViews.reset();
  generation += 1;
  flow?.destroy();
  for (const element of streams.keys()) stopStreaming(element);
  streamQueue.length = 0;
  activeStream = null;
  for (const timer of appTimers) clearTimeout(timer);
  appTimers.clear();
  liveApps.reset();
  agentSetup.reset();
  responses = [];
  responding = false;
  recommendationVersion += 1;
  recommendationKey = '';
  recommendationContent = undefined;
  revisitConversation?.restore();
  history.replaceChildren();
  prompt.value = '';
  attachments = [];
  if (attachmentInput) attachmentInput.value = '';
  statusMessage.textContent = '';
  [...introMessages, connectionBox, connectionStatus, reviewMessage, feedback, recommendation].forEach((element) => {
    element.hidden = true;
  });
  activity.open = false;
  setMode(revisitMode ? 'ask' : 'build');
  updateSendButton();
  const currentGeneration = generation;
  flow = createConnectionFlow({ onChange: (state) => {
    if (generation === currentGeneration && !revisitMode) render(state);
  } });
  if (revisitMode) {
    revisitConversation.start({ complete: completeRevisit });
    chatScroll.reset({ follow: !completeRevisit });
  } else {
    render(flow.snapshot());
    chatScroll.reset();
    startIntroduction();
  }
  if (syncRoute) updateViewRoute(revisitMode ? '' : 'new');
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

function setDesktopNavigation(collapsed) {
  document.body.classList.toggle('navigation-collapsed', collapsed);
  const label = collapsed ? 'Open navigation' : 'Close navigation';
  desktopNavigationToggle.setAttribute('aria-expanded', String(!collapsed));
  desktopNavigationToggle.setAttribute('aria-label', label);
  desktopNavigationToggle.title = label;
}

function syncPanelToggle() {
  const open = document.body.classList.contains('live-app-open');
  const label = `${open ? 'Close' : 'Open'} ${revisitMode ? panelKind === 'report' ? 'weekly update report' : 'meeting view' : panelKind === 'report' ? 'report' : 'app preview'}`;
  panelToolbar.hidden = !availablePanels.size;
  panelToggle.setAttribute('aria-expanded', String(open));
  panelToggle.setAttribute('aria-label', label);
  panelToggle.title = label;
}

function markPanelReady(kind) {
  if (availablePanels.has(kind)) return;
  availablePanels.add(kind);
  // New content becomes the next target only when nothing is already open.
  if (!document.body.classList.contains('live-app-open')) panelKind = kind;
  prepareLiveAppPreview();
  syncPanelToggle();
}

function focusRevisitPanel() {
  const report = panelKind === 'report';
  const frame = report ? reportFrame : appFrame;
  const closeButton = frame.contentDocument?.getElementById(report ? 'close-revisit-report' : 'close-meeting-preview');
  (closeButton || frame).focus({ preventScroll: true });
}

function setLiveAppOpen(open, restoreFocus = true, kind = panelKind, syncRoute = true) {
  if (open && !availablePanels.has(kind)) return;
  const wasOpen = document.body.classList.contains('live-app-open');
  // App and report share the reversible panel transition. Only New Chat and
  // page navigation settle immediately so a reset cannot leave motion running.
  const immediate = !restoreFocus;
  if (immediate) document.body.classList.add('live-app-reset');
  if (open) prepareLiveAppPreview();
  else if (restoreFocus && availablePanels.size) (revisitMode ? panelKind === 'report' ? revisitReportButton : meetingButton : panelToggle)?.focus({ preventScroll: true });
  if (open) panelKind = kind;
  else if (!restoreFocus) panelKind = 'app';
  updateConversation(() => {
    document.body.classList.toggle('live-app-open', open);
    // Preserve a manual sidebar choice when switching between open previews.
    if (open !== wasOpen || immediate) setDesktopNavigation(open);
    liveAppPanel.inert = !open;
    liveAppPanel.setAttribute('aria-hidden', String(!open));
    const report = panelKind === 'report';
    liveAppPanel.dataset.view = panelKind;
    liveAppPanel.setAttribute('aria-label', revisitMode ? report ? 'Weekly Sales Pipeline Update report' : 'Weekly Sales Pipeline Review meeting view' : report ? 'Weekly Sales Pipeline Update report' : 'Weekly Sales Pipeline Review App preview');
    syncPanelToggle();
    byId('open-live-app').setAttribute('aria-expanded', String(open && !report));
    byId('open-agent-report').setAttribute('aria-expanded', String(open && report));
    meetingButton?.setAttribute('aria-expanded', String(open && revisitMode && !report));
    revisitReportButton?.setAttribute('aria-expanded', String(open && revisitMode && report));
    appPreview.setActive(!report);
    reportViews.setActive(!revisitMode && report);
    if (revisitMode) {
      reportFrame.classList.toggle('app-preview-inactive', !report);
      reportFrame.inert = !report;
      reportFrame.setAttribute('aria-hidden', String(!report));
    }
  });
  agentSetup.setViewing(!revisitMode && open && panelKind === 'app');
  if (revisitMode && syncRoute) updateViewRoute(open ? panelKind === 'report' ? 'report' : 'meeting' : '');
  if (open && immediate) chatScroll.settle();
  if (immediate) {
    // Commit every layout change before restoring transitions.
    liveAppPanel.getBoundingClientRect();
    document.body.classList.remove('live-app-reset');
  }
  if (open) {
    if (revisitMode) focusRevisitPanel();
    else {
      const focusTarget = panelKind === 'report' ? byId('report-view-tabs').querySelector('[aria-selected="true"]') : panelToggle;
      (focusTarget || panelToggle).focus({ preventScroll: true });
    }
  }
}

function prepareLiveAppPreview() {
  appFrame.title = revisitMode ? 'Weekly Sales Pipeline Review meeting view' : 'Weekly Sales Pipeline Review App';
  if (revisitMode) {
    if (availablePanels.has('app') && !appFrame.hasAttribute('src')) appFrame.src = 'meeting-preview.html?v=a2e25702';
    if (availablePanels.has('report') && !reportFrame.hasAttribute('src')) reportFrame.src = 'revisit-report.html?v=ad43d2bd';
  } else {
    appPreview.prepare();
    reportViews.prepare();
  }
}

const appPreview = createLiveAppPreview({ source: 'live-app-preview-v3.html?v=0d582437', onClose: () => setLiveAppOpen(false) });
const reportViews = createReportViews({ previews: { report: 'report-preview.html?v=8aa43a24', workflow: 'workflow-preview.html?v=4ffa5c09' }, onClose: () => setLiveAppOpen(false) });
const agentSetup = createAgentSetupChat({ history, update: updateConversation, streamMessage, stopStreaming, later, onScheduleChange: reportViews.setSchedule, onReady: () => markPanelReady('report'), onOpenReport: () => {
  reportViews.open(agentSetup.snapshot().schedule);
  setLiveAppOpen(true, true, 'report');
} });
const liveApps = createLiveAppChat({ history, update: updateConversation, streamMessage, stopStreaming, later, follow: () => chatScroll.follow(), onOpen: () => setLiveAppOpen(true, true, 'app'), onReady: () => markPanelReady('app') });
const revisitConversation = revisitThread ? createRevisitConversation({
  history, update: updateConversation, streamMessage, stopStreaming, later,
  onAppReady: () => markPanelReady('app'),
  onReportReady: () => markPanelReady('report'),
  onChoice: () => { statusMessage.textContent = ''; prompt.focus({ preventScroll: true }); },
}) : null;
panelToggle.addEventListener('click', () => setLiveAppOpen(!document.body.classList.contains('live-app-open')));
meetingButton?.addEventListener('click', () => {
  markPanelReady('app');
  setLiveAppOpen(true, true, 'app');
});
revisitReportButton?.addEventListener('click', () => {
  markPanelReady('report');
  setLiveAppOpen(true, true, 'report');
});
for (const [kind, frame] of [['app', appFrame], ['report', reportFrame]]) frame.addEventListener('load', () => {
  if (revisitMode && panelKind === kind && document.body.classList.contains('live-app-open') && document.activeElement === frame) focusRevisitPanel();
});
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  const fromApp = event.source === appFrame.contentWindow && event.data?.type === 'close-app-preview' && panelKind === 'app';
  const fromReport = event.source === reportFrame.contentWindow && event.data?.type === 'close-report-preview' && panelKind === 'report';
  if (!fromApp && !fromReport) return;
  if (document.body.classList.contains('live-app-open')) setLiveAppOpen(false);
});
desktopNavigationToggle.addEventListener('click', () => {
  updateConversation(() => setDesktopNavigation(!document.body.classList.contains('navigation-collapsed')));
});
sidebar.querySelectorAll('.sidebar-item').forEach((item) => {
  if (!item.hasAttribute('aria-label')) item.setAttribute('aria-label', item.textContent.trim());
});
makeToolRows();
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const submittedAttachments = attachments.map((file) => file.name);
  const text = prompt.value.trim() || (submittedAttachments.length ? 'Review these attachments.' : '');
  if (!text) return;
  if (revisitMode && submittedAttachments.length === 0 && revisitConversation.respond(text)) {
    prompt.value = '';
    updateSendButton();
    return;
  }
  if (!revisitMode) {
    updateConversation(finishIntroduction);
    updateConversation(finishRecommendation);
  }
  const userMessage = document.createElement('p');
  userMessage.className = 'user-message';
  userMessage.textContent = `${text}${submittedAttachments.length ? `\n\nAttached: ${submittedAttachments.join(', ')}` : ''}`;
  const reply = document.createElement('div');
  reply.hidden = true;
  updateConversation(() => history.append(userMessage, reply), true);
  const action = chooseAction(text);
  if (action.kind === 'agent-setup' || action.kind === 'agent-defer') {
    reply.remove();
    if (action.kind === 'agent-setup') agentSetup.setup();
    else agentSetup.defer();
  } else if (action.kind === 'live-app-build' || action.kind === 'crm-connect' || action.kind === 'crm-skip' || action.kind === 'live-app-defer') {
    reply.remove();
    if (action.kind === 'live-app-build') liveApps.start();
    else if (action.kind === 'crm-connect') action.ids.forEach((id) => liveApps.connect(id));
    else if (action.kind === 'crm-skip') liveApps.skip();
    else liveApps.defer();
  } else {
    responses.push({ text, action, element: reply, attachments: submittedAttachments });
  }
  prompt.value = '';
  attachments = [];
  if (attachmentInput) attachmentInput.value = '';
  updateSendButton();
  statusMessage.textContent = '';
  prompt.focus({ preventScroll: true });
  beginNextReply();
});
prompt.addEventListener('input', updateSendButton);
prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.isComposing && (!event.shiftKey || event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    if (prompt.value.trim() || attachments.length) form.requestSubmit();
  }
});
byId('chat-attach')?.addEventListener('click', () => attachmentInput?.click());
attachmentInput?.addEventListener('change', () => {
  attachments = [...attachmentInput.files];
  statusMessage.textContent = attachments.length
    ? `${names(attachments.map((file) => file.name))} attached locally. File contents aren’t uploaded in this prototype.`
    : '';
  updateSendButton();
});
const micButton = byId('chat-mic');
if (micButton && !micButton.hasAttribute('data-preview')) micButton.addEventListener('click', () => {
  statusMessage.textContent = 'Voice input is a static preview in this prototype.';
});
skipButton.addEventListener('click', () => flow.skip());
byId('show-connections').addEventListener('click', () => {
  setSidebar(false, false);
  if (revisitMode) {
    statusMessage.textContent = 'Your connected context is available in this revisit. Choose New Chat to try the connection setup again.';
    return;
  }
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
  if (event.key === 'Escape' && document.body.classList.contains('live-app-open')) {
    event.preventDefault();
    setLiveAppOpen(false);
    return;
  }
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
  setLiveAppOpen(false, false, panelKind, false);
  flow.destroy();
  liveApps.destroy();
  agentSetup.destroy();
  chatScroll.cancel();
  for (const timer of appTimers) clearTimeout(timer);
  appTimers.clear();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    restoreViewFromUrl(true);
    setSidebar(false);
  }
});
function restoreViewFromUrl(reset = false) {
  const view = new URLSearchParams(location.search).get('view');
  const revisit = Boolean(revisitThread) && view !== 'new';
  // Panel navigation keeps the live conversation, draft, and iframe mounted.
  if (reset || revisit !== revisitMode) resetConversation({ revisit, syncRoute: false, completeRevisit: view === 'meeting' || view === 'report' });
  setLiveAppOpen(revisit && (view === 'meeting' || view === 'report'), !reset, view === 'report' ? 'report' : 'app', false);
  if (reset && revisit && (view === 'meeting' || view === 'report')) {
    syncChatOverlays();
    chatScroll.scrollToElement(byId('revisit-report-offer'));
    chatScroll.settle();
  }
}
window.addEventListener('popstate', () => restoreViewFromUrl());
restoreViewFromUrl(true);
setSidebar(false);
