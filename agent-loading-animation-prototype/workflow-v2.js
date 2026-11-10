/* ─────────────────────────────────────────────────────────
 * V2 · FRONT-FACING WORKFLOW STORYBOARD
 *
 *    0ms   white panel settles into place above a soft shadow
 *  240ms   step cards lift into view, one every 175ms
 *  460ms   four straight connections draw from left to right
 * 1000ms   the quiet progress rail appears beneath the flow
 * 1700ms   a violet signal travels through the finished workflow
 *          each step lifts softly as it receives the signal
 * 7400ms   the continuous motion cycle repeats
 *
 * The shared player owns time, pause, replay, and reduced motion.
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    panelEnter: 0, panelSettle: 720,
    cardsEnter: 240, cardStagger: 175, cardSettle: 600,
    connectorsEnter: 460, connectorStagger: 185, connectorDraw: 500,
    railEnter: 1000, railFade: 700,
    loopStart: 1700, loopDuration: 7400, signalTravel: 5600,
    cardPulse: 1000,
  };
  const STAGE = { panel: 1, cards: 2, connections: 3, rail: 4, flowing: 5 };
  const PANEL = { x: 40, y: 57, width: 520, height: 208, radius: 15, enterOffset: 13, floatAmplitude: 1.8 };
  const CARD = { x: 66, y: 117, width: 76, height: 88, spacing: 98, radius: 10, enterOffset: 18, pulseLift: 3 };
  const SIGNAL = { y: 153, radius: 2.8, color: '#8789EB', glow: '#C1C3FA' };
  const PALETTE = { border: '#DFE2E9', connection: '#B9BECF', ink: '#686D79', faint: '#E9EBF1', purple: '#9294E8' };
  const clamp = value => Math.max(0, Math.min(1, value));
  const progress = (time, start, duration) => clamp((time - start) / duration);
  const easeOut = value => 1 - Math.pow(1 - value, 3);
  const smooth = value => value * value * (3 - 2 * value);
  const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function create({ id, items }) {
    const prefix = `${id}-v2`;
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.setAttribute('class', 'build-illustration');
    element.setAttribute('viewBox', '0 0 600 330');
    element.setAttribute('role', 'img');
    element.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const cards = items.map((item, index) => `<g transform="translate(${CARD.x + index * CARD.spacing} ${CARD.y})">
      <g data-v2-card="${index}">
        <rect x="0" y="4" width="${CARD.width}" height="${CARD.height}" rx="${CARD.radius}" fill="#A3A9BD" opacity=".09" filter="url(#${prefix}-card-shadow)"/>
        <rect data-v2-border="${index}" width="${CARD.width}" height="${CARD.height}" rx="${CARD.radius}" fill="#FFF" stroke="${PALETTE.border}" stroke-width=".9"/>
        <rect x="21" y="13" width="34" height="34" rx="9" fill="${item.color}"/>
        <svg x="27" y="19" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
        <text x="38" y="66" text-anchor="middle" fill="${PALETTE.ink}" font-family="Inter, system-ui, sans-serif" font-size="10.5" font-weight="500" letter-spacing="-.12">${escapeText(item.name)}</text>
        <circle cx="0" cy="36" r="2.1" fill="#FFF" stroke="#C9CEDC" stroke-width=".9"/>
        <circle cx="76" cy="36" r="2.1" fill="#FFF" stroke="#C9CEDC" stroke-width=".9"/>
      </g>
    </g>`).join('');
    const connectors = items.slice(0, -1).map((_, index) => `<path data-v2-connector="${index}" d="M${CARD.x + CARD.width + index * CARD.spacing} ${SIGNAL.y}h${CARD.spacing - CARD.width}" fill="none" stroke="${PALETTE.connection}" stroke-width="1.3" stroke-linecap="round" pathLength="1"/>`).join('');
    const rail = items.map((item, index) => `<g transform="translate(${CARD.x + CARD.width / 2 + index * CARD.spacing} 236)">
      <circle data-v2-rail-dot="${index}" r="2.3" fill="${item.color}" opacity=".45"/>
      ${index < items.length - 1 ? '<path d="M9 0h80" stroke="#EDEEF3" stroke-width="1" stroke-linecap="round"/>' : ''}
    </g>`).join('');

    element.innerHTML = `<title id="${prefix}-title">Your agent workflow, step by step</title>
      <desc id="${prefix}-description">A front-facing white panel connects Trigger, Data, Analysis, Report, and Email. A soft violet signal moves between the five steps.</desc>
      <defs>
        <filter id="${prefix}-shadow" x="-15%" y="-60%" width="130%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>
        <filter id="${prefix}-card-shadow" x="-25%" y="-25%" width="150%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="${prefix}-glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.8"/></filter>
        <linearGradient id="${prefix}-panel-edge" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFF"/><stop offset="1" stop-color="#F4F5FA"/></linearGradient>
      </defs>
      <ellipse data-v2-shadow cx="300" cy="275" rx="230" ry="10" fill="#959BAE" opacity=".08" filter="url(#${prefix}-shadow)"/>
      <g data-v2-panel>
        <rect x="48" y="65" width="504" height="208" rx="15" fill="#F5F6FA" stroke="#E8EAF0" stroke-width=".8"/>
        <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.width}" height="${PANEL.height}" rx="${PANEL.radius}" fill="url(#${prefix}-panel-edge)" stroke="#DCE0E8" stroke-width="1"/>
        <rect x="41" y="58" width="518" height="204" rx="14" fill="#FFF"/>
        <circle cx="66" cy="82" r="3" fill="#AAA9EF"/>
        <rect x="78" y="79.5" width="83" height="4" rx="2" fill="#D9DDE7"/>
        <rect x="169" y="80" width="38" height="3" rx="1.5" fill="#ECEEF3"/>
        <rect x="506" y="75" width="30" height="13" rx="6.5" fill="#F5F5FB"/>
        <circle cx="515" cy="81.5" r="1.5" fill="#B7B8DE"/><path d="M521 81.5h7" stroke="#D4D5E8" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M62 100h476" stroke="#F0F1F5" stroke-width=".8"/>
        ${connectors}
        <g data-v2-signal opacity="0"><circle r="6.5" fill="${SIGNAL.glow}" opacity=".65" filter="url(#${prefix}-glow)"/><circle r="${SIGNAL.radius}" fill="${SIGNAL.color}"/></g>
        ${cards}
        <g data-v2-rail>${rail}</g>
      </g>`;

    const panel = element.querySelector('[data-v2-panel]');
    const shadow = element.querySelector('[data-v2-shadow]');
    const cardNodes = [...element.querySelectorAll('[data-v2-card]')];
    const borders = [...element.querySelectorAll('[data-v2-border]')];
    const paths = [...element.querySelectorAll('[data-v2-connector]')];
    const signal = element.querySelector('[data-v2-signal]');
    const railNode = element.querySelector('[data-v2-rail]');
    const railDots = [...element.querySelectorAll('[data-v2-rail-dot]')];
    let stage = STAGE.panel;

    function render(time, staticFrame = false) {
      const entered = staticFrame ? 1 : easeOut(progress(time, TIMING.panelEnter, TIMING.panelSettle));
      const phase = staticFrame ? 0 : Math.max(0, time - TIMING.loopStart) % TIMING.loopDuration;
      const looping = !staticFrame && time >= TIMING.loopStart;
      const wave = looping ? Math.sin(phase / TIMING.loopDuration * Math.PI * 2) : 0;
      stage = staticFrame || time >= TIMING.loopStart ? STAGE.flowing : time >= TIMING.railEnter ? STAGE.rail : time >= TIMING.connectorsEnter ? STAGE.connections : time >= TIMING.cardsEnter ? STAGE.cards : STAGE.panel;
      element.dataset.stage = stage;
      panel.style.opacity = entered;
      panel.setAttribute('transform', `translate(0 ${(1 - entered) * PANEL.enterOffset + wave * PANEL.floatAmplitude})`);
      shadow.style.opacity = .08 * entered;
      const signalProgress = clamp(phase / TIMING.signalTravel);
      cardNodes.forEach((card, index) => {
        const entrance = staticFrame ? 1 : easeOut(progress(time, TIMING.cardsEnter + index * TIMING.cardStagger, TIMING.cardSettle));
        const pulseTime = phase - index * TIMING.signalTravel / (cardNodes.length - 1);
        const pulse = looping && pulseTime >= 0 && pulseTime <= TIMING.cardPulse ? Math.sin(pulseTime / TIMING.cardPulse * Math.PI) : 0;
        card.style.opacity = entrance;
        card.setAttribute('transform', `translate(0 ${(1 - entrance) * CARD.enterOffset - pulse * CARD.pulseLift})`);
        borders[index].setAttribute('stroke', pulse > .15 ? '#BFC1EE' : PALETTE.border);
        railDots[index].style.opacity = staticFrame ? .5 : .35 + pulse * .55;
      });
      paths.forEach((path, index) => {
        const drawn = staticFrame ? 1 : smooth(progress(time, TIMING.connectorsEnter + index * TIMING.connectorStagger, TIMING.connectorDraw));
        path.style.strokeDasharray = '1';
        path.style.strokeDashoffset = 1 - drawn;
        path.style.opacity = drawn;
      });
      railNode.style.opacity = staticFrame ? 1 : smooth(progress(time, TIMING.railEnter, TIMING.railFade));
      const travelling = looping && phase <= TIMING.signalTravel;
      signal.style.opacity = travelling ? .9 : 0;
      if (travelling) signal.setAttribute('transform', `translate(${CARD.x + CARD.width / 2 + (cardNodes.length - 1) * CARD.spacing * signalProgress} ${SIGNAL.y})`);
    }

    render(0);
    return { element, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v2 = { create };
})();
