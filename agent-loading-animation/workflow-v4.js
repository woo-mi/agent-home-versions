/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V4 / CONTACT CONSTELLATION
 *
 *    0ms   the gradient WisdomAI logo appears in a quiet aurora
 *  180ms   five upright cards assemble from the center (150ms stagger)
 *  600ms   one continuous workflow connection draws around the nucleus
 * 1700ms   assembly resolves into a calm 7400ms breathing loop
 *          a luminous signal visits Trigger → Data → Analysis → Report → Email
 *          icons stay black until the visible dot touches their rounded card
 *          contact reveals the filled colored icon; it returns to a black outline as the dot leaves
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
    iconSize: 24, idleIcon: '#000000',
    labelY: 50, labelSize: 11.5,
    initialScale: .70, pulseLift: 2.3, contactDepth: 18,
    shadowOffset: 5, shadowBlur: 7,
    border: '#E2E4EE', activeBorder: '#BBB8EC',
    label: '#747988', activeLabel: '#555464',
    haloRadius: 43, haloOpacity: .12, haloBlur: 9,
    positions: [
      { x: 140, y: 170 },
      { x: 225, y: 77 },
      { x: 375, y: 77 },
      { x: 460, y: 170 },
      { x: 300, y: 258 },
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
    enterScale: .62, breathScale: .025,
    logoSize: 42, offsetY: -20,
    logo: 'assets/wai-logo-symbol-gradient.png',
  };
  const AURORA = {
    width: 146, height: 80, blur: 23,
    violet: '#D5C9F1', cyan: '#C9EAF0', rose: '#F1D9E7',
    baseOpacity: .25, breatheOpacity: .07,
    horizontalDrift: 5, verticalDrift: 3,
  };

  // Original 24px outline and filled vectors from central icon system v1.35.
  // Provenance lives in assets/v4-icons and assets/v5-filled-icons.
  const ICONS = Object.freeze({
  "Trigger": {
    "href": "assets/v4-icons/sprite.svg#trigger",
    "filledHref": "assets/v5-filled-icons/sprite.svg?v=database-v2#trigger",
    "viewBox": "0 0 24 24",
    "nodeId": "6523:55358"
  },
  "Data": {
    "href": "assets/v4-icons/sprite.svg#data",
    "filledHref": "assets/v5-filled-icons/sprite.svg?v=database-v2#data",
    "viewBox": "0 0 24 24",
    "nodeId": "5592:54671"
  },
  "Analysis": {
    "href": "assets/v4-icons/sprite.svg#analysis",
    "filledHref": "assets/v5-filled-icons/sprite.svg?v=database-v2#analysis",
    "viewBox": "0 0 24 24",
    "nodeId": "5645:54428"
  },
  "Report": {
    "href": "assets/v4-icons/sprite.svg#report",
    "filledHref": "assets/v5-filled-icons/sprite.svg?v=database-v2#report",
    "viewBox": "0 0 24 24",
    "nodeId": "5640:60213"
  },
  "Email": {
    "href": "assets/v4-icons/sprite.svg#email",
    "filledHref": "assets/v5-filled-icons/sprite.svg?v=database-v2#email",
    "viewBox": "0 0 24 24",
    "nodeId": "5658:58223"
  }
});

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

  // Signed distance to the actual rounded rectangle, in scene coordinates.
  // A visible signal touches the card when this distance <= its solid radius.
  function roundedCardDistance(point, x, y, scale) {
    const radius = CARDS.radius;
    const dx = Math.abs(point.x - x) / scale - (CARDS.width / 2 - radius);
    const dy = Math.abs(point.y - y) / scale - (CARDS.height / 2 - radius);
    return (Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius) * scale;
  }

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-constellation-v4`;
    const steps = items.slice(0, CARDS.positions.length);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-constellation build-constellation-v4');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const cardMarkup = steps.map((item, index) => {
      const half = CARDS.width / 2;
      const icon = ICONS[item.name];
      return `<g data-v4-card="${index}">
        <circle data-v4-halo="${index}" r="${CARDS.haloRadius}" fill="${escape(item.color)}" opacity="0" filter="url(#${prefix}-soft)"/>
        <rect x="${-half}" y="${-half + CARDS.shadowOffset}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="${SCENE.shadowColor}" opacity=".085" filter="url(#${prefix}-shadow)"/>
        <rect data-v4-border="${index}" x="${-half}" y="${-half}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="#FFFFFF" stroke="${CARDS.border}" stroke-width="1"/>
        <svg data-v4-icon="${index}" x="${-CARDS.iconSize / 2}" y="${-CARDS.iconSize / 2}" width="${CARDS.iconSize}" height="${CARDS.iconSize}" viewBox="${escape(icon.viewBox || '0 0 24 24')}" color="${CARDS.idleIcon}" fill="currentColor" stroke="none" aria-hidden="true"><use data-v4-outline="${index}" href="${escape(icon.href)}"/><use data-v4-filled="${index}" href="${escape(icon.filledHref)}" opacity="0"/></svg>
        <text data-v4-label="${index}" x="0" y="${CARDS.labelY}" text-anchor="middle" fill="${CARDS.label}" font-family="${SCENE.font}" font-size="${CARDS.labelSize}" font-weight="500">${escape(item.name)}</text>
      </g>`;
    }).join('');

    svg.innerHTML = `<title id="${prefix}-title">An agent workflow taking shape</title>
      <desc id="${prefix}-description">Five upright cards form a constellation around the gradient WisdomAI logo. A soft signal follows Trigger, Data, Analysis, Report, and Email in order. Each black outline icon switches to a filled icon in its step color while the signal touches its card, then returns to a black outline.</desc>
      <defs>
        <filter id="${prefix}-shadow" x="-50%" y="-50%" width="200%" height="220%"><feGaussianBlur stdDeviation="${CARDS.shadowBlur}"/></filter>
        <filter id="${prefix}-soft" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="${CARDS.haloBlur}"/></filter>
        <filter id="${prefix}-aurora" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="${AURORA.blur}"/></filter>
        <filter id="${prefix}-signal" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${FLOW.glowBlur}"/></filter>
        <linearGradient id="${prefix}-wake" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#C7BDEA"/><stop offset="1" stop-color="${FLOW.signalColor}"/></linearGradient>
      </defs>
      <g data-v4-aurora filter="url(#${prefix}-aurora)">
        <ellipse cx="276" cy="160" rx="${AURORA.width / 2}" ry="${AURORA.height / 2}" fill="${AURORA.violet}"/>
        <ellipse cx="341" cy="152" rx="60" ry="32" fill="${AURORA.cyan}" opacity=".70"/>
        <ellipse cx="305" cy="201" rx="66" ry="25" fill="${AURORA.rose}" opacity=".64"/>
      </g>
      <g data-v4-scene>
        <path data-v4-path d="${FLOW.path}" pathLength="1" fill="none" stroke="${FLOW.stroke}" stroke-width="${FLOW.width}" stroke-linecap="round"/>
        <path data-v4-wake d="${FLOW.path}" pathLength="1" fill="none" stroke="url(#${prefix}-wake)" stroke-width="2" stroke-linecap="round" opacity="0"/>
        <g data-v4-nucleus transform="translate(${SCENE.center.x} ${SCENE.center.y + NUCLEUS.offsetY})">
          <image href="${NUCLEUS.logo}" x="${-NUCLEUS.logoSize / 2}" y="${-NUCLEUS.logoSize / 2}" width="${NUCLEUS.logoSize}" height="${NUCLEUS.logoSize}" preserveAspectRatio="xMidYMid meet"/>
        </g>
        <g data-v4-signal opacity="0"><circle r="${FLOW.glowRadius}" fill="${FLOW.glowColor}" opacity=".60" filter="url(#${prefix}-signal)"/><circle r="${FLOW.signalRadius}" fill="${FLOW.signalColor}"/><circle r=".9" fill="#FFFFFF" opacity=".95"/></g>
        ${cardMarkup}
      </g>`;

    const find = selector => svg.querySelector(selector);
    const all = selector => [...svg.querySelectorAll(selector)];
    const scene = find('[data-v4-scene]');
    const aurora = find('[data-v4-aurora]');
    const nucleus = find('[data-v4-nucleus]');
    const path = find('[data-v4-path]');
    const wake = find('[data-v4-wake]');
    const signal = find('[data-v4-signal]');
    const cards = all('[data-v4-card]');
    const halos = all('[data-v4-halo]');
    const borders = all('[data-v4-border]');
    const labels = all('[data-v4-label]');
    const icons = all('[data-v4-icon]');
    const outlineIcons = all('[data-v4-outline]');
    const filledIcons = all('[data-v4-filled]');
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
      nucleus.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y + NUCLEUS.offsetY}) scale(${coreScale})`);
      nucleus.setAttribute('opacity', coreEnter);
      aurora.setAttribute('opacity', coreEnter * (AURORA.baseOpacity + wave * AURORA.breatheOpacity));
      aurora.setAttribute('transform', `translate(${wave * AURORA.horizontalDrift} ${wave * AURORA.verticalDrift})`);

      const travelling = !staticFrame && stage >= STAGE.flowing && phase < TIMING.signalTravel;
      const visibility = travelling ? Math.min(progress(phase, 0, TIMING.signalFade), progress(TIMING.signalTravel - phase, 0, TIMING.signalFade)) : 0;
      const fraction = travelling ? phase / TIMING.signalTravel : 0;
      let point = null;
      if (travelling) {
        if (pathLength === null) pathLength = path.getTotalLength();
        point = path.getPointAtLength(pathLength * fraction);
      }

      cards.forEach((card, index) => {
        const enter = staticFrame ? 1 : spring(progress(elapsed, TIMING.cardsEnter + index * TIMING.cardStagger, TIMING.cardSettle));
        const destination = CARDS.positions[index];
        const x = mix(SCENE.center.x, destination.x, enter);
        const restingY = mix(SCENE.center.y, destination.y, enter);
        const scale = mix(CARDS.initialScale, 1, enter);
        const visiblePoint = point !== null && visibility > 0;
        const distance = visiblePoint ? roundedCardDistance(point, x, restingY, scale) : Infinity;
        const pulse = smooth(clamp((FLOW.signalRadius - distance) / CARDS.contactDepth));
        const y = restingY - pulse * CARDS.pulseLift;
        const touching = visiblePoint && roundedCardDistance(point, x, y, scale) <= FLOW.signalRadius;
        icons[index].setAttribute('color', touching ? steps[index].color : CARDS.idleIcon);
        outlineIcons[index].setAttribute('opacity', touching ? '0' : '1');
        filledIcons[index].setAttribute('opacity', touching ? '1' : '0');
        card.dataset.contact = String(touching);
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
      signal.setAttribute('opacity', visibility);
      wake.setAttribute('opacity', visibility * FLOW.wakeOpacity);
      if (point !== null) {
        signal.setAttribute('transform', `translate(${point.x} ${point.y})`);
        wake.setAttribute('stroke-dasharray', `${FLOW.wakeLength} ${1 + FLOW.wakeLength}`);
        wake.setAttribute('stroke-dashoffset', -Math.max(0, fraction - FLOW.wakeLength));
      }
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v4 = Object.freeze({ create });
})();
