// Exported charts use fixed coordinates. Keep their proportions without
// enlarging them to fill wide app panels, and balance the space on both sides.
(() => {
  const charts = [...document.querySelectorAll('[data-chart-width]')].map(region => {
    const canvas = region.firstElementChild;
    const width = Number(region.dataset.chartWidth);
    const height = Number.parseFloat(canvas.style.height);
    const maxWidth = Number(region.dataset.chartMaxWidth) || width;
    const labels = region.hasAttribute('data-chart-readable-labels')
      ? [...canvas.querySelectorAll('[style*="font-size"]')].map(element => ({
          element,
          fontSize: Number.parseFloat(element.style.fontSize),
          lineHeight: Number.parseFloat(element.style.lineHeight),
        }))
      : [];

    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      width: `${width}px`,
      transformOrigin: 'top left',
    });

    function fit() {
      const availableWidth = region.clientWidth;
      if (!availableWidth) return;
      const scale = Math.min(availableWidth, maxWidth) / width;
      region.style.height = `${height * scale}px`;
      canvas.style.left = `${(availableWidth - width * scale) / 2}px`;
      canvas.style.transform = `scale(${scale})`;
      // Compact the funnel geometry without shrinking its source typography.
      for (const { element, fontSize, lineHeight } of labels) {
        element.style.fontSize = `${fontSize / scale}px`;
        if (Number.isFinite(lineHeight)) element.style.lineHeight = `${lineHeight / scale}px`;
      }
    }

    return { region, fit };
  });

  const chartResize = new ResizeObserver(() => charts.forEach(chart => chart.fit()));
  for (const chart of charts) {
    chart.fit();
    chartResize.observe(chart.region);
  }
})();
