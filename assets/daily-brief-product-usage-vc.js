const named=(name,root=document)=>root.querySelector(`[data-pencil-name="${name}"]`);
const content=named('Conversation content');
const users=[...content.querySelectorAll('[data-pencil-name="User message"]')];
const assistants=[...content.querySelectorAll('[data-pencil-name="Wisdom AI message"]')];
const assistantTextTemplate=named('Assistant response',content);
const textOf=node=>node?.textContent.replace(/\s+/g,' ').trim()||'';
// Match each answer to its preceding question/card, including source frame wrappers.
function answerAfter(question){
  const user=[...users].reverse().find(node=>question.test(textOf(node.previousElementSibling)));
  return textOf(user&&named('User response',user));
}
const composer=named('Message composer');
const input=document.createElement('textarea');input.rows=1;input.placeholder='Type your answer…';input.setAttribute('aria-label','Your answer');named('Input placeholder').replaceWith(input);
const app=content.parentElement;
app.classList.add('chat-app');
const header=named('Conversation header');
const titleGroup=document.createElement('nav');titleGroup.className='chat-title-group';titleGroup.setAttribute('aria-label','Conversation navigation');
const sidebarToggle=document.createElement('button');sidebarToggle.type='button';sidebarToggle.className='chat-sidebar-toggle';sidebarToggle.setAttribute('aria-label','Hide sidebar');sidebarToggle.setAttribute('aria-expanded','true');sidebarToggle.setAttribute('aria-controls','app-sidebar');sidebarToggle.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1.5" width="14" height="13" rx="2.5" fill="none" stroke="#666666"/><path d="M5.6 1.5 L5.6 14.5" fill="none" stroke="#666666"/></svg>';
const sidebar=named('aside');sidebar.id='app-sidebar';
sidebarToggle.onclick=()=>{const collapsed=app.classList.toggle('sidebar-collapsed');sidebar.hidden=collapsed;sidebarToggle.setAttribute('aria-expanded',String(!collapsed));sidebarToggle.setAttribute('aria-label',collapsed?'Show sidebar':'Hide sidebar')};
const back=document.createElement('a');back.className='chat-back';back.href='./#va-smaller';back.setAttribute('aria-label','Back to agent home');back.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.9 3.2 L5.3 8 L9.9 12.8" fill="none" stroke="#171717" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Agent / Daily brief</span>';
titleGroup.append(sidebarToggle,back);header.replaceChildren(titleGroup);
const scroller=document.createElement('main');scroller.className='message-scroll';scroller.setAttribute('aria-label','Conversation history');
const footer=document.createElement('footer');footer.className='chat-footer';
const footerInner=document.createElement('div');footerInner.className='chat-footer-inner';footer.append(footerInner);
app.append(header,scroller,footer);scroller.append(content);footerInner.append(composer);
input.className='chat-input';input.id='chat-message';input.setAttribute('aria-label','Message Wisdom');
let chatMode='build';
function button(label,fn,cls='choice'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;return b}
function iconButton(icon,label){const b=button('',()=>{},'icon-button');b.setAttribute('aria-label',label);icon.replaceWith(b);b.append(icon);return b}
const send=iconButton(named('Send message'),'Send answer');
send.className='composer-tool chat-send';send.setAttribute('aria-label','Send message');send.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 11 5-5 5 5M12 6v12"/></svg>';
const choices=document.createElement('div');choices.className='choices';content.append(choices);
const hint=document.createElement('p');hint.className='composer-status';hint.setAttribute('role','status');composer.after(hint);
const toolbar=document.createElement('div');toolbar.className='composer-toolbar';
const leftTools=document.createElement('div');leftTools.className='composer-toolbar-group';
const rightTools=document.createElement('div');rightTools.className='composer-toolbar-group';
const fileInput=document.createElement('input');fileInput.type='file';fileInput.multiple=true;fileInput.hidden=true;
const attachments=document.createElement('div');attachments.className='attachments';
const attach=button('',()=>fileInput.click(),'composer-tool');attach.setAttribute('aria-label','Attach files');attach.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
fileInput.onchange=()=>{for(const file of fileInput.files){const chip=document.createElement('div');chip.className='attachment-chip';const name=document.createElement('span');name.textContent=file.name;const remove=button('×',()=>chip.remove());remove.setAttribute('aria-label','Remove '+file.name);chip.append(name,remove);attachments.append(chip)}hint.textContent='Files attached for preview only. This prototype does not upload or analyze attachments.';fileInput.value=''};
const modeSwitch=document.createElement('div');modeSwitch.className='composer-mode';modeSwitch.setAttribute('role','group');modeSwitch.setAttribute('aria-label','Conversation mode');
function setMode(mode){chatMode=mode;modeSwitch.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));input.placeholder=mode==='ask'?'Ask Wisdom about your data…':'Describe the app you want to build';input.focus({preventScroll:true})}
for(const mode of ['ask','build']){const b=button(mode==='ask'?'Ask':'Build',()=>setMode(mode),'');b.dataset.mode=mode;b.setAttribute('aria-pressed',String(mode===chatMode));modeSwitch.append(b)}
const thinking=button('',()=>{const active=thinking.getAttribute('aria-pressed')!=='true';thinking.setAttribute('aria-pressed',String(active));thinking.querySelector('span').textContent=active?'Thinking':'Quick';hint.textContent=active?'Thinking selected · Responses in this prototype use sample data.':'Quick selected · Responses in this prototype use sample data.'},'thinking-control');thinking.setAttribute('aria-label','Toggle thinking mode');thinking.setAttribute('aria-pressed','true');thinking.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></svg><span>Thinking</span><svg class="thinking-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const mic=button('',()=>{},'composer-tool');mic.setAttribute('aria-label','Dictate message');mic.innerHTML='<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/></svg>';
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){mic.onclick=()=>{const recognition=new Recognition();recognition.lang=navigator.language;recognition.onresult=e=>{input.value+=(input.value?' ':'')+e.results[0][0].transcript;syncInput();input.focus()};recognition.onerror=()=>{hint.textContent='Dictation unavailable. You can type your message below.'};recognition.start()}}else{mic.disabled=true;mic.title='Dictation is not available in this browser'}
leftTools.append(attach,modeSwitch);rightTools.append(thinking,mic,send);toolbar.append(leftTools,rightTools);composer.prepend(attachments);composer.append(toolbar,fileInput);
const latest=button('↓',()=>scrollToLatest(),'latest-button');latest.setAttribute('aria-label','Jump to latest message');latest.hidden=true;footer.prepend(latest);
function updateLatest(){latest.hidden=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<150}
scroller.addEventListener('scroll',updateLatest,{passive:true});
// Keep the last message above the floating composer as its content grows.
const composerObserver=new ResizeObserver(()=>{
  const atBottom=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<2;
  app.style.setProperty('--composer-height',Math.ceil(composer.getBoundingClientRect().height)+'px');
  if(atBottom)scroller.scrollTop=scroller.scrollHeight;
  updateLatest();
});
composerObserver.observe(composer);
const scrollObserver=new ResizeObserver(()=>{
  app.style.setProperty('--scrollbar-width',(scroller.offsetWidth-scroller.clientWidth)+'px');
});
scrollObserver.observe(scroller);
function syncInput(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,144)+'px';send.disabled=!input.value.trim();updateLatest()}
input.addEventListener('input',syncInput);
// The design is a complete conversation. Always display its entire transcript;
// previous guided-setup progress must never hide or rewrite the source messages.
users.forEach(node=>node.hidden=false);
assistants.forEach(node=>node.hidden=false);
const config=named('Agent configuration');
const status=named('Scheduled agent status');
config.id='configuration';status.id='scheduled';
document.querySelector('#prototype-menu')?.remove();
const settings=[...config.querySelectorAll('[data-pencil-name="Setting label"]')].map(label=>{
  const node=named('Setting value',label.parentElement);
  return {label:textOf(label),node,value:textOf(node)};
});
const settingsByLabel=new Map(settings.map(setting=>[setting.label,setting]));
const settingValue=label=>settingsByLabel.get(label)?.value||'';
function useSelection(label,value){if(value&&settingsByLabel.has(label))settingsByLabel.get(label).value=value}
// Keep the exported cards intact on load. Follow-ups use the latest explicit choices.
const datasets=answerAfter(/see these.*datasets|which datasets/i);
const metrics=answerAfter(/what metrics should the brief cover/i)||answerAfter(/for metrics, what/i);
const definitions=answerAfter(/how do you define activation/i);
if(datasets){const source=settingValue('Data').split(' · ')[0];useSelection('Data',[source,datasets].filter(Boolean).join(' · '))}
useSelection('Metrics',[metrics,definitions].filter(Boolean).join(' · '));
useSelection('Comparisons',answerAfter(/compare against/i));
useSelection('Segments',answerAfter(/segment by/i));
const threshold=answerAfter(/flag anomalies/i);
const explanation=answerAfter(/when it flags/i);
useSelection('Anomalies',[threshold,explanation].filter(Boolean).join(' · '));
function editConfig(){
  const dialog=document.createElement('dialog');dialog.className='config-dialog';
  const form=document.createElement('form');
  const title=document.createElement('h2');title.textContent='Edit Product Metrics Brief';form.append(title);
  settings.forEach(setting=>{
    const wrap=document.createElement('label');wrap.textContent=setting.label;
    const field=document.createElement('textarea');field.name=setting.label;field.value=setting.value;field.rows=2;field.required=true;
    wrap.append(field);form.append(wrap);
  });
  const actions=document.createElement('div');actions.className='choices';actions.append(button('Cancel',()=>dialog.close()));
  const saveButton=document.createElement('button');saveButton.type='submit';saveButton.textContent='Save changes';saveButton.className='choice primary';actions.append(saveButton);form.append(actions);
  form.onsubmit=event=>{
    event.preventDefault();
    settings.forEach(setting=>{
      const value=form.elements.namedItem(setting.label).value.trim();
      if(value!==setting.value){
        setting.value=value;setting.node.textContent=value;
        if(setting.label==='Delivery')named('Delivery details',status).textContent=value;
      }
    });
    dialog.close();appendReply(null,'Your configuration changes are reflected in this prototype. No live delivery has been changed.');
  };
  dialog.append(form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
}
function scrollToLatest(){requestAnimationFrame(()=>{scroller.scrollTo({top:scroller.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});updateLatest()})}
function appendReply(text,response){
  if(text){const user=users[0].cloneNode(true);user.classList.add('followup-message');named('User response',user).textContent=text;choices.before(user)}
  const answer=document.createElement('div');answer.dataset.pencilName='Wisdom AI message';answer.className='followup-message';
  answer.style.cssText='display:flex;flex-direction:column;flex-shrink:0;width:100%;';
  const answerText=assistantTextTemplate.cloneNode(false);answerText.removeAttribute('data-pencil-id');answerText.textContent=response;answer.append(answerText);choices.before(answer);
  scrollToLatest();
}
function submit(){
  const text=input.value.trim();if(!text)return;
  const lower=text.toLowerCase();let response;
  if(/edit|change|adjust/.test(lower)){
    editConfig();response='Use Edit configuration to update the settings for this brief.';
  }else if(/schedule|delivery|when/.test(lower)){
    response='Current delivery: '+settingValue('Delivery').replace(/[.\s]+$/,'')+'.';
  }else if(/activation|definition/.test(lower)){
    response=settingValue('Metrics');
  }else if(/anomal|threshold/.test(lower)){
    response='Anomaly setting: '+settingValue('Anomalies');
  }else if(/data|source|dataset/.test(lower)){
    response='Configured source and datasets: '+settingValue('Data');
  }else if(/metric|cover/.test(lower)){
    response='The brief covers '+settingValue('Metrics');
  }else if(/segment|platform|region/.test(lower)){
    response='Current segments: '+settingValue('Segments');
  }else if(/comparison|compare/.test(lower)){
    response='Current comparisons: '+settingValue('Comparisons');
  }else{
    response='You can ask about metrics, activation, data sources, anomalies, or delivery. Ask me to change the configuration to update the brief. This prototype does not connect to live data.';
  }
  input.value='';attachments.replaceChildren();appendReply(text,response);syncInput();
}
send.onclick=submit;
input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();submit()}};
input.placeholder='Describe the app you want to build';
syncInput();
requestAnimationFrame(()=>{scroller.scrollTop=0;updateLatest()});

