const app=document.querySelector('#app'),api=window.STUDY_CONFIG.api;
let bank,state,screen='home',busy=false,error='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>bank.cards.find(c=>c.id===id);
const level=id=>state.levels[id]?.level||0;
const mastered=()=>bank.cards.filter(c=>level(c.id)===3).length;
const active=()=>state.session&&!state.session.finished;
function button(action,text,primary=false,disabled=false){return `<button data-action="${action}" class="${primary?'primary':''}" ${busy||disabled?'disabled':''}>${text}</button>`;}
function progress(value,total,label){return `<div class="progress" role="progressbar" aria-label="${label}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${100*value/total}%"></span></div>`;}
function lineRanges(numbers){const ranges=[];for(const n of numbers){const last=ranges.at(-1);if(last&&n===last[1]+1)last[1]=n;else ranges.push([n,n]);}return ranges.map(([a,b])=>a===b?a:`${a}-${b}`).join(', ');}
function codeExample(c){
 const focus=c.codeFocus,e=bank.evidence[focus?.evidence||c.evidence],selected=new Set(focus?.lines||[]);
 const raw=e.code.split('\n');
 const rows=raw.map((line,i)=>{const n=e.start+i;return `<span class="code-line${selected.has(n)?' code-key-line':''}" data-line="${n}"><span class="line-number" data-number="${n}" aria-hidden="true"></span><span class="code-text">${e.highlightedLines?.[i]??esc(line)}</span></span>`;}).join('');
 return `<details class="code-details"><summary>Код</summary><p class="source">${esc(e.file)}:${e.start}-${e.end}</p>${selected.size?`<p class="code-guide">Ключевые строки: ${lineRanges([...selected])}.</p>`:''}${focus?.note?`<p class="code-note">${esc(focus.note)}</p>`:''}<pre class="source-code" tabindex="0" aria-label="Исходный код, ${e.language==='cmake'?'CMake':'C++'}"><code>${rows}</code></pre></details>`;
}
function home(){const count=mastered();return `<h1>Подготовка к защите</h1><div class="progress-label">Освоено ${count} из ${bank.cards.length}</div>${progress(count,bank.cards.length,'Освоено вопросов')}<div class="start-actions">${button(active()?'resume':'start',active()?'Продолжить билет':'Начать билет',true)}${button('final','Итоговый тест',false,count<bank.cards.length||active())}<a class="faq-entry" href="faq.html">Теория: вопросы и ответы</a></div><section class="topics" aria-label="Темы">${bank.topics.map(t=>{const cards=bank.cards.filter(c=>c.topic===t.id),done=cards.filter(c=>level(c.id)===3).length;return `<div class="topic ${done===cards.length?'done':''}"><span>${esc(t.title)}</span><span class="topic-count">${done===cards.length?'Освоено':`${done} / ${cards.length}`}</span></div>`;}).join('')}</section>`;}
function explanation(c,a){const v=bank.visuals?.[c.visual];return `<section class="explanation"><h2>${a.correct?'Верно':'Неверно'}</h2><p><strong>${esc(c.answer)}</strong></p><p>${esc(c.explanation)}</p>${!a.correct?`<p>${esc(c.options[a.choice].explanation)}</p>`:''}<div class="theory"><h3>Немного теории</h3><p>${esc(c.theory)}</p><h3>В C++</h3><p>${esc(c.cpp)}</p></div>${v?`<figure class="memory-image"><img src="${esc(v.src)}" alt="${esc(v.alt)}" width="1536" height="1024" loading="lazy" decoding="async"><figcaption>${esc(v.caption)}</figcaption></figure>`:''}${codeExample(c)}</section>`;}
function quiz(){const s=state.session,c=byId(s.deck[s.index]),a=s.answers[c.id],final=s.mode==='final';return `<div class="question-top">${button('home','К билетам')}<span>${final?'Итоговый тест':'Билет'} · ${s.index+1} / ${s.deck.length}</span></div>${progress(Object.keys(s.answers).length,s.deck.length,'Ответов')}<h1 class="question" tabindex="-1">${esc(c.question)}</h1><div class="answers">${s.orders[c.id].map((idx,pos)=>`<button class="answer ${a?(final?(a.choice===idx?'selected':''):c.options[idx].correct?'correct':a.choice===idx?'incorrect':''):''}" data-action="answer" data-choice="${idx}" ${busy||a?'disabled':''}><span class="number">${pos+1}</span><span>${esc(c.options[idx].text)}${a?.choice===idx?'<small>Ваш ответ</small>':''}</span></button>`).join('')}</div>${a?(final?'<p class="saved" role="status">Ответ сохранен</p>':explanation(c,a)):''}<div class="next">${button('next',s.index+1===s.deck.length?(final?'Завершить тест':'Завершить билет'):'Следующий вопрос',true,!a)}</div>`;}
function result(){const s=state.session,correct=Object.values(s.answers).filter(a=>a.correct).length;return `<h1>${s.mode==='final'?'Итоговый тест':'Билет завершен'}</h1><p class="result-score">${correct} из ${s.deck.length} верно</p><div class="start-actions">${button('home','К билетам',true)}</div><section class="review-list">${s.deck.map(id=>{const c=byId(id),a=s.answers[id];return `<details class="review"><summary><span class="status ${a?.correct?'good':'bad'}">${a?.correct?'Верно':a?'Повторить':'Без ответа'}</span>${esc(c.question)}</summary>${a?explanation(c,a):''}</details>`;}).join('')}</section>`;}
function render(focus=false){app.innerHTML=`<main id="main">${error?`<div class="error" role="alert"><p>${esc(error)}</p>${button('refresh','Повторить')}</div>`:''}${state?({home,quiz,result}[screen]||home)():error?'':'<p class="loading">Загрузка…</p>'}<div class="saving" role="status" aria-live="polite">${busy?'Сохраняем…':''}</div></main>`;if(focus){window.scrollTo(0,0);document.querySelector('.question')?.focus({preventScroll:true});}}
async function request(path,payload){const r=await fetch(api+path,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store',signal:AbortSignal.timeout(12000)});const data=await r.json();if(!r.ok){if(data.state)state=data.state;throw Error(data.error||'Не удалось сохранить ответ.');}return data;}
async function refresh(){if(!bank||busy)return;try{state=await request('/state');error='';if(screen==='quiz'&&state.session?.finished)screen='result';}catch{error='Нет связи. Прогресс пока не обновлен.';}render();}
async function action(name,extra={}){if(busy)return;busy=true;error='';render();try{state=await request('/'+name,{...extra,revision:state.revision,sessionId:state.session?.id});screen=state.session?.finished?'result':'quiz';}catch(e){error=e.message==='Failed to fetch'?'Нет связи. Ответ пока не подтвержден. Нажми «Повторить», когда связь появится.':e.message;try{state=await request('/state');}catch{}}finally{busy=false;render(name==='next'||name==='start');}}
app.addEventListener('click',async event=>{const el=event.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action;
 if(a==='home'){screen='home';render(true);}
 else if(a==='resume'){screen='quiz';render(true);}
 else if(a==='refresh')await refresh();
 else if(a==='start'||a==='final')await action('start',{mode:a==='final'?'final':'cards'});
 else if(a==='answer')await action('answer',{card:state.session.deck[state.session.index],choice:Number(el.dataset.choice)});
 else if(a==='next')await action('next');
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(screen==='home'&&!document.hidden)refresh();},20000);
try{bank=await(await fetch('bank.json?v=20261001-explanations')).json();await refresh();}catch{error='Не удалось загрузить вопросы. Обнови страницу.';render();}

app.addEventListener('toggle',event=>{
 const details=event.target;
 if(!details.matches('.code-details')||!details.open)return;
 const pane=details.querySelector('.source-code'),first=details.querySelector('.code-key-line');
 if(first)pane.scrollTop=first.getBoundingClientRect().top-pane.getBoundingClientRect().top+pane.scrollTop-48;
},true);
