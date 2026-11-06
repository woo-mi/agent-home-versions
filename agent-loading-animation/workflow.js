/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 *    0ms   board fades in, settles upward 14px → 0px
 *  260ms   five workflow tiles assemble (170ms stagger)
 *  480ms   quiet connections draw between the tiles
 *  980ms   the smaller front card lifts into place
 * 1700ms   finished board begins a gentle 7400ms float loop
 *          a violet signal visits Trigger → Data → Analysis → Report → Email
 *          pause freezes the illustration; replay restarts the assembly
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    boardEnter:          0, // board entrance starts
    boardSettle:       720, // board settles into its resting position
    tilesEnter:        260, // first workflow tile enters
    tileStagger:       170, // interval between tile entrances
    tileSettle:        620, // each tile settles softly
    connectorsEnter:   480, // first connection begins drawing
    connectorStagger:  185, // interval between connections
    connectorDraw:     480, // connection drawing duration
    frontEnter:        980, // front card begins its entrance
    frontSettle:       720, // front card entrance duration
    loopStart:        1700, // end of the assembly sequence
    loopDuration:     7400, // complete gentle motion cycle
    signalTravel:     5600, // time spent moving the signal across the flow
    tilePulse:        1100, // one card's small lifting pulse
    captionEnter:     200, // caption fades in early in the assembly
    captionFade:      550, // caption entrance duration
  };

  const STAGE = { waiting: 0, board: 1, tiles: 2, connections: 3, front: 4, flowing: 5 };
  const BOARD = {
    width: 448, height: 168, radius: 9,
    projection: { a: .90, b: -.30, c: .65, d: .52, x: 32, y: 178 },
    enterOffset: 14, floatAmplitude: 3.4,
    border: '#d9dce5', surface: '#ffffff', shadow: '#8c91a7',
  };
  const TILES = {
    x: 36, y: 53, spacing: 80, width: 64, height: 74,
    enterLift: 23, restingLift: 4, pulseLift: 3.2,
    items: [
      { name: 'Trigger', color: '#F58B3F', icon: '<path d="m12 3-7 10h6l-1 8 9-12h-6l1-6z"/>' },
      { name: 'Data', color: '#34ADE5', icon: '<ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>' },
      { name: 'Analysis', color: '#35C77C', icon: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><path d="m12 7 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5z"/>' },
      { name: 'Report', color: '#EF6366', icon: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 16v-3m3 3v-5m3 5v-2"/>' },
      { name: 'Email', color: '#C759BA', icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>' },
    ],
  };
  const FRONT = {
    x: 180, y: 133, width: 264, height: 65,
    restingLift: 13, enterOffset: 18, floatAmplitude: 2.6,
    barFloor: .72, barAmplitude: .28, barPhase: .75,
    bars: [14, 21, 28, 35, 42],
    colors: ['#f2e7d1', '#e0eff2', '#e5eddb', '#f5dfdb', '#f0dfed'],
  };
  const SIGNAL = {
    y: TILES.y + TILES.height / 2,
    radius: 2.25, color: '#898bf0', glow: '#bfc1ff',
    initialX: TILES.x + TILES.width / 2,
    finalX: TILES.x + TILES.spacing * (TILES.items.length - 1) + TILES.width / 2,
  };

  const mounts = new WeakMap();
  let instanceCount = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const progress = (time, start, duration) => clamp((time - start) / duration);
  const smooth = (value) => value * value * (3 - 2 * value);
  const settle = (value) => 1 - Math.pow(1 - value, 3);
  const project = (x, y) => ({
    x: BOARD.projection.x + BOARD.projection.a * x + BOARD.projection.c * y,
    y: BOARD.projection.y + BOARD.projection.b * x + BOARD.projection.d * y,
  });
  const planeMatrix = () => `matrix(${BOARD.projection.a} ${BOARD.projection.b} ${BOARD.projection.c} ${BOARD.projection.d} 0 0)`;

  function mount(container) {
    if (!(container instanceof Element)) throw new TypeError('AgentBuildAnimation.mount requires an element.');
    if (mounts.has(container)) return mounts.get(container);

    const id = `agent-build-${++instanceCount}`;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const illustration = document.createElement('section');
    illustration.className = 'agent-build-animation';
    illustration.hidden = true;
    illustration.setAttribute('aria-label', 'Agent workflow loading animation');
    illustration.dataset.stage = STAGE.waiting;

    const nodeMarkup = TILES.items.map((item, index) => {
      const point = project(TILES.x + index * TILES.spacing, TILES.y);
      return `<g transform="translate(${point.x} ${point.y})"><g class="build-node-float" data-build-node="${index}"><g transform="${planeMatrix()}">
        <rect x="0" y="3" width="${TILES.width}" height="${TILES.height}" rx="7" fill="#edf0f6" opacity=".5"/>
        <rect data-build-tile-border="${index}" width="${TILES.width}" height="${TILES.height}" rx="7" fill="#fff" stroke="#dce0e8" stroke-width=".8"/>
        <rect x="17" y="11" width="30" height="30" rx="8" fill="${item.color}"/>
        <svg x="22" y="16" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
        <text class="build-node-name" x="32" y="57" text-anchor="middle">${item.name}</text>
        <circle cx="0" cy="37" r="1.8" fill="#fff" stroke="#d4d9e5" stroke-width=".75"/>
        <circle cx="64" cy="37" r="1.8" fill="#fff" stroke="#d4d9e5" stroke-width=".75"/>
      </g></g></g>`;
    }).join('');
    const connectorMarkup = TILES.items.slice(0, -1).map((_, index) => {
      const x = TILES.x + index * TILES.spacing + TILES.width;
      return `<path data-build-connector="${index}" d="M${x} ${SIGNAL.y}h${TILES.spacing - TILES.width}" pathLength="1" fill="none" stroke="#B9BECF" stroke-width="1.2" stroke-linecap="round"/>`;
    }).join('');
    const frontPoint = project(FRONT.x, FRONT.y);
    const frontBars = FRONT.bars.map((height, index) => `<g data-build-bar="${index}">
      <rect x="${25 + index * 44}" y="${52 - height}" width="29" height="${height}" rx="2.5" fill="${FRONT.colors[index]}"/>
      <rect x="${25 + index * 44}" y="56" width="29" height="1.2" rx=".6" fill="#e5e7f0"/>
    </g>`).join('');

    illustration.innerHTML = `<figure class="build-figure">
      <svg class="build-illustration" viewBox="0 0 600 330" role="img" aria-labelledby="${id}-art-title ${id}-art-description">
        <title id="${id}-art-title">A workflow is coming together</title>
        <desc id="${id}-art-description">Five connected steps on a gently floating board: Trigger, Data, Analysis, Report, and Email.</desc>
        <defs>
          <filter id="${id}-shadow" x="-25%" y="-50%" width="150%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
          <filter id="${id}-signal-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.5"/></filter>
        </defs>
        <g class="build-shadow" opacity=".085" transform="translate(0 13)">
          <g transform="translate(${BOARD.projection.x} ${BOARD.projection.y}) ${planeMatrix()}"><rect width="${BOARD.width}" height="${BOARD.height}" rx="${BOARD.radius}" fill="${BOARD.shadow}" filter="url(#${id}-shadow)"/></g>
        </g>
        <g class="build-plane">
          <g transform="translate(${BOARD.projection.x} ${BOARD.projection.y}) ${planeMatrix()}">
            <rect y="2" width="${BOARD.width}" height="${BOARD.height}" rx="${BOARD.radius}" fill="#f0f2f7" stroke="#e4e6ed" stroke-width=".8"/>
            <rect width="${BOARD.width}" height="${BOARD.height}" rx="${BOARD.radius}" fill="${BOARD.surface}" stroke="${BOARD.border}" stroke-width="1"/>
            <rect x="24" y="21" width="79" height="3.4" rx="1.7" fill="#d7dbe4"/>
            <rect x="24" y="29" width="48" height="2.2" rx="1.1" fill="#e9eaf0"/>
            <circle cx="408" cy="24" r="2" fill="#e2e4ec"/><circle cx="417" cy="24" r="2" fill="#e2e4ec"/>
            <path d="M24 42h400" stroke="#f0f1f5" stroke-width=".7"/>
            ${connectorMarkup}
            <path d="M36 147h376" fill="none" stroke="#ececf7" stroke-width=".7" stroke-dasharray="2 3"/>
          </g>
          <g class="build-signal" opacity="0"><circle r="6" fill="${SIGNAL.glow}" opacity=".65" filter="url(#${id}-signal-glow)"/><circle r="${SIGNAL.radius}" fill="${SIGNAL.color}"/></g>
          ${nodeMarkup}
          <g transform="translate(${frontPoint.x} ${frontPoint.y})"><g class="build-front-float"><g transform="${planeMatrix()}">
            <rect x="0" y="7" width="${FRONT.width}" height="${FRONT.height}" rx="7" fill="#9297b0" opacity=".075" filter="url(#${id}-shadow)"/>
            <rect width="${FRONT.width}" height="${FRONT.height}" rx="7" fill="#fff" stroke="#d9dce5" stroke-width=".9"/>
            ${frontBars}
          </g></g></g>
        </g>
      </svg>
      <figcaption class="build-caption">
        <h2 class="build-title">Building your agent…</h2>
        <p class="build-subtitle">Connecting your data, analysis, and actions.</p>
      </figcaption>
    </figure>
    <div class="version-picker">
      <div class="version-menu" role="menu" aria-label="Prototype version" hidden>
        <button type="button" role="menuitemradio" data-version="v1" aria-checked="true" tabindex="-1"><span class="version-number">V1</span><span>Isometric</span><svg class="version-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg></button>
        <button type="button" role="menuitemradio" data-version="v2" aria-checked="false" tabindex="-1"><span class="version-number">V2</span><span>Front-facing</span><svg class="version-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg></button>
        <button type="button" role="menuitemradio" data-version="v3" aria-checked="false" tabindex="-1"><span class="version-number">V3</span><span>Constellation</span><svg class="version-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg></button>
        <button type="button" role="menuitemradio" data-version="v4" aria-checked="false" tabindex="-1"><span class="version-number">V4</span><span>Color on contact</span><svg class="version-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg></button>
        <button type="button" role="menuitemradio" data-version="v5" aria-checked="false" tabindex="-1"><span class="version-number">V5</span><span>Expanded orbit</span><svg class="version-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg></button>
        <button type="button" role="menuitemradio" data-version="v6" aria-checked="false" tabindex="-1"><span class="version-number">V6</span><span>Concentric flow</span><svg class="version-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg></button>
      </div>
      <button class="version-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Switch version, V1"><span class="version-current">V1</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 6 4.5 4.5L12.5 6"/></svg></button>
      <span class="visually-hidden prototype-announcement" aria-live="polite"></span>
    </div>`;
    container.append(illustration);

    const plane = illustration.querySelector('.build-plane');
    const shadow = illustration.querySelector('.build-shadow');
    const front = illustration.querySelector('.build-front-float');
    const nodes = [...illustration.querySelectorAll('[data-build-node]')];
    const borders = [...illustration.querySelectorAll('[data-build-tile-border]')];
    const connectors = [...illustration.querySelectorAll('[data-build-connector]')];
    const signal = illustration.querySelector('.build-signal');
    const barRects = [...illustration.querySelectorAll('[data-build-bar] > rect:first-child')];
    const caption = illustration.querySelector('.build-caption');
    const picker = illustration.querySelector('.version-picker');
    const versionTrigger = picker.querySelector('.version-trigger');
    const versionMenu = picker.querySelector('.version-menu');
    const versionLabel = picker.querySelector('.version-current');
    let playback = 'stopped';
    let stage = STAGE.waiting;
    let frame = null;
    let lastTick = 0;
    let elapsed = 0;
    let speed = 1;
    let motionReduced = reducedMotion.matches;
    let lastBroadcast = -Infinity;
    let version = 'v1';
    const versions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];
    const totalDuration = TIMING.loopStart + TIMING.loopDuration;
    const versionButtons = [...picker.querySelectorAll('[data-version]')];
    const announcement = picker.querySelector('.prototype-announcement');
    const figurePanel = illustration.querySelector('.build-figure');
    figurePanel.id = `${id}-panel`;
    versionMenu.id = `${id}-versions`;
    versionTrigger.setAttribute('aria-controls', versionMenu.id);
    versionButtons.forEach((button) => {
      button.id = `${id}-${button.dataset.version}-option`;
      button.setAttribute('aria-controls', figurePanel.id);
    });
    document.body.append(picker);
    const panels = { v1: { element: illustration.querySelector('.build-illustration'), render: renderV1 } };
    ['v2', 'v3', 'v4', 'v5', 'v6'].forEach((key) => {
      const panel = window.AgentWorkflowVariants[key].create({ id: `${id}-${key}`, items: TILES.items });
      panel.element.setAttribute('hidden', '');
      panel.element.setAttribute('data-renderer', key);
      caption.before(panel.element);
      panels[key] = panel;
    });
    panels.v1.element.setAttribute('data-renderer', 'v1');

    function setStage(nextStage) {
      if (nextStage === stage) return;
      stage = nextStage;
      illustration.dataset.stage = stage;
    }

    function broadcast(paused, restart = false) {
      document.dispatchEvent(new CustomEvent('agent-build-motion', { detail: { paused, elapsedMs: elapsed, speed, state: playback, ...(restart ? { restart: true } : {}) } }));
    }

    function renderV1(time, staticFrame = false) {
      const boardProgress = staticFrame ? 1 : settle(progress(time, TIMING.boardEnter, TIMING.boardSettle));
      const phase = staticFrame ? 0 : Math.max(0, time - TIMING.loopStart) % TIMING.loopDuration;
      const wave = staticFrame ? 0 : Math.sin(phase / TIMING.loopDuration * Math.PI * 2);
      setStage(staticFrame || time >= TIMING.loopStart ? STAGE.flowing : time >= TIMING.frontEnter ? STAGE.front : time >= TIMING.connectorsEnter ? STAGE.connections : time >= TIMING.tilesEnter ? STAGE.tiles : STAGE.board);
      plane.style.opacity = boardProgress;
      plane.setAttribute('transform', `translate(0 ${(1 - boardProgress) * BOARD.enterOffset + wave * BOARD.floatAmplitude})`);
      shadow.style.opacity = .085 * boardProgress;
      caption.style.opacity = staticFrame ? 1 : smooth(progress(time, TIMING.captionEnter, TIMING.captionFade));

      nodes.forEach((node, index) => {
        const enter = staticFrame ? 1 : settle(progress(time, TIMING.tilesEnter + index * TIMING.tileStagger, TIMING.tileSettle));
        const pulseTime = phase - index * TIMING.signalTravel / (nodes.length - 1);
        const pulse = !staticFrame && stage >= STAGE.flowing && pulseTime >= 0 && pulseTime <= TIMING.tilePulse ? Math.sin(pulseTime / TIMING.tilePulse * Math.PI) : 0;
        node.style.opacity = enter;
        node.setAttribute('transform', `translate(0 ${-TILES.restingLift - (1 - enter) * TILES.enterLift - pulse * TILES.pulseLift})`);
        borders[index].setAttribute('stroke', pulse > .2 ? '#bec0ec' : '#dce0e8');
      });
      connectors.forEach((connector, index) => {
        const drawn = staticFrame ? 1 : smooth(progress(time, TIMING.connectorsEnter + index * TIMING.connectorStagger, TIMING.connectorDraw));
        connector.style.strokeDasharray = '1';
        connector.style.strokeDashoffset = 1 - drawn;
        connector.style.opacity = drawn;
      });
      const frontProgress = staticFrame ? 1 : settle(progress(time, TIMING.frontEnter, TIMING.frontSettle));
      front.style.opacity = frontProgress;
      front.setAttribute('transform', `translate(0 ${-FRONT.restingLift + (1 - frontProgress) * FRONT.enterOffset - wave * FRONT.floatAmplitude})`);
      barRects.forEach((bar, index) => {
        const variation = staticFrame ? 1 : FRONT.barFloor + FRONT.barAmplitude * (1 + Math.sin(phase / TIMING.loopDuration * Math.PI * 2 + index * FRONT.barPhase)) / 2;
        const height = FRONT.bars[index] * variation;
        bar.setAttribute('height', height);
        bar.setAttribute('y', 52 - height);
      });
      const travelling = !staticFrame && stage >= STAGE.flowing && phase <= TIMING.signalTravel;
      signal.style.opacity = travelling ? .85 : 0;
      if (travelling) {
        const position = smooth(phase / TIMING.signalTravel);
        const point = project(SIGNAL.initialX + (SIGNAL.finalX - SIGNAL.initialX) * position, SIGNAL.y);
        signal.setAttribute('transform', `translate(${point.x} ${point.y})`);
      }
    }

    function render(time, staticFrame = false) {
      setStage(staticFrame || time >= TIMING.loopStart ? STAGE.flowing : time >= TIMING.frontEnter ? STAGE.front : time >= TIMING.connectorsEnter ? STAGE.connections : time >= TIMING.tilesEnter ? STAGE.tiles : STAGE.board);
      panels[version].render(time, staticFrame);
      caption.style.opacity = staticFrame ? 1 : smooth(progress(time, TIMING.captionEnter, TIMING.captionFade));

    }

    function notifyTime(force = false) {
      if (!force && Math.abs(elapsed - lastBroadcast) < 100) return;
      lastBroadcast = elapsed;
      document.dispatchEvent(new CustomEvent('agent-build-time', { detail: { elapsedMs: elapsed, speed } }));
    }

    function syncElapsed() {
      const now = performance.now();
      if (playback === 'running' && !motionReduced) elapsed += (now - lastTick) * speed;
      lastTick = now;
    }

    function tick(now) {
      if (playback !== 'running') return;
      elapsed += (now - lastTick) * speed;
      lastTick = now;
      render(elapsed);
      notifyTime();
      frame = window.requestAnimationFrame(tick);
    }

    function cancelFrame() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    }

    function updateControls() {
      illustration.dataset.playback = playback;
      illustration.dataset.version = version;
      illustration.dataset.speed = speed;
      illustration.dataset.reducedMotion = String(reducedMotion.matches);
      illustration.style.setProperty('--build-cycle-duration', `${TIMING.loopDuration / speed}ms`);
      versionLabel.textContent = version.toUpperCase();
      versionTrigger.setAttribute('aria-label', `Switch version, ${version.toUpperCase()}`);
      Object.entries(panels).forEach(([key, panel]) => { panel.element.toggleAttribute('hidden', key !== version); });
      versionButtons.forEach((button) => {
        const selected = button.dataset.version === version;
        button.setAttribute('aria-checked', String(selected));
        if (selected) figurePanel.setAttribute('aria-label', `${button.children[0].textContent} ${button.children[1].textContent} animation`);
      });
    }

    const api = {
      start() {
        cancelFrame();
        illustration.hidden = false;
        playback = 'running';
        elapsed = 0;
        lastTick = performance.now();
        lastBroadcast = -Infinity;
        setStage(STAGE.waiting);
        updateControls();
        render(0, reducedMotion.matches);
        if (!reducedMotion.matches) frame = window.requestAnimationFrame(tick);
        broadcast(false, true);
        notifyTime(true);
        return api;
      },
      stop() {
        cancelFrame();
        playback = 'stopped';
        elapsed = 0;
        illustration.hidden = true;
        setStage(STAGE.waiting);
        updateControls();
        broadcast(false);
        return api;
      },
      replay() { return api.start(); },
      pause() {
        if (playback !== 'running' || reducedMotion.matches) return api;
        syncElapsed();
        cancelFrame();
        playback = 'paused';
        render(elapsed);
        updateControls();
        broadcast(true);
        notifyTime(true);
        return api;
      },
      resume() {
        if (playback !== 'paused') return api;
        playback = 'running';
        lastTick = performance.now();
        updateControls();
        if (!reducedMotion.matches) frame = window.requestAnimationFrame(tick);
        broadcast(false);
        return api;
      },
      selectVersion(nextVersion) {
        if (!versions.includes(nextVersion)) return api;
        syncElapsed();
        version = nextVersion;
        updateControls();
        render(elapsed, reducedMotion.matches);
        const url = new URL(location.href);
        url.searchParams.set('version', version);
        history.replaceState(null, '', url);
        announcement.textContent = `Version ${version.slice(1)}: ${versionButtons.find(b => b.dataset.version === version).innerText.replace(/\n/g, ' ')}`;
        return api;
      },
      setSpeed(nextSpeed) {
        if (![.5, 1, 1.5, 2].includes(nextSpeed)) return api;
        syncElapsed();
        speed = nextSpeed;
        updateControls();
        render(elapsed, reducedMotion.matches);
        broadcast(playback === 'paused');
        return api;
      },
      seek(time) {
        cancelFrame();
        elapsed = Math.max(0, Math.min(totalDuration, Number(time) || 0));
        playback = 'paused';
        render(elapsed, reducedMotion.matches);
        updateControls();
        broadcast(true);
        notifyTime(true);
        return api;
      },
      get state() { return playback; },
    };

    function setMenu(open, focusOption = false) {
      versionMenu.hidden = !open;
      versionTrigger.setAttribute('aria-expanded', String(open));
      picker.classList.toggle('is-open', open);
      if (open && focusOption) versionButtons.find(button => button.dataset.version === version).focus();
    }
    versionTrigger.addEventListener('click', () => setMenu(versionMenu.hidden, true));
    versionTrigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setMenu(true, true);
      }
    });
    versionButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        api.selectVersion(button.dataset.version);
        setMenu(false);
        versionTrigger.focus();
      });
      button.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowDown') next = (index + 1) % versions.length;
        if (event.key === 'ArrowUp') next = (index + versions.length - 1) % versions.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = versions.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        versionButtons[next].focus();
      });
    });
    document.addEventListener('pointerdown', (event) => {
      if (!picker.contains(event.target)) setMenu(false);
    });
    picker.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
        versionTrigger.focus();
      }
      if (event.key === 'Tab') { setMenu(false); versionTrigger.focus(); }
    });
    reducedMotion.addEventListener('change', () => {
      syncElapsed();
      motionReduced = reducedMotion.matches;
      if (playback === 'stopped') { updateControls(); return; }
      cancelFrame();
      render(elapsed, reducedMotion.matches);
      updateControls();
      if (!reducedMotion.matches && playback === 'running') {
        lastTick = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
      broadcast(playback === 'paused');
    });
    const requestedVersion = new URL(location.href).searchParams.get('version');
    version = versions.includes(requestedVersion) ? requestedVersion : 'v1';
    updateControls();
    mounts.set(container, api);
    return api;
  }

  window.AgentBuildAnimation = Object.freeze({ mount });
})();
