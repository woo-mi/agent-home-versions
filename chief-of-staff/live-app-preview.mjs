/** Keep the app document mounted while the panel opens, closes, or shows a report. */
export function createLiveAppPreview({ source, onClose }) {
  const frame = document.getElementById('live-app-preview-v3');

  frame.addEventListener('load', () => {
    frame.contentDocument?.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    });
  });

  return {
    setActive(active) {
      frame.classList.toggle('app-preview-inactive', !active);
      frame.inert = !active;
      frame.setAttribute('aria-hidden', String(!active));
    },
    prepare() {
      if (!frame.hasAttribute('src')) frame.src = source;
    },
  };
}
