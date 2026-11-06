/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V3 / CONSTELLATION
 *
 *    0ms   a small agent nucleus appears in a quiet aurora
 *  180ms   five upright cards assemble from the center (150ms stagger)
 *  600ms   one continuous workflow connection draws around the nucleus
 * 1700ms   assembly resolves into a calm 7400ms breathing loop
 *          a luminous signal visits Trigger → Data → Analysis → Report → Email
 *          the active card answers with a small lift and soft color halo
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    nucleusEnter:       0, // the central agent first appears
    nucleusSettle:    850, // central agent settles into position
    cardsEnter:       180, // the first card leaves the center
    cardStagger:      150, // interval between card entrances
    cardSettle:       820, // spring settling time for each card
    pathEnter:        600, // the continuous connection begins drawing
    pathDraw:        1000, // the connection is fully drawn before the loop
    loopStart:       1700, // the intro finishes
    loopDuration:    7400, // one complete breathing cycle
    signalTravel:    5700, // signal travels from the first card to the last
    signalFade:       360, // signal fades softly at either endpoint
    cardPulse:        900, // a card responds as the signal reaches it
  };

  const STAGE = { nucleus: 0, assembly: 1, connection: 2, flowing: 3 };
  const SCENE = {
    width: 600, height: 330,
    center: { x: 300, y: 166 },
    enterScale: .72,
    springFrequency: 7,
    floatAmplitude: 1.6,
    shadowColor: '#8F91B6',
    font: 'Inter, system-ui, sans-serif',
  };
  const CARDS = {
    width: 64, height: 64, radius: 13,
    iconSize: 24, badgeSize: 37, badgeRadius: 10,
    labelY: 50, labelSize: 11.5,
    initialScale: .70, pulseLift: 2.3,
    shadowOffset: 5, shadowBlur: 7,
    border: '#E2E4EE', activeBorder: '#BBB8EC',
    label: '#747988', activeLabel: '#555464',
    haloRadius: 43, haloOpacity: .12,
    positions: [
      { x: 140, y: 170, arrival: 0 },
      { x: 225, y: 77, arrival: .245 },
      { x: 375, y: 77, arrival: .48 },
      { x: 460, y: 170, arrival: .725 },
      { x: 300, y: 258, arrival: 1 },
    ],
  };
  const FLOW = {
    path: 'M140 170 C140 119 176 77 225 77 C273 52 327 52 375 77 C424 77 460 119 460 170 C460 221 365 258 300 258',
    stroke: '#DDDCEB', width: 1.25,
    signalColor: '#8B80DB', signalRadius: 2.7,
    glowColor: '#B8ABEF', glowRadius: 9, glowBlur: 3,
    wakeLength: .055, wakeOpacity: .56,
  };
  const NUCLEUS = {
    size: 43, radius: 14, ringRadius: 31,
    enterScale: .62, breathScale: .025,
    border: '#E6E1F5', icon: '#9C90D7',
    haloRadius: 42, haloBlur: 9, haloOpacity: .11,
    ring: '#E7E2F4', ringBreath: 2,
  };
  const AURORA = {
    width: 146, height: 80, blur: 23,
    violet: '#D5C9F1', cyan: '#C9EAF0', rose: '#F1D9E7',
    baseOpacity: .25, breatheOpacity: .07,
    horizontalDrift: 5, verticalDrift: 3,
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));
  const progress = (time, start, duration) => clamp((time - start) / duration);
  const smooth = value => value * value * (3 - 2 * value);
  const mix = (from, to, amount) => from + (to - from) * amount;
  const spring = value => {
    const frequency = SCENE.springFrequency;
    const endpoint = 1 - (1 + frequency) * Math.exp(-frequency);
    return (1 - (1 + frequency * value) * Math.exp(-frequency * value)) / endpoint;
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-constellation`;
    const steps = items.slice(0, CARDS.positions.length);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-constellation');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const cardMarkup = steps.map((item, index) => {
      const half = CARDS.width / 2;
      const badgeHalf = CARDS.badgeSize / 2;
      return `<g data-v3-card="${index}">
        <circle data-v3-halo="${index}" r="${CARDS.haloRadius}" fill="${escape(item.color)}" opacity="0" filter="url(#${prefix}-soft)"/>
        <rect x="${-half}" y="${-half + CARDS.shadowOffset}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="${SCENE.shadowColor}" opacity=".085" filter="url(#${prefix}-shadow)"/>
        <rect data-v3-border="${index}" x="${-half}" y="${-half}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="#FFFFFF" stroke="${CARDS.border}" stroke-width="1"/>
        <rect x="${-badgeHalf}" y="${-badgeHalf}" width="${CARDS.badgeSize}" height="${CARDS.badgeSize}" rx="${CARDS.badgeRadius}" fill="${escape(item.color)}" opacity=".10"/>
        <svg x="${-CARDS.iconSize / 2}" y="${-CARDS.iconSize / 2}" width="${CARDS.iconSize}" height="${CARDS.iconSize}" viewBox="0 0 24 24" fill="none" stroke="${escape(item.color)}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${item.icon}</svg>
        <text data-v3-label="${index}" x="0" y="${CARDS.labelY}" text-anchor="middle" fill="${CARDS.label}" font-family="${SCENE.font}" font-size="${CARDS.labelSize}" font-weight="500">${escape(item.name)}</text>
      </g>`;
    }).join('');

    svg.innerHTML = `<title id="${prefix}-title">An agent workflow taking shape</title>
      <desc id="${prefix}-description">Five upright cards form a constellation around an agent. A soft signal follows Trigger, Data, Analysis, Report, and Email in order.</desc>
      <defs>
        <filter id="${prefix}-shadow" x="-50%" y="-50%" width="200%" height="220%"><feGaussianBlur stdDeviation="${CARDS.shadowBlur}"/></filter>
        <filter id="${prefix}-soft" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="${NUCLEUS.haloBlur}"/></filter>
        <filter id="${prefix}-aurora" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="${AURORA.blur}"/></filter>
        <filter id="${prefix}-signal" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${FLOW.glowBlur}"/></filter>
        <linearGradient id="${prefix}-wake" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#C7BDEA"/><stop offset="1" stop-color="${FLOW.signalColor}"/></linearGradient>
      </defs>
      <g data-v3-aurora filter="url(#${prefix}-aurora)">
        <ellipse cx="276" cy="160" rx="${AURORA.width / 2}" ry="${AURORA.height / 2}" fill="${AURORA.violet}"/>
        <ellipse cx="341" cy="152" rx="60" ry="32" fill="${AURORA.cyan}" opacity=".70"/>
        <ellipse cx="305" cy="201" rx="66" ry="25" fill="${AURORA.rose}" opacity=".64"/>
      </g>
      <g data-v3-scene>
        <path data-v3-path d="${FLOW.path}" pathLength="1" fill="none" stroke="${FLOW.stroke}" stroke-width="${FLOW.width}" stroke-linecap="round"/>
        <path data-v3-wake d="${FLOW.path}" pathLength="1" fill="none" stroke="url(#${prefix}-wake)" stroke-width="2" stroke-linecap="round" opacity="0"/>
        <g data-v3-nucleus transform="translate(${SCENE.center.x} ${SCENE.center.y})">
          <circle data-v3-nucleus-halo r="${NUCLEUS.haloRadius}" fill="#C8B9ED" opacity="${NUCLEUS.haloOpacity}" filter="url(#${prefix}-soft)"/>
          <circle data-v3-ring r="${NUCLEUS.ringRadius}" fill="none" stroke="${NUCLEUS.ring}" stroke-width=".8"/>
          <rect x="${-NUCLEUS.size / 2}" y="${-NUCLEUS.size / 2}" width="${NUCLEUS.size}" height="${NUCLEUS.size}" rx="${NUCLEUS.radius}" fill="#FFFFFF" stroke="${NUCLEUS.border}"/>
          <path d="M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10Z" fill="${NUCLEUS.icon}"/>
          <circle cx="12" cy="-12" r="2" fill="#BDAFE7"/>
        </g>
        <g data-v3-signal opacity="0"><circle r="${FLOW.glowRadius}" fill="${FLOW.glowColor}" opacity=".60" filter="url(#${prefix}-signal)"/><circle r="${FLOW.signalRadius}" fill="${FLOW.signalColor}"/><circle r=".9" fill="#FFFFFF" opacity=".95"/></g>
        ${cardMarkup}
      </g>`;

    const find = selector => svg.querySelector(selector);
    const all = selector => [...svg.querySelectorAll(selector)];
    const scene = find('[data-v3-scene]');
    const aurora = find('[data-v3-aurora]');
    const nucleus = find('[data-v3-nucleus]');
    const nucleusHalo = find('[data-v3-nucleus-halo]');
    const ring = find('[data-v3-ring]');
    const path = find('[data-v3-path]');
    const wake = find('[data-v3-wake]');
    const signal = find('[data-v3-signal]');
    const cards = all('[data-v3-card]');
    const halos = all('[data-v3-halo]');
    const borders = all('[data-v3-border]');
    const labels = all('[data-v3-label]');
    let pathLength = null;

    function render(time, staticFrame = false) {
      const elapsed = Math.max(0, Number(time) || 0);
      const stage = staticFrame || elapsed >= TIMING.loopStart ? STAGE.flowing : elapsed >= TIMING.pathEnter ? STAGE.connection : elapsed >= TIMING.cardsEnter ? STAGE.assembly : STAGE.nucleus;
      const phase = staticFrame ? 0 : Math.max(0, elapsed - TIMING.loopStart) % TIMING.loopDuration;
      const wave = staticFrame ? 0 : Math.sin(phase / TIMING.loopDuration * TAU);
      const coreEnter = staticFrame ? 1 : spring(progress(elapsed, TIMING.nucleusEnter, TIMING.nucleusSettle));
      const coreScale = mix(NUCLEUS.enterScale, 1, coreEnter) + wave * NUCLEUS.breathScale;
      svg.dataset.stage = String(stage);
      scene.setAttribute('transform', `translate(0 ${wave * SCENE.floatAmplitude})`);
      nucleus.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y}) scale(${coreScale})`);
      nucleus.setAttribute('opacity', coreEnter);
      ring.setAttribute('r', NUCLEUS.ringRadius + wave * NUCLEUS.ringBreath);
      nucleusHalo.setAttribute('opacity', NUCLEUS.haloOpacity * (1 + wave * .22));
      aurora.setAttribute('opacity', coreEnter * (AURORA.baseOpacity + wave * AURORA.breatheOpacity));
      aurora.setAttribute('transform', `translate(${wave * AURORA.horizontalDrift} ${wave * AURORA.verticalDrift})`);

      cards.forEach((card, index) => {
        const enter = staticFrame ? 1 : spring(progress(elapsed, TIMING.cardsEnter + index * TIMING.cardStagger, TIMING.cardSettle));
        const destination = CARDS.positions[index];
        const pulseDistance = Math.abs(phase - destination.arrival * TIMING.signalTravel);
        const pulse = !staticFrame && stage >= STAGE.flowing ? smooth(clamp(1 - pulseDistance / (TIMING.cardPulse / 2))) : 0;
        const x = mix(SCENE.center.x, destination.x, enter);
        const y = mix(SCENE.center.y, destination.y, enter) - pulse * CARDS.pulseLift;
        const scale = mix(CARDS.initialScale, 1, enter);
        card.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
        card.setAttribute('opacity', smooth(enter));
        halos[index].setAttribute('opacity', pulse * CARDS.haloOpacity);
        borders[index].setAttribute('stroke', pulse > .15 ? CARDS.activeBorder : CARDS.border);
        labels[index].setAttribute('fill', pulse > .15 ? CARDS.activeLabel : CARDS.label);
      });

      const drawn = staticFrame ? 1 : smooth(progress(elapsed, TIMING.pathEnter, TIMING.pathDraw));
      path.setAttribute('stroke-dasharray', '1');
      path.setAttribute('stroke-dashoffset', 1 - drawn);
      path.setAttribute('opacity', drawn);
      const travelling = !staticFrame && stage >= STAGE.flowing && phase < TIMING.signalTravel;
      const visibility = travelling ? Math.min(progress(phase, 0, TIMING.signalFade), progress(TIMING.signalTravel - phase, 0, TIMING.signalFade)) : 0;
      signal.setAttribute('opacity', visibility);
      wake.setAttribute('opacity', visibility * FLOW.wakeOpacity);
      if (travelling) {
        if (pathLength === null) pathLength = path.getTotalLength();
        const fraction = phase / TIMING.signalTravel;
        const point = path.getPointAtLength(pathLength * fraction);
        signal.setAttribute('transform', `translate(${point.x} ${point.y})`);
        wake.setAttribute('stroke-dasharray', `${FLOW.wakeLength} ${1 + FLOW.wakeLength}`);
        wake.setAttribute('stroke-dashoffset', -Math.max(0, fraction - FLOW.wakeLength));
      }
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v3 = Object.freeze({ create });
})();
