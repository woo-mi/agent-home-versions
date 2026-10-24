(() => {
  'use strict';

  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const moreIcon = '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><g fill="currentColor" stroke="currentColor" stroke-width=".875"><circle cx="7" cy="2.1875" r=".58333"/><circle cx="7" cy="7" r=".58333"/><circle cx="7" cy="11.8125" r=".58333"/></g></svg>';
  const tasks = [
    { id: 'deal-follow-ups', title: 'Deal follow-ups (6)', status: 'Review' },
    { id: 'territory-confirmations', title: 'Territory confirmations', status: 'Running...' },
    { id: 'churn-risk', title: 'Churn risk', status: 'Running...' },
    { id: 'forecast-brief', title: 'Forecast brief', status: 'Done' },
    { id: 'discount-review', title: 'Discount review', status: 'Done' }
  ];
  const routines = [
    { id: 'sales-pipeline', title: 'Weekly Sales Pipeline Update', schedule: 'Fridays at 7:00 AM PT', channel: 'Slack · #sales-pipeline', enabled: true },
    { id: 'workspace-health', title: 'Weekly Workspace Health', schedule: 'Fridays at 4:00 PM PT', channel: 'Slack · #data-platform', enabled: true },
    { id: 'quarterly-review', title: 'Quarterly Wisdom Review', schedule: '5 business days before each quarter ends', enabled: true }
  ];
  const artifactGroups = [
    { title: 'Apps', items: [{ id: 'deal-risk-app', title: 'Deal risk app' }, { id: 'coverage-model', title: 'Coverage model' }] },
    { title: 'Agents', items: [{ id: 'churn-watch', title: 'Churn watch' }, { id: 'weekly-forecast', title: 'Weekly forecast' }] },
    { title: 'Chats', items: [{ id: 'q4-slip-analysis', title: 'Q4 slip analysis' }, { id: 'apac-hiring', title: 'APAC hiring Q&A' }] }
  ];
  const memory = {
    updated: 'Oct 23, 2026',
    summary: 'Who Woomi is - employer, product, and role; read for any work-related request.',
    details: [
      'Works at WisdomAI; refers to "our WisdomAI product" (serves business users.)',
      "Working on UI card for the product's daily brief feature. FINAL WRITE"
    ]
  };
  const taskRow = task => `<div class="ws-task-row" data-task-id="${task.id}">
    <button type="button" class="ws-content-text-button ws-task-title" data-ws-action="task-detail" data-id="${task.id}">${escape(task.title)}</button>
    <div class="ws-task-actions${task.status === 'Review' ? ' ws-task-actions-review' : ''}">
      ${task.status === 'Review' ? `<button type="button" class="ws-task-review" data-ws-action="task-review" data-id="${task.id}">Review</button>` : `<span class="ws-task-status" data-task-status="${task.id}">${task.status}</span>`}
      <span class="ws-task-more" aria-hidden="true">${moreIcon}</span>
    </div>
  </div>`;

  window.MVPWorkspaceData = {
    tasks,
    routines,
    artifactGroups,
    artifacts: artifactGroups.flatMap(group => group.items.map(item => ({ ...item, category: group.title }))),
    memory
  };
  window.MVPWorkspaceContent = {
    schedules: `<div class="ws-tabcontent ws-schedules-content">
      <section class="ws-content-section ws-task-section" aria-labelledby="ws-tasks-heading">
        <h3 class="ws-content-label" id="ws-tasks-heading">Tasks</h3>
        ${tasks.map(taskRow).join('')}
        <button type="button" class="ws-content-see-all" data-ws-action="tasks-all">See all</button>
      </section>
      <section class="ws-content-section" aria-labelledby="ws-routine-heading">
        <h3 class="ws-content-label" id="ws-routine-heading">Routines</h3>
        <ul class="ws-tools ws-routines">${routines.map(routine => `<li class="ws-tool ws-routine">
          <div class="ws-tool-copy"><p class="ws-routine-title">${escape(routine.title)}</p><div id="ws-routine-${routine.id}-details"><p class="ws-routine-schedule">${escape(routine.schedule)}</p>${routine.channel ? `<p class="ws-routine-channel">${escape(routine.channel)}</p>` : ''}</div></div>
          <button type="button" class="ws-switch" role="switch" aria-checked="${routine.enabled}" aria-label="${escape(routine.title)}" aria-describedby="ws-routine-${routine.id}-details" data-routine="${routine.id}"></button>
        </li>`).join('')}</ul>
      </section>
    </div>`,
    artifacts: `<div class="ws-tabcontent ws-artifacts-content">${artifactGroups.map(group => `<section class="ws-content-section" aria-labelledby="ws-artifacts-${group.title.toLowerCase()}">
      <h3 class="ws-content-label" id="ws-artifacts-${group.title.toLowerCase()}">${group.title}</h3>
      ${group.items.map(item => `<button type="button" class="ws-content-text-button ws-artifact-item" data-ws-action="artifact-detail" data-id="${item.id}">${escape(item.title)}</button>`).join('')}
    </section>`).join('')}</div>`,
    memory: `<div class="ws-tabcontent ws-memory-content">
      <section class="ws-content-section" aria-labelledby="ws-memory-updated"><h3 class="ws-content-label" id="ws-memory-updated">Last updated</h3><p>${memory.updated}</p></section>
      <section class="ws-content-section" aria-labelledby="ws-memory-summary"><h3 class="ws-content-label" id="ws-memory-summary">Summary</h3><p>${escape(memory.summary)}</p></section>
      <section class="ws-content-section" aria-labelledby="ws-memory-details"><h3 class="ws-content-label" id="ws-memory-details">Details</h3>
        <ul class="ws-memory-details">${memory.details.map(detail => `<li><span aria-hidden="true" class="ws-memory-bullet">·</span><span>${escape(detail)}</span></li>`).join('')}</ul>
        <span class="ws-content-see-all">See all</span>
      </section>
    </div>`
  };
})();
