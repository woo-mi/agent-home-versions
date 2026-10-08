import { DEFAULT_AGENT_SCHEDULE } from './agent-setup-flow.mjs?v=454da931';

/** Keep report/workflow documents mounted while switching the right panel's view. */
export function createReportViews({ previews, onClose }) {
  const tabs = document.getElementById('report-view-tabs');
  const buttons = [...tabs.querySelectorAll('[data-report-view]')];
  const frames = Object.entries(previews).map(([view, source]) => ({
    view, source, element: document.getElementById(`${view}-preview`),
  }));
  let selected = 'report';
  let active = false;
  let metadata;

  function sync() {
    tabs.hidden = !active;
    for (const button of buttons) {
      const current = button.dataset.reportView === selected;
      button.setAttribute('aria-selected', String(current));
      button.tabIndex = current ? 0 : -1;
    }
    for (const { view, element } of frames) {
      const inactive = !active || view !== selected;
      element.classList.toggle('app-preview-inactive', inactive);
      element.inert = inactive;
      element.setAttribute('aria-hidden', String(inactive));
    }
  }

  function select(view, focus = false) {
    if (!previews[view]) return;
    selected = view;
    sync();
    if (focus) buttons.find((button) => button.dataset.reportView === view)?.focus({ preventScroll: true });
  }

  function sendMetadata(frame) {
    if (metadata && frame.hasAttribute('src')) frame.contentWindow?.postMessage(metadata, location.origin);
  }

  function setSchedule(schedule = DEFAULT_AGENT_SCHEDULE) {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const time = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
    metadata = {
      type: 'report-schedule',
      schedule: `Every ${schedule.day}, ${time}`,
      timezone: `· ${schedule.timezone}`,
      delivery: `Slack · ${schedule.channel} · Scheduled delivery is simulated`,
    };
    frames.forEach(({ element }) => sendMetadata(element));
  }

  for (const button of buttons) button.addEventListener('click', () => select(button.dataset.reportView));
  tabs.addEventListener('keydown', (event) => {
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    select(buttons[next].dataset.reportView, true);
  });

  for (const { element } of frames) element.addEventListener('load', () => {
    sendMetadata(element);
    element.contentDocument?.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    });
  });
  setSchedule();
  sync();
  return {
    setActive(value) { active = value; sync(); },
    open(schedule) { setSchedule(schedule); select('report'); },
    reset() { setSchedule(); select('report'); },
    prepare() {
      for (const { element, source } of frames) {
        if (!element.hasAttribute('src')) element.src = source;
      }
    },
  };
}
