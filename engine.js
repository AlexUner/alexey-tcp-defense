export const emptyState=()=>({revision:0,levels:{},history:[],session:null,finals:[]});
export function shuffle(a,rand=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function selectDeck(bank,state,mode='cards',topic=null,rand=Math.random){
  const pool=bank.cards.filter(c=>!topic||c.topic===topic);
  if(mode==='final'){
    if(!bank.cards.every(c=>(state.levels[c.id]?.level||0)>=3))throw Error('Сначала освойте все карточки.');
    return shuffle(bank.cards.map(c=>c.id),rand);
  }
  const seen=shuffle(pool.filter(c=>state.levels[c.id]).map(c=>c.id),rand).sort((a,b)=>state.levels[a].level-state.levels[b].level||state.levels[a].lastAt-state.levels[b].lastAt);
  const fresh=pool.filter(c=>!state.levels[c.id]).map(c=>c.id);
  const review=seen.slice(0,fresh.length?Math.min(seen.length,3+Math.floor(rand()*3)):15);
  const ids=[...fresh.slice(0,15-review.length),...review];
  ids.push(...seen.filter(k=>!ids.includes(k)).slice(0,15-ids.length));
  return shuffle(ids,rand);
}
export function recordAnswer(state,id,correct,sessionId,now=Date.now()){
  const p=state.levels[id]??={level:0,correct:0,wrong:0,lastSession:null,lastAt:0};
  const before=p.level;
  if(correct){p.correct++;if(p.lastSession!==sessionId)p.level=Math.min(3,p.level+1);}
  else{p.wrong++;p.level=Math.max(0,p.level-2);}
  p.lastSession=sessionId;p.lastAt=now;
  state.history.push({card:id,correct,before,after:p.level,at:now});state.history=state.history.slice(-3000);
}
export function applyAction(bank,state,action,p={}){
  const cards=Object.fromEntries(bank.cards.map(c=>[c.id,c]));
  const finish=()=>{const s=state.session;if(!s||s.finished)return;if(s.mode==='final'){
    for(const[id,a]of Object.entries(s.answers))recordAnswer(state,id,a.correct,s.id);
    const correct=Object.values(s.answers).filter(a=>a.correct).length;
    state.finals.push({at:Date.now(),correct,total:s.deck.length,answered:Object.keys(s.answers).length,passed:correct===s.deck.length});
  }s.finished=true;};
  if(action==='start'){
    if(state.session&&!state.session.finished)throw Error('Сначала завершите начатый подход.');
    const deck=selectDeck(bank,state,p.mode,p.topic);
    state.session={id:crypto.randomUUID(),mode:p.mode||'cards',deck,index:0,answers:{},orders:Object.fromEntries(deck.map(k=>[k,shuffle(cards[k].options.map((_,i)=>i))])),finished:false,startedAt:Date.now()};
  }else if(action==='answer'){
    const s=state.session;
    if(!s||s.finished||s.id!==p.sessionId)throw Error('Подход уже изменился.');
    if(s.answers[p.card])return state;
    if(s.deck[s.index]!==p.card||!cards[p.card]?.options[p.choice])throw Error('Некорректный ответ.');
    const correct=cards[p.card].options[p.choice].correct;
    s.answers[p.card]={choice:p.choice,correct};
    if(s.mode==='cards')recordAnswer(state,p.card,correct,s.id);
  }else if(action==='next'){
    const s=state.session;if(!s||s.finished||s.id!==p.sessionId)throw Error('Подход уже изменился.');
    if(!s.answers[s.deck[s.index]])throw Error('Сначала выберите ответ.');
    if(s.index+1<s.deck.length)s.index++;else finish();
  }else if(action==='finish'){if(state.session?.id!==p.sessionId)throw Error('Подход уже изменился.');finish();}
  else throw Error('Неизвестное действие.');
  state.revision++;state.updatedAt=Date.now();return state;
}
