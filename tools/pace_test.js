// 演出つき進行(paced)の確認: 同じ種(seed)で、通常進行と1ステップずつ進行の結果が同じになるか。node tools/pace_test.js
const fs=require('fs'),vm=require('vm'),path=require('path'),ROOT=path.join(__dirname,'..');
const HP=process.env.HTML||[path.join(ROOT,'bs-practice.html'),path.join(ROOT,'index.html')].find(f=>fs.existsSync(f));
const html=fs.readFileSync(HP,'utf8'),HDIR=path.dirname(HP);
const eng=(html.match(/<script id="engine">([\s\S]*?)<\/script>/)||[])[1]||[...html.matchAll(/<script src="(js\/engine-[^"]+)"><\/script>/g)].map(m=>fs.readFileSync(path.join(HDIR,m[1]),'utf8')).join('\n');
const ctx={console,Math,JSON,Date,setTimeout,clearTimeout,window:{}};vm.createContext(ctx);vm.runInContext(eng,ctx);
vm.runInContext('this.X={newGame,cleanDef,act,cpuDecide,cpuSkip,paceReady,RECDB};',ctx);const X=ctx.X;
const cx2={window:{}};vm.createContext(cx2);vm.runInContext(fs.readFileSync(path.join(ROOT,'cards/cards-data.js'),'utf8'),cx2);
const RAW={};cx2.window.CARD_DB.forEach(s=>s.cards.forEach(c=>{RAW[c.id]=c}));const CD={};const cdef=id=>CD[id]||(CD[id]=X.cleanDef(RAW[id]));
const SD=path.join(ROOT,'cards/サンプルデッキ')+'/';
const SAMPLE=fs.readFileSync(SD+'一覧.txt','utf8').split(/\r?\n/).filter(x=>x&&x[0]!=='#').map(f=>JSON.parse(fs.readFileSync(SD+f,'utf8')));
const DECKS=SAMPLE.map(d=>{const a=[];d.cards.forEach(([id,n])=>{for(let i=0;i<n;i++)a.push(cdef(id))});return a});
function play(dA,dB,seed,paced){
  X.cpuSkip.clear();const G=X.newGame(dA,dB,{first:'host',test:false,seed,norec:true,paced});G.cpuLv=['strong','strong'];
  let key='',paces=0,seq=[];
  for(let s=0;s<20000&&G.winner==null;s++){
    if(paced&&X.paceReady(G)){const st=G.step;X.act(G,G.turn,{k:'pace'});paces++;seq.push(st);continue}
    let pi;const pd=G.pending;
    if(G.pick)pi=G.pick.pi;else if(G.mull)pi=G.mull.order[G.mull.idx];else if(pd)pi=pd.pi;else if(G.battle)pi=G.battle.prio;else pi=G.turn;
    let a=X.cpuDecide(G,pi);
    if(!a){if(G.pick)a={k:'setFirst',first:true};else if(G.mull)a={k:'mulligan',yes:false};else if(G.battle)a={k:G.battle.phase==='block'?'block':'pass',iid:null};else if(pd){a={k:'next'}}else a={k:'next'}}
    const n=G.log.length;X.act(G,pi,a);if(a.k==='play'&&G.log.length===n)X.cpuSkip.add(a.iid);
    const k2=G.turnNo+':'+G.step;if(k2!==key){key=k2;X.cpuSkip.clear()}
  }
  return {w:G.winner,t:G.turnNo,l:G.log.length,paces,seq};
}
let bad=0,n=0,order=0;
for(let i=0;i<DECKS.length;i++)for(let j=0;j<DECKS.length;j++){const seed=1000+i*17+j;
  const a=play(DECKS[i],DECKS[j],seed,false),b=play(DECKS[i],DECKS[j],seed,true);n++;
  if(a.w!==b.w||a.t!==b.t||a.l!==b.l){bad++;console.log('差あり',i,j,JSON.stringify([a.w,a.t,a.l]),JSON.stringify([b.w,b.t,b.l]))}
  // 順序: start→core→draw→refresh→(main…)→end の順で進んでいるか
  const s=b.seq;for(let k=0;k+3<s.length;k++){if(s[k]==='start'){order++;if(s[k+1]!=='core'||s[k+2]!=='draw'||s[k+3]!=='refresh'){bad++;console.log('順序おかしい',s.slice(k,k+4));break}}}
}
console.log('試合',n,'差・順序の異常',bad,'ターン開始の確認回数',order);process.exit(bad?1:0);
