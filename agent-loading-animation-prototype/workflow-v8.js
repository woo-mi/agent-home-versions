/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V8 / LIQUID HALO
 *
 *    0ms   a translucent optical lens emerges from colored light
 *  650ms   one authentic workflow icon appears in the steady center
 * 1400ms   the lens settles into continuous liquid deformation
 *          oval → rounded triangle → asymmetric pear → near-circle
 *          the silhouette, rim thickness, and refracted light all evolve
 *          every 2600ms: the center icon fades out before the next appears
 *          Trigger → Data → Analysis → Report → Email
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    lensEnter:         0, // colored lens first appears
    lensSettle:     1400, // scale and opacity reach their resting values
    morphLoop:      9800, // continuously deforming silhouette cycle
    lightLoop:      8600, // independent traveling prismatic light
    iconEnter:       650, // the first icon appears in the center
    iconStep:       2600, // one centered icon per chapter
    iconFadeIn:      300, // soft entrance
    iconFadeOut:     300, // complete exit before the following icon
    accentStart:     820, // brief corresponding icon color
    accentDuration:  520, // accent returns to black
  };
  const STAGE = { lens: 0, icon: 1, settled: 2 };
  const SCENE = {
    width: 600, height: 480,
    center: { x: 300, y: 228 },
    resolution: 2,
    font: 'Inter, system-ui, sans-serif',
  };
  const LENS = {
    radius: 154, maxDeform: 36, points: 72,
    initialPhase: -.8, staticPhase: Math.PI,
    pearAmplitude: .075, ovalAmplitude: .14,
    triangleAmplitude: .095, rippleAmplitude: .025,
    tilt: -.36, tiltAmplitude: .45,
    enterScale: .92,
    rimBase: 3.1, rimAmplitude: 5.2,
    edgeWidth: 2.4, edgeOffset: 1.2,
    refractionWidth: 1.8, refractionOffset: -3.2,
    whiteWidth: 1.15, whiteAmplitude: .55, whiteOffset: -1.0,
    nearGlow: 8, nearGlowOpacity: .62,
    farGlow: 17, farGlowOpacity: .22,
    interiorOpacity: .12,
    spectrum: [
      [0, '#FFF58E'], [.10, '#F9FFD5'], [.19, '#70F6FF'],
      [.29, '#00BFFF'], [.36, '#3154EF'], [.42, '#DB32CF'],
      [.49, '#FFB139'], [.57, '#FFF57C'], [.65, '#EEFFDD'],
      [.73, '#7BFBFF'], [.82, '#009BFA'], [.88, '#5732C8'],
      [.94, '#F878B6'], [1, '#FFF58E'],
    ],
    whiteSpectrum: [
      [0, '#FFFFE0'], [.16, '#F9FFFF'], [.32, '#71F4FF'],
      [.42, '#FFF5A0'], [.56, '#FFFFFF'], [.72, '#DBFFFF'],
      [.84, '#7AEEFF'], [1, '#FFFFE0'],
    ],
    darkSpectrum: [
      [0, 'rgba(27,16,55,.64)'], [.16, 'rgba(27,16,55,.08)'],
      [.30, 'rgba(20,27,63,.44)'], [.48, 'rgba(23,14,51,.67)'],
      [.66, 'rgba(23,14,51,.04)'], [.82, 'rgba(20,26,58,.26)'],
      [1, 'rgba(27,16,55,.64)'],
    ],
  };
  const ICON = {
    size: 54, yOffset: -9,
    idleColor: '#000000', enterScale: .94, leaveScale: .975,
    accentStrength: .78,
  };
  const LABEL = { y: 59, fontSize: 13.5, color: '#767986' };

  // Genuine central icon system v1.35 geometry; source manifest is unchanged.
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

  // A bounded radial field actually deforms the outline. Separate harmonics
  // produce tilted ovals, rounded triangles, and asymmetric kidney/pear forms.
  function contour(phase, light, offset = 0, thickness = 0, scale = 1) {
    const tilt = LENS.tilt + LENS.tiltAmplitude * Math.sin(phase);
    return Array.from({ length: LENS.points }, (_, index) => {
      const angle = index / LENS.points * TAU;
      const theta = angle - tilt;
      const deformation = LENS.radius * (
        LENS.pearAmplitude * Math.sin(phase + .4) * Math.cos(theta - phase * .25) +
        LENS.ovalAmplitude * Math.sin(phase) * Math.cos(theta * 2) +
        LENS.triangleAmplitude * Math.sin(phase * 2) * Math.cos(theta * 3 + .6) +
        LENS.rippleAmplitude * Math.sin(phase * 3) * Math.cos(theta * 4 - .5)
      );
      const radius = LENS.radius + LENS.maxDeform * Math.tanh(deformation / LENS.maxDeform);
      const energy = Math.pow(.5 + .5 * Math.sin(angle * 2 - light * 1.5), 2);
      const band = LENS.rimBase + LENS.rimAmplitude * energy;
      const distance = (radius + offset + thickness * band) * scale;
      return {
        x: SCENE.center.x + Math.cos(angle) * distance,
        y: SCENE.center.y + Math.sin(angle) * distance,
      };
    });
  }

  // Closed Catmull–Rom contours become smooth cubic Bézier paths.
  function appendContour(path, points, reverse = false) {
    const list = reverse ? [...points].reverse() : points;
    const count = list.length;
    path.moveTo(list[0].x, list[0].y);
    for (let index = 0; index < count; index++) {
      const before = list[(index - 1 + count) % count];
      const current = list[index];
      const next = list[(index + 1) % count];
      const after = list[(index + 2) % count];
      path.bezierCurveTo(
        current.x + (next.x - before.x) / 6,
        current.y + (next.y - before.y) / 6,
        next.x - (after.x - current.x) / 6,
        next.y - (after.y - current.y) / 6,
        next.x, next.y,
      );
    }
    path.closePath();
  }
  function bandPath(outer, inner) {
    const path = new Path2D();
    appendContour(path, outer);
    appendContour(path, inner, true);
    return path;
  }
  function spectralGradient(context, rotation, stops) {
    const gradient = typeof context.createConicGradient === 'function'
      ? context.createConicGradient(rotation, SCENE.center.x, SCENE.center.y)
      : context.createLinearGradient(SCENE.center.x - LENS.radius, SCENE.center.y - LENS.radius, SCENE.center.x + LENS.radius, SCENE.center.y + LENS.radius);
    stops.forEach(([position, color]) => gradient.addColorStop(position, color));
    return gradient;
  }

  function create({ id, items }) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-liquid-v8`;
    const steps = items.slice(0, 5);
    const element = document.createElement('div');
    element.className = 'build-illustration build-liquid build-liquid-v8';
    Object.assign(element.style, { position: 'relative', aspectRatio: `${SCENE.width} / ${SCENE.height}`, width: '100%', height: 'auto', overflow: 'visible' });
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'A continuously morphing liquid halo surrounds the Trigger, Data, Analysis, Report, and Email icons, shown one at a time.');

    const canvas = document.createElement('canvas');
    const buffer = document.createElement('canvas');
    for (const surface of [canvas, buffer]) {
      surface.width = SCENE.width * SCENE.resolution;
      surface.height = SCENE.height * SCENE.resolution;
    }
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
    canvas.setAttribute('aria-hidden', 'true');
    element.append(canvas);
    const context = canvas.getContext('2d');
    const colorContext = buffer.getContext('2d');

    const overlay = document.createElementNS(SVG_NS, 'svg');
    overlay.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' });
    overlay.innerHTML = steps.map((item, index) => {
      const icon = ICONS[item.name];
      return `<g data-v8-step="${index}" opacity="0" transform="translate(${SCENE.center.x} ${SCENE.center.y + ICON.yOffset})">
        <svg data-v8-icon="${index}" x="${-ICON.size / 2}" y="${-ICON.size / 2}" width="${ICON.size}" height="${ICON.size}" viewBox="${escape(icon.viewBox)}" color="${ICON.idleColor}" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><use href="${escape(icon.href)}"/></svg>
        <text x="0" y="${LABEL.y}" text-anchor="middle" font-family="${SCENE.font}" font-size="${LABEL.fontSize}" font-weight="500" fill="${LABEL.color}">${escape(item.name)}</text>
      </g>`;
    }).join('');
    element.append(overlay);
    const chapters = [...overlay.querySelectorAll('[data-v8-step]')];
    const icons = [...overlay.querySelectorAll('[data-v8-icon]')];
    element.dataset.renderer = prefix;

    function paintLens(phase, light, scale, opacity) {
      for (const target of [context, colorContext]) {
        target.setTransform(SCENE.resolution, 0, 0, SCENE.resolution, 0, 0);
        target.globalAlpha = 1;
        target.globalCompositeOperation = 'source-over';
        target.filter = 'none';
        target.clearRect(0, 0, SCENE.width, SCENE.height);
      }
      if (opacity <= 0) return;
      const outer = contour(phase, light, 0, .5, scale);
      const inner = contour(phase, light, 0, -.5, scale);
      const spectrum = bandPath(outer, inner);
      colorContext.fillStyle = spectralGradient(colorContext, light, LENS.spectrum);
      colorContext.fill(spectrum, 'evenodd');

      context.globalAlpha = opacity * LENS.farGlowOpacity;
      context.filter = `blur(${LENS.farGlow * SCENE.resolution}px)`;
      context.drawImage(buffer, 0, 0, SCENE.width, SCENE.height);
      context.globalAlpha = opacity * LENS.nearGlowOpacity;
      context.filter = `blur(${LENS.nearGlow * SCENE.resolution}px)`;
      context.drawImage(buffer, 0, 0, SCENE.width, SCENE.height);
      context.filter = 'none';

      const lens = new Path2D();
      appendContour(lens, inner);
      context.save();
      context.clip(lens);
      const interior = context.createRadialGradient(SCENE.center.x - 14, SCENE.center.y - 18, LENS.radius * .55, SCENE.center.x, SCENE.center.y, LENS.radius + LENS.maxDeform);
      interior.addColorStop(0, 'rgba(62,90,134,0)');
      interior.addColorStop(.55, 'rgba(62,90,134,0)');
      interior.addColorStop(1, `rgba(62,90,134,${LENS.interiorOpacity})`);
      context.globalAlpha = opacity;
      context.fillStyle = interior;
      context.fillRect(0, 0, SCENE.width, SCENE.height);
      context.restore();

      const dark = bandPath(
        contour(phase, light, LENS.edgeOffset + LENS.edgeWidth, .5, scale),
        contour(phase, light, LENS.edgeOffset, .5, scale),
      );
      context.globalAlpha = opacity;
      context.fillStyle = spectralGradient(context, light + .18, LENS.darkSpectrum);
      context.fill(dark, 'evenodd');
      context.drawImage(buffer, 0, 0, SCENE.width, SCENE.height);

      const refraction = bandPath(
        contour(phase, light, LENS.refractionOffset + LENS.refractionWidth / 2, 0, scale),
        contour(phase, light, LENS.refractionOffset - LENS.refractionWidth / 2, 0, scale),
      );
      context.globalAlpha = opacity * .75;
      context.fillStyle = spectralGradient(context, light + .26, LENS.spectrum);
      context.fill(refraction, 'evenodd');
      const hotWidth = LENS.whiteWidth + LENS.whiteAmplitude * (.5 + .5 * Math.sin(light * 2));
      const hot = bandPath(
        contour(phase, light, LENS.whiteOffset + hotWidth / 2, 0, scale),
        contour(phase, light, LENS.whiteOffset - hotWidth / 2, 0, scale),
      );
      context.globalAlpha = opacity;
      context.fillStyle = spectralGradient(context, light - .05, LENS.whiteSpectrum);
      context.fill(hot, 'evenodd');
    }

    function render(time, staticFrame = false) {
      const numeric = Number(time);
      const elapsed = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
      const entered = staticFrame ? 1 : smooth(progress(elapsed, TIMING.lensEnter, TIMING.lensSettle));
      const phase = staticFrame ? LENS.staticPhase : LENS.initialPhase + elapsed / TIMING.morphLoop * TAU;
      const light = staticFrame ? -.6 : -.6 + elapsed / TIMING.lightLoop * TAU;
      const scale = mix(LENS.enterScale, 1, entered);
      paintLens(phase, light, scale, entered);
      element.dataset.stage = String(staticFrame || elapsed >= TIMING.lensSettle ? STAGE.settled : elapsed >= TIMING.iconEnter ? STAGE.icon : STAGE.lens);

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
      element.dataset.activeStep = steps[activeIndex]?.name || '';
    }

    render(0);
    return { element, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v8 = Object.freeze({ create });
})();
