// 先読みCPU(god)と、ふつうのCPUの対戦。使い方: N=28 MS=400 V=3 node tools/god_bench.js
const {X,play,mkDecks}=require('./cpu_sim.js');
const N=+process.env.N||28,MS=+process.env.MS||400,V=+process.env.V||3;
const base=Object.assign({},X.CPUW,{god:0}),G1=Object.assign({},X.CPUW,{god:1,godMs:MS,godV:V});
const decks=mkDecks();let wg=0,wb=0,d=0,t0=Date.now();
for(let g=0;g<N;g++){const i=g%7,j=(g*3+1)%7,first=g%2===0,swap=(g>>1)%2===0;
  const res=swap?play([G1,base],decks[i],decks[j],first):play([base,G1],decks[j],decks[i],first);
  if(res<0)d++;else if((res===0)===swap)wg++;else wb++;
  if((g+1)%7===0)console.log((g+1)+'/'+N+'  先読み勝'+wg+' 通常勝'+wb+' 引分'+d+'  '+((Date.now()-t0)/1000|0)+'秒');}
console.log('先読みCPUの勝率 '+((wg+d/2)/N).toFixed(3)+' (先読み '+wg+' / 通常 '+wb+' / 引分 '+d+') 1局平均 '+((Date.now()-t0)/N/1000).toFixed(1)+'秒');
