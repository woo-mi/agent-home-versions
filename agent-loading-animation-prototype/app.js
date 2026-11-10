(() => {
  'use strict';

  /* ANIMATION STORYBOARD — conversation and workflow begin together.
   *    0ms  request appears; understand the request
   * 1100ms  connect the data
   * 2600ms  assemble the workflow
   * 4600ms  connect the actions; illustration continues its quiet loop
   */
  const TIMING = { understand: 0, connectData: 1100, designWorkflow: 2600, connectActions: 4600 };
  const BUILD_STEPS = ['Understanding your request', 'Connecting your data', 'Designing your workflow', 'Connecting the actions'];
  const DEMO_REQUEST = 'Create a weekly bug report. Analyze resolved issues, summarize the trends, and email me the results.';
  const byId = (id) => document.getElementById(id);
  const shell = byId('app-shell');
  const input = byId('message-input');
  const form = byId('message-form');
  const send = byId('send-button');
  const history = byId('message-history');
  const empty = byId('empty-state');
  const panelToggle = byId('panel-toggle');
  const openNavigation = byId('open-navigation');
  const closeNavigation = byId('close-navigation');
  const sidebar = byId('sidebar');
  const backdrop = byId('sidebar-backdrop');
  const mobile = window.matchMedia('(max-width: 900px)');
  const status = byId('status-message');
  const animation = window.AgentBuildAnimation.mount(byId('agent-workspace'));
  let statusTimeout;
  let currentRequest = DEMO_REQUEST;
  let progressStage = -1;

  function announce(message) {
    window.clearTimeout(statusTimeout);
    status.textContent = message;
    status.hidden = false;
    statusTimeout = window.setTimeout(() => { status.hidden = true; }, 3000);
  }

  function setNavigation(open) {
    if (mobile.matches) {
      shell.classList.toggle('mobile-navigation-open', open);
      shell.classList.remove('navigation-collapsed');
      backdrop.hidden = !open;
    } else {
      shell.classList.toggle('navigation-collapsed', !open);
      shell.classList.remove('mobile-navigation-open');
      backdrop.hidden = true;
    }
    openNavigation.setAttribute('aria-expanded', String(open));
    closeNavigation.setAttribute('aria-expanded', String(open));
    sidebar.classList.toggle('is-compact', !open);
    closeNavigation.setAttribute('aria-label', open ? 'Collapse sidebar' : 'Expand sidebar');
    closeNavigation.title = open ? 'Collapse sidebar' : 'Expand sidebar';
  }

  function setMobileView(view) {
    shell.classList.toggle('mobile-view-workflow', view === 'workflow');
    shell.classList.toggle('mobile-view-conversation', view === 'conversation');
    byId('view-workflow').setAttribute('aria-pressed', String(view === 'workflow'));
    byId('view-conversation').setAttribute('aria-pressed', String(view === 'conversation'));
  }

  function syncSend() { send.disabled = input.value.trim().length === 0; }

  function renderProgress(stage) {
    if (progressStage === stage) return;
    progressStage = stage;
    history.querySelectorAll('.build-step').forEach((step, index) => {
      step.classList.toggle('is-complete', index < stage);
      step.classList.toggle('is-current', index === stage);
      if (index === stage) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  function renderProgressAt(elapsed) {
    const time = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? TIMING.connectActions : elapsed;
    const thresholds = Object.values(TIMING);
    let stage = 0;
    thresholds.forEach((threshold, index) => { if (time >= threshold) stage = index; });
    renderProgress(stage);
  }

  function startBuild(request = currentRequest) {
    const moveComposerFocus = document.activeElement === input && window.matchMedia('(max-width: 900px)').matches;
    currentRequest = request;
    const bubble = document.createElement('p');
    bubble.className = 'user-message';
    bubble.textContent = request;
    const response = document.createElement('div');
    response.className = 'build-response';
    const introduction = document.createElement('p');
    introduction.textContent = 'I’m putting together the data, analysis, and actions for your agent.';
    const progress = document.createElement('ol');
    progress.className = 'build-progress';
    progress.setAttribute('aria-label', 'Agent building progress');
    BUILD_STEPS.forEach((label) => {
      const row = document.createElement('li');
      row.className = 'build-step';
      const indicator = document.createElement('span');
      indicator.className = 'step-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      row.append(indicator, document.createTextNode(label));
      progress.append(row);
    });
    response.append(introduction, progress);
    history.replaceChildren(bubble, response);
    history.hidden = false;
    empty.hidden = true;
    input.value = '';
    status.hidden = true;
    syncSend();
    shell.classList.add('has-workflow');
    shell.classList.remove('conversation-hidden');
    panelToggle.setAttribute('aria-expanded', 'true');
    panelToggle.setAttribute('aria-label', 'Hide conversation panel');
    panelToggle.title = 'Hide conversation panel';
    setMobileView('workflow');
    if (mobile.matches) setNavigation(false);
    progressStage = -1;
    shell.classList.remove('animation-paused');
    renderProgressAt(0);
    animation.start();
    if (moveComposerFocus) byId('view-workflow').focus();
  }

  function resetConversation() {
    shell.classList.remove('has-workflow', 'animation-paused');
    animation.stop();
    input.value = '';
    history.replaceChildren();
    history.hidden = true;
    empty.hidden = false;
    shell.classList.remove('has-workflow', 'conversation-hidden');
    panelToggle.setAttribute('aria-expanded', 'true');
    panelToggle.setAttribute('aria-label', 'Hide conversation panel');
    panelToggle.title = 'Hide conversation panel';
    setMobileView('conversation');
    status.hidden = true;
    syncSend();
    if (mobile.matches) setNavigation(false);
    input.focus();
  }

  input.addEventListener('input', syncSend);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
      event.preventDefault();
      if (!send.disabled) form.requestSubmit();
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (message) startBuild(message);
  });
  openNavigation.addEventListener('click', () => setNavigation(true));
  closeNavigation.addEventListener('click', () => setNavigation(sidebar.classList.contains('is-compact')));
  backdrop.addEventListener('click', () => { setNavigation(false); closeNavigation.focus(); });
  panelToggle.addEventListener('click', () => {
    const hidden = shell.classList.toggle('conversation-hidden');
    const label = hidden ? 'Show conversation panel' : 'Hide conversation panel';
    panelToggle.setAttribute('aria-expanded', String(!hidden));
    panelToggle.setAttribute('aria-label', label);
    panelToggle.title = label;
  });
  byId('view-conversation').addEventListener('click', () => setMobileView('conversation'));
  byId('view-workflow').addEventListener('click', () => setMobileView('workflow'));
  byId('cancel-button').addEventListener('click', resetConversation);
  byId('nav-new-chat').addEventListener('click', resetConversation);
  byId('create-button').addEventListener('click', () => startBuild(input.value.trim() || currentRequest));
  byId('preview-animation').addEventListener('click', () => startBuild(DEMO_REQUEST));
  document.querySelectorAll('[data-preview]').forEach((button) => {
    button.addEventListener('click', () => announce(`${button.dataset.preview} is not connected in this prototype.`));
  });
  sidebar.querySelectorAll('[data-nav]').forEach((button) => {
    if (button.id === 'nav-new-chat') return;
    button.addEventListener('click', () => announce(`${button.dataset.nav} is outside this preview.`));
  });
  sidebar.querySelectorAll('[data-recent]').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.dataset.recent || button.textContent.trim();
      syncSend();
      shell.classList.remove('conversation-hidden');
      panelToggle.setAttribute('aria-expanded', 'true');
      panelToggle.setAttribute('aria-label', 'Hide conversation panel');
      panelToggle.title = 'Hide conversation panel';
      setMobileView('conversation');
      setNavigation(false);
      input.focus();
    });
  });
  const recentSearch = byId('recent-search-button');
  const recentFilter = document.createElement('input');
  recentFilter.type = 'search';
  recentFilter.id = 'recent-filter';
  recentFilter.className = 'recent-filter';
  recentFilter.placeholder = 'Search recent chats';
  recentFilter.setAttribute('aria-label', 'Search recent chats');
  recentFilter.hidden = true;
  recentSearch.closest('h2').after(recentFilter);
  recentSearch.setAttribute('aria-controls', recentFilter.id);
  recentSearch.setAttribute('aria-expanded', 'false');
  const filterRecent = () => sidebar.querySelectorAll('[data-recent]').forEach((button) => {
    button.hidden = !button.textContent.toLowerCase().includes(recentFilter.value.toLowerCase());
  });
  const closeRecentSearch = () => {
    recentFilter.hidden = true;
    recentFilter.value = '';
    recentSearch.setAttribute('aria-expanded', 'false');
    filterRecent();
  };
  recentSearch.addEventListener('click', () => {
    const compact = sidebar.classList.contains('is-compact');
    if (compact) setNavigation(true);
    if (compact || recentFilter.hidden) {
      recentFilter.hidden = false;
      recentSearch.setAttribute('aria-expanded', 'true');
      recentFilter.focus();
    } else closeRecentSearch();
  });
  recentFilter.addEventListener('input', filterRecent);
  recentFilter.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeRecentSearch();
      recentSearch.focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      status.hidden = true;
      if (shell.classList.contains('mobile-navigation-open')) {
        setNavigation(false);
        closeNavigation.focus();
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      resetConversation();
    }
  });
  mobile.addEventListener('change', () => setNavigation(!mobile.matches));
  document.addEventListener('agent-build-motion', (event) => {
    shell.classList.toggle('animation-paused', Boolean(event.detail?.paused));
    shell.style.setProperty('--build-spinner-duration', `${1300 / (event.detail?.speed || 1)}ms`);
    if (shell.classList.contains('has-workflow')) renderProgressAt(event.detail?.elapsedMs || 0);
  });
  document.addEventListener('agent-build-time', (event) => {
    if (shell.classList.contains('has-workflow')) renderProgressAt(event.detail.elapsedMs);
  });
  setNavigation(!mobile.matches);
  syncSend();
  startBuild(DEMO_REQUEST);
})();
