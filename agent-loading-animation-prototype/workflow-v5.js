/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V5 / EXPANDED ORBIT
 *
 *    0ms   a small agent nucleus appears in a quiet aurora
 *  180ms   five upright cards assemble from the center (150ms stagger)
 *  600ms   a soft purple closed oval draws around the gradient WisdomAI logo
 * 1700ms   assembly resolves; a luminous dot makes a 7400ms full orbit
 *          a quiet 1200ms rest follows before the next circuit
 *          a luminous signal visits Trigger → Data → Analysis → Report → Email
 *          icons rest as black outlines inside white circular cards
 *          touching the signal reveals the filled icon and matching color border
 *          the enlarged card gives a subtle lift, scale, and restrained halo
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
    loopDuration:    8600, // full orbit plus a 1200ms quiet rest
    signalTravel:    7400, // one complete closed circuit around the ellipse
    signalFade:       300, // signal fades softly at the start and finish
  };

  const STAGE = { nucleus: 0, assembly: 1, connection: 2, flowing: 3 };
  const SCENE = {
    width: 600, height: 430,
    center: { x: 300, y: 200 },
    enterScale: .72,
    springFrequency: 7,
    floatAmplitude: 1.6,
    shadowColor: 'var(--workflow-shadow, #8F91B6)',
    font: 'Inter, system-ui, sans-serif',
  };
  const ORBIT = {
    radiusX: 210, radiusY: 138,
    cardAngles: [180, 240, 300, 360, 450], // clockwise: left → top → right → bottom
  };
  const CARDS = {
    width: 64, height: 64, radius: 32,
    iconSize: 24, iconY: -6, idleIcon: 'var(--workflow-icon, #000000)',
    labelY: 19, labelSize: 11.5,
    initialScale: .70, pulseLift: 2.1, pulseScale: .018, contactDepth: 24,
    shadowOffset: 5, shadowBlur: 7, shadowOpacity: .070,
    nearShadowOffset: 2, nearShadowBlur: 2.5, nearShadowOpacity: .045,
    border: 'var(--workflow-border, #E2E4EE)', borderWidth: 1, activeBorderWidth: 1.3,
    label: 'var(--workflow-label, #747988)', activeLabel: 'var(--workflow-active-label, #555464)',
    haloRadius: 43, haloOpacity: .095, haloBlur: 9,
    positions: ORBIT.cardAngles.map(angle => ({
      x: SCENE.center.x + ORBIT.radiusX * Math.cos(angle * Math.PI / 180),
      y: SCENE.center.y + ORBIT.radiusY * Math.sin(angle * Math.PI / 180),
    })),
  };
  const FLOW = {
    path: `M${SCENE.center.x - ORBIT.radiusX} ${SCENE.center.y} A${ORBIT.radiusX} ${ORBIT.radiusY} 0 1 1 ${SCENE.center.x + ORBIT.radiusX} ${SCENE.center.y} A${ORBIT.radiusX} ${ORBIT.radiusY} 0 1 1 ${SCENE.center.x - ORBIT.radiusX} ${SCENE.center.y} Z`,
    stroke: 'var(--workflow-track, #DDDCEB)', width: 1.25,
    signalColor: 'var(--workflow-signal, #8B80DB)', signalRadius: 3.2,
    glowColor: 'var(--workflow-glow, #B8ABEF)', glowRadius: 12, glowBlur: 3.8, glowOpacity: .60,
    wakeColor: 'var(--workflow-wake, #C7BDEA)',
    highlightRadius: 1.1, wakeWidth: 2.2, wakeLength: .060, wakeOpacity: .64,
  };
  const NUCLEUS = {
    enterScale: .62, breathScale: .025,
    logoSize: 60,
    logo: 'assets/wai-logo-symbol-gradient.png',
  };
  const AURORA = {
    width: 196, height: 112, blur: 29,
    violet: 'var(--workflow-aurora-violet, #D5C9F1)', cyan: 'var(--workflow-aurora-cyan, #C9EAF0)', rose: 'var(--workflow-aurora-rose, #F1D9E7)',
    baseOpacity: .25, breatheOpacity: .07,
    horizontalDrift: 5, verticalDrift: 3,
  };

  // Original 24px outline and filled vectors from central icon system v1.35.
  // Provenance lives in assets/v4-icons, v5-outline-icons, and v5-filled-icons.
  const ICONS = Object.freeze({
  "Trigger": {
    "href": "assets/v5-filled-icons/sprite.svg?v=database-v2#trigger",
    "outlineHref": "assets/v5-outline-icons/sprite.svg#trigger",
    "viewBox": "0 0 24 24",
    "nodeId": "6523:55361"
  },
  "Data": {
    "href": "assets/v5-filled-icons/sprite.svg?v=database-v2#data",
    "outlineHref": "assets/v4-icons/sprite.svg#data",
    "viewBox": "0 0 24 24",
    "nodeId": "5595:55270"
  },
  "Analysis": {
    "href": "assets/v5-filled-icons/sprite.svg?v=database-v2#analysis",
    "outlineHref": "assets/v5-outline-icons/sprite.svg#analysis",
    "viewBox": "0 0 24 24",
    "nodeId": "5645:54431"
  },
  "Report": {
    "href": "assets/v5-filled-icons/sprite.svg?v=database-v2#report",
    "outlineHref": "assets/v5-outline-icons/sprite.svg#report",
    "viewBox": "0 0 24 24",
    "nodeId": "5640:60215"
  },
  "Email": {
    "href": "assets/v5-filled-icons/sprite.svg?v=database-v2#email",
    "outlineHref": "assets/v5-outline-icons/sprite.svg#email",
    "viewBox": "0 0 24 24",
    "nodeId": "5658:58225"
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

  // Signed distance to the rendered card, including its circular corner radius.
  // A visible signal touches the card when this distance <= its solid radius.
  function roundedCardDistance(point, x, y, scale) {
    const radius = CARDS.radius;
    const dx = Math.abs(point.x - x) / scale - (CARDS.width / 2 - radius);
    const dy = Math.abs(point.y - y) / scale - (CARDS.height / 2 - radius);
    return (Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius) * scale;
  }

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-constellation-v5`;
    const steps = items.slice(0, CARDS.positions.length);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-constellation build-constellation-v5');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const cardMarkup = steps.map((item, index) => {
      const half = CARDS.width / 2;
      const icon = ICONS[item.name];
      return `<g data-v5-card="${index}">
        <circle data-v5-halo="${index}" r="${CARDS.haloRadius}" fill="${escape(item.color)}" opacity="0" filter="url(#${prefix}-soft)"/>
        <rect x="${-half}" y="${-half + CARDS.shadowOffset}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="${SCENE.shadowColor}" opacity="${CARDS.shadowOpacity}" filter="url(#${prefix}-shadow)"/>
        <rect x="${-half}" y="${-half + CARDS.nearShadowOffset}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="${SCENE.shadowColor}" opacity="${CARDS.nearShadowOpacity}" filter="url(#${prefix}-near-shadow)"/>
        <rect data-v5-border="${index}" x="${-half}" y="${-half}" width="${CARDS.width}" height="${CARDS.height}" rx="${CARDS.radius}" fill="var(--workflow-card-fill, #FFFFFF)" stroke="${CARDS.border}" stroke-width="${CARDS.borderWidth}"/>
        <svg data-v5-icon="${index}" x="${-CARDS.iconSize / 2}" y="${CARDS.iconY - CARDS.iconSize / 2}" width="${CARDS.iconSize}" height="${CARDS.iconSize}" viewBox="${escape(icon.viewBox || '0 0 24 24')}" color="${CARDS.idleIcon}" fill="currentColor" stroke="none" aria-hidden="true"><use data-v5-outline="${index}" href="${escape(icon.outlineHref)}"/><use data-v5-filled="${index}" href="${escape(icon.href)}" opacity="0"/></svg>
        <text data-v5-label="${index}" x="0" y="${CARDS.labelY}" text-anchor="middle" fill="${CARDS.label}" font-family="${SCENE.font}" font-size="${CARDS.labelSize}" font-weight="500">${escape(item.name)}</text>
      </g>`;
    }).join('');

    svg.innerHTML = `<title id="${prefix}-title">An agent workflow in orbit</title>
      <desc id="${prefix}-description">Five circles with outline icons and labels sit on a soft purple closed oval around the gradient WisdomAI logo. A glowing purple signal visits Trigger, Data, Analysis, Report, and Email before returning. Only while the signal touches a circle, its icon becomes filled and colored and the circle border matches. It returns to an outline after contact.</desc>
      <defs>
        <filter id="${prefix}-shadow" x="-50%" y="-50%" width="200%" height="220%"><feGaussianBlur stdDeviation="${CARDS.shadowBlur}"/></filter>
        <filter id="${prefix}-near-shadow" x="-25%" y="-25%" width="150%" height="160%"><feGaussianBlur stdDeviation="${CARDS.nearShadowBlur}"/></filter>
        <filter id="${prefix}-soft" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="${CARDS.haloBlur}"/></filter>
        <filter id="${prefix}-aurora" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="${AURORA.blur}"/></filter>
        <filter id="${prefix}-signal" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${FLOW.glowBlur}"/></filter>
        <linearGradient id="${prefix}-wake" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${FLOW.wakeColor}"/><stop offset="1" stop-color="${FLOW.signalColor}"/></linearGradient>
      </defs>
      <g data-v5-aurora filter="url(#${prefix}-aurora)">
        <ellipse cx="${SCENE.center.x - 24}" cy="${SCENE.center.y - 6}" rx="${AURORA.width / 2}" ry="${AURORA.height / 2}" fill="${AURORA.violet}"/>
        <ellipse cx="${SCENE.center.x + 48}" cy="${SCENE.center.y - 14}" rx="78" ry="44" fill="${AURORA.cyan}" opacity=".70"/>
        <ellipse cx="${SCENE.center.x + 5}" cy="${SCENE.center.y + 40}" rx="86" ry="32" fill="${AURORA.rose}" opacity=".64"/>
      </g>
      <g data-v5-scene>
        <path data-v5-path d="${FLOW.path}" pathLength="1" fill="none" stroke="${FLOW.stroke}" stroke-width="${FLOW.width}" stroke-linecap="round"/>
        <path data-v5-wake d="${FLOW.path}" pathLength="1" fill="none" stroke="url(#${prefix}-wake)" stroke-width="${FLOW.wakeWidth}" stroke-linecap="round" opacity="0"/>
        <g data-v5-nucleus transform="translate(${SCENE.center.x} ${SCENE.center.y})">
          <image href="${NUCLEUS.logo}" x="${-NUCLEUS.logoSize / 2}" y="${-NUCLEUS.logoSize / 2}" width="${NUCLEUS.logoSize}" height="${NUCLEUS.logoSize}" preserveAspectRatio="xMidYMid meet"/>
        </g>
        <g data-v5-signal opacity="0"><circle r="${FLOW.glowRadius}" fill="${FLOW.glowColor}" opacity="${FLOW.glowOpacity}" filter="url(#${prefix}-signal)"/><circle r="${FLOW.signalRadius}" fill="${FLOW.signalColor}"/><circle r="${FLOW.highlightRadius}" fill="#FFFFFF" opacity=".95"/></g>
        ${cardMarkup}
      </g>`;

    const find = selector => svg.querySelector(selector);
    const all = selector => [...svg.querySelectorAll(selector)];
    const scene = find('[data-v5-scene]');
    const aurora = find('[data-v5-aurora]');
    const nucleus = find('[data-v5-nucleus]');
    const path = find('[data-v5-path]');
    const wake = find('[data-v5-wake]');
    const signal = find('[data-v5-signal]');
    const cards = all('[data-v5-card]');
    const halos = all('[data-v5-halo]');
    const borders = all('[data-v5-border]');
    const labels = all('[data-v5-label]');
    const icons = all('[data-v5-icon]');
    const outlineIcons = all('[data-v5-outline]');
    const filledIcons = all('[data-v5-filled]');
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
        const restingScale = mix(CARDS.initialScale, 1, enter);
        const visiblePoint = point !== null && visibility > 0;
        const distance = visiblePoint ? roundedCardDistance(point, x, restingY, restingScale) : Infinity;
        const pulse = smooth(clamp((FLOW.signalRadius - distance) / CARDS.contactDepth));
        const y = restingY - pulse * CARDS.pulseLift;
        const scale = restingScale * (1 + pulse * CARDS.pulseScale);
        const touching = visiblePoint && roundedCardDistance(point, x, y, scale) <= FLOW.signalRadius;
        const activeColor = steps[index].color;
        icons[index].setAttribute('color', touching ? activeColor : CARDS.idleIcon);
        outlineIcons[index].setAttribute('opacity', touching ? '0' : '1');
        filledIcons[index].setAttribute('opacity', touching ? '1' : '0');
        card.dataset.contact = String(touching);
        card.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
        card.setAttribute('opacity', smooth(enter));
        halos[index].setAttribute('opacity', pulse * CARDS.haloOpacity);
        borders[index].setAttribute('stroke', touching ? activeColor : CARDS.border);
        borders[index].setAttribute('stroke-width', touching ? CARDS.activeBorderWidth : CARDS.borderWidth);
        labels[index].setAttribute('fill', touching ? CARDS.activeLabel : CARDS.label);
      });

      const drawn = staticFrame ? 1 : smooth(progress(elapsed, TIMING.pathEnter, TIMING.pathDraw));
      path.setAttribute('stroke-dasharray', '1');
      path.setAttribute('stroke-dashoffset', 1 - drawn);
      path.setAttribute('opacity', drawn);
      signal.setAttribute('opacity', visibility);
      wake.setAttribute('opacity', visibility * FLOW.wakeOpacity);
      if (point !== null) {
        signal.setAttribute('transform', `translate(${point.x} ${point.y})`);
        wake.setAttribute('stroke-dasharray', `${FLOW.wakeLength} ${1 - FLOW.wakeLength}`);
        wake.setAttribute('stroke-dashoffset', -(fraction - FLOW.wakeLength));
      }
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v5 = Object.freeze({ create });
})();
