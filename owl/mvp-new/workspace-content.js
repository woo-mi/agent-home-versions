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
      <button type="button" class="ws-task-more" data-ws-action="task-menu" data-id="${task.id}" aria-label="Options for ${escape(task.title)}" aria-haspopup="menu" aria-expanded="false">${moreIcon}</button>
    </div>
  </div>`;

  window.MVPWorkspaceData = {
    tasks,
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
      <section class="ws-content-section" aria-labelledby="ws-routine-heading"><h3 class="ws-content-label" id="ws-routine-heading">Routine</h3></section>
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
        <button type="button" class="ws-content-see-all" data-ws-action="memory-all">See all</button>
      </section>
    </div>`
  };
})();
