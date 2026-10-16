(() => {
  const tabs = [...document.querySelectorAll('[data-report-view]')];
  const report = document.getElementById('revisit-report-content');
  const workflow = document.getElementById('revisit-workflow-content');
  const workflowFrame = document.getElementById('revisit-workflow-frame');

  document.querySelectorAll('.report-chart-fill').forEach(fill => {
    fill.style.width = `${fill.dataset.fillWidth}%`;
  });

  function closeReport() {
    if (parent !== window) parent.postMessage({ type: 'close-report-preview' }, location.origin);
  }
  function handleEscape(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeReport();
  }
  function selectView(view, focus = false) {
    if (view !== 'report' && view !== 'workflow') return;
    const showReport = view === 'report';
    report.hidden = !showReport;
    report.inert = !showReport;
    workflow.hidden = showReport;
    workflow.inert = showReport;
    tabs.forEach(button => {
      const selected = button.dataset.reportView === view;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus({ preventScroll: true });
    });
    if (!showReport && !workflowFrame.hasAttribute('src')) workflowFrame.src = 'workflow-preview.html';
  }

  document.getElementById('close-revisit-report').addEventListener('click', closeReport);
  document.addEventListener('keydown', handleEscape);
  tabs.forEach(button => button.addEventListener('click', () => selectView(button.dataset.reportView)));
  document.querySelector('.report-tabs').addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectView(tabs[next].dataset.reportView, true);
  });
  workflowFrame.addEventListener('load', () => {
    const doc = workflowFrame.contentDocument;
    // This wrapper owns the toolbar space normally reserved by the workflow document.
    if (doc?.body) doc.body.style.paddingTop = '0';
    doc?.addEventListener('keydown', handleEscape);
  });
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    // This revisit uses the saved report's schedule. New Chat owns its separate
    // configurable report and must not overwrite this snapshot's metadata.
    if (event.data?.type === 'revisit-report-open') selectView('report');
  });
})();
