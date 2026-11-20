// コアをカードからリザーブへ(相手が選ぶ場合は、ソウルコアが乗っていれば選択を待つ)
function coreOutDo(G, K, qi, ids) {
  G.effPi = G.cs.pi;
  const nm = '「' + K.def.name + '」', n0 = K.cores.length, got = [];
  ids.forEach(id => { if (moveCore(G, qi, id, { zone: 'reserve' })) got.push(id); });
  if (got.length) G.evs.push({ t: 'coreOut', p: qi, iid: K.iid, n: got.length });
  const gone = !G.p[qi].field.includes(K);
  const r = nm + 'のコア' + got.length + '個をリザーブへ' + (gone ? '(消滅)' : '');
  G.cs.rs.push(r); lg(G, G.cs.pi, '　' + G.cs.name + ': ' + r);
  return gone;
}
const coreFloorOpp = (G, K) => { const o = ownerOf(G, K); return o >= 0 && G.p[o].field.some(X => X.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'always' && effectActive(X, e) && e.ops.some(op => op.op === 'coreFloorOpp' && (X === K || (op.name && K.def.name === op.name))))); };
function coreOutNext(G) {
  const cs = G.cs;
  while (cs.jobs.length) {
    const j = cs.jobs[0], K = G.p[j.qi].field.find(x => x.iid === j.iid);
    if (!K) { cs.jobs.shift(); continue; }
    if (j.qi !== cs.pi && K.def.effects.some(e => e.timing.kind === 'static' && effectActive(K, e) && e.ops.some(o => o.op === 'coreLock'))) { cs.rs.push('「' + K.def.name + '」のコアは、相手の効果では移動できません'); lg(G, cs.pi, '　「' + K.def.name + '」のコアは相手の効果では移動できない'); cs.jobs.shift(); continue; }
    const len = K.cores.length, norm = K.cores.filter(c => !c.soul), soul = K.cores.filter(c => c.soul);
    let rem = j.leave != null ? len - j.leave : j.leaveNon != null ? norm.length - j.leaveNon : Math.min(j.n, len);
    if (j.non || j.leaveNon != null) rem = Math.min(rem, norm.length);
    if (j.keep != null) rem = Math.min(rem, len - j.keep);
    { const fnm = coreFloorSrc(G, K); if (fnm && rem >= len) { rem = len - 1; const r = '「' + fnm + '」の効果により、「' + K.def.name + '」のコアは1個より少なくならないため、1個は残ります'; cs.rs.push(r); lg(G, cs.pi, '　' + cs.name + ': ' + r); } }
    if (cs.pi !== j.qi && rem >= len && coreFloorOpp(G, K)) { rem = len - 1; const r = '「' + K.def.name + '」のコアは相手の効果では1個より少なくならないため、1個は残ります'; cs.rs.push(r); lg(G, cs.pi, '　' + cs.name + ': ' + r); }
    if (rem <= 0) { const r = '「' + K.def.name + '」から取り除けるコアがありません(何も起きません)'; cs.rs.push(r); lg(G, cs.pi, '　' + cs.name + ': ' + r); cs.jobs.shift(); continue; }
    if (j.choose && soul.length && rem < len && j.leaveNon == null) {
      G.pending = { pi: j.qi, name: cs.name, n: rem, cands: K.cores.map(c => c.id), qi: j.qi, text: '', kind: 'coreSel', opt: false, x: { iid: K.iid, sname: K.def.name, rem, cores: K.cores.map(c => ({ id: c.id, soul: !!c.soul })), by: cs.pi } };
      return 'wait';
    }
    const ids = norm.concat(soul).slice(0, rem).map(c => c.id);
    cs.jobs.shift();
    const gone = coreOutDo(G, K, j.qi, ids);
    if (gone && j.vdraw && !cs.vd) { cs.vd = true; const n = draw(G.p[cs.pi], 1); cs.rs.push('消滅したため' + n + '枚ドローしました'); lg(G, cs.pi, '　' + cs.name + ': 消滅したため' + n + '枚ドロー'); }
  }
  G.fx.push({ n: cs.name, t: '', p: cs.pi, r: cs.rs }); G.cs = null; G.effPi = null;
}
function coreSelAct(G, pi, ids) {
  const pd = G.pending; if (!pd || pd.kind !== 'coreSel' || pd.pi !== pi || !Array.isArray(ids) || !G.cs) return;
  const u = [...new Set(ids.map(String))].filter(i => pd.cands.includes(i));
  if (u.length !== pd.n) return;
  G.pending = null; G.undo = null;
  const j = G.cs.jobs.shift(), K = G.p[j.qi].field.find(x => x.iid === pd.x.iid);
  if (K) { const gone = coreOutDo(G, K, j.qi, u); if (gone && j.vdraw && !G.cs.vd) { G.cs.vd = true; draw(G.p[G.cs.pi], 1); } }
  if (coreOutNext(G) === 'wait') return;
  G.queue[0].i++; runQueue(G);
}
const atkCap1 = (G, k) => k.def.cost <= 3 && G.cap1T === G.turnNo &&   // コスト3以下(トークンも含む)のスピリットすべてで、そのターンに合計1回
   G.p.some((Q, si) => Q.field.some(X => X.def.effects.some(e => e.keyword === 'atkCap1' && effectActive(X, e) && evalCond(G, si, e.cond))));
