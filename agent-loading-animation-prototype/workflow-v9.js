/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V9 / AURORA GLOW
 *
 *    0ms   diffuse cyan, blue, and violet light softly appears
 *          a precise, flat light disc always masks the center of the glow
 *  650ms   one large workflow icon enters its steady center
 * 1400ms   the disc is settled; only the soft aura keeps moving
 *          slow plume breathing and a restrained swaying light field
 *          every 2600ms: one icon fades out before the next appears
 *          Trigger → Data → Analysis → Report → Email
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    auraEnter:          0, // diffuse light first appears
    auraSettle:      1400, // the full glow reaches its resting intensity
    lightSway:      22000, // slow angular movement of the light field
    auraBreath:      7600, // gentle breathing of the diffuse envelope
    plumeBreath:    11200, // individual plumes evolve at their own phase
    iconEnter:        650, // first centered workflow icon appears
    iconStep:        2600, // one centered icon per chapter
    iconFadeIn:       300, // gentle icon entrance
    iconFadeOut:      300, // complete exit before the following icon
    accentStart:      820, // optional brief step-color accent
    accentDuration:   520, // accent returns to black
  };
  const STAGE = { aura: 0, icon: 1, settled: 2 };
  const SCENE = {
    width: 600, height: 480,
    center: { x: 300, y: 244 },
    font: 'Inter, system-ui, sans-serif',
  };
  const DISC = {
    radius: 145,
    fill: '#FAFCFC',
  };
  const AURA = {
    baseRadius: 156, baseBlur: 18, baseOpacity: .69,
    plumeBlur: 12,
    swayDegrees: 11, breathScale: .021,
    plumeScale: .045, plumeDrift: 3.5,
    cyan: '#1ADDD7', blue: '#226BFA', violet: '#7650DF',
    plumes: [
      { name: 'Upper-left cyan', x: -70, y: -105, rx: 63, ry: 70, color: '#13D7DB', opacity: .87, phase: 0 },
      { name: 'Upper cyan mist', x: -15, y: -145, rx: 55, ry: 38, color: '#3DE0D9', opacity: .74, phase: .8 },
      { name: 'Upper-right blue', x: 70, y: -110, rx: 67, ry: 64, color: '#1769F6', opacity: .93, phase: 1.6 },
      { name: 'Right violet', x: 128, y: 4, rx: 50, ry: 75, color: '#6250E8', opacity: .72, phase: 2.4 },
      { name: 'Lower violet', x: 12, y: 125, rx: 84, ry: 42, color: '#7954DE', opacity: .74, phase: 3.2 },
    ],
  };
  const ICON = {
    size: 54, yOffset: -10,
    idleColor: '#000000', enterScale: .94, leaveScale: .975,
    accentStrength: 0,
  };
  const LABEL = { y: 59, fontSize: 13.5, color: '#767986' };

  // Genuine central icon system v1.35 outlines; native vectors stay unchanged.
  // Source attribution, hashes, and node IDs: assets/v4-icons/manifest.json.
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
  const rgb = hex => {
    const raw = hex.replace('#', '');
    const value = raw.length === 3 ? [...raw].map(char => char + char).join('') : raw;
    return [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  };
  const blend = (first, second, amount) => {
    const a = rgb(first), b = rgb(second);
    return `#${a.map((value, index) => Math.round(mix(value, b[index], clamp(amount))).toString(16).padStart(2, '0')).join('')}`;
  };

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-aurora-v9`;
    const steps = items.slice(0, 5);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-aurora build-aurora-v9');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const plumeGradients = AURA.plumes.map((plume, index) => `<radialGradient id="${prefix}-plume-${index}"><stop offset="0" stop-color="${plume.color}" stop-opacity="1"/><stop offset=".48" stop-color="${plume.color}" stop-opacity=".8"/><stop offset="1" stop-color="${plume.color}" stop-opacity="0"/></radialGradient>`).join('');
    const plumeMarkup = AURA.plumes.map((plume, index) => `<ellipse data-v9-plume="${index}" cx="${plume.x}" cy="${plume.y}" rx="${plume.rx}" ry="${plume.ry}" fill="url(#${prefix}-plume-${index})" opacity="${plume.opacity}"/>`).join('');
    const stepMarkup = steps.map((item, index) => {
      const icon = ICONS[item.name];
      return `<g data-v9-step="${index}" opacity="0" transform="translate(${SCENE.center.x} ${SCENE.center.y + ICON.yOffset})">
        <svg data-v9-icon="${index}" x="${-ICON.size / 2}" y="${-ICON.size / 2}" width="${ICON.size}" height="${ICON.size}" viewBox="${escape(icon.viewBox)}" color="${ICON.idleColor}" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="${escape(icon.href)}"/></svg>
        <text x="0" y="${LABEL.y}" text-anchor="middle" font-family="${SCENE.font}" font-size="${LABEL.fontSize}" font-weight="500" fill="${LABEL.color}">${escape(item.name)}</text>
      </g>`;
    }).join('');

    svg.innerHTML = `<title id="${prefix}-title">Aurora agent workflow</title>
      <desc id="${prefix}-description">A precise light disc floats in a soft cyan, blue, and violet aura. Large Trigger, Data, Analysis, Report, and Email icons appear one at a time in its steady center.</desc>
      <defs>
        <linearGradient id="${prefix}-base" x1="18%" y1="0%" x2="78%" y2="100%"><stop offset="0" stop-color="${AURA.cyan}"/><stop offset=".45" stop-color="${AURA.blue}"/><stop offset="1" stop-color="${AURA.violet}"/></linearGradient>
        ${plumeGradients}
        <filter id="${prefix}-base-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${AURA.baseBlur}"/></filter>
        <filter id="${prefix}-plume-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${AURA.plumeBlur}"/></filter>
      </defs>
      <g data-v9-aura transform="translate(${SCENE.center.x} ${SCENE.center.y})">
        <g data-v9-light>
          <circle r="${AURA.baseRadius}" fill="url(#${prefix}-base)" opacity="${AURA.baseOpacity}" filter="url(#${prefix}-base-blur)"/>
          <g filter="url(#${prefix}-plume-blur)">${plumeMarkup}</g>
        </g>
      </g>
      <circle data-v9-disc cx="${SCENE.center.x}" cy="${SCENE.center.y}" r="${DISC.radius}" fill="${DISC.fill}"/>
      ${stepMarkup}`;

    const aura = svg.querySelector('[data-v9-aura]');
    const light = svg.querySelector('[data-v9-light]');
    const disc = svg.querySelector('[data-v9-disc]');
    const plumes = [...svg.querySelectorAll('[data-v9-plume]')];
    const chapters = [...svg.querySelectorAll('[data-v9-step]')];
    const icons = [...svg.querySelectorAll('[data-v9-icon]')];

    function render(time, staticFrame = false) {
      const numeric = Number(time);
      const elapsed = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
      const entered = staticFrame ? 1 : smooth(progress(elapsed, TIMING.auraEnter, TIMING.auraSettle));
      const breath = staticFrame ? 0 : Math.sin(elapsed / TIMING.auraBreath * TAU);
      const rotation = staticFrame ? 0 : Math.sin(elapsed / TIMING.lightSway * TAU) * AURA.swayDegrees;
      aura.setAttribute('opacity', entered);
      aura.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y}) scale(${1 + breath * AURA.breathScale})`);
      light.setAttribute('transform', `rotate(${rotation})`);
      disc.setAttribute('opacity', 1);
      plumes.forEach((plume, index) => {
        const config = AURA.plumes[index];
        const wave = staticFrame ? 0 : Math.sin(elapsed / TIMING.plumeBreath * TAU + config.phase);
        plume.setAttribute('cx', config.x + wave * AURA.plumeDrift);
        plume.setAttribute('cy', config.y - wave * AURA.plumeDrift);
        plume.setAttribute('rx', config.rx * (1 + wave * AURA.plumeScale));
        plume.setAttribute('ry', config.ry * (1 - wave * AURA.plumeScale));
      });
      svg.dataset.stage = String(staticFrame || elapsed >= TIMING.auraSettle ? STAGE.settled : elapsed >= TIMING.iconEnter ? STAGE.icon : STAGE.aura);

      const sequence = Math.max(0, elapsed - TIMING.iconEnter);
      const activeIndex = staticFrame || !steps.length ? 0 : Math.floor(sequence / TIMING.iconStep) % steps.length;
      const chapterTime = staticFrame ? TIMING.iconFadeIn : sequence % TIMING.iconStep;
      const fadeIn = staticFrame ? 1 : smooth(progress(chapterTime, 0, TIMING.iconFadeIn));
      const fadeOut = staticFrame ? 1 : smooth(progress(TIMING.iconStep - chapterTime, 0, TIMING.iconFadeOut));
      const visible = staticFrame ? 1 : elapsed >= TIMING.iconEnter ? Math.min(fadeIn, fadeOut) : 0;
      const iconScale = mix(ICON.enterScale, 1, fadeIn) * mix(ICON.leaveScale, 1, fadeOut);
      const accentPhase = progress(chapterTime, TIMING.accentStart, TIMING.accentDuration);
      const accent = staticFrame ? 0 : Math.pow(Math.sin(accentPhase * Math.PI), 2) * ICON.accentStrength;
      chapters.forEach((chapter, index) => {
        const active = index === activeIndex;
        chapter.setAttribute('opacity', active ? visible : 0);
        chapter.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y + ICON.yOffset}) scale(${active ? iconScale : 1})`);
        chapter.dataset.active = String(active && visible > 0);
        icons[index].setAttribute('color', active ? blend(ICON.idleColor, steps[index].color, accent) : ICON.idleColor);
      });
      svg.dataset.activeStep = steps[activeIndex]?.name || '';
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v9 = Object.freeze({ create });
})();
