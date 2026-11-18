// 人間の対戦記録から、CPUの重みを学ぶ(まねる学習)。
// 記録をエンジンで再現し、人間が操作した場面ごとに「候補の重みのCPUなら同じ手を選ぶか」を数え、いちばん近い重みを探す。
// 既定では、勝った側の操作だけを手本にする(強い人のまねをするため)。ALL=1 で両方。
// 使い方: node tools/cpu_learn.js 記録.json [出力.json]   (記録.json は、対戦記録の配列)
const {X,cdef}=require('./cpu_sim.js');const fs=require('fs');
<<<<<<< HEAD
const RANGE={sBp:[0,2],sEff:[0,1500],sFirst:[0,8000],sNx:[0,3000],sNx0:[0,4000],sMg:[0,1500],keepRes:[0,3,1],lvBp:[0,3],lvMin:[0,1500],lvNx:[0,3000],aFree:[0,6],aLife:[0,4],aSwarm:[0,3],aRisk:[0,3],aDef:[0,5],aThr:[-2,4],lvPre:[500,8000],bLife:[0,5,1],bTrade:[0,3,1],bBp:[0,3],aPushM:[0,4,1],aBait:[0,1,1],aEarly:[0,6],aTrade:[0,6],sRed:[0,2000],sCoreE:[0,5000],tEx:[0,1500]};
=======
const RANGE={sBp:[0,2],sEff:[0,1500],sFirst:[0,8000],sNx:[0,3000],sNx0:[0,4000],sMg:[0,1500],keepRes:[0,3,1],lvBp:[0,3],lvMin:[0,1500],lvNx:[0,3000],aFree:[0,6],aLife:[0,4],aSwarm:[0,3],aRisk:[0,3],aDef:[0,5],aThr:[-2,4],lvPre:[500,8000],bLife:[0,5,1],bTrade:[0,3,1],bBp:[0,3]};
>>>>>>> 45031516b51edfe1d925c9580b0279d4e4defa74
const KEYS=Object.keys(RANGE).filter(k=>X.CPUW[k]!==undefined);
const rnd=()=>Math.random();
function perturb(base,scale){const c=Object.assign({},base);const n=1+Math.floor(rnd()*4);
  for(let m=0;m<n;m++){const k=KEYS[Math.floor(rnd()*KEYS.length)],[lo,hi,int]=RANGE[k],sg=(hi-lo)*scale;let v=c[k]+(rnd()+rnd()+rnd()-1.5)*2*sg;v=Math.max(lo,Math.min(hi,v));c[k]=int?Math.round(v):+v.toFixed(3)}return c}
function build(rec){const defs=rec.defs.map(a=>a.map(id=>{try{return cdef(id)}catch(e){return null}}));if(defs.some(a=>a.some(x=>!x)))return null;
  return X.newGame(defs[0],defs[1],Object.assign({},rec.s,{seed:rec.seed,norec:true}))}
function same(d,a){if(!d||!a||d.k!==a.k)return false;if(a.iid!==undefined&&d.iid!==a.iid)return false;return true}
// 1戦を再現しながら、各候補の「人間と同じ手を選んだ点数」を足していく。戻り値: 候補ごとの[点数, 場面数]
function evalRec(rec,cands,onlyWinner){
  const G=build(rec);if(!G)return null;const sc=cands.map(()=>0);let n=0;G.cpuLv=['strong','strong'];
  for(let i=0;i<rec.acts.length&&G.winner==null;i++){
    const [pi,a]=rec.acts[i];let ds=null,w=1;
    if(a&&a.k!=='stamp'&&!G.pick&&!G.mull&&!G.pending&&(!onlyWinner||rec.winner==null||pi===rec.winner)&&(rec.mode!=='cpu'||pi===rec.hs)){
      const top=G.battle?(G.battle.phase==='block'&&G.battle.prio===pi):(G.turn===pi&&(G.step==='main'||G.step==='main2'||G.step==='attack')&&!G.noAttack||G.turn===pi&&(G.step==='main'||G.step==='main2'));
      if(top){w=a.k==='next'?0.5:1;
        ds=cands.map(W=>{G.cpuW=[W,W];X.cpuSkip.clear();let d=null;try{d=X.cpuDecide(G,pi)}catch(e){}if(!d&&G.battle&&G.battle.phase==='block')d={k:'block',iid:null};if(!d&&!G.battle)d={k:'next'};return d});}
    }
    const L0=G.log.length,S0=G.seq;
    try{X.act(G,pi,JSON.parse(JSON.stringify(a)))}catch(e){return null}
    if(ds&&(G.log.length!==L0||G.seq!==S0||a.k==='next')){n+=w;ds.forEach((d,ci)=>{if(same(d,a))sc[ci]+=w})}   // 効かなかった操作(失敗した操作)は数えない
  }
  return {sc,n};
}
function scoreAll(recs,cands,onlyWinner){const tot=cands.map(()=>0);let n=0;recs.forEach(r=>{const e=evalRec(r,cands,onlyWinner);if(!e)return;e.sc.forEach((v,i)=>tot[i]+=v);n+=e.n});return {rate:tot.map(v=>n?v/n:0),n}}
function learn(recs,opt){
  opt=opt||{};const onlyWinner=!opt.all,cand=opt.cand||60,rounds=opt.rounds||6,base=Object.assign({},X.CPUW);
  const idx=recs.map((_,i)=>i),test=recs.filter((_,i)=>i%5===4),train=recs.filter((_,i)=>i%5!==4);   // 5戦に1戦は検証用
  let best=base,bs=scoreAll(train,[base],onlyWinner).rate[0];const log=opt.log||(()=>{});
  log('学習用 '+train.length+'戦 / 検証用 '+test.length+'戦  いまの重みの一致率 '+bs.toFixed(3));
  for(let r=0;r<rounds;r++){
    const cs=[best];
    KEYS.forEach(k=>{const [lo,hi,int]=RANGE[k];for(let j=1;j<=6;j++){const v0=lo+(hi-lo)*j/7,v=int?Math.round(v0):+v0.toFixed(3);if(v!==best[k]){const c=Object.assign({},best);c[k]=v;cs.push(c)}}});   // 1つずつ値を変えて試す
    for(let i=0;i<cand;i++)cs.push(perturb(best,0.25/(Math.floor(r/2)+1)));
    const rt=scoreAll(train,cs,onlyWinner).rate;let bi=0;rt.forEach((v,i)=>{if(v>rt[bi])bi=i});
    if(rt[bi]>bs+0.001){best=cs[bi];bs=rt[bi]}log('ラウンド'+(r+1)+' 学習用の一致率 '+bs.toFixed(3));
  }
  const vb=test.length?scoreAll(test,[base,best],onlyWinner).rate:[0,0];
  return {weights:best,trainRate:bs,valBase:vb[0],valNew:vb[1],nTrain:train.length,nTest:test.length};
}
module.exports={learn,scoreAll,evalRec,KEYS};
if(require.main===module){
  const recs=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const t=Date.now();
  const r=learn(recs,{all:!!process.env.ALL,cand:+process.env.CAND||60,rounds:+process.env.ROUNDS||3,log:console.log});
  console.log('検証用の一致率: いまの重み',r.valBase.toFixed(3),'→ 学習後',r.valNew.toFixed(3),' 時間',((Date.now()-t)/1000).toFixed(0)+'秒');
  console.log(JSON.stringify(r.weights));if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(r.weights));
}
