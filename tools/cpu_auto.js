// 自動学習: サーバーに集まった人間の対戦記録から重みを学び、いまの重みに勝ち越したときだけ反映する。
// 環境変数: API(Workerのアドレス) ADMIN_TOKEN(管理者の合言葉) / 省略可: APPLY=1(反映する。省略時は結果を表示するだけ) MINREC(最低戦数 既定60) GATE(勝率の下限 既定0.52)
const {learn}=require('./cpu_learn.js');const {X,match,mkDecks}=require('./cpu_sim.js');
const API=(process.env.API||'').replace(/\/$/,''),TOK=process.env.ADMIN_TOKEN||'',APPLY=process.env.APPLY==='1',MINREC=+process.env.MINREC||60,GATE=+process.env.GATE||0.52;
const H={Authorization:'Bearer '+TOK,'Content-Type':'application/json'};
async function j(path,opt){const r=await fetch(API+path,Object.assign({headers:H},opt||{}));if(!r.ok)throw new Error(path+' '+r.status);return r.json()}
(async()=>{
  if(!API||!TOK){console.log('API と ADMIN_TOKEN を設定してください');process.exit(1)}
  const cfg=await j('/cfg');const cur=Object.assign({},X.CPUW,cfg.w||{});
  let recs=[],since=0;for(let i=0;i<20;i++){const r=await j('/admin/recs?since='+since+'&limit=500');if(!r.recs.length)break;r.recs.forEach(x=>recs.push(x.rec));since=r.recs[r.recs.length-1].id;if(r.recs.length<500)break}
  recs=recs.filter(r=>r&&r.ver!=='sim'&&Array.isArray(r.acts));
  console.log('記録',recs.length,'戦');if(recs.length<MINREC){console.log('戦数が足りないので、今回は学習しません(最低 '+MINREC+'戦)');return}
<<<<<<< HEAD
  Object.assign(X.CPUW,cur);X.CPUW.god=0;
=======
  Object.assign(X.CPUW,cur);
>>>>>>> 45031516b51edfe1d925c9580b0279d4e4defa74
  const L=learn(recs,{cand:+process.env.CAND||80,rounds:+process.env.ROUNDS||6,log:console.log});
  console.log('検証用の一致率 '+L.valBase.toFixed(3)+' → '+L.valNew.toFixed(3));
  if(!(L.valNew>L.valBase+0.003)){console.log('検証用で良くならなかったので、反映しません');return}
  const decks=mkDecks(),old=Object.assign({},cur),nw=L.weights;
  const m=match(nw,old,decks,+process.env.R||4);console.log('いまの重みとの自己対戦の勝率 '+m.win.toFixed(3)+' ('+m.n+'戦)');
  if(m.win<GATE){console.log('自己対戦で勝ち越せなかったので、反映しません');return}
  if(!APPLY){console.log('(確認のみ。反映するには APPLY=1)',JSON.stringify(nw));return}
<<<<<<< HEAD
  const out=Object.assign({},nw);['god','godMs','godV'].forEach(k=>delete out[k]);   // 先読みの設定は、サーバーに書き込まない
  const r=await j('/admin/weights',{method:'PUT',body:JSON.stringify(out)});console.log('反映しました',JSON.stringify(r.w||r));
=======
  const r=await j('/admin/weights',{method:'PUT',body:JSON.stringify(nw)});console.log('反映しました',JSON.stringify(r.w||r));
>>>>>>> 45031516b51edfe1d925c9580b0279d4e4defa74
})().catch(e=>{console.error(e);process.exit(1)});
