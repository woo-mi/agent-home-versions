import { createVersionMenu } from './version-menu.mjs?v=76591447';

const versions = new Set(['v1', 'v2', 'v3']);
const description = document.getElementById('agent-description');
const originalDescription = description.textContent;
const shortDescription = 'Every day I pull the numbers across sales, finance, and ops, compare them to plan, and send you a two-line recap: the verdict, the biggest risk.';
const menu = createVersionMenu({
  controlId: 'home-version-control',
  triggerId: 'home-version-trigger',
  menuId: 'home-version-menu',
  onSelect: version => select(version, true),
});

function select(version, updateUrl = false) {
  if (!versions.has(version)) return;
  document.body.dataset.homeVersion = version;
  description.textContent = version === 'v1' ? originalDescription : shortDescription;
  menu.setSelection(version, `Home ${version}`, `Home version ${version}`);
  if (updateUrl) {
    const url = new URL(location.href);
    if (version === 'v1') url.searchParams.delete('home');
    else url.searchParams.set('home', version);
    history.replaceState(null, '', url);
  }
}

document.addEventListener('keydown', event => menu.handleEscape(event));
const requestedVersion = new URLSearchParams(location.search).get('home');
select(versions.has(requestedVersion) ? requestedVersion : 'v1');