const oppNoAtk = (G, k) => { if (atkCap1(G, k)) return true; const qi = ownerOf(G, k); return qi >= 0 && G.p[1 - qi].field.some(K => K.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'step' && e.timing.step === 'attack' && e.timing.turn === 'opp' && G.turn === qi && effectActive(K, e) && e.ops.some(o => o.op === 'noAtkCore' && k.cores.length <= (o.coreMax | 0)))); };
// 「お互いのアタックステップ: BPが○以下ならアタック/ブロックできない」
const abLocked = (G, k) => G.step === 'attack' && k.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'always' && effectActive(k, e) && e.ops.some(o => o.op === 'noAB' && curBP(G, k) <= (o.bpMax | 0)));
const canAttackNow = (G, k) => !cantAttack(k, G) && !abLocked(G, k) && !oppNoAtk(G, k) && !(G.lock || []).some(l => l.iid === k.iid && l.turn === G.turnNo && l.atk);
const cantAttack = (k, G) => { const li = lvInfo(k); return !!li && k.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'always' && e.levels.includes(li.lv) && e.ops.some(o => o.op === 'noAttack') && (!e.cond || !G || evalCond(G, ownerOf(G, k) < 0 ? 0 : ownerOf(G, k), e.cond, { srcIid: k.iid }))); };
function atkToll(G, pi, k) {
  const li = lvInfo(k); if (!li || li.lv !== 1) return 0;
  return G.p[1 - pi].field.some(K => K.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'step' && e.timing.step === 'attack' && e.timing.turn === 'opp' && effectActive(K, e) && e.ops.some(o => o.op === 'atkToll'))) ? 1 : 0;
}
function startAttack(G, pi, k) {
  if (cantAttack(k, G) || oppNoAtk(G, k) || (G.lock || []).some(l => l.iid === k.iid && l.turn === G.turnNo && l.atk)) { lg(G, pi, '「' + k.def.name + '」はアタックできません'); return; }
  const toll = atkToll(G, pi, k);
  if (toll) {
    const c = G.p[pi].reserve.slice().sort((x, y) => (x.soul ? 1 : 0) - (y.soul ? 1 : 0))[0];
    if (!c) { lg(G, pi, '「' + k.def.name + '」: アタックに必要な1コストを支払えないためアタックできません'); return; }
    moveCore(G, pi, c.id, { zone: 'coreTrash' }); lg(G, pi, '「' + k.def.name + '」のアタックのため、1コストを支払いました(リザーブ→トラッシュ)');
  }
  k.tapped = true; k.atkT = G.turnNo; if (k.def.cost <= 3) G.cap1T = G.turnNo; tapEvt(G, pi, k, 'game', true);
  G.battleNo = (G.battleNo || 0) + 1;
  G.battle = { pi, iid: k.iid, phase: 'trigger', prio: pi, passes: 0, blocker: null, gone: false, bgone: false };
  lg(G, pi, '「' + k.def.name + '」でアタック!'); G.evs.push({ t: 'attack', p: pi, name: k.def.name, id: k.def.id });
  applyTrig(G, pi, k, collectTrig(k, 'attack'), { event: 'attack' });
  if (k.def.family.includes('白妙') && (G.blkAtkT === G.turnNo && G.blkAtkP === pi || G.p[pi].field.some(X => X.def.effects.some(e => e.timing.kind === 'static' && effectActive(X, e) && e.ops.some(o => o.op === 'blkAsAtk'))))) applyTrig(G, pi, k, { act: collectTrig(k, 'block').act, inact: [] }, { event: 'attack' });   // 白妙のブロック時効果は、アタック時にも発揮する
  G.p[1 - pi].field.forEach(K => K.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'oppAttack' && effectActive(K, e)) enqueue(G, 1 - pi, K, e, { event: 'oppAttack', atkCost: k.def.cost }); }));
  G.atkCnt = (G.atkCnt && G.atkCnt.t === G.turnNo) ? { t: G.turnNo, n: G.atkCnt.n + 1 } : { t: G.turnNo, n: 1 };
  G.p[pi].field.forEach(X => X.def.effects.forEach((e, ei) => {
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyAttack' || !effectActive(X, e) || !matchT(G, pi, pi, k, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (t.when === 'first' && G.atkCnt.n !== 1) return;
    if (t.flt && t.flt.notSelf && X === k) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, pi, X, e, { event: 'allyAttack' });
  }));
  runQueue(G);
}
function mill(G, qi, n, src, mo) {
  const P = G.p[qi], cards = []; G.lastMill = { turn: G.turnNo, sp: false };
  while (n-- > 0 && P.deck.length) { const c = P.deck.pop(); P.trash.push(c); cards.push(c); if (c.def.type === 'spirit') G.lastMill.sp = true; (G.discards = G.discards || []).push({ turn: G.turnNo, p: qi, iid: c.iid, id: c.def.id, name: c.def.name, type: c.def.type, ex: !!c.def.symbols.ex, color: c.def.color, src }); }
  if (cards.length) { G.evs.push({ t: 'mill', p: qi, src, note: (mo && mo.note) || '', sep: !!(mo && mo.sep), cards: cards.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) }); lg(G, qi, '「' + src + '」の効果: デッキの上から' + cards.length + '枚を破棄(' + cards.map(c => '「' + c.def.name + '」').join('') + ')'); G.fx.push({ n: src, t: '', p: 1 - qi, r: ['相手のデッキの上から' + cards.length + '枚を破棄'], quick: true }); }
}
function quakeResolve(G, b) {
  const A = b.gone ? null : G.p[b.pi].field.find(x => x.iid === b.iid); if (!A) return;
  const o = 1 - b.pi; let n = 0; const qParts = [];
  A.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e)) e.ops.forEach(op => { if (op.op === 'quake') n += op.n | 0; }); });
  if (!n) return;
  const qBase = n;
  G.p[b.pi].field.forEach(K => K.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'step' && e.timing.step === 'attack' && e.timing.turn === 'you' && G.turn === b.pi && effectActive(K, e)) e.ops.forEach(op => { if (op.op === 'quakePlus') { n += op.n | 0; qParts.push('「' + K.def.name + '」の効果 +' + (op.n | 0)); } }); }));
  // 桜樹結界など: 待機中の「地鳴+N」を先に反映する(地鳴の破棄より前に処理)
  for (let qi2 = (G.queue || []).length - 1; qi2 >= 0; qi2--) { const it2 = G.queue[qi2]; if (it2 && it2.ops && it2.i === 0 && it2.ops.some(o => o.op === 'quakeBoost')) { G.queue.splice(qi2, 1); it2.ops.forEach(o => { if (o.op === 'quakeBoost') { b.quakeAdd = (b.quakeAdd | 0) + (o.n | 0); lg(G, it2.pi, '「' + it2.name + '」の効果: このバトル中、「' + A.def.name + '」の地鳴を+' + (o.n | 0) + '枚'); G.fx.push({ n: it2.name, t: '', p: it2.pi, r: ['「' + A.def.name + '」の地鳴を+' + (o.n | 0) + '枚'], quick: true }); } }); } }
  n += b.quakeAdd | 0; if (b.quakeAdd) qParts.push('他の効果 +' + (b.quakeAdd | 0));
  const bl = b.blocker ? G.p[o].trash.find(x => x.iid === b.blocker) : null;
  if (bl) { n = Math.max(0, n - bl.def.cost); qParts.push('ブロックしたスピリットのコスト -' + bl.def.cost); }
  const qNote2 = '【地鳴】' + qBase + '枚' + qParts.map(x => ' / ' + x).join('') + (qParts.length ? ' = ' + n + '枚' : '');
  if (n) { const n0 = (G.discards || []).length; mill(G, o, n, A.def.name, { note: qNote2 }); if (G.turn === b.pi && G.step === 'attack' && (G.discards || []).slice(n0).some(x => x.ex)) G.p[b.pi].field.forEach(X => X.def.effects.forEach((e, ei) => { if (e.timing.kind === 'trigger' && e.timing.event === 'quakeEx' && effectActive(X, e)) { if (e.timing.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; } enqueue(G, b.pi, X, e, { event: 'quakeEx' }); } })); if (G.turn === b.pi && G.step === 'attack' && (G.discards || []).length > n0) G.p[b.pi].field.forEach(X => X.def.effects.forEach((e, ei) => { if (X.iid !== A.iid && X.tapped && e.timing.kind === 'trigger' && e.timing.event === 'quakeOther' && effectActive(X, e)) { if (e.timing.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; } enqueue(G, b.pi, X, e, { event: 'quakeOther' }); } })); } else lg(G, b.pi, '「' + A.def.name + '」の地鳴: 破棄する枚数は0枚');
}
function endBattle(G) {
  const b = G.battle;
  if (b && b.phase !== 'end' && G.winner == null) quakeResolve(G, b);
  if (b && b.phase !== 'end' && G.winner == null) {
    // バトル終了時の効果(アタックしたスピリット/ブロックしたスピリットが場に残っているときだけ)
    const todo = [];
    [['attacking', b.pi, b.iid, b.gone], ['blocking', 1 - b.pi, b.blocker, b.bgone]].forEach(([when, qi, iid, gone]) => {
      const k = iid && !gone ? G.p[qi].field.find(x => x.iid === iid) : null; if (!k) return;
      k.def.effects.forEach((e, ei) => { if (e.timing.kind === 'trigger' && e.timing.event === 'battleEnd' && ((e.timing.when || 'attacking') === when || e.timing.when === 'attblk') && effectActive(k, e)) { if (e.timing.limit === 'turn') { if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; } todo.push([qi, k, e]); } });
    });
    if (b.hits) G.p[b.pi].field.forEach(k => k.def.effects.forEach((e, ei) => {
      if (e.timing.kind !== 'trigger' || e.timing.event !== 'oppDestroy' || !effectActive(k, e)) return;
      const tag = 't' + G.turnNo; if (e.timing.limit === 'turn' && k.used && k.used[ei] === tag) return;
      if (e.timing.limit === 'turn') { k.used = k.used || {}; k.used[ei] = tag; }
      todo.push([b.pi, k, e]);
    }));
    if (G.turn === b.pi && !b.gone && G.p[b.pi].field.some(x => x.iid === b.iid)) G.p[b.pi].field.forEach(k => k.def.effects.forEach((e, ei) => { if (e.timing.kind !== 'trigger' || e.timing.event !== 'allyBattleEnd' || !effectActive(k, e)) return; if (e.timing.flt && e.timing.flt.srcUntapped && k.tapped) return; const AA = G.p[b.pi].field.find(x => x.iid === b.iid); if (e.timing.flt && e.timing.flt.color && !(AA && AA.def.color === e.timing.flt.color)) return; if (e.timing.flt && e.timing.flt.tapped != null && !(AA && !!AA.tapped === !!e.timing.flt.tapped)) return; if (e.timing.flt && e.timing.flt.bpMin != null && !(AA && curBP(G, AA) >= e.timing.flt.bpMin)) return; if (e.timing.flt && e.timing.flt.kw && !(AA && AA.def.effects.some(e2 => e2.keyword === e.timing.flt.kw && effectActive(AA, e2)))) return; if (e.timing.limit === 'turn') { if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; } todo.push([b.pi, k, e]); }));
    (b.endQ || []).forEach(x => todo.push(x));
    if (todo.length) { b.phase = 'end'; todo.forEach(([qi, k, e]) => enqueue(G, qi, k, e, { event: 'battleEnd' })); runQueue(G); return; }
  }
  G.lastB = G.battle ? { iid: G.battle.iid, blocker: G.battle.blocker, bn: G.battleNo } : null; G.battle = null; clearMods(G, 'battle'); lg(G, -1, 'バトル終了'); runQueue(G);
}
function passFlash(G, pi) {
  const b = G.battle;
  if (!b || G.pending || !(b.phase === 'flash1' || b.phase === 'flash2') || b.prio !== pi) return;
  lg(G, pi, 'フラッシュ: パス');
  b.passes++;
  if (b.passes < 2) { b.prio = 1 - b.prio; return; }
  if (b.phase === 'flash1') {
    if (b.gone) { lg(G, -1, 'アタックしたスピリットがいなくなったため、バトルを終了します'); endBattle(G); return; }
    b.phase = 'block'; b.prio = 1 - b.pi; b.passes = 0; lg(G, b.prio, 'ブロック宣言');
    { const A0 = G.p[b.pi].field.find(x => x.iid === b.iid), un = G.p[b.prio].field.filter(x => x.def.type === 'spirit' && !x.tapped);
      if (A0 && un.length === 1 && A0.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A0, e) && e.ops.some(o => o.op === 'blockToll'))) { const m = '「' + A0.def.name + '」の効果: ブロックするには、ブロックするスピリット以外のスピリット1体を疲労させる必要があります。疲労させられるスピリットがいないため、ブロックできません(ライフで受けます)'; lg(G, b.prio, m); G.fx.push({ n: A0.def.name, t: '', p: b.pi, r: [m.replace(/^「[^」]*」の効果: /, '')] }); } }
  } else resolveBattle(G);
}
// 【激突】: アタック中のスピリットが持つ効果。ブロックできる相手スピリットがいれば必ずブロックしなければならない
function blockPayN(G, A, ap) {   // ブロックするために支払うコストの数(リザーブ→トラッシュ)
  let n = 0; if (!A) return 0;
  A.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && evalCond(G, ap, e.cond)) e.ops.forEach(o => { if (o.op === 'blockPay') n = Math.max(n, o.n); }); });
  G.p[ap].field.forEach(K => K.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'step' && e.timing.step === 'attack' && e.timing.turn === 'you' && effectActive(K, e) && evalCond(G, ap, e.cond)) e.ops.forEach(o => { if (o.op === 'blockPayT' && (A.def.team || []).includes(o.team)) n = Math.max(n, o.n); }); }));
  return n;
}
function canBlockWith(G, k) {
  if (abLocked(G, k)) return false;
  if ((G.lock || []).some(l => l.iid === k.iid && l.turn === G.turnNo && l.blk)) return false;
  const b = G.battle; if (!b) return true;
  if ((b.noBlk || []).includes(k.iid)) return false;
  if (b.unbBp != null && b.unbPi === b.pi && curBP(G, k) <= b.unbBp) return false;
  const A = G.p[b.pi].field.find(x => x.iid === b.iid); if (!A) return true;
  if ((G.unb || []).some(u => u.iid === A.iid && u.turn === G.turnNo && (u.bpMax == null || curBP(G, k) <= u.bpMax) && (u.costMax == null || k.def.cost <= u.costMax) && (u.costMin == null || k.def.cost >= u.costMin) && (u.bn == null || u.bn === G.battleNo))) return false;
  { const bpn = blockPayN(G, A, b.pi); if (bpn && G.p[1 - b.pi].reserve.length < bpn) return false; }
  const hit = o => o.op === 'noBlock' && k.def.cost <= (o.costMax == null ? 99 : o.costMax) && (o.bpMax == null || curBP(G, k) <= o.bpMax) && (o.coreMax == null || k.cores.length <= o.coreMax);
  if (A.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && evalCond(G, b.pi, e.cond) && e.ops.some(hit))) return false;
  if (A.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && evalCond(G, b.pi, e.cond) && e.ops.some(o => o.op === 'noBlkNoSoul')) && !k.cores.some(c => c.soul)) return false;
  if (A.puppetTurn === G.turnNo && G.turn === b.pi && k.def.cost <= 3 && G.p[b.pi].field.some(K => K.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'puppetNoBlock' && effectActive(K, e)))) return false;
  if (A.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && e.ops.some(o => o.op === 'blockToll')) && !G.p[1 - b.pi].field.some(x => x !== k && x.def.type === 'spirit' && !x.tapped)) return false;
  return !G.p[b.pi].field.some(K => K.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'step' && e.timing.step === 'attack' && e.timing.turn === 'you' && G.turn === b.pi && effectActive(K, e) && evalCond(G, b.pi, e.cond) && e.ops.some(o => hit(o) && (!o.family || A.def.family.includes(o.family)) && (!o.kw || A.def.effects.some(e2 => e2.keyword === o.kw && effectActive(A, e2))))));
}
function bp0KillHook(G, pi) {
  if (G.turn !== pi || G.step !== 'attack') return;
  G.p[pi].field.forEach(k => k.def.effects.forEach((e, ei) => {
    if (e.timing.kind !== 'trigger' || e.timing.event !== 'bp0Kill' || !effectActive(k, e)) return;
    if (e.timing.limit === 'turn') { if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, pi, k, e, { event: 'bp0Kill' });
  }));
}
function mustAtkHook(G) {
  const m = G.mustAtk; if (!m) return;
  if (m.turn !== G.turnNo || G.winner != null) { G.mustAtk = null; return; }
  if (G.step !== 'attack' || G.battle || G.pending || G.queue.length) return;
  G.mustAtk = null;
  const k = G.p[m.pi].field.find(x => x.iid === m.iid);
  if (k && G.turn === m.pi && k.def.type === 'spirit' && !k.tapped && !G.noAttack) { lg(G, m.pi, '「' + k.def.name + '」は最初にアタックしなければなりません'); startAttack(G, m.pi, k); }
}
function mustBlocker(G) {
  const b = G.battle; if (!b || b.phase !== 'block' || !b.must) return null;
  const k = G.p[1 - b.pi].field.find(x => x.iid === b.must);
  return k && k.def.type === 'spirit' && canBlockWith(G, k) ? k.iid : null;
}
const clashFam = (G, pi, A) => G.turn === pi && G.p[pi].field.some(K => K.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'step' && e.timing.step === 'attack' && e.timing.turn === 'you' && effectActive(K, e) && e.ops.some(o => o.op === 'grantClashFam' && A.def.family.includes(o.family))));   // 系統を持つ自分のスピリットすべてに【激突】を与える
function clashForced(G) {
  const b = G.battle; if (!b || b.phase !== 'block') return false;
  const A = G.p[b.pi].field.find(x => x.iid === b.iid); if (!A) return false;
  if (A.clashT !== G.turnNo && !clashFam(G, b.pi, A) && !A.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && e.ops.some(o => o.op === 'clash') && effectActive(A, e))) return false;
  return G.p[1 - b.pi].field.some(k => k.def.type === 'spirit' && !k.tapped && canBlockWith(G, k));
}
// 【起動】効果: メイン/フラッシュのタイミングで、コスト(コア支払い/疲労)を払って使う
function abilityOK(G, pi, k, ei) {
  const e = k.def.effects[ei]; if (!e || e.timing.kind !== 'ability' || G.winner != null || G.pending || G.queue.length) return false;
  if (!G.p[pi].field.includes(k) || !effectActive(k, e)) return false;
  const t = e.timing, b = G.battle, lab = t.label || '';
  if (t.step === 'main') { if (!(G.turn === pi && (G.step === 'main' || G.step === 'main2') && !b)) return false; }
  else {
    if (b) { if (!(b.phase === 'flash1' || b.phase === 'flash2') || b.prio !== pi) return false; }
    else if (!(G.turn === pi && ['main', 'main2'].includes(G.step))) return false;   // アタックとアタックの間(バトルが無いアタックステップ)ではフラッシュの起動効果は使えない
    const atk = !!b && b.iid === k.iid && !b.gone, blk = !!b && b.blocker === k.iid && !b.bgone;
    if (lab.includes('アタック/ブロック中')) { if (!atk && !blk) return false; }
    else if (lab.includes('アタック中')) { if (!atk) return false; }
    else if (lab.includes('ブロック中')) { if (!blk) return false; }
    if (lab.includes('自分のアタックステップ') && !(G.turn === pi && G.step === 'attack')) return false;
    if (lab.includes('相手のアタックステップ') && !(G.turn !== pi && G.step === 'attack')) return false;
    if (lab.includes('自分のターン') && G.turn !== pi) return false;
  }
  if (t.limit && k.used && k.used[ei] === (t.limit === 'battle' ? 'b' + G.battleNo : 't' + G.turnNo)) return false;
  const c = e.cost || {};
  if (c.pay && G.p[pi].reserve.length < c.pay - (penSub(G, pi, k) ? 1 : 0)) return false;
  if (c.soulTrash && !(G.p[pi].reserve.some(x => x.soul) || G.p[pi].field.some(x => x.cores.length > 1 && x.cores.some(y => y.soul)))) return false;
  if (c.tapSelf && k.tapped) return false;
  if (c.tapNexus && !G.p[pi].field.some(x => x.def.type === 'nexus' && !x.tapped && x.def.family.includes(c.tapNexus))) return false;
  if (c.discard && !discardCands(G, pi, c.discard).length) return false;
  if (e.cond && e.cond.exists && e.cond.exists.other && !G.p[pi].field.some(x => x !== k && matchT(G, pi, pi, x, e.cond.exists))) return false;
  if (e.cond && e.cond.exists && (e.cond.exists.state === 'blocking' || e.cond.exists.state === 'attacking') && !evalCond(G, pi, e.cond)) return false;
  if (e.cond && (e.cond.nexusAllFam || e.cond.lifeLost) && !evalCond(G, pi, e.cond)) return false;
  const o0 = e.ops[0];
  { const hf = e.ops.find(o => o.op === 'handFree'); if (hf) { if (hf.needTap && !k.tapped) return false; if (!handFreeCands(G, pi, k, hf).length) return false; } const no = e.ops.find(o => o.op === 'nameOnce'); if (no && G.nameUsed && G.nameUsed[pi + '|' + no.key + '|' + (no.key === 'x3a' || no.self ? k.iid : k.def.name)] === G.turnNo) return false; }
  { const mc = e.ops.find(o => o.op === 'moveCores' && o.to && o.to.choose); if (mc && !(k.cores.some(c => !mc.nonSoul || !c.soul) && G.p[pi].field.some(x => x !== k && matchT(G, pi, pi, x, Object.assign({}, mc.to, { who: 'you' }))))) return false; const hp = e.ops.find(o => o.op === 'handPick' && o.discard && !o.opt && o.cost); if (hp && !G.p[pi].hand.some(x => matchDef(x.def, hp.filter || {}))) return false; }
  if (o0 && o0.op === 'recover' && !G.p[pi].trash.some(x => matchDef(x.def, o0.target || {}))) return false;
  if (o0 && o0.op === 'act' && o0.target) { const t = o0.target, qi = t.who === 'opp' ? 1 - pi : pi; if (!G.p[qi].field.some(x => matchT(G, pi, qi, x, t))) return false; }
  return true;
}
const discardCands = (G, pi, f) => G.p[pi].hand.filter(c => (!f.family || c.def.family.includes(f.family)) && (f.costMax == null || c.def.cost <= f.costMax)).map(c => c.iid);
function abilityAct(G, pi, iid, ei) {
  const P = G.p[pi], k = P.field.find(x => x.iid === iid); if (!k || !abilityOK(G, pi, k, ei)) return;
  const e = k.def.effects[ei], c = e.cost || {};
  if (c.discard) {   // 手札を選んで破棄するコスト: 選んだあとに効果を使う
    G.pending = { pi, name: k.def.name, n: c.discard.n || 1, cands: discardCands(G, pi, c.discard), qi: pi, text: e.text, kind: 'costDiscard', opt: true, x: { src: iid, ei, to: c.discard.to || '', desc: (c.discard.costMax != null ? 'コスト' + c.discard.costMax + '以下の' : '') + (c.discard.family ? '系統「' + c.discard.family + '」を持つ' : '') } };
    G.seq++; return;
  }
  abilityPay(G, pi, k, ei, null);
}
