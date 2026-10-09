const byId = (id) => document.getElementById(id);
const status = byId('agents-status');
const minePanel = byId('mine-panel');
const suggestionsPanel = byId('suggestions-panel');
const grid = byId('suggestion-grid');
const tabs = [byId('mine-tab'), byId('suggestions-tab')];
const rows = [...byId('agent-rows').rows];
const search = byId('agent-search');
const filter = byId('status-filter');
const filterButton = byId('agent-filter');
const filterOptions = byId('filter-options');
const dialog = byId('agent-details');
let detailTrigger;
let ascending = false;

function selectTab(index, focus = false) {
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(index === i));
    tab.tabIndex = index === i ? 0 : -1;
  });
  minePanel.hidden = index !== 0;
  suggestionsPanel.hidden = index !== 1;
  (index === 0 ? document.querySelector('.agent-suggestions') : suggestionsPanel).prepend(grid);
  if (focus) tabs[index].focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(index));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    selectTab(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index, true);
  });
});
byId('see-more').addEventListener('click', () => selectTab(1, true));

function filterRows() {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  rows.forEach((row) => {
    const matches = row.dataset.name.toLocaleLowerCase().includes(query)
      && (filter.value === 'all' || row.dataset.status === filter.value);
    row.hidden = !matches;
    if (matches) count++;
  });
  byId('agents-empty').hidden = count !== 0;
  status.textContent = `${count} ${count === 1 ? 'agent' : 'agents'} shown.`;
}
search.addEventListener('input', filterRows);
filter.addEventListener('change', filterRows);
function closeFilter(restoreFocus = false) {
  filterOptions.hidden = true;
  filterButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) filterButton.focus();
}
filterButton.addEventListener('click', () => {
  const opening = filterOptions.hidden;
  filterOptions.hidden = !opening;
  filterButton.setAttribute('aria-expanded', String(opening));
  if (opening) filter.focus();
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.filter-control')) closeFilter();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !filterOptions.hidden) {
    event.preventDefault();
    closeFilter(true);
  }
});
byId('sort-agents').addEventListener('click', () => {
  ascending = !ascending;
  const sorted = [...rows].sort((a, b) => a.dataset.name.localeCompare(b.dataset.name) * (ascending ? 1 : -1));
  byId('agent-rows').append(...sorted);
  byId('sort-agents').closest('th').setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
});

function showDetails(trigger, title, description, entries = []) {
  detailTrigger = trigger;
  byId('agent-details-title').textContent = title;
  byId('agent-details-description').textContent = description;
  byId('agent-details-description').hidden = !description;
  const meta = byId('agent-details-meta');
  meta.replaceChildren();
  for (const [label, value] of entries) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    meta.append(term, detail);
  }
  meta.hidden = entries.length === 0;
  byId('agent-details-setup').hidden = entries.length > 0;
  dialog.showModal();
}
document.querySelectorAll('[data-template]').forEach((card) => {
  card.addEventListener('click', () => showDetails(card, card.querySelector('.template-title').textContent, card.querySelector('.template-description').textContent));
});
document.querySelectorAll('[data-agent]').forEach((button) => {
  button.addEventListener('click', () => {
    const row = rows[Number(button.dataset.agent)];
    const owner = row.querySelector('.agent-owner').cloneNode(true);
    owner.querySelector('.owner-avatar').remove();
    showDetails(button, row.dataset.name, '', [
      ['Owner', owner.textContent],
      ['Last modified', row.cells[3].textContent],
      ['Status', row.dataset.status[0].toUpperCase() + row.dataset.status.slice(1)],
      ['Run logs', row.querySelector('.run-history').getAttribute('aria-label')],
    ]);
  });
});
byId('close-details').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => detailTrigger?.focus());
byId('toggle-navigation').addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('navigation-collapsed');
  byId('toggle-navigation').setAttribute('aria-expanded', String(!collapsed));
  byId('toggle-navigation').setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
});
document.querySelectorAll('[data-preview]').forEach((button) => {
  button.addEventListener('click', () => {
    status.classList.remove('visually-hidden');
    status.textContent = `${button.dataset.preview} is not connected in this prototype.`;
  });
});
