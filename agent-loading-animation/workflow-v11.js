/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — V11 / WORKFLOW SKELETON
 *
 *   100ms   a pale source card draws in; its skeleton rows appear
 *   650ms   curved connections grow into two parallel branches
 *  1130ms   upper branch appears; lower branch follows at 1330ms
 *  1800ms   both branches extend into a second card (250ms stagger)
 *  3000ms   the two chains draw curved connections toward their merge
 *  3770ms   the merge card settles into place
 *  4230ms   the final connection grows toward the output
 *  4760ms   output appears; its last row completes by 5450ms
 *  5500ms   the completed graph holds with soft placeholder shimmer
 *  9450ms   the whole graph fades out gently over 800ms
 * 10500ms   the sequence repeats from the shared animation clock
 * ───────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const TIMING = {
    sourceEnter:       100, // source card starts drawing
    upperConnect:      650, // source → upper branch
    lowerConnect:      850, // source → lower branch
    branchDraw:        500, // duration of branch and chain connections
    upperEnter:       1130, // upper branch first card appears
    lowerEnter:       1330, // lower branch first card appears
    upperExtend:      1800, // upper branch extends into its second card
    lowerExtend:      2050, // lower branch follows
    upperNextEnter:   2280, // upper branch second card appears
    lowerNextEnter:   2530, // lower branch second card appears
    upperMerge:       3000, // upper chain → merge
    lowerMerge:       3240, // lower chain → merge
    connectionDraw:    550, // duration of merge and output connections
    mergeEnter:       3770, // merge card appears at the arriving lines
    outputConnect:    4230, // merge → output
    outputEnter:      4760, // output card appears
    cardSettle:        420, // subtle vertical settling and opacity reveal
    borderDraw:        540, // rounded card perimeter drawing duration
    fillDelay:          80, // pale surface follows the outline
    fillReveal:        340, // surface fade duration
    headerDelay:       160, // avatar and header bars follow the outline
    headerReveal:      320, // header fade duration
    rowsDelay:         260, // body rows start revealing
    rowStagger:         65, // interval between body rows
    rowReveal:         300, // each body row reveal duration
    contentComplete:   690, // final row settles relative to its card entrance
    graphComplete:    5500, // all seven cards and connections are complete
    shimmerStagger:    180, // individual card shimmer offset
    shimmerTravel:    1800, // slow sweep across settled placeholders
    shimmerCycle:     3100, // sweep plus quiet pause
    fadeOut:          9450, // begin the quiet whole-graph fade
    fadeDuration:      800, // fade duration
    loopDuration:    10500, // includes a brief empty pause before repeating
  };
  const STAGE = { waiting: 0, source: 1, branches: 2, chains: 3, merge: 4, output: 5, settled: 6, fading: 7 };
  const SCENE = { width: 1100, height: 560 };
  const CARD = {
    width: 152, height: 102, radius: 12,
    surface: '#FFFFFF', surfaceOpacity: .94,
    border: '#D8DCE4', borderWidth: 1,
    settleY: 3,
    items: [
      { x: 38,  y: 229, enter: TIMING.sourceEnter, stage: STAGE.source },
      { x: 254, y: 105, enter: TIMING.upperEnter, stage: STAGE.branches },
      { x: 254, y: 353, enter: TIMING.lowerEnter, stage: STAGE.branches },
      { x: 470, y: 105, enter: TIMING.upperNextEnter, stage: STAGE.chains },
      { x: 470, y: 353, enter: TIMING.lowerNextEnter, stage: STAGE.chains },
      { x: 686, y: 229, enter: TIMING.mergeEnter, stage: STAGE.merge },
      { x: 902, y: 229, enter: TIMING.outputEnter, stage: STAGE.output },
    ],
  };
  const PLACEHOLDERS = {
    avatar: { x: 26, y: 27, radius: 10, fill: '#E0E3E9' },
    headerFill: '#E0E3E9', bodyFill: '#E6E8ED', radius: 3,
    headers: [
      { x: 44, y: 18, width: 67, height: 7 },
      { x: 44, y: 31, width: 45, height: 5 },
    ],
    rows: [
      { x: 16, y: 55, width: 120, height: 6 },
      { x: 16, y: 69, width: 108, height: 6 },
      { x: 16, y: 83, width: 79, height: 6 },
    ],
  };
  const CONNECTIONS = {
    stroke: '#C8CDD7', width: 1.15,
    items: [
      { from: 0, to: 1, enter: TIMING.upperConnect, duration: TIMING.branchDraw },
      { from: 0, to: 2, enter: TIMING.lowerConnect, duration: TIMING.branchDraw },
      { from: 1, to: 3, enter: TIMING.upperExtend, duration: TIMING.branchDraw },
      { from: 2, to: 4, enter: TIMING.lowerExtend, duration: TIMING.branchDraw },
      { from: 3, to: 5, enter: TIMING.upperMerge, duration: TIMING.connectionDraw },
      { from: 4, to: 5, enter: TIMING.lowerMerge, duration: TIMING.connectionDraw },
      { from: 5, to: 6, enter: TIMING.outputConnect, duration: TIMING.connectionDraw },
    ],
  };
  const SHIMMER = { width: 64, color: '#FFFFFF', peakOpacity: .66, opacity: .55 };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const progress = (time, start, duration) => clamp((time - start) / duration);
  const smooth = value => value * value * (3 - 2 * value);
  let instanceCount = 0;

  function rectangle(shape, extra = '') {
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${PLACEHOLDERS.radius}" ${extra}/>`;
  }

  function connectionPath(connection) {
    const source = CARD.items[connection.from];
    const target = CARD.items[connection.to];
    const x1 = source.x + CARD.width;
    const y1 = source.y + CARD.height / 2;
    const x2 = target.x;
    const y2 = target.y + CARD.height / 2;
    const middle = (x1 + x2) / 2;
    return `M${x1} ${y1} C${middle} ${y1} ${middle} ${y2} ${x2} ${y2}`;
  }

  function create({ id = 'workflow' } = {}) {
    const prefix = `${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}-skeleton-v11-${++instanceCount}`;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'build-illustration build-skeleton build-skeleton-v11');
    svg.setAttribute('viewBox', `0 0 ${SCENE.width} ${SCENE.height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${prefix}-title ${prefix}-description`);

    const avatarShape = `<circle cx="${PLACEHOLDERS.avatar.x}" cy="${PLACEHOLDERS.avatar.y}" r="${PLACEHOLDERS.avatar.radius}"/>`;
    const clips = CARD.items.map((_, index) => `<clipPath id="${prefix}-placeholders-${index}" clipPathUnits="userSpaceOnUse">${avatarShape}${PLACEHOLDERS.headers.map(shape => rectangle(shape)).join('')}${PLACEHOLDERS.rows.map(shape => rectangle(shape)).join('')}</clipPath>`).join('');
    const edges = CONNECTIONS.items.map((connection, index) => `<path data-v11-edge="${index}" d="${connectionPath(connection)}" pathLength="1" fill="none" stroke="${CONNECTIONS.stroke}" stroke-width="${CONNECTIONS.width}" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" opacity="0"/>`).join('');
    const cards = CARD.items.map((card, index) => `<g data-v11-card="${index}" transform="translate(${card.x} ${card.y})" opacity="0">
        <rect data-v11-surface="${index}" width="${CARD.width}" height="${CARD.height}" rx="${CARD.radius}" fill="${CARD.surface}" opacity="0"/>
        <rect data-v11-border="${index}" width="${CARD.width}" height="${CARD.height}" rx="${CARD.radius}" pathLength="1" fill="none" stroke="${CARD.border}" stroke-width="${CARD.borderWidth}" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>
        <g data-v11-header="${index}" opacity="0">
          <circle cx="${PLACEHOLDERS.avatar.x}" cy="${PLACEHOLDERS.avatar.y}" r="${PLACEHOLDERS.avatar.radius}" fill="${PLACEHOLDERS.avatar.fill}"/>
          ${PLACEHOLDERS.headers.map(shape => rectangle(shape, `fill="${PLACEHOLDERS.headerFill}"`)).join('')}
        </g>
        ${PLACEHOLDERS.rows.map((shape, rowIndex) => rectangle(shape, `data-v11-row="${index}-${rowIndex}" fill="${PLACEHOLDERS.bodyFill}" opacity="0"`)).join('')}
        <g clip-path="url(#${prefix}-placeholders-${index})">
          <rect data-v11-shimmer="${index}" x="${-SHIMMER.width}" width="${SHIMMER.width}" height="${CARD.height}" fill="url(#${prefix}-shimmer)" opacity="0"/>
        </g>
      </g>`).join('');

    svg.innerHTML = `<title id="${prefix}-title">A workflow being drawn</title>
      <desc id="${prefix}-description">Seven pale skeleton cards form a workflow. A source branches into two parallel chains of two cards each. The chains merge into one card and connect to a final output. Curved connections draw progressively as avatar, header, and three body-row placeholders appear. The complete graph holds with a soft shimmer before gently repeating.</desc>
      <defs>
        <linearGradient id="${prefix}-shimmer" x1="0" y1="0" x2="1" y2="0">
          <stop stop-color="${SHIMMER.color}" stop-opacity="0"/>
          <stop offset=".5" stop-color="${SHIMMER.color}" stop-opacity="${SHIMMER.peakOpacity}"/>
          <stop offset="1" stop-color="${SHIMMER.color}" stop-opacity="0"/>
        </linearGradient>
        ${clips}
      </defs>
      <g data-v11-graph>${edges}${cards}</g>`;

    const all = selector => [...svg.querySelectorAll(selector)];
    const graph = svg.querySelector('[data-v11-graph]');
    const edgeNodes = all('[data-v11-edge]');
    const cardNodes = all('[data-v11-card]');
    const surfaces = all('[data-v11-surface]');
    const borders = all('[data-v11-border]');
    const headers = all('[data-v11-header]');
    const rows = all('[data-v11-row]');
    const shimmers = all('[data-v11-shimmer]');

    function render(time, staticFrame = false) {
      const numericTime = Number(time);
      const elapsed = Number.isFinite(numericTime) ? Math.max(0, numericTime) : 0;
      const phase = staticFrame ? TIMING.graphComplete : elapsed % TIMING.loopDuration;
      const stage = staticFrame ? STAGE.settled : phase >= TIMING.fadeOut ? STAGE.fading : phase >= TIMING.graphComplete ? STAGE.settled : phase >= TIMING.outputEnter ? STAGE.output : phase >= TIMING.mergeEnter ? STAGE.merge : phase >= TIMING.upperNextEnter ? STAGE.chains : phase >= TIMING.upperEnter ? STAGE.branches : phase >= TIMING.sourceEnter ? STAGE.source : STAGE.waiting;
      svg.dataset.stage = String(stage);
      graph.setAttribute('opacity', staticFrame ? 1 : 1 - smooth(progress(phase, TIMING.fadeOut, TIMING.fadeDuration)));

      CONNECTIONS.items.forEach((connection, index) => {
        const drawn = staticFrame ? 1 : smooth(progress(phase, connection.enter, connection.duration));
        edgeNodes[index].setAttribute('stroke-dashoffset', 1 - drawn);
        edgeNodes[index].setAttribute('opacity', drawn > 0 ? 1 : 0);
      });

      CARD.items.forEach((card, index) => {
        const appeared = staticFrame ? 1 : stage >= card.stage ? smooth(progress(phase, card.enter, TIMING.cardSettle)) : 0;
        const border = staticFrame ? 1 : smooth(progress(phase, card.enter, TIMING.borderDraw));
        const surface = staticFrame ? 1 : smooth(progress(phase, card.enter + TIMING.fillDelay, TIMING.fillReveal));
        const header = staticFrame ? 1 : smooth(progress(phase, card.enter + TIMING.headerDelay, TIMING.headerReveal));
        cardNodes[index].setAttribute('transform', `translate(${card.x} ${card.y + CARD.settleY * (1 - appeared)})`);
        cardNodes[index].setAttribute('opacity', appeared);
        surfaces[index].setAttribute('opacity', surface * CARD.surfaceOpacity);
        borders[index].setAttribute('stroke-dashoffset', 1 - border);
        headers[index].setAttribute('opacity', header);
        PLACEHOLDERS.rows.forEach((_, rowIndex) => {
          const row = staticFrame ? 1 : smooth(progress(phase, card.enter + TIMING.rowsDelay + rowIndex * TIMING.rowStagger, TIMING.rowReveal));
          rows[index * PLACEHOLDERS.rows.length + rowIndex].setAttribute('opacity', row);
        });

        const shimmerStart = card.enter + TIMING.contentComplete + index * TIMING.shimmerStagger;
        const shimmerTime = Math.max(0, phase - shimmerStart) % TIMING.shimmerCycle;
        const sweep = progress(shimmerTime, 0, TIMING.shimmerTravel);
        const shimmerOpacity = !staticFrame && phase >= shimmerStart && shimmerTime < TIMING.shimmerTravel ? Math.sin(sweep * Math.PI) ** 2 * SHIMMER.opacity : 0;
        shimmers[index].setAttribute('transform', `translate(${(CARD.width + SHIMMER.width) * sweep} 0)`);
        shimmers[index].setAttribute('opacity', shimmerOpacity);
      });
    }

    render(0);
    return { element: svg, render };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v11 = Object.freeze({ create });
})();
