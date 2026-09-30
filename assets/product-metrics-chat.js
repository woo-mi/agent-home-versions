const named=(name,root=document)=>root.querySelector(`[data-pencil-name="${name}"]`);
const content=named('Conversation content');
const users=[...content.children].filter(x=>x.dataset.pencilName==='User message');
const assistants=[...content.children].filter(x=>x.dataset.pencilName==='Wisdom AI message');
const defaults=users.map(x=>named('User response',x).textContent.trim());
const questions=assistants.map(x=>named('Assistant response',x).textContent.trim());
let answers=[...defaults],paused=false;
const composer=named('Message composer');
const input=document.createElement('textarea');input.rows=1;input.placeholder='Type your answer…';input.setAttribute('aria-label','Your answer');named('Input placeholder').replaceWith(input);
const app=content.parentElement;
app.classList.add('chat-app');
const header=named('Conversation header');
const titleGroup=document.createElement('div');titleGroup.className='chat-title-group';
const back=document.createElement('a');back.className='chat-back';back.href='./#va-smaller';back.setAttribute('aria-label','Back to agent home');back.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15 18-6-6 6-6"/></svg>';
const badge=document.createElement('span');badge.className='chat-prototype';badge.textContent='Prototype';
titleGroup.append(back,named('Conversation title'),badge);header.prepend(titleGroup);
const scroller=document.createElement('main');scroller.className='message-scroll';scroller.setAttribute('aria-label','Conversation history');
const footer=document.createElement('footer');footer.className='chat-footer';
const footerInner=document.createElement('div');footerInner.className='chat-footer-inner';footer.append(footerInner);
app.append(header,scroller,footer);scroller.append(content);footerInner.append(composer);
input.className='chat-input';input.id='chat-message';input.setAttribute('aria-label','Message Wisdom');
let chatMode='ask';
function button(label,fn,cls='choice'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=fn;return b}
function iconButton(icon,label){const b=button('',()=>{},'icon-button');b.setAttribute('aria-label',label);icon.replaceWith(b);b.append(icon);return b}
const send=iconButton(named('Send message'),'Send answer');
send.className='composer-tool chat-send';send.setAttribute('aria-label','Send message');
const choices=document.createElement('div');choices.className='choices';content.append(choices);
const hint=document.createElement('p');hint.className='demo-note';hint.setAttribute('role','status');hint.textContent='Interactive prototype · Sample data. Scheduling is simulated; no Slack messages are sent.';composer.after(hint);
const toolbar=document.createElement('div');toolbar.className='composer-toolbar';
const leftTools=document.createElement('div');leftTools.className='composer-toolbar-group';
const rightTools=document.createElement('div');rightTools.className='composer-toolbar-group';
const fileInput=document.createElement('input');fileInput.type='file';fileInput.multiple=true;fileInput.hidden=true;
const attachments=document.createElement('div');attachments.className='attachments';
const attach=button('',()=>fileInput.click(),'composer-tool');attach.setAttribute('aria-label','Attach files');attach.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
fileInput.onchange=()=>{for(const file of fileInput.files){const chip=document.createElement('div');chip.className='attachment-chip';const name=document.createElement('span');name.textContent=file.name;const remove=button('×',()=>chip.remove());remove.setAttribute('aria-label','Remove '+file.name);chip.append(name,remove);attachments.append(chip)}hint.textContent='Files attached for preview only. This prototype does not upload or analyze attachments.';fileInput.value=''};
const modeSwitch=document.createElement('div');modeSwitch.className='composer-mode';modeSwitch.setAttribute('role','group');modeSwitch.setAttribute('aria-label','Conversation mode');
function setMode(mode){chatMode=mode;modeSwitch.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));input.placeholder=mode==='ask'?'Ask Wisdom about your data…':'Reply or describe the agent you want to build…';input.focus({preventScroll:true})}
for(const mode of ['ask','build']){const b=button(mode==='ask'?'Ask':'Build',()=>setMode(mode),'');b.dataset.mode=mode;b.setAttribute('aria-pressed',String(mode===chatMode));modeSwitch.append(b)}
const thinking=button('',()=>{const active=thinking.getAttribute('aria-pressed')!=='true';thinking.setAttribute('aria-pressed',String(active));thinking.querySelector('span').textContent=active?'Thinking':'Quick';hint.textContent=active?'Thinking selected · Responses in this prototype use sample data.':'Quick selected · Responses in this prototype use sample data.'},'thinking-control');thinking.setAttribute('aria-label','Toggle thinking mode');thinking.setAttribute('aria-pressed','true');thinking.innerHTML='<svg viewBox="0 0 24 24"><path d="M9 18h6m-5 3h4M8 14c-1.3-1-2-2.5-2-4a6 6 0 0 1 12 0c0 1.5-.7 3-2 4-1 .8-1 1.3-1 2H9c0-.7 0-1.2-1-2Z"/></svg><span>Thinking</span><span aria-hidden="true">⌄</span>';
const mic=button('',()=>{},'composer-tool');mic.setAttribute('aria-label','Dictate message');mic.innerHTML='<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/></svg>';
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){mic.onclick=()=>{const recognition=new Recognition();recognition.lang=navigator.language;recognition.onresult=e=>{input.value+=(input.value?' ':'')+e.results[0][0].transcript;syncInput();input.focus()};recognition.onerror=()=>{hint.textContent='Dictation unavailable. You can type your message below.'};recognition.start()}}else{mic.disabled=true;mic.title='Dictation is not available in this browser'}
leftTools.append(attach,modeSwitch);rightTools.append(thinking,mic,send);toolbar.append(leftTools,rightTools);composer.prepend(attachments);composer.append(toolbar,fileInput);
const latest=button('↓',()=>scrollToLatest(),'latest-button');latest.setAttribute('aria-label','Jump to latest message');latest.hidden=true;footer.prepend(latest);
function updateLatest(){latest.hidden=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<150}
scroller.addEventListener('scroll',updateLatest,{passive:true});
function syncInput(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,144)+'px';send.disabled=!input.value.trim();updateLatest()}
input.addEventListener('input',syncInput);
// The design is a complete conversation. Always display its entire transcript;
// previous guided-setup progress must never hide or rewrite the source messages.
users.forEach(node=>node.hidden=false);
assistants.forEach(node=>node.hidden=false);
const config=named('Agent configuration');
const status=named('Scheduled agent status');
const originalConfig=config.innerHTML;
const originalStatus=status.innerHTML;
const configCells=[...config.querySelectorAll('[data-pencil-name="Setting value"]')].map(node=>node.innerHTML);
config.id='configuration';status.id='scheduled';
const menu=document.querySelector('#prototype-menu');menu.innerHTML='';
const more=iconButton(named('More options'),'Conversation options');
more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls','prototype-menu');
function closeMenu(){menu.hidden=true;more.setAttribute('aria-expanded','false')}
more.onclick=()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden))};
function jumpTo(node){node.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});closeMenu()}
menu.append(
  button('Conversation beginning',()=>jumpTo(users[0])),
  button('Agent configuration',()=>jumpTo(config)),
  button('Scheduling confirmation',()=>jumpTo(assistants.at(-1))),
  button('Reset to design',()=>{closeMenu();resetToDesign()})
);
const home=document.createElement('a');home.href='./#va-smaller';home.textContent='Back to agent home';menu.append(home);
document.addEventListener('click',event=>{if(!menu.contains(event.target)&&!more.contains(event.target))closeMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
const fields=[['Brief type',1],['Area',2],['Data source',3],['Datasets',5],['Metrics',6],['Definitions',7],['Comparisons',8],['Segments',9],['Anomalies',10],['Explanation',11],['Delivery',12],['Format',13],['Order',14],['Permissions',15],['Follow-up questions',16],['Missing data',17]];
function renderActions(){choices.replaceChildren(button('Edit configuration',editConfig),button(paused?'Resume schedule':'Pause schedule',toggleSchedule))}
function resetToDesign(){
  answers=[...defaults];paused=false;
  config.innerHTML=originalConfig;status.innerHTML=originalStatus;
  document.querySelectorAll('.followup-message').forEach(node=>node.remove());
  input.value='';attachments.replaceChildren();setMode('ask');renderActions();syncInput();
  scroller.scrollTo({top:0,behavior:'instant'});
}
function updateConfig(){
  const datasets=answers[5]==='Yes.'?'product.events, product.daily_active_users, product.signups, billing.subscriptions':answers[5];
  const values=[answers[1]+' — '+answers[2],answers[3]+' · '+datasets,answers[6]+' · '+answers[7],answers[8],answers[9],answers[10]+' · '+answers[11],answers[12]+' · '+answers[13],answers[14],answers[15]+' · '+answers[16]+' · '+answers[17]];
  const inputs=[[1,2],[3,5],[6,7],[8],[9],[10,11],[12,13],[14],[15,16,17]];
  config.querySelectorAll('[data-pencil-name="Setting value"]').forEach((node,i)=>{
    if(inputs[i].every(index=>answers[index]===defaults[index]))node.innerHTML=configCells[i];
    else node.textContent=values[i];
  });
  if(answers[12]!==defaults[12])named('Delivery details').textContent=answers[12];
  else named('Delivery details').innerHTML=new DOMParser().parseFromString(originalStatus,'text/html').querySelector('[data-pencil-name="Delivery details"]').innerHTML;
}
function toggleSchedule(){
  paused=!paused;
  named('Scheduled status').textContent=paused?'Ⅱ  Product Metrics Brief is paused':'✓  Product Metrics Brief is scheduled';
  renderActions();
  appendReply(null,paused?'The schedule is paused in this prototype.':'The schedule is resumed in this prototype.');
}
function editConfig(){
  const dialog=document.createElement('dialog');dialog.className='config-dialog';
  const form=document.createElement('form');
  const title=document.createElement('h2');title.textContent='Edit Product Metrics Brief';form.append(title);
  fields.forEach(([label,index])=>{
    const wrap=document.createElement('label');wrap.textContent=label;
    const field=document.createElement('textarea');field.name=String(index);field.value=answers[index];field.rows=2;field.required=true;
    wrap.append(field);form.append(wrap);
  });
  const actions=document.createElement('div');actions.className='choices';actions.append(button('Cancel',()=>dialog.close()));
  const saveButton=document.createElement('button');saveButton.type='submit';saveButton.textContent='Save changes';saveButton.className='choice primary';actions.append(saveButton);form.append(actions);
  form.onsubmit=event=>{
    event.preventDefault();fields.forEach(([,index])=>answers[index]=form.elements.namedItem(String(index)).value.trim());
    updateConfig();dialog.close();appendReply(null,'Your configuration changes are reflected in this prototype. No live delivery has been changed.');
  };
  dialog.append(form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
}
function scrollToLatest(){requestAnimationFrame(()=>{scroller.scrollTo({top:scroller.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});updateLatest()})}
function appendReply(text,response){
  if(text){const user=users[0].cloneNode(true);user.classList.add('followup-message');named('User response',user).textContent=text;choices.before(user)}
  const answer=assistants[1].cloneNode(true);answer.classList.add('followup-message');named('Assistant response',answer).textContent=response;choices.before(answer);
  scrollToLatest();
}
function submit(){
  const text=input.value.trim();if(!text)return;
  const lower=text.toLowerCase();let response;
  if(/edit|change|adjust/.test(lower)){
    editConfig();response='Use Edit configuration to update the settings for this brief.';
  }else if(/schedule|delivery|when/.test(lower)){
    response=(paused?'The schedule is paused. Configured delivery: ':'Current delivery: ')+answers[12].replace(/[.\s]+$/,'')+'.';
  }else if(/activation|definition/.test(lower)){
    response=answers[7];
  }else if(/anomal|threshold/.test(lower)){
    response='Anomaly setting: '+answers[10]+' '+answers[11];
  }else if(/data|source|dataset/.test(lower)){
    response='Configured source: '+answers[3]+' Datasets: '+(answers[5]==='Yes.'?'product.events, product.daily_active_users, product.signups, billing.subscriptions.':answers[5]);
  }else if(/metric|cover/.test(lower)){
    response='The brief covers '+answers[6];
  }else{
    response='You can ask about metrics, activation, data sources, anomalies, or delivery. Use Edit configuration to change the brief. This prototype does not connect to live data.';
  }
  input.value='';attachments.replaceChildren();appendReply(text,response);syncInput();
}
send.onclick=submit;
input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();submit()}};
input.placeholder='Ask a follow-up or adjust this agent…';
renderActions();syncInput();
requestAnimationFrame(()=>{scroller.scrollTop=0;updateLatest()});
