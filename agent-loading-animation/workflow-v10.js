/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V10 / SPARKLING FLOW
 *
 *    0ms   a three-sparkle cluster settles and gently twinkles at the center
 *  100ms   five concentric broken rings draw in (120ms stagger)
 *  260ms   bare icons and their labels settle into the ring gaps
 * 1700ms   one luminous dot begins the outer-to-inner sequence
 *          2000ms around each arc → 600ms gently through its icon gap
 *          icon + ring share the step color on icon contact
 *          a 480ms fade carries the signal to the next ring
 *          after all five rings, an 800ms quiet rest precedes the next loop
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    centerEnter:        0, // bare center sparkle cluster appears
    centerSettle:     700, // cluster settles without a backing shape
    ringsEnter:       100, // first ring starts drawing
    ringStagger:      120, // interval between ring entrances
    ringDraw:         950, // each near-complete arc draws in
    iconsEnter:       260, // labeled icons begin appearing in their gaps
    iconSettle:       620, // icon opacity and small settling motion
    loopStart:       1700, // the settled composition starts flowing
    orbitTravel:     2000, // visible arc travel on each ring
    gapTravel:        600, // slower crossing through the icon gap
    ringTransition:   480, // fade out → hidden transfer → fade in
    signalFade:       180, // start of the outermost ring fades in
    loopRest:         800, // fully neutral pause after the final ring
  };
  const STAGE = { entering: 0, rings: 1, icons: 2, flowing: 3 };
  const SCENE = {
    width: 600, height: 600,
    center: { x: 300, y: 280 },
    font: 'Inter, system-ui, sans-serif',
    centerColor: '#A39BCB', centerScale: .72,
  };
  const SPARKLES = {
    // Pointed, inward-curved four-point stars; all share the existing lavender.
    path: 'M0-1C.1-.3.3-.1 1 0 .3.1.1.3 0 1-.1.3-.3.1-1 0-.3-.1-.1-.3 0-1Z',
    duration: 4200,
    minScale: .96, maxScale: 1.04, minOpacity: .82,
    stars: [
      { x: 0, y: 8, radius: 14, phase: 0 },
      { x: 11, y: -12, radius: 9, phase: 1.4 },
      { x: -11, y: -7, radius: 6, phase: 2.8 },
    ],
  };
  const RINGS = {
    radii: [236, 192, 148, 104, 60],
    gapAngles: [-40, -145, 55, 150, -20],
    stroke: '#DADDE5', width: .8, activeWidth: 1,
    gapClearance: 4,
  };
  const NODES = {
    iconSize: 24, color: '#000000',
    labelY: 29, labelSize: 11.5, labelColor: '#747988',
    enterScale: .90,
    maskPadding: 4,
    labelMaskWidth: 68, labelMaskTop: 17, labelMaskHeight: 17,
  };
  const SIGNAL = {
    radius: 2.9, color: '#9388D1',
    glowRadius: 8.5, glowBlur: 2.7, glowOpacity: .32,
    highlightRadius: .9,
    wakeLength: .055, wakeWidth: 1.2, wakeOpacity: .40,
  };

  // Authentic central icon system v1.35 vectors, unchanged native geometry.
  // Source node IDs and hashes: assets/v4-icons/manifest.json.
  const ICONS = Object.freeze({
    Trigger: { href: 'assets/v4-icons/sprite.svg#trigger', viewBox: '0 0 24 24' },
    Data: { href: 'assets/v4-icons/sprite.svg#data', viewBox: '0 0 24 24' },
    Analysis: { href: 'assets/v4-icons/sprite.svg#analysis', viewBox: '0 0 24 24' },
    Report: { href: 'assets/v4-icons/sprite.svg#report', viewBox: '0 0 24 24' },
    Email: { href: 'assets/v4-icons/sprite.svg#email', viewBox: '0 0 24 24' },
  });

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const clamp = value => Math.max(0, Math.min(1, value));
  const progress = (time, start, duration) => clamp((time - start) / duration);
  const smooth = value => value * value * (3 - 2 * value);
  const mix = (from, to, amount) => from + (to - from) * amount;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const pointAt = (radius, angle) => ({
    x: SCENE.center.x + radius * Math.cos(angle),
    y: SCENE.center.y + radius * Math.sin(angle),
  });
  const geometry = RINGS.radii.map((radius, index) => {
    const gapAngle = RINGS.gapAngles[index] * Math.PI / 180;
    // A conservative bounding circle clears every corner of the upright icon.
    // The label is separately removed from every ring by the shared mask.
    const iconHalfDiagonal = NODES.iconSize / Math.SQRT2;
    const gapHalfAngle = Math.asin((iconHalfDiagonal + RINGS.gapClearance) / radius);
    const startAngle = gapAngle + gapHalfAngle;
    const endAngle = gapAngle + TAU - gapHalfAngle;
    const start = pointAt(radius, startAngle);
    const end = pointAt(radius, endAngle);
    return {
      radius, gapAngle, gapHalfAngle, startAngle, endAngle,
      icon: pointAt(radius, gapAngle), start, end,
      path: `M${start.x} ${start.y} A${radius} ${radius} 0 1 1 ${end.x} ${end.y}`,
    };
  });

  // Signed distance to the icon bounds, excluding the label and signal glow.
  function iconDistance(point, icon, scale) {
    const dx = Math.abs(point.x - icon.x) / scale - NODES.iconSize / 2;
    const dy = Math.abs(point.y - icon.y) / scale - NODES.iconSize / 2;
    return (Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0)) * scale;
  }

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-concentric-v10`;
    const steps = items.slice(0, geometry.length);
    const ringDuration = TIMING.orbitTravel + TIMING.gapTravel + TIMING.ringTransition;
    const flowDuration = ringDuration * steps.length;
    const loopDuration = flowDuration + TIMING.loopRest;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-concentric build-concentric-v10');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const sparkleMarkup = SPARKLES.stars.map((star, index) => `<path data-v10-sparkle="${index}" d="${SPARKLES.path}" transform="translate(${star.x} ${star.y}) scale(${star.radius})" fill="${SCENE.centerColor}"/>`).join('');
    const ringMarkup = steps.map((_, index) => `<path data-v10-ring="${index}" d="${geometry[index].path}" pathLength="1" fill="none" stroke="${RINGS.stroke}" stroke-width="${RINGS.width}" stroke-linecap="round"/>`).join('');
    const wakeMarkup = steps.map((_, index) => `<path data-v10-wake="${index}" d="${geometry[index].path}" pathLength="1" fill="none" stroke="${SIGNAL.color}" stroke-width="${SIGNAL.wakeWidth}" stroke-linecap="round" opacity="0"/>`).join('');
    // Keep every ring lane clear of bare icons and their labels.
    const maskMarkup = steps.map((_, index) => {
      const point = geometry[index].icon;
      const pad = NODES.maskPadding;
      return `<g transform="translate(${point.x} ${point.y})"><rect x="${-NODES.iconSize / 2 - pad}" y="${-NODES.iconSize / 2 - pad}" width="${NODES.iconSize + pad * 2}" height="${NODES.iconSize + pad * 2}" rx="4" fill="#000000"/><rect x="${-NODES.labelMaskWidth / 2}" y="${NODES.labelMaskTop}" width="${NODES.labelMaskWidth}" height="${NODES.labelMaskHeight}" rx="4" fill="#000000"/></g>`;
    }).join('');
    const iconMarkup = steps.map((item, index) => {
      const icon = ICONS[item.name];
      const point = geometry[index].icon;
      return `<g data-v10-node="${index}" transform="translate(${point.x} ${point.y})">
        <svg data-v10-icon="${index}" x="${-NODES.iconSize / 2}" y="${-NODES.iconSize / 2}" width="${NODES.iconSize}" height="${NODES.iconSize}" viewBox="${escape(icon.viewBox)}" color="${NODES.color}" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="${escape(icon.href)}"/></svg>
        <text data-v10-label="${index}" x="0" y="${NODES.labelY}" text-anchor="middle" fill="${NODES.labelColor}" font-family="${SCENE.font}" font-size="${NODES.labelSize}" font-weight="500">${escape(item.name)}</text>
      </g>`;
    }).join('');

    svg.innerHTML = `<title id="${prefix}-title">A sparkling workflow through concentric rings</title>
      <desc id="${prefix}-description">A lavender cluster of three curved four-point sparkles gently twinkles at the center. Five nested circles contain bare labeled icons in their gaps. One signal visits Trigger, Data, Analysis, Report, and Email, coloring each icon and ring only while touching the icon.</desc>
      <defs>
        <filter id="${prefix}-signal-glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="${SIGNAL.glowBlur}"/></filter>
        <mask id="${prefix}-ring-clearance" maskUnits="userSpaceOnUse" x="0" y="0" width="${SCENE.width}" height="${SCENE.height}" style="mask-type:luminance"><rect width="${SCENE.width}" height="${SCENE.height}" fill="#FFFFFF"/>${maskMarkup}</mask>
      </defs>
      <g mask="url(#${prefix}-ring-clearance)">${ringMarkup}${wakeMarkup}</g>
      <g data-v10-center transform="translate(${SCENE.center.x} ${SCENE.center.y})">${sparkleMarkup}</g>
      <g data-v10-signal opacity="0" color="${SIGNAL.color}"><circle r="${SIGNAL.glowRadius}" fill="currentColor" opacity="${SIGNAL.glowOpacity}" filter="url(#${prefix}-signal-glow)"/><circle r="${SIGNAL.radius}" fill="currentColor"/><circle r="${SIGNAL.highlightRadius}" fill="#FFFFFF" opacity=".95"/></g>
      ${iconMarkup}`;

    const all = selector => [...svg.querySelectorAll(selector)];
    const rings = all('[data-v10-ring]');
    const wakes = all('[data-v10-wake]');
    const nodes = all('[data-v10-node]');
    const icons = all('[data-v10-icon]');
    const center = svg.querySelector('[data-v10-center]');
    const sparkles = all('[data-v10-sparkle]');
    const signal = svg.querySelector('[data-v10-signal]');

    function render(time, staticFrame = false) {
      const numericTime = Number(time);
      const elapsed = Number.isFinite(numericTime) ? Math.max(0, numericTime) : 0;
      const stage = staticFrame || elapsed >= TIMING.loopStart ? STAGE.flowing : elapsed >= TIMING.iconsEnter ? STAGE.icons : elapsed >= TIMING.ringsEnter ? STAGE.rings : STAGE.entering;
      const flowing = !staticFrame && stage >= STAGE.flowing;
      const phase = flowing ? (elapsed - TIMING.loopStart) % loopDuration : 0;
      const resting = phase >= flowDuration;
      const index = Math.min(steps.length - 1, Math.floor(phase / ringDuration));
      const local = phase - index * ringDuration;
      let point = null;
      let visibility = 0;
      let wakeFraction = null;

      if (flowing && !resting && steps.length) {
        const ring = geometry[index];
        if (local < TIMING.orbitTravel) {
          wakeFraction = smooth(progress(local, 0, TIMING.orbitTravel));
          point = pointAt(ring.radius, mix(ring.startAngle, ring.endAngle, wakeFraction));
          visibility = index === 0 ? progress(local, 0, TIMING.signalFade) : 1;
        } else if (local < TIMING.orbitTravel + TIMING.gapTravel) {
          const throughGap = smooth(progress(local, TIMING.orbitTravel, TIMING.gapTravel));
          point = pointAt(ring.radius, mix(ring.endAngle, ring.startAngle + TAU, throughGap));
          visibility = 1;
        } else {
          const transfer = progress(local, TIMING.orbitTravel + TIMING.gapTravel, TIMING.ringTransition);
          const nextIndex = index + 1;
          if (transfer < 1 / 3) {
            point = ring.start;
            visibility = 1 - smooth(transfer * 3);
          } else if (nextIndex < steps.length && transfer >= 2 / 3) {
            point = geometry[nextIndex].start;
            visibility = smooth((transfer - 2 / 3) * 3);
          }
        }
      }

      svg.dataset.stage = String(stage);
      const centerEnter = staticFrame ? 1 : smooth(progress(elapsed, TIMING.centerEnter, TIMING.centerSettle));
      center.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y}) scale(${mix(SCENE.centerScale, 1, centerEnter)})`);
      center.setAttribute('opacity', centerEnter);
      sparkles.forEach((sparkle, sparkleIndex) => {
        const star = SPARKLES.stars[sparkleIndex];
        const twinkle = (Math.sin(elapsed / SPARKLES.duration * TAU - star.phase) + 1) / 2;
        const scale = staticFrame ? 1 : mix(SPARKLES.minScale, SPARKLES.maxScale, twinkle);
        sparkle.setAttribute('transform', `translate(${star.x} ${star.y}) scale(${star.radius * scale})`);
        sparkle.setAttribute('opacity', staticFrame ? 1 : mix(SPARKLES.minOpacity, 1, twinkle));
      });
      let contactIndex = -1;

      steps.forEach((item, ringIndex) => {
        const ring = geometry[ringIndex];
        const drawn = staticFrame ? 1 : smooth(progress(elapsed, TIMING.ringsEnter + ringIndex * TIMING.ringStagger, TIMING.ringDraw));
        const appeared = staticFrame ? 1 : smooth(progress(elapsed, TIMING.iconsEnter + ringIndex * TIMING.ringStagger, TIMING.iconSettle));
        const scale = mix(NODES.enterScale, 1, appeared);
        const touching = point !== null && visibility > 0 && iconDistance(point, ring.icon, scale) <= SIGNAL.radius;
        if (touching) contactIndex = ringIndex;
        icons[ringIndex].setAttribute('color', touching ? item.color : NODES.color);
        nodes[ringIndex].setAttribute('transform', `translate(${ring.icon.x} ${ring.icon.y}) scale(${scale})`);
        nodes[ringIndex].setAttribute('opacity', appeared);
        nodes[ringIndex].dataset.contact = String(touching);
        rings[ringIndex].setAttribute('stroke', touching ? item.color : RINGS.stroke);
        rings[ringIndex].setAttribute('stroke-width', touching ? RINGS.activeWidth : RINGS.width);
        rings[ringIndex].setAttribute('stroke-dasharray', '1');
        rings[ringIndex].setAttribute('stroke-dashoffset', 1 - drawn);
        rings[ringIndex].setAttribute('opacity', drawn);
        const wakeVisible = point !== null && visibility > 0 && ringIndex === index && wakeFraction !== null;
        wakes[ringIndex].setAttribute('opacity', wakeVisible ? visibility * SIGNAL.wakeOpacity : 0);
        if (wakeVisible) {
          const length = Math.min(SIGNAL.wakeLength, wakeFraction);
          wakes[ringIndex].setAttribute('stroke-dasharray', `${length} ${1 + SIGNAL.wakeLength}`);
          wakes[ringIndex].setAttribute('stroke-dashoffset', -(wakeFraction - length));
        }
      });

      signal.setAttribute('opacity', visibility);
      signal.setAttribute('color', contactIndex >= 0 ? steps[contactIndex].color : SIGNAL.color);
      if (point !== null) signal.setAttribute('transform', `translate(${point.x} ${point.y})`);
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v10 = Object.freeze({ create });
})();
