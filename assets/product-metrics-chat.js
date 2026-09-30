const named=(name,root=document)=>root.querySelector(`[data-pencil-name="${name}"]`);
const content=named('Conversation content');
const users=[...content.children].filter(x=>x.dataset.pencilName==='User message');
const assistants=[...content.children].filter(x=>x.dataset.pencilName==='Wisdom AI message');
const defaults=users.map(x=>named('User response',x).textContent.trim());
const questions=assistants.map(x=>named('Assistant response',x).textContent.trim());
let answers=[...defaults],step=0,complete=false,paused=false;
const key='product-metrics-prototype-v1';
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
let chatMode='build';
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
const menu=document.querySelector('#prototype-menu');menu.innerHTML='';
const more=iconButton(named('More options'),'Conversation options');more.setAttribute('aria-expanded','false');
function closeMenu(){menu.hidden=true;more.setAttribute('aria-expanded','false')}
more.onclick=()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden))};
menu.append(button('View complete example',()=>{closeMenu();resetTranscript();answers=[...defaults];step=19;complete=true;paused=false;setMode('ask');render();save();scrollToLatest()}),button('Edit configuration',()=>{closeMenu();editConfig()}),button('Restart setup',()=>{closeMenu();resetTranscript();answers=[...defaults];step=0;complete=false;paused=false;try{localStorage.removeItem(key)}catch{}input.value='';attachments.replaceChildren();setMode('build');render();scroller.scrollTo({top:0})}));
const home=document.createElement('a');home.href='./#va-smaller';home.textContent='Back to agent home';menu.append(home);
document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!more.contains(e.target))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
const config=named('Agent configuration'),sample=named('Sample product metrics brief'),status=named('Scheduled agent status');
config.id='configuration';sample.id='sample';status.id='scheduled';
function save(){try{localStorage.setItem(key,JSON.stringify({answers,step,complete,paused}))}catch{}}
function setText(name,text){named(name).textContent=text}
function updateConfig(){
setText('Scheduled status',paused?'Ⅱ  Product Metrics Brief is paused':'✓  Product Metrics Brief is scheduled');
 const values=[answers[1]+' — '+answers[2],answers[3]+' · '+(answers[5]==='Yes.'?'product.events, product.daily_active_users, product.signups, billing.subscriptions':answers[5]),answers[6]+' · '+answers[7],answers[8],answers[9],answers[10]+' · '+answers[11],answers[12]+' · '+answers[13],answers[14],answers[15]+' · '+answers[16]+' · '+answers[17]];
 config.querySelectorAll('[data-pencil-name="Setting value"]').forEach((x,i)=>x.textContent=values[i]);
 setText('Delivery details',answers[12]);
 named('Assistant response',assistants[19]).textContent='Scheduled in this prototype. Delivery: '+answers[12];
 const shortFormat=/5 key|numbers only/i.test(answers[13]);for(const label of ['Chart title','Chart caption','7-day activation chart'])named(label).hidden=shortFormat;
 const threshold=Number(answers[10].match(/\d+(\.\d+)?/)?.[0]||15);
 named('Activation anomaly').hidden=threshold>=18||/^no\b/i.test(answers[10]);
 named('Root cause').hidden=/just report|^no\b/i.test(answers[11]);
 const anomaly=named('Activation anomaly');
 if(/anomalies first/i.test(answers[14]))sample.insertBefore(anomaly,named('Headline numbers'));else sample.insertBefore(anomaly,named('Segments title'));
 named('Segment table').hidden=/^no\b|none/i.test(answers[9]);named('Segments title').hidden=named('Segment table').hidden;
}
function scrollToLatest(){requestAnimationFrame(()=>{scroller.scrollTo({top:scroller.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});updateLatest()})}
function submit(value=input.value){const text=value.trim();if(!text)return;if(arguments.length&&!complete)setMode('build');if(chatMode==='ask'){followup(text);return}if(step===0&&!/data analyst/i.test(text)){hint.textContent='Choose Data analyst to explore this Product Metrics Brief prototype.';return}if(!complete&&step===18&&!/schedule|confirm|yes/i.test(text)){hint.textContent='Use Edit configuration to make changes, or Schedule this brief to confirm.';return}if(step===17&&!/yes|sample|preview/i.test(text)){hint.textContent='Use Edit configuration to make changes, or Generate sample brief to continue.';return}if(complete){followup(text);return}answers[step+1]=text;step++;choices.before(users[step],assistants[step]);input.value='';if(step===19){complete=true;setMode('ask')}attachments.replaceChildren();render();save();scrollToLatest()}
const presets={2:['Product usage.'],3:['BigQuery.'],4:['Look and suggest.'],6:['DAU, signups, activation rate, and churn.'],7:['Activation = user completes onboarding within 7 days. Churn = subscription canceled.'],8:['Same day last week and 7-day average.','Yesterday.'],9:['By plan and platform.','No segmentation.'],10:['Yes, 15%.','Yes, 10%.','No anomalies.'],11:['Try to explain why.','Just report it.'],12:['8 AM Pacific, weekdays, Slack #product-metrics.'],13:['One screen with a chart.','5 key numbers.','Full report.'],14:['Put anomalies first.','Keep the proposed order.'],15:['Read-only.','Create tickets in Linear.'],16:['Follow-up questions are fine.','One-way only.'],17:['Send with a note.','Hold it.']};
function resetTranscript(){document.querySelectorAll('.followup-message').forEach(x=>x.remove());users.forEach((user,i)=>choices.before(user,assistants[i]))}
function render(){
hint.textContent='Interactive prototype · Sample data. Scheduling is simulated; no Slack messages are sent.';
 users.forEach((u,i)=>{u.hidden=i>step;named('User response',u).textContent=answers[i]});assistants.forEach((a,i)=>a.hidden=i>step);
 updateConfig();choices.replaceChildren();input.placeholder=chatMode==='ask'?'Ask Wisdom about your data…':'Reply or describe the agent you want to build…';
 const next=step+1;
 if(step===0){const options=named('Options');options.replaceChildren();['Personal — your calendar, inbox, and tasks for the day','Team — what your team shipped, blockers, and updates','Data analyst — key metrics, trends, and anomalies from your data','News & market — industry news, competitors, market moves','Custom — mix of the above'].forEach((label,i)=>{const b=button(String.fromCharCode(65+i)+'   '+label,()=>{if(i===2)submit('Data analyst.');else{input.value=label.split(' — ')[0];hint.textContent='This screen prototypes the data analyst setup. Choose Data analyst to continue the Product Metrics Brief flow.';input.focus()}},'brief-option');if(i!==2){b.disabled=true;b.title='This prototype covers the Data analyst flow'}const keyLabel=document.createElement('span');keyLabel.className='option-key';keyLabel.textContent=String.fromCharCode(65+i);const copy=document.createElement('span');copy.textContent=label;b.replaceChildren(keyLabel,copy);options.append(b)});}
 else named('Options').innerHTML='';
 if(step>0){const b=document.createElement('div');b.className='confirmed-choice';b.textContent='C   '+answers[1]+'   ✓';named('Options').append(b)}
 const datasetOptions=named('Dataset options');
 datasetOptions.querySelectorAll('input').forEach(x=>x.remove());
 if(step===4){[...datasetOptions.children].forEach(row=>{const cb=document.createElement('input');cb.type='checkbox';cb.checked=true;cb.setAttribute('aria-label',row.dataset.pencilName);row.prepend(cb)});choices.append(button('Use selected datasets',()=>{const selected=[...datasetOptions.querySelectorAll('input:checked')].map(x=>x.parentElement.dataset.pencilName);if(!selected.length){hint.textContent='Select at least one dataset to continue.';return}submit(selected.join(', '))}));}
 else if(step===17){choices.append(button('Generate sample brief',()=>submit('Yes.')),button('Edit configuration',editConfig));}
 else if(step===18){choices.append(button('Schedule this brief',()=>submit('Good. Schedule it.')),button('Edit configuration',editConfig));}
 else if(complete){choices.append(button('Edit configuration',editConfig),button('View sample brief',()=>sample.scrollIntoView({block:'start'})),button(paused?'Resume schedule':'Pause schedule',toggleSchedule));}
 else if(next!==1){(presets[next]||[defaults[next]]).filter(Boolean).forEach(text=>choices.append(button(text,()=>submit(text))));}
 if(step<18)sample.hidden=true;else sample.hidden=false;syncInput();
}
function toggleSchedule(){paused=!paused;status.dataset.paused=String(paused);setText('Scheduled status',paused?'Ⅱ  Product Metrics Brief is paused':'✓  Product Metrics Brief is scheduled');choices.lastChild.textContent=paused?'Resume schedule':'Pause schedule';save()}
const fields=[['Brief type',1],['Area',2],['Data source',3],['Datasets',5],['Metrics',6],['Definitions',7],['Comparisons',8],['Segments',9],['Anomalies',10],['Explanation',11],['Delivery',12],['Format',13],['Order',14],['Permissions',15],['Follow-up questions',16],['Missing data',17]];
function editConfig(){const dialog=document.createElement('dialog');dialog.className='config-dialog';const form=document.createElement('form');const title=document.createElement('h2');title.textContent='Edit Product Metrics Brief';form.append(title);fields.forEach(([label,i])=>{const wrap=document.createElement('label');wrap.textContent=label;const field=document.createElement('textarea');field.name=String(i);field.value=answers[i];field.rows=2;field.required=true;wrap.append(field);form.append(wrap)});const actions=document.createElement('div');actions.className='choices';actions.append(button('Cancel',()=>dialog.close()));const saveButton=document.createElement('button');saveButton.type='submit';saveButton.textContent='Save changes';saveButton.className='choice primary';actions.append(saveButton);form.append(actions);form.onsubmit=e=>{e.preventDefault();fields.forEach(([,i])=>answers[i]=form.elements.namedItem(String(i)).value.trim());updateConfig();users.forEach((u,i)=>named('User response',u).textContent=answers[i]);save();dialog.close()};dialog.append(form);document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal()}
function followup(text){input.value='';const user=users[0].cloneNode(true);user.classList.add('followup-message');user.hidden=false;named('User response',user).textContent=text;const answer=assistants[1].cloneNode(true);answer.classList.add('followup-message');answer.hidden=false;const lower=text.toLowerCase();let response;if(/schedule|delivery|when/.test(lower))response='Current delivery: '+answers[12]+'. You can change this in Edit configuration.';else if(/anomal|activation|drop/.test(lower))response='In the sample, activation is 31%, down 18% from the 7-day average. Free-plan Android onboarding step 3 completions dropped 40% after 2 PM. This is illustrative sample data.';else if(/data|source/.test(lower))response='Configured source: '+answers[3]+'. Datasets: '+answers[5]+'.';else if(/edit|change|adjust/.test(lower)){editConfig();response='Update the fields in Edit configuration and save your changes.'}else response='You can ask about the schedule, data sources, or activation anomaly, or use Edit configuration to change the brief. This prototype uses sample data.';named('Assistant response',answer).textContent=response;choices.before(user,answer);syncInput();attachments.replaceChildren();scrollToLatest()}
send.onclick=()=>submit();input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();submit()}};
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Array.isArray(saved.answers)&&saved.answers.length===20&&saved.answers.every(x=>typeof x==='string')&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<=19){answers=saved.answers;step=saved.step;complete=step===19;paused=Boolean(saved.paused)}}catch{}
if(complete)chatMode='ask';modeSwitch.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===chatMode)));render();if(step>0)scrollToLatest();if(paused){paused=false;toggleSchedule()}
