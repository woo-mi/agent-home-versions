/* ANIMATION STORYBOARD
 *   0ms  Panel slides in from the right; desktop chat narrows alongside it.
 * 130ms  The newly selected tab settles from 4px below into place.
 * 260ms  Panel reaches its resting position; closing reverses the movement.
 */
(() => {
  'use strict';
  const TIMING = { panel: 260, tab: 130 };
  const PANEL = { easing: 'cubic-bezier(.22,1,.36,1)', closed: 0, open: 1, closing: 2 };
  const OWL = "<div\n      style=\"box-sizing: border-box; height: 44px; overflow: hidden; position: relative; width: 44px\"\n    >\n      <svg\n        viewBox=\"0 -2 2 4.5\"\n        preserveAspectRatio=\"none\"\n        xmlns=\"http://www.w3.org/2000/svg\"\n        style=\"box-sizing: border-box; height: 8.25px; left: 20.167px; overflow: visible; position: absolute; top: 23.833px; width: 3.667px; z-index: 0\"\n      >\n        <path d=\"M0 0c0 0 0.5-2 1-2 0.5 0 1 2 1 2l-1 2.5-1-2.5z\" fill=\"#000000\"></path>\n      </svg>\n      <div\n        style=\"border-radius: 50%; border: 2.444px solid #000000; box-sizing: border-box; height: 44px; left: 0px; position: absolute; top: 0px; width: 44px; z-index: 1\"\n      ></div>\n      <div\n        style=\"background-color: #000000; border-radius: 50%; box-sizing: border-box; height: 7.333px; left: 27.5px; position: absolute; top: 18.333px; width: 7.333px; z-index: 2\"\n      ></div>\n      <div\n        style=\"background-color: #000000; border-radius: 50%; box-sizing: border-box; height: 7.333px; left: 9.167px; position: absolute; top: 18.333px; width: 7.333px; z-index: 3\"\n      ></div>\n      <svg\n        viewBox=\"-17 -16.5 19.342000007629395 18.28600025177002\"\n        preserveAspectRatio=\"none\"\n        xmlns=\"http://www.w3.org/2000/svg\"\n        style=\"box-sizing: border-box; height: 17.192px; left: 41.7px; overflow: visible; position: absolute; top: 1.833px; transform-origin: top left; transform: scaleX(-1); width: 19.7px; z-index: 4\"\n      >\n        <path\n          d=\"M-5.758-11.625l-1.8 2.925-4.442-7.8 0 3.5-5-3.5 5 9.5 14.342 8.786-8.1-13.411z\"\n          fill=\"#000000\"\n        ></path>\n        <path\n          d=\"M-5.758-11.625l-1.8 2.925-4.442-7.8 0 3.5-5-3.5 5 9.5 14.342 8.786-8.1-13.411z\"\n          fill=\"none\"\n          stroke=\"#000000\"\n          stroke-width=\"2.444\"\n          stroke-linejoin=\"round\"\n          vector-effect=\"non-scaling-stroke\"\n        ></path>\n      </svg>\n      <svg\n        viewBox=\"-17 -16.5 19.342000007629395 18.28600025177002\"\n        preserveAspectRatio=\"none\"\n        xmlns=\"http://www.w3.org/2000/svg\"\n        style=\"box-sizing: border-box; height: 17.192px; left: 1.833px; overflow: visible; position: absolute; top: 1.833px; width: 19.7px; z-index: 5\"\n      >\n        <path\n          d=\"M-5.758-11.625l-1.8 2.925-4.442-7.8 0 3.5-5-3.5 5 9.5 14.342 8.786-8.1-13.411z\"\n          fill=\"#000000\"\n        ></path>\n        <path\n          d=\"M-5.758-11.625l-1.8 2.925-4.442-7.8 0 3.5-5-3.5 5 9.5 14.342 8.786-8.1-13.411z\"\n          fill=\"none\"\n          stroke=\"#000000\"\n          stroke-width=\"2.444\"\n          stroke-linejoin=\"round\"\n          vector-effect=\"non-scaling-stroke\"\n        ></path>\n      </svg>\n    </div>";
  const TOOLS = [
    { id: 'notion', name: 'Notion', status: 'Connected', enabled: true },
    { id: 'hubspot', name: 'HubSpot', status: 'Connected', enabled: true },
    { id: 'slack', name: 'Slack', status: 'Connected · WisdomAI', enabled: true },
    { id: 'gmail', name: 'Gmail', status: 'Connecting…', enabled: true },
    { id: 'snowflake', name: 'Snowflake', status: 'Service-account key renewal due', enabled: true },
    { id: 'databricks', name: 'Databricks', status: 'Approval pending · Restrict to product_events', enabled: false }
  ];
  const TABS = [ ['connections','Connections'], ['schedules','Schedules'], ['artifacts','Artifacts'], ['memory','Memory'] ];
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const xIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
  const backIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';

  function start() {
    const trigger = document.getElementById('chief-profile');
    const main = document.querySelector('.main');
    const chat = document.getElementById('chat-scroll');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const overlay = matchMedia('(max-width: 1100px)');
    document.documentElement.style.setProperty('--ws-motion-duration', `${TIMING.panel}ms`);
    document.documentElement.style.setProperty('--ws-motion-ease', PANEL.easing);
    let stage = PANEL.closed;
    let activeTab = 'connections';
    let closeTimer;
    let anchorAnimation = 0;
    let detailOpener;
    const inertBefore = new Map();
    const tabScroll = new Map();
    const taskStates = new Map(window.MVPWorkspaceData.tasks.map(t => [t.id, t.status]));

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'workspace-backdrop';
    backdrop.setAttribute('aria-label', 'Close workspace');
    backdrop.tabIndex = -1;
    backdrop.hidden = true;
    const panel = document.createElement('aside');
    panel.id = 'workspace-panel';
    panel.className = 'workspace-panel';
    panel.hidden = true;
    panel.inert = true;
    panel.tabIndex = -1;
    panel.setAttribute('aria-label', 'Chief of staff workspace');
    panel.innerHTML = `<header class="workspace-header">
      <button class="workspace-close" type="button" aria-label="Close workspace">${xIcon}</button>
      <div class="workspace-avatar" aria-hidden="true">${OWL}</div>
      <h2 class="workspace-title">Chief of staff</h2>
      <div class="workspace-tabs" role="tablist" aria-label="Workspace sections">${TABS.map(([id,label]) => `<button type="button" class="workspace-tab" id="workspace-tab-${id}" role="tab" aria-controls="workspace-${id}" aria-selected="${id===activeTab}" tabindex="${id===activeTab?0:-1}" data-tab="${id}">${label}</button>`).join('')}</div>
    </header><div class="workspace-scroll">${TABS.map(([id]) => `<section class="workspace-tabpanel" id="workspace-${id}" role="tabpanel" aria-labelledby="workspace-tab-${id}" tabindex="0" ${id===activeTab?'':'hidden'}>${id==='connections' ? `<h3 class="ws-tools-heading">Tools</h3><ul class="ws-tools">${TOOLS.map(tool => `<li class="ws-tool"><div class="ws-tool-copy"><p class="ws-tool-name">${tool.name}</p><p class="ws-tool-status" id="ws-tool-${tool.id}-status">${esc(tool.status)}</p></div><button type="button" class="ws-switch" role="switch" aria-checked="${tool.enabled}" aria-label="${tool.name}" aria-describedby="ws-tool-${tool.id}-status" data-tool="${tool.id}"></button></li>`).join('')}</ul>` : window.MVPWorkspaceContent[id]}</section>`).join('')}<section class="ws-detail" hidden></section></div>`;
    document.body.append(backdrop, panel);
    const closeButton = panel.querySelector('.workspace-close');
    const scroll = panel.querySelector('.workspace-scroll');
    const tabs = [...panel.querySelectorAll('[role=tab]')];
    const detail = panel.querySelector('.ws-detail');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Open Chief of staff workspace');

    function rememberAnchor() {
      if (overlay.matches) return null;
      const viewportTop = chat.getBoundingClientRect().top + 128;
      const nodes = [...document.querySelectorAll('#messages .message-source')];
      const node = nodes.find(n => n.getBoundingClientRect().bottom > viewportTop) || document.querySelector('#messages> :last-child');
      return node ? { node, top: node.getBoundingClientRect().top, bottom: chat.scrollHeight - chat.clientHeight - chat.scrollTop < 2 && chat.scrollTop > 0 } : null;
    }
    function preserveAnchor(anchor) {
      const request = ++anchorAnimation;
      if (!anchor) return;
      const startTime = performance.now();
      const tick = now => {
        if (request !== anchorAnimation || !anchor.node.isConnected) return;
        if (anchor.bottom) chat.scrollTop = chat.scrollHeight - chat.clientHeight;
        else chat.scrollTop += anchor.node.getBoundingClientRect().top - anchor.top;
        if (!reduced.matches && now - startTime < TIMING.panel + 40) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    chat.addEventListener('wheel', () => { anchorAnimation++; }, { passive: true });
    chat.addEventListener('touchstart', () => { anchorAnimation++; }, { passive: true });

    function syncModal() {
      const modal = stage === PANEL.open && overlay.matches;
      backdrop.hidden = !modal;
      panel.setAttribute('role', modal ? 'dialog' : 'complementary');
      if (modal) panel.setAttribute('aria-modal', 'true');
      else panel.removeAttribute('aria-modal');
      const outside = [main, document.getElementById('sidebar'), document.querySelector('.prototype-versions')].filter(Boolean);
      outside.forEach(element => {
        if (modal) {
          if (!inertBefore.has(element)) inertBefore.set(element, element.inert);
          element.inert = true;
        } else if (inertBefore.has(element)) {
          element.inert = inertBefore.get(element);
          inertBefore.delete(element);
        }
      });
      if (modal && !panel.contains(document.activeElement)) closeButton.focus({ preventScroll: true });
    }
    function setOpen(open, { restoreFocus = true } = {}) {
      if (open === (stage === PANEL.open)) return;
      const anchor = rememberAnchor();
      clearTimeout(closeTimer);
      if (open) {
        window.dispatchEvent(new Event('mvp-workspace-open'));
        stage = PANEL.open;
        panel.hidden = false;
        panel.inert = false;
        panel.removeAttribute('aria-hidden');
        // Establish the closed position before the CSS transition begins.
        panel.getBoundingClientRect();
        panel.classList.add('is-open');
        document.body.classList.add('workspace-open');
        trigger.setAttribute('aria-expanded', 'true');
        trigger.setAttribute('aria-label', 'Close Chief of staff workspace');
        syncModal();
        closeButton.focus({ preventScroll: true });
      } else {
        const focusWasInside = panel.contains(document.activeElement);
        stage = PANEL.closing;
        panel.classList.remove('is-open');
        document.body.classList.remove('workspace-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Open Chief of staff workspace');
        syncModal();
        if (restoreFocus || focusWasInside) trigger.focus({ preventScroll: true });
        panel.inert = true;
        panel.setAttribute('aria-hidden', 'true');
        const finish = () => { if(stage===PANEL.closing){ stage=PANEL.closed; panel.hidden=true; } };
        if (reduced.matches) finish();
        else closeTimer = setTimeout(finish, TIMING.panel);
      }
      preserveAnchor(anchor);
    }
    function setTab(id, focus = false) {
      if (!TABS.some(([key]) => key===id)) return;
      tabScroll.set(activeTab, scroll.scrollTop);
      detail.hidden = true;
      activeTab = id;
      tabs.forEach(tab => {
        const selected = tab.dataset.tab===id;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panel.querySelector(`#workspace-${tab.dataset.tab}`).hidden = !selected;
      });
      scroll.scrollTop = tabScroll.get(id) || 0;
      const content = panel.querySelector(`#workspace-${id}`);
      if (!reduced.matches) content.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:TIMING.tab,easing:PANEL.easing});
      if (focus) tabs.find(tab => tab.dataset.tab===id).focus({ preventScroll: true });
    }
    function backToTab() {
      detail.hidden = true;
      panel.querySelector(`#workspace-${activeTab}`).hidden = false;
      scroll.scrollTop = tabScroll.get(activeTab) || 0;
      const focusTarget = detailOpener?.isConnected ? detailOpener : tabs.find(tab => tab.dataset.tab === activeTab);
      focusTarget?.focus({ preventScroll: true });
    }
    function showDetail(title, html, opener) {
      if (detail.hidden) tabScroll.set(activeTab, scroll.scrollTop);
      detailOpener = opener;
      panel.querySelector(`#workspace-${activeTab}`).hidden = true;
      detail.innerHTML = `<button type="button" class="ws-detail-back" data-ws-action="detail-back">${backIcon}Back to ${TABS.find(([key])=>key===activeTab)[1]}</button><h3>${esc(title)}</h3>${html}`;
      detail.hidden = false;
      scroll.scrollTop = 0;
      detail.querySelector('button').focus({ preventScroll: true });
    }
    function openTask(id, opener) {
      const task = window.MVPWorkspaceData.tasks.find(t=>t.id===id);
      if (!task) return;
      showDetail(task.title, `<p class="ws-detail-label">Status</p><p class="ws-detail-value">${esc(taskStates.get(id))}</p><button type="button" class="ws-detail-primary" data-ws-action="ask" data-prompt="${esc(`Show me the latest update for ${task.title}.`)}">Ask about this task</button>`, opener);
    }
    trigger.addEventListener('click',()=>setOpen(stage!==PANEL.open));
    closeButton.addEventListener('click',()=>setOpen(false));
    backdrop.addEventListener('click',()=>setOpen(false));
    tabs.forEach(tab=>tab.addEventListener('click',()=>setTab(tab.dataset.tab)));
    panel.querySelector('.workspace-tabs').addEventListener('keydown',event=>{
      const index=tabs.indexOf(document.activeElement);
      if(index<0)return;
      let next;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();setTab(tabs[next].dataset.tab,true);}
    });
    panel.addEventListener('click', event=>{
      const toggle=event.target.closest('[data-tool]');
      if(toggle){
        const tool=TOOLS.find(t=>t.id===toggle.dataset.tool);
        tool.enabled=!tool.enabled;
        toggle.setAttribute('aria-checked',String(tool.enabled));
        panel.querySelector(`#ws-tool-${tool.id}-status`).textContent=tool.enabled?tool.status:'Disabled';
        return;
      }
      const routineToggle = event.target.closest('[data-routine]');
      if (routineToggle) {
        const routine = window.MVPWorkspaceData.routines.find(item => item.id === routineToggle.dataset.routine);
        routine.enabled = !routine.enabled;
        routineToggle.setAttribute('aria-checked', String(routine.enabled));
        return;
      }
      const button=event.target.closest('[data-ws-action]');
      if(!button)return;
      const action=button.dataset.wsAction,id=button.dataset.id;
      if(action==='detail-back')backToTab();
      if(action==='task-detail'||action==='task-review')openTask(id,button);
      if(action==='tasks-all')showDetail('All tasks',`<div class="ws-task-directory">${window.MVPWorkspaceData.tasks.map(task=>`<button type="button" data-ws-action="task-detail" data-id="${task.id}"><span>${esc(task.title)}</span><small>${esc(taskStates.get(task.id))}</small></button>`).join('')}</div>`,button);
      if(action==='artifact-detail'){
        const artifact=window.MVPWorkspaceData.artifacts.find(a=>a.id===id);
        if(artifact)showDetail(artifact.title,`<p class="ws-detail-label">${esc(artifact.category)}</p><button type="button" class="ws-detail-primary" data-ws-action="ask" data-prompt="${esc(`Open ${artifact.title} and show me the latest details.`)}">Ask about ${artifact.category==='Chats'?'this chat':artifact.category==='Agents'?'this agent':'this app'}</button>`,button);
      }
      if(action==='ask'){
        setOpen(false,{restoreFocus:false});
        const input=document.getElementById('message-input');
        input.value=[input.value.trim(),button.dataset.prompt].filter(Boolean).join('\n');
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.focus({preventScroll:true});
      }
    });
    document.addEventListener('keydown',event=>{
      if(stage!==PANEL.open)return;
      if(event.key==='Escape'){
        if(document.querySelector('.prototype-version-trigger')?.getAttribute('aria-expanded')==='true')return;
        event.preventDefault();event.stopImmediatePropagation();
        const thinkingMenu = document.getElementById('thinking-menu');
        if (!overlay.matches && thinkingMenu && !thinkingMenu.hidden) {
          const thinkingButton = document.getElementById('thinking-button');
          thinkingButton.click();
          thinkingButton.focus({ preventScroll: true });
          return;
        }
        if(!detail.hidden)backToTab();
        else setOpen(false);
      }
      if(event.key==='Tab'&&overlay.matches){
        const container=panel;
        const nodes=[...container.querySelectorAll('button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));
        const first=nodes[0],last=nodes[nodes.length-1];
        if(event.shiftKey&&(document.activeElement===first||!container.contains(document.activeElement))){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!container.contains(document.activeElement))){event.preventDefault();first?.focus();}
      }
    },true);
    window.addEventListener('resize',()=>requestAnimationFrame(()=>{syncModal();}));
    window.addEventListener('mvp-view-change',()=>setOpen(false,{restoreFocus:false}));
    window.addEventListener('popstate',()=>setOpen(false,{restoreFocus:false}));
    window.MVPWorkspace=Object.freeze({open:()=>setOpen(true),close:()=>setOpen(false),isOpen:()=>stage===PANEL.open,setTab});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