// Reuse the home prototype's version control, with links back to each exploration.
const versionWrap=document.querySelector('.version-wrap');
app.append(versionWrap);
const versionTrigger=versionWrap.querySelector('.version-trigger');
const versionMenu=versionWrap.querySelector('.version-menu');
const versionOptions=[...versionMenu.querySelectorAll('[role="menuitem"]')];
function setVersionMenu(open,focusIndex=0){
  versionWrap.classList.toggle('open',open);
  versionTrigger.setAttribute('aria-expanded',String(open));
  versionMenu.hidden=!open;
  if(open)versionOptions[focusIndex].focus({preventScroll:true});
}
versionTrigger.onclick=()=>setVersionMenu(versionMenu.hidden);
versionTrigger.onkeydown=event=>{
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();
    setVersionMenu(true,event.key==='ArrowUp'?versionOptions.length-1:0);
  }
};
versionMenu.onkeydown=event=>{
  const index=versionOptions.indexOf(document.activeElement);
  let next;
  if(event.key==='ArrowDown')next=(index+1)%versionOptions.length;
  if(event.key==='ArrowUp')next=(index-1+versionOptions.length)%versionOptions.length;
  if(event.key==='Home')next=0;
  if(event.key==='End')next=versionOptions.length-1;
  if(next!==undefined){event.preventDefault();versionOptions[next].focus()}
  if(event.key==='Tab')setVersionMenu(false);
};
versionMenu.querySelector('[data-current-prototype]').onclick=()=>{setVersionMenu(false);versionTrigger.focus()};
document.addEventListener('click',event=>{if(!versionWrap.contains(event.target))setVersionMenu(false)});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!versionMenu.hidden){event.preventDefault();setVersionMenu(false);versionTrigger.focus()}
});
function positionVersionControl(){
  const bounds=composer.getBoundingClientRect();
  const raised=innerWidth-16-versionTrigger.offsetWidth<bounds.right+12;
  const bottom=raised?innerHeight-bounds.top+12:16;
  versionWrap.classList.toggle('above-composer',raised);
  versionWrap.style.bottom=bottom+'px';
  versionWrap.style.setProperty('--control-bottom',bottom+'px');
  footer.style.setProperty('--latest-left',(bounds.left-footer.getBoundingClientRect().left)+'px');
}
const versionObserver=new ResizeObserver(positionVersionControl);
versionObserver.observe(footer);
versionObserver.observe(versionTrigger);
window.addEventListener('resize',positionVersionControl);
positionVersionControl();
