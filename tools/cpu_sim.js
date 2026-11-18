// CPU同士の自動対戦(重みの学習用)。使い方: node tools/cpu_sim.js
const fs=require('fs'),vm=require('vm');
const path=require('path'),ROOT=path.join(__dirname,'..'),HP=process.env.HTML||[path.join(ROOT,'bs-practice.html'),path.join(ROOT,'index.html')].find(f=>fs.existsSync(f));
const html=fs.readFileSync(HP,'utf8');
const eng=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const ctx={console,Math,JSON,Date,setTimeout,clearTimeout,window:{}};vm.createContext(ctx);
vm.runInContext(eng,ctx);const GODJS=path.join(__dirname,'god.js'),HAS_T=fs.existsSync(GODJS);
if(HAS_T)vm.runInContext(fs.readFileSync(GODJS,'utf8'),ctx);   // 追加の学習用モジュール(あれば読み込む)
vm.runInContext(HAS_T?'this.X={newGame,cleanDef,act,cpuDecide:cpuDecideTeacher,cpuDecideNormal,cpuSkip,CPUW,RECDB};':'this.X={newGame,cleanDef,act,cpuDecide,cpuSkip,CPUW,RECDB};',ctx);const X=ctx.X;
const vm2=require('vm'),cx2={window:{}};vm2.createContext(cx2);vm2.runInContext(fs.readFileSync(path.join(ROOT,'cards/cards-data.js'),'utf8'),cx2);
const RAW={};cx2.window.CARD_DB.forEach(s=>s.cards.forEach(c=>{RAW[c.id]=c}));
const CD={};const cdef=id=>CD[id]||(CD[id]=X.cleanDef(RAW[id]));
// サンプルデッキ(7種)を読み込む
const SD=path.join(ROOT,'cards/サンプルデッキ')+'/';
const SAMPLE=fs.readFileSync(SD+'一覧.txt','utf8').split(/\r?\n/).filter(x=>x&&x[0]!=='#').map(f=>JSON.parse(fs.readFileSync(SD+f,'utf8')));
const DECKS=SAMPLE.map(d=>{const a=[];d.cards.forEach(([id,n])=>{for(let i=0;i<n;i++)a.push(cdef(id))});return {name:d.name,cards:a}});
function mkDecks(){return DECKS.map(d=>d.cards)}
function play(W,dA,dB,firstHost){ // W=[重み席0,重み席1]。戻り値: 勝った席(0/1)、引き分けは-1
  X.cpuSkip.clear();
  const G=X.newGame(dA,dB,{first:firstHost?'host':'guest',test:false});G.cpuLv=["strong","strong"];G.cpuW=W;
  let key='',stuck=0;
  for(let s=0;s<6000&&G.winner==null;s++){
    let pi;const pd=G.pending;
    if(G.pick)pi=G.pick.pi;else if(G.mull)pi=G.mull.order[G.mull.idx];else if(pd)pi=pd.pi;else if(G.battle)pi=G.battle.prio;else pi=G.turn;
    let a=X.cpuDecide(G,pi);
    if(!a){ if(G.pick)a={k:'setFirst',first:true};else if(G.mull)a={k:'mulligan',yes:false};else if(G.battle)a={k:G.battle.phase==='block'?'block':'pass',iid:null};else if(pd){if(++stuck>3)break;continue}else a={k:'next'} }
    const n=G.log.length;X.act(G,pi,a);
    if(a.k==='play'&&G.log.length===n)X.cpuSkip.add(a.iid);
    const k2=G.turnNo+':'+G.step;if(k2!==key){key=k2;X.cpuSkip.clear()}
  }
  return G.winner==null?-1:G.winner;
}
// 重みWAと重みWBを、7種のデッキの全組み合わせ(先後・席も入れ替え)でrounds周させる。WAの勝率を返す
function match(WA,WB,decks,rounds){let w=0,d=0,g=0;const D=decks.length;
  for(let r=0;r<(rounds||1);r++)for(let i=0;i<D;i++)for(let j=0;j<D;j++){const hostFirst=(r+i+j)%2===0,swap=(r+i)%2===0;
    const res=swap?play([WA,WB],decks[i],decks[j],hostFirst):play([WB,WA],decks[j],decks[i],hostFirst);
    if(res<0)d++;else if((res===0)===swap)w++;g++}
  return {win:(w+d/2)/g,draw:d/g,n:g}}
module.exports={X,match,mkDecks,play,cdef,DECKS};
if(require.main===module){
  const decks=mkDecks();const base=X.CPUW,old=Object.assign({},base,{old:1});
  console.time('t');console.log('新(初期値) vs 旧',match(base,old,decks,+process.env.R||4));console.timeEnd('t');
}
