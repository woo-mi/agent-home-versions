(() => {
  'use strict';
  const views = Object.freeze([
    Object.freeze({ view: 'text-only', label: 'Text only' }),
    Object.freeze({ view: 'furling-v1', label: 'Furling v1' }),
    Object.freeze({ view: 'furling-v2', label: 'Furling v2' }),
    Object.freeze({ view: 'text-furling', label: 'Text + Furling' })
  ]);
  const findView = value => views.find(item => item.view === value);
  const readView = () => findView(new URL(location.href).searchParams.get('view')) || views[0];
  let current = readView();

  const control = document.createElement('nav');
  control.className = 'prototype-versions';
  control.setAttribute('aria-label', 'Prototype versions');
  control.innerHTML = `
    <button class="prototype-version-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="prototype-version-menu">
      <span class="prototype-version-label"></span>
      <svg class="prototype-version-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m4 7 6 6 6-6"/></svg>
    </button>
    <ul id="prototype-version-menu" class="prototype-version-menu" role="menu" aria-label="Prototype versions" hidden></ul>`;
  const trigger = control.querySelector('button');
  const label = control.querySelector('.prototype-version-label');
  const menu = control.querySelector('[role="menu"]');
  const options = views.map(view => {
    const item = document.createElement('li');
    item.setAttribute('role', 'none');
    const link = document.createElement('a');
    link.className = 'prototype-version-option';
    link.setAttribute('role', 'menuitem');
    link.tabIndex = -1;
    link.dataset.view = view.view;
    link.textContent = view.label;
    item.append(link);
    menu.append(item);
    return link;
  });
  document.body.append(control);
  document.body.classList.add('has-mvp-versions');

  function updateControl() {
    label.textContent = current.label;
    trigger.setAttribute('aria-label', `Switch prototype version, ${current.label}`);
    document.body.dataset.prototypeView = current.view;
    options.forEach(option => {
      const url = new URL(location.href);
      url.searchParams.set('view', option.dataset.view);
      url.searchParams.delete('thread');
      url.hash = '';
      option.href = `${url.pathname}${url.search}${url.hash}`;
      if (option.dataset.view === current.view) option.setAttribute('aria-current', 'page');
      else option.removeAttribute('aria-current');
    });
  }

  function setOpen(open, restoreFocus = false) {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) options.find(option => option.dataset.view === current.view).focus({ preventScroll: true });
    else if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  function notify() {
    window.dispatchEvent(new CustomEvent('mvp-view-change', {
      detail: { view: current.view, label: current.label }
    }));
  }

  function setView(value, { replace = false, dispatch = true } = {}) {
    const next = findView(value);
    if (!next) return false;
    const changed = current.view !== next.view;
    current = next;
    const url = new URL(location.href);
    url.searchParams.set('view', current.view);
    const leavingReplies = url.searchParams.has('thread');
    url.searchParams.delete('thread');
    url.hash = '';
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (path !== `${location.pathname}${location.search}${location.hash}`) {
      history[replace ? 'replaceState' : 'pushState'](null, '', path);
    }
    updateControl();
    setOpen(false);
    if (dispatch && (changed || leavingReplies)) notify();
    return true;
  }

  trigger.addEventListener('click', () => setOpen(menu.hidden));
  trigger.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setOpen(true);
    options[event.key === 'ArrowDown' ? 0 : options.length - 1].focus({ preventScroll: true });
  });
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    if (event.key === ' ' && index >= 0) {
      event.preventDefault();
      options[index].click();
      return;
    }
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      options[next].focus({ preventScroll: true });
    }
    if (event.key === 'Tab') setOpen(false, true);
  });
  options.forEach(option => option.addEventListener('click', event => {
    // Keep standard new-tab and modifier-click behavior for the shareable query links.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setView(option.dataset.view);
    trigger.focus({ preventScroll: true });
  }));
  document.addEventListener('pointerdown', event => {
    if (!control.contains(event.target)) setOpen(false);
  });
  document.addEventListener('focusin', event => {
    if (!control.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  window.addEventListener('popstate', () => {
    const next = readView();
    const changed = next.view !== current.view;
    current = next;
    updateControl();
    setOpen(false);
    if (changed) notify();
  });

  window.MVPVersions = Object.freeze({
    views,
    getCurrent: () => ({ view: current.view, label: current.label }),
    setView
  });
  updateControl();
  requestAnimationFrame(notify);
})();
