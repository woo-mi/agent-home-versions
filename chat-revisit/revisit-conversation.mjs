/** Play the designed revisit conversation in chunks, with live replies available. */
export function createRevisitConversation({ history, update, streamMessage, stopStreaming, later, onAppReady, onReportReady, onChoice = () => {} }) {
  const byId = (id) => document.getElementById(id);
  const banner = byId('revisit-banner');
  const greeting = byId('revisit-greeting');
  const changes = byId('revisit-changes');
  const app = byId('revisit-meeting-card');
  const question = byId('revisit-metrics-question');
  const yes = byId('revisit-yes');
  const yesRow = yes.closest('.revisit-user-row');
  const metrics = byId('revisit-metrics');
  const weekly = byId('revisit-weekly-prompt');
  const weeklyRow = weekly.closest('.revisit-user-row');
  const report = byId('revisit-report-offer');
  const greetingText = greeting.textContent;
  const questionText = question.textContent;
  const yesText = yes.textContent;
  const weeklyText = weekly.textContent;
  const blocks = [banner, greeting, changes, app, question, yesRow, metrics, weeklyRow, report];
  const homes = [yesRow, metrics, weeklyRow, report].map((element) => {
    const marker = document.createComment('revisit conversation position');
    element.before(marker);
    return { element, marker };
  });
  let version = 0;
  let introComplete = false;
  let metricsAccepted = false;
  let metricsShown = false;
  let weeklyAccepted = false;

  function schedule(callback, delay = 750) {
    const current = version;
    later(() => { if (current === version) callback(); }, delay);
  }

  function restore() {
    version += 1;
    stopStreaming(greeting);
    stopStreaming(question);
    for (const { element, marker } of homes) marker.after(element);
    for (const element of blocks) element.hidden = true;
    greeting.textContent = greetingText;
    question.textContent = questionText;
    yes.textContent = yesText;
    weekly.textContent = weeklyText;
    yes.disabled = false;
    weekly.disabled = false;
    delete yes.dataset.sent;
    delete weekly.dataset.sent;
    introComplete = false;
    metricsAccepted = false;
    metricsShown = false;
    weeklyAccepted = false;
  }

  function finishIntro() {
    if (introComplete) return;
    version += 1;
    stopStreaming(greeting);
    stopStreaming(question);
    update(() => {
      greeting.textContent = greetingText;
      question.textContent = questionText;
      for (const element of [banner, greeting, changes, app, question, yesRow]) element.hidden = false;
    });
    introComplete = true;
    onAppReady();
  }

  function sent(button, text) {
    button.textContent = text;
    button.disabled = true;
    button.dataset.sent = 'true';
  }

  function relocateAfterMessages(elements, force = false) {
    // Keep a later choice after intervening free-form messages, not above them.
    if (!force && !history.childElementCount) return;
    const group = document.createElement('div');
    group.className = 'revisit-thread';
    group.style.marginBlock = '16px';
    group.append(...elements);
    history.append(group);
  }

  function showMetrics() {
    if (metricsShown) return;
    metricsShown = true;
    update(() => { metrics.hidden = false; });
    schedule(() => {
      if (!weeklyAccepted) acceptWeekly(weeklyText, { userInitiated: false });
    }, 1200);
  }

  function acceptMetrics(text = yesText, { userInitiated = true } = {}) {
    if (metricsAccepted) return false;
    finishIntro();
    metricsAccepted = true;
    update(() => {
      relocateAfterMessages(weeklyAccepted ? [yesRow, metrics] : [yesRow, metrics, weeklyRow], weeklyAccepted);
      sent(yes, text);
      yesRow.hidden = false;
    }, userInitiated);
    schedule(showMetrics, 900);
    if (userInitiated) onChoice();
    return true;
  }

  function acceptWeekly(text = weeklyText, { userInitiated = true } = {}) {
    if (weeklyAccepted) return false;
    finishIntro();
    weeklyAccepted = true;
    if (metricsAccepted) showMetrics();
    update(() => {
      relocateAfterMessages([weeklyRow, report]);
      sent(weekly, text);
      weeklyRow.hidden = false;
    }, userInitiated);
    schedule(() => {
      update(() => { report.hidden = false; });
      onReportReady();
    }, 1000);
    if (userInitiated) onChoice();
    return true;
  }

  yes.addEventListener('click', () => acceptMetrics());
  weekly.addEventListener('click', () => acceptWeekly());

  return {
    restore,
    start({ complete = false } = {}) {
      restore();
      if (complete) {
        finishIntro();
        metricsAccepted = metricsShown = weeklyAccepted = true;
        update(() => {
          sent(yes, yesText);
          sent(weekly, weeklyText);
          metrics.hidden = weeklyRow.hidden = report.hidden = false;
        });
        onReportReady();
        return;
      }
      schedule(() => {
        update(() => { banner.hidden = false; });
        schedule(() => {
          const current = version;
          streamMessage(greeting, greetingText, () => {
            if (current !== version) return;
            schedule(() => {
              update(() => { changes.hidden = false; });
              schedule(() => {
                update(() => { app.hidden = false; });
                onAppReady();
                schedule(() => {
                  streamMessage(question, questionText, () => {
                    if (current !== version) return;
                    introComplete = true;
                    schedule(() => acceptMetrics(yesText, { userInitiated: false }), 650);
                  });
                });
              });
            });
          });
        });
      }, 700);
    },
    respond(text) {
      const value = text.trim().toLowerCase();
      if (/\bweekly\s+(?:update|report)\b|\bshow\s+(?:me\s+)?(?:the\s+)?report\b/.test(value)) return acceptWeekly(text);
      if (/^(?:yes|yep|yeah|sure|please|ok(?:ay)?|show\s+(?:me\s+)?(?:my\s+|the\s+)?metrics)(?:,?\s+please)?[.!]?$/.test(value)) return acceptMetrics(text);
      return false;
    },
  };
}
