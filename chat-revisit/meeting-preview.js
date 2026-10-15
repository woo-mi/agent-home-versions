(() => {
  const tooltip = document.querySelector('#chart-tooltip');
  const status = document.querySelector('#meeting-status');
  const closePreview = () => {
    if (window.parent !== window) window.parent.postMessage({ type: 'close-app-preview' }, window.location.origin);
  };
  document.querySelector('.close-panel').addEventListener('click', closePreview);

  const chartRegions = [...document.querySelectorAll('.chart-region')];
  const fitCharts = () => chartRegions.forEach(region => {
    const canvas = region.firstElementChild;
    const width = Number(region.dataset.nativeWidth);
    const height = Number(region.dataset.nativeHeight);
    const scale = Math.min(region.clientWidth / width, 1);
    canvas.style.width = `${width}px`;
    canvas.style.left = `${Math.max(0, (region.clientWidth - width * scale) / 2)}px`;
    canvas.style.transform = `scale(${scale})`;
    region.style.height = `${height * scale}px`;
  });
  fitCharts();
  const observer = new ResizeObserver(fitCharts);
  chartRegions.forEach(region => observer.observe(region));

  const hideTooltip = () => { tooltip.hidden = true; };
  const showTooltip = (element, text) => {
    tooltip.textContent = text;
    tooltip.hidden = false;
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(12, Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, window.innerWidth - tooltipRect.width - 12))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(rect.top + 8, window.innerHeight - tooltipRect.height - 12))}px`;
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const bars = [...document.querySelectorAll('[data-month]')];
  const monthButtons = [...document.querySelectorAll('.month-hit')];
  const description = document.querySelector('#category-description');
  const clearButton = document.querySelector('#clear-month');
  let focusedMonth = null;
  let focusedWindow = null;
  const updateFocus = () => {
    bars.forEach(bar => {
      const index = Number(bar.dataset.month);
      bar.classList.toggle('is-muted', focusedMonth !== null ? index !== focusedMonth : focusedWindow !== null && index < 12 - focusedWindow);
    });
    monthButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.monthIndex) === focusedMonth)));
    clearButton.hidden = focusedMonth === null && focusedWindow === null;
    description.textContent = focusedMonth !== null
      ? `Net of returns · last 12 months · ${months[focusedMonth]} in focus`
      : focusedWindow !== null && focusedWindow !== 12
        ? `Net of returns · last 12 months · last ${focusedWindow === 1 ? '30' : '90'} days highlighted`
        : 'Net of returns · last 12 months · click a column to focus a month';
    status.textContent = description.textContent;
  };
  monthButtons.forEach(button => {
    const detail = `${months[Number(button.dataset.monthIndex)]} · $${button.dataset.value}K net revenue`;
    button.addEventListener('pointerenter', () => showTooltip(button, detail));
    button.addEventListener('pointerleave', hideTooltip);
    button.addEventListener('focus', () => showTooltip(button, detail));
    button.addEventListener('blur', hideTooltip);
    button.addEventListener('click', () => {
      const index = Number(button.dataset.monthIndex);
      focusedMonth = focusedMonth === index ? null : index;
      focusedWindow = null;
      updateFocus();
    });
  });
  document.querySelectorAll('.funnel-hit').forEach(button => {
    button.addEventListener('pointerenter', () => showTooltip(button, button.dataset.detail));
    button.addEventListener('pointerleave', hideTooltip);
    button.addEventListener('focus', () => showTooltip(button, button.dataset.detail));
    button.addEventListener('blur', hideTooltip);
    button.addEventListener('click', () => { status.textContent = button.dataset.detail; showTooltip(button, button.dataset.detail); });
  });
  clearButton.addEventListener('click', () => { focusedMonth = null; focusedWindow = null; updateFocus(); });
  document.querySelector('#meeting-period').addEventListener('change', event => {
    focusedMonth = null;
    focusedWindow = { 30: 1, 90: 3, 365: 12 }[event.target.value];
    updateFocus();
  });
  document.querySelectorAll('.app-tabs a').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    document.querySelectorAll('.app-tabs a').forEach(other => {
      const current = other === link;
      other.classList.toggle('is-current', current);
      if (current) other.setAttribute('aria-current', 'location');
      else other.removeAttribute('aria-current');
    });
    const target = document.querySelector(link.getAttribute('href'));
    if (target.id === 'overview') window.scrollTo({ top: 0, behavior: 'auto' });
    else target.scrollIntoView({ block: 'start', behavior: 'auto' });
  }));
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('resize', hideTooltip, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (!tooltip.hidden) hideTooltip();
    else closePreview();
  });
})();
