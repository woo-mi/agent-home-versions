const canvas = document.getElementById('workflow-canvas');
const nodes = document.getElementById('workflow-nodes');
const panButton = document.getElementById('canvas-pan');
const zoomOut = document.getElementById('canvas-zoom-out');
const zoomIn = document.getElementById('canvas-zoom-in');
const zoomLabel = document.getElementById('canvas-zoom');
const status = document.getElementById('canvas-status');
let scale = 1;
let x = 0;
let y = 48;
let lastWidth = 0;
let initialized = false;
let drag = null;
let panEnabled = true;
const minScale = .4;
const maxScale = 2;

function render(announce = false) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  x = Math.min(width - 48, Math.max(48 - nodes.offsetWidth * scale, x));
  y = Math.min(height - 60, Math.max(48 - nodes.offsetHeight * scale, y));
  nodes.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  canvas.style.backgroundSize = `${20 * scale}px ${20 * scale}px`;
  canvas.style.backgroundPosition = `${x + 2}px ${y + 2}px`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  zoomOut.disabled = scale <= minScale;
  zoomIn.disabled = scale >= maxScale;
  if (announce) status.textContent = `Workflow zoom ${Math.round(scale * 100)} percent.`;
}

function resetView(fit = false) {
  if (!canvas.clientWidth || !canvas.clientHeight) return;
  scale = fit ? Math.max(minScale, Math.min(1, (canvas.clientWidth - 64) / nodes.offsetWidth, (canvas.clientHeight - 104) / nodes.offsetHeight)) : 1;
  x = (canvas.clientWidth - nodes.offsetWidth * scale) / 2;
  y = fit ? Math.max(24, (canvas.clientHeight - 52 - nodes.offsetHeight * scale) / 2) : 48;
  initialized = true;
  render(true);
}

function zoomTo(nextScale, originX = canvas.clientWidth / 2, originY = canvas.clientHeight / 2) {
  const next = Math.max(minScale, Math.min(maxScale, nextScale));
  const ratio = next / scale;
  x = originX - (originX - x) * ratio;
  y = originY - (originY - y) * ratio;
  scale = next;
  render(true);
}

zoomOut.addEventListener('click', () => zoomTo(scale - .1));
zoomIn.addEventListener('click', () => zoomTo(scale + .1));
document.getElementById('canvas-reset').addEventListener('click', () => resetView());
document.getElementById('canvas-fit').addEventListener('click', () => resetView(true));
panButton.addEventListener('click', () => {
  panEnabled = !panEnabled;
  panButton.setAttribute('aria-pressed', String(panEnabled));
  canvas.dataset.pan = String(panEnabled);
  status.textContent = panEnabled ? 'Canvas panning enabled.' : 'Canvas panning disabled. Text can be selected.';
});

canvas.addEventListener('pointerdown', event => {
  if (!panEnabled || event.button !== 0 || event.target.closest('button')) return;
  event.preventDefault();
  canvas.focus({preventScroll: true});
  drag = {id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y};
  canvas.setPointerCapture(event.pointerId);
  canvas.dataset.dragging = 'true';
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  x = drag.x + event.clientX - drag.startX;
  y = drag.y + event.clientY - drag.startY;
  render();
});
function stopDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  drag = null;
  delete canvas.dataset.dragging;
}
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('lostpointercapture', stopDrag);
canvas.addEventListener('wheel', event => {
  if (event.target.closest('.canvas-controls')) return;
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
  if (event.ctrlKey || event.metaKey) {
    const rect = canvas.getBoundingClientRect();
    zoomTo(scale * Math.exp(-event.deltaY * unit * .008), event.clientX - rect.left, event.clientY - rect.top);
  } else {
    x -= event.deltaX * unit;
    y -= event.deltaY * unit;
    render();
  }
}, {passive: false});
canvas.addEventListener('keydown', event => {
  if (event.target !== canvas || event.altKey || event.ctrlKey || event.metaKey) return;
  const amount = event.shiftKey ? 64 : 24;
  if (event.key === '+' || event.key === '=') zoomTo(scale + .1);
  else if (event.key === '-') zoomTo(scale - .1);
  else if (event.key === '0') resetView();
  else if (event.key.toLowerCase() === 'f') resetView(true);
  else if (event.key === 'ArrowLeft') { x += amount; render(); }
  else if (event.key === 'ArrowRight') { x -= amount; render(); }
  else if (event.key === 'ArrowUp') { y += amount; render(); }
  else if (event.key === 'ArrowDown') { y -= amount; render(); }
  else return;
  event.preventDefault();
});

new ResizeObserver(() => {
  const width = canvas.clientWidth;
  if (!width || !canvas.clientHeight) return;
  if (!initialized) resetView();
  else { x += (width - (lastWidth || width)) / 2; render(); }
  lastWidth = width;
}).observe(canvas);
document.fonts.ready.then(() => {
  if (!initialized) resetView();
  else { x = (canvas.clientWidth - nodes.offsetWidth * scale) / 2; render(); }
});

window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'report-schedule') return;
  const {schedule, timezone, delivery} = event.data;
  if (typeof schedule !== 'string' || typeof timezone !== 'string' || typeof delivery !== 'string') return;
  const timezoneName = timezone.replace(/^·\s*/, '');
  document.getElementById('report-schedule').textContent = schedule;
  document.getElementById('report-timezone').textContent = `· ${timezoneName}`;
  document.getElementById('report-delivery').textContent = delivery;
  document.getElementById('workflow-trigger').textContent = `${schedule.replace(/^Every\s+/, '')} trigger`;
  document.getElementById('workflow-timezone').textContent = timezoneName;
  const channel = delivery.match(/#[^\s·]+/)?.[0] || '#sales-pipeline';
  const day = schedule.match(/^Every\s+([A-Za-z]+)/)?.[1] || 'Friday';
  document.getElementById('workflow-destination').textContent = `${channel} · Every ${day}`;
  render();
});
