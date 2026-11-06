/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V7 / PRISMATIC PULSE
 *
 *    0ms   a thin optical rim resolves from soft refracted light
 *  650ms   Trigger appears, upright and large in the open center
 * 1400ms   the rim is settled; prismatic energy keeps rotating slowly
 *          every 2600ms: one icon fades out, then the next fades in
 *          Trigger → Data → Analysis → Report → Email
 *          a brief step-colored accent returns gently to black
 *          the rim breathes quietly without a spinner-like leading edge
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    rimEnter:          0, // prismatic edge first appears
    rimSettle:      1400, // optical rim reaches its final size
    iconEnter:       650, // first centered icon begins its entrance
    iconStep:       2600, // duration of each single-icon chapter
    iconFadeIn:      300, // gentle fade and scale at the start
    iconFadeOut:     300, // complete fade before the next icon appears
    accentStart:     820, // a quiet corresponding step color appears
    accentDuration:  520, // colored accent returns to black
    energyLoop:    22000, // complete rotation of refracted energy
    breathLoop:     7200, // subtle whole-rim breathing cycle
  };
  const STAGE = { rim: 0, icon: 1, settled: 2 };
  const SCENE = {
    width: 600, height: 480,
    center: { x: 300, y: 218 },
    font: 'Inter, system-ui, sans-serif',
  };
  const RIM = {
    radius: 165, segments: 120,
    startAngle: -Math.PI / 2,
    segmentOverlap: .0025,
    enterScale: .93, breathScale: .010,
    darkColor: '#281C43', darkRadius: 167.8,
    darkWidth: 2.8, darkOpacity: .65,
    innerRadius: 163.2, innerWidth: 2.0,
    spectrumWidth: 4.2, spectrumOpacity: .98,
    outerRadius: 166.1, outerWidth: 2.3,
    glowWidth: 15, glowBlur: 7, glowOpacity: .65,
    hazeWidth: 17, hazeBlur: 17, hazeOpacity: .14,
    whiteRadius: 164.9, whiteWidth: 1.15,
    whiteColor: '#FFFFF4', whiteOpacity: .98,
    colors: [
      { at: 0, color: '#FFF079' },
      { at: .10, color: '#F5FFE0' },
      { at: .20, color: '#34E1FF' },
      { at: .28, color: '#00BFFF' },
      { at: .36, color: '#FFB24A' },
      { at: .43, color: '#FFE95A' },
      { at: .51, color: '#FFF6BB' },
      { at: .60, color: '#B4FFF3' },
      { at: .70, color: '#29D8FF' },
      { at: .77, color: '#5352D8' },
      { at: .84, color: '#B963DF' },
      { at: .92, color: '#FFD94A' },
      { at: 1, color: '#FFF079' },
    ],
  };
  const ICON = {
    size: 54, yOffset: -10,
    idleColor: '#000000', enterScale: .94, leaveScale: .975,
    accentStrength: .78,
  };
  const LABEL = { y: 59, fontSize: 13.5, color: '#767986' };

  // Original central icon system v1.35 geometry; no redrawn substitutes.
  // Source details and node IDs are preserved in assets/v4-icons/manifest.json.
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
    const value = hex.replace('#', '');
    const expanded = value.length === 3 ? [...value].map(char => char + char).join('') : value;
    return [0, 2, 4].map(offset => parseInt(expanded.slice(offset, offset + 2), 16));
  };
  const blend = (first, second, amount) => {
    const a = rgb(first), b = rgb(second);
    return `#${a.map((value, index) => Math.round(mix(value, b[index], clamp(amount))).toString(16).padStart(2, '0')).join('')}`;
  };
  function spectralColor(fraction) {
    const wrapped = ((fraction % 1) + 1) % 1;
    const upper = RIM.colors.findIndex(stop => stop.at >= wrapped);
    if (upper <= 0) return RIM.colors[0].color;
    const before = RIM.colors[upper - 1], after = RIM.colors[upper];
    return blend(before.color, after.color, (wrapped - before.at) / (after.at - before.at));
  }
  const intensity = fraction => {
    const angle = fraction * TAU;
    return .28 + .72 * Math.pow(.5 + .5 * Math.cos(angle * 2 - .4), 1.6);
  };

  // Short overlapping arcs approximate a continuous spectral rim without
  // foreignObject/conic-gradient dependencies or a uniform rainbow stroke.
  function opticalBand(radius, width, color, opacity) {
    return Array.from({ length: RIM.segments }, (_, index) => {
      const fraction = index / RIM.segments;
      const start = RIM.startAngle + fraction * TAU;
      const end = start + TAU / RIM.segments + RIM.segmentOverlap;
      const energy = intensity(fraction);
      const d = `M${radius * Math.cos(start)} ${radius * Math.sin(start)} A${radius} ${radius} 0 0 1 ${radius * Math.cos(end)} ${radius * Math.sin(end)}`;
      return `<path d="${d}" fill="none" stroke="${color(fraction, energy)}" stroke-width="${width(energy)}" opacity="${opacity(energy)}"/>`;
    }).join('');
  }

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-prismatic-v7`;
    const steps = items.slice(0, 5);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-prismatic build-prismatic-v7');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const spectrum = opticalBand(RIM.radius, energy => RIM.spectrumWidth * (.75 + energy * .6), fraction => spectralColor(fraction), energy => RIM.spectrumOpacity * (.72 + energy * .28));
    const glow = opticalBand(RIM.radius, energy => RIM.glowWidth * (.72 + energy * .65), fraction => spectralColor(fraction), energy => RIM.glowOpacity * energy);
    const haze = opticalBand(RIM.radius, () => RIM.hazeWidth, fraction => spectralColor(fraction), energy => RIM.hazeOpacity * energy);
    const darkEdge = opticalBand(RIM.darkRadius, energy => RIM.darkWidth * (1.3 - energy * .4), () => RIM.darkColor, energy => RIM.darkOpacity * (1 - energy * .70));
    const outerEdge = opticalBand(RIM.outerRadius, energy => RIM.outerWidth * (.65 + energy * .6), fraction => spectralColor(fraction + .07), energy => .40 + energy * .25);
    const innerEdge = opticalBand(RIM.innerRadius, energy => RIM.innerWidth * (.55 + energy * .5), fraction => spectralColor(fraction - .035), energy => .38 + energy * .22);
    const whiteEdge = opticalBand(RIM.whiteRadius, energy => RIM.whiteWidth * (.60 + energy * .95), () => RIM.whiteColor, energy => RIM.whiteOpacity * (.45 + energy * .55));
    const stepMarkup = steps.map((item, index) => {
      const icon = ICONS[item.name];
      return `<g data-v7-step="${index}" opacity="0" transform="translate(${SCENE.center.x} ${SCENE.center.y + ICON.yOffset})">
        <svg data-v7-icon="${index}" x="${-ICON.size / 2}" y="${-ICON.size / 2}" width="${ICON.size}" height="${ICON.size}" viewBox="${escape(icon.viewBox)}" color="${ICON.idleColor}" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="${escape(icon.href)}"/></svg>
        <text x="0" y="${LABEL.y}" text-anchor="middle" font-family="${SCENE.font}" font-size="${LABEL.fontSize}" font-weight="500" fill="${LABEL.color}">${escape(item.name)}</text>
      </g>`;
    }).join('');

    svg.innerHTML = `<title id="${prefix}-title">Prismatic agent workflow</title>
      <desc id="${prefix}-description">A thin luminous optical rim carries uneven cyan, violet, and warm yellow light. In its open center, the Trigger, Data, Analysis, Report, and Email icons appear one at a time.</desc>
      <defs>
        <filter id="${prefix}-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${RIM.glowBlur}"/></filter>
        <filter id="${prefix}-haze" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${RIM.hazeBlur}"/></filter>
      </defs>
      <g data-v7-rim transform="translate(${SCENE.center.x} ${SCENE.center.y})">
        <g data-v7-energy>
          <g filter="url(#${prefix}-haze)">${haze}</g>
          <g filter="url(#${prefix}-glow)">${glow}</g>
          ${darkEdge}
          ${outerEdge}
          ${spectrum}
          ${innerEdge}
          ${whiteEdge}
        </g>
      </g>
      ${stepMarkup}`;

    const rim = svg.querySelector('[data-v7-rim]');
    const energy = svg.querySelector('[data-v7-energy]');
    const chapters = [...svg.querySelectorAll('[data-v7-step]')];
    const icons = [...svg.querySelectorAll('[data-v7-icon]')];

    function render(time, staticFrame = false) {
      const numeric = Number(time);
      const elapsed = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
      const stage = staticFrame || elapsed >= TIMING.rimSettle ? STAGE.settled : elapsed >= TIMING.iconEnter ? STAGE.icon : STAGE.rim;
      const entered = staticFrame ? 1 : smooth(progress(elapsed, TIMING.rimEnter, TIMING.rimSettle));
      const breath = staticFrame ? 0 : Math.sin(elapsed / TIMING.breathLoop * TAU);
      const scale = mix(RIM.enterScale, 1, entered) + breath * RIM.breathScale * entered;
      const rotation = staticFrame ? 0 : elapsed % TIMING.energyLoop / TIMING.energyLoop * 360;
      rim.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y}) scale(${scale})`);
      rim.setAttribute('opacity', entered);
      energy.setAttribute('transform', `rotate(${rotation})`);
      svg.dataset.stage = String(stage);

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
        const isActive = index === activeIndex;
        chapter.setAttribute('opacity', isActive ? visible : 0);
        chapter.setAttribute('transform', `translate(${SCENE.center.x} ${SCENE.center.y + ICON.yOffset}) scale(${isActive ? iconScale : 1})`);
        chapter.dataset.active = String(isActive && visible > 0);
        icons[index].setAttribute('color', isActive ? blend(ICON.idleColor, steps[index].color, accent) : ICON.idleColor);
      });
      svg.dataset.activeStep = steps[activeIndex]?.name || '';
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v7 = Object.freeze({ create });
})();
