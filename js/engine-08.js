/* --- CPU(相手プレイヤーとして、人と同じ操作を自動で出す) --- */
const cpuSkip = new Set();
function cpuSummon(G, i = 1) {
  const P = G.p[i], res = P.reserve;
  const cands = P.hand.filter(k => k.def.type !== 'magic' && !cpuSkip.has(k.iid)).map(k => { const r = payRequirement(P, k.def, {}); return { k, need: r.need, place: minPlaceOf(k.def), ok: r.ok }; })
    .filter(x => x.ok && x.need + x.place <= res.length).sort((a, b) => b.k.def.cost - a.k.def.cost);
  if (!cands.length) return null;
  const x = cands[0], ids = res.slice().sort((a, b) => (a.soul ? 1 : 0) - (b.soul ? 1 : 0)).map(c => c.id);
  const rest = ids.slice(x.need), lv2 = x.k.def.levels[1] ? x.k.def.levels[1].core : x.place;
  return { k: 'play', iid: x.k.iid, pay: ids.slice(0, x.need), place: rest.slice(0, Math.min(rest.length, Math.max(x.place, lv2))) };
}

/* --- 強いCPU(状況を見て、アタック・ブロック・召喚・マジックを選ぶ) --- */
const cpuStrong = (G, i) => (Array.isArray(G.cpuLv) ? G.cpuLv[i] : G.cpuLv) === 'strong';
function cpuWantMull(G, i) {
  const h = G.p[i].hand, low = h.filter(k => k.def.type !== 'magic' && k.def.cost <= 3).length, mg = h.filter(k => k.def.type === 'magic').length;
  return low === 0 || mg >= Math.max(3, h.length - 1);
}
/* CPUの判断に使う重み(自己対戦で調整した値)。G.cpuW[i] があればそちらを使う */
const CPUW = { sBp: 1, sEff: 400, sFirst: 4000, sNx: 980.553, sNx0: 2500, sMg: 525.679, keepRes: 0, lvBp: 1, lvMin: 0, lvNx: 800, lvOn: 1, lvPre: 99999, aFree: 3, aLife: 2, aSwarm: 1, aRisk: 2.005, aDef: 2, aThr: 0.874, bLife: 1, bTrade: 1, bBp: 0, aPushM: 0, aBait: 0, aEarly: 0, aEarlyT: 3, aTrade: 0, sRed: 0, sCoreE: 0, sCoreT: 3, tEx: 0 };   // 追加の判断材料は標準ではオフ(従来と同じ強さ)。学習で調整される
// カードの役割(見えている情報だけで判断): 召喚時にコアが増える/召喚した時点で仕事を終える小型/軽減の助けになる小型
const cpuHasSumCore = d => (d.effects || []).some(e => e.timing && e.timing.kind === 'trigger' && e.timing.event === 'summon' && (e.ops || []).some(o => o.op === 'voidCore'));
const cpuDone = d => d.type === 'spirit' && d.cost <= 2 && (d.effects || []).filter(e => e.timing.kind !== 'keyword').every(e => e.timing.kind === 'trigger' && e.timing.event === 'summon');
const cpuW = (G, i) => (G.cpuW && G.cpuW[i]) || CPUW;
function cpuSummonStrong(G, i) {
  const W = cpuW(G, i), P = G.p[i], res = P.reserve, mySp = P.field.filter(k => k.def.type === 'spirit').length, myNx = P.field.some(k => k.def.type === 'nexus');
  const cands = P.hand.filter(k => k.def.type !== 'magic' && !cpuSkip.has(k.iid)).map(k => { const r = payRequirement(P, k.def, {}); return { k, need: r.need, place: minPlaceOf(k.def), ok: r.ok }; })
    .filter(x => x.ok && x.need + x.place <= res.length);
  if (!cands.length) return null;
  cands.forEach(x => {
    const spare = res.length - x.need, lv = (x.k.def.levels || []).filter(l => l.core <= spare && l.core >= x.place).sort((a, b) => b.core - a.core)[0];
    x.put = lv ? lv.core : x.place;
    const eff = x.k.def.effects.filter(e => e.timing.kind !== 'keyword').length;
    const dd = x.k.def, roleB = dd.type === 'spirit' ? ((G.turnNo <= W.sCoreT && cpuHasSumCore(dd) ? W.sCoreE : 0) + (dd.cost <= 1 && dd.symbols && dd.symbols.normal >= 1 && P.hand.some(h => h !== x.k && h.def.color === dd.color && h.def.reduction > 0) ? W.sRed : 0)) : 0;
    x.score = x.k.def.type === 'spirit' ? ((lv ? lv.bp : ((x.k.def.levels || [])[0] || {}).bp || 0) * W.sBp + eff * W.sEff + (mySp === 0 ? W.sFirst : 0) + roleB) : (myNx ? W.sNx : W.sNx0) + eff * W.sMg;
  });
  cands.sort((a, b) => b.score - a.score || b.k.def.cost - a.k.def.cost);
  const x = cands[0], ids = res.slice().sort((a, b) => (a.soul ? 1 : 0) - (b.soul ? 1 : 0)).map(c => c.id);
  return { k: 'play', iid: x.k.iid, pay: ids.slice(0, x.need), place: ids.slice(x.need, x.need + x.put) };
}
// リザーブのコアを盤面のカードに移して、レベルを上げる(コアの移動)
function cpuLevelStrong(G, i, pre) {
  const W = cpuW(G, i), P = G.p[i], res = P.reserve; if (!W.lvOn) return null;
  const avail = res.length - W.keepRes; if (avail <= 0) return null;
  let best = null;
  P.field.forEach(k => {
    const L = k.def.levels || []; if (!L.length) return;
    const n = k.cores.length, cur = L.filter(l => l.core <= n).pop(), nx = L.find(l => l.core > n); if (!nx) return;
    const need = nx.core - n; if (need <= 0 || need > avail) return;
    const gain = k.def.type === 'spirit' ? ((nx.bp || 0) - ((cur && cur.bp) || 0)) * W.lvBp / Math.max(1, need) : W.lvNx / Math.max(1, need);
    if (gain < Math.max(W.lvMin, pre || 0)) return; if (!best || gain > best.gain) best = { k, need, gain };
  });
  if (!best) return null;
  const ids = res.slice().sort((a, b) => (a.soul ? 1 : 0) - (b.soul ? 1 : 0)).slice(0, best.need).map(c => c.id);
  return { k: 'moveCores', ids, to: { zone: 'card', iid: best.k.iid } };
}
function cpuMagicStrong(G, i) {
  const P = G.p[i], O = G.p[1 - i], res = P.reserve;
  const c = P.hand.filter(k => k.def.type === 'magic' && !cpuSkip.has(k.iid) && k.def.effects.some(e => e.timing.kind === 'main')).map(k => ({ k, r: payRequirement(P, k.def, {}) }))
    .filter(x => x.r.ok && x.r.need <= res.length && !x.r.soul && (O.field.some(f => f.def.type === 'spirit') || x.k.def.effects.some(e => (e.ops || []).some(o => ['draw', 'addCore', 'reveal', 'recover'].includes(o.op))))).sort((a, b) => b.k.def.cost - a.k.def.cost);
  if (!c.length) return null;
  const x = c[0], ids = res.slice().sort((a, b) => (a.soul ? 1 : 0) - (b.soul ? 1 : 0)).map(q => q.id);
  return { k: 'play', iid: x.k.iid, pay: ids.slice(0, x.r.need), place: [] };
}
function cpuAttackStrong(G, i) {
  const W = cpuW(G, i), P = G.p[i], O = G.p[1 - i];
  const mine = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canAttackNow(G, k) && (!atkToll(G, i, k) || P.reserve.length)).sort((a, b) => curBP(G, b) - curBP(G, a));
  if (!mine.length) return null;
  const oppBl = O.field.filter(k => k.def.type === 'spirit' && !k.tapped), oppMax = Math.max(0, ...oppBl.map(k => curBP(G, k)));
  const oppLife = O.life.length, oppAll = O.field.filter(k => k.def.type === 'spirit').length;
  const myUn = P.field.filter(k => k.def.type === 'spirit' && !k.tapped).length;
  if (mine.length > oppBl.length && mine.length - oppBl.length >= oppLife) {   // とどめを狙える
    const margin = mine.length - oppBl.length - oppLife;   // 余裕(止められても足りる数)
    if (margin >= W.aPushM || !W.aBait) return { k: 'attack', iid: mine[0].iid };   // 余裕があれば押し切る
    return { k: 'attack', iid: mine[mine.length - 1].iid };   // ぴったりのときは、止められても痛くない方から殴る
  }
  // 守りの必要さ(自分のライフが少なく、残る守り手が少ないほど大きい)
  const defNeed = (myUn <= 1 ? 1 : 0) * Math.max(0, (5 - P.life.length) / 4) * (oppAll > 0 ? 1 : 0);
  let best = null;
  mine.forEach(k => {
    const bp = curBP(G, k), risk = oppBl.length ? Math.max(0, oppMax - bp) / 1000 : 0;
    const sc = (oppBl.length === 0 ? W.aFree : 0) + W.aLife * Math.max(0, (6 - oppLife) / 6) * 2 + W.aSwarm * Math.max(0, mine.length - oppBl.length) - W.aRisk * risk - W.aDef * defNeed - (G.turnNo <= W.aEarlyT ? W.aEarly : 0) + (risk > 0 && cpuDone(k.def) ? W.aTrade : 0);
    if (!best || sc > best.sc) best = { k, sc };
  });
  if (best && best.sc >= W.aThr) return { k: 'attack', iid: best.k.iid };
  return null;
}
function cpuBlockStrong(G, i, b) {
  const W = cpuW(G, i), P = G.p[i], O = G.p[1 - i], A = O.field.find(x => x.iid === b.iid), ab = A ? curBP(G, A) : 0, dmg = A ? atkDmgPreview(G, b, A) : 1;
  const bl = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canBlockWith(G, k)).map(k => ({ k, bp: curBP(G, k) }));
  if (!bl.length) return { k: 'block', iid: null };
  const weak = bl.slice().sort((a, b2) => a.bp - b2.bp || a.k.def.cost - b2.k.def.cost)[0];
  const win = bl.filter(x => x.bp > ab + W.bBp * 1000).sort((a, b2) => a.bp - b2.bp)[0];
  if (win) return { k: 'block', iid: win.k.iid };
  const trade = bl.filter(x => x.bp === ab && A && x.k.def.cost <= A.def.cost + W.bTrade).sort((a, b2) => a.k.def.cost - b2.k.def.cost)[0];
  if (trade) return { k: 'block', iid: trade.k.iid };
  if (clashForced(G)) return { k: 'block', iid: weak.k.iid };
  if (P.life.length <= dmg || P.life.length <= W.bLife) return { k: 'block', iid: weak.k.iid };
  return { k: 'block', iid: null };
}
// 以前のCPU(比較用)
function cpuAttackOld(G, i) {
  const P = G.p[i], O = G.p[1 - i];
  const mine = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canAttackNow(G, k) && (!atkToll(G, i, k) || P.reserve.length)).sort((a, b) => curBP(G, b) - curBP(G, a));
  if (!mine.length) return null;
  const oppBl = O.field.filter(k => k.def.type === 'spirit' && !k.tapped), oppMax = Math.max(0, ...oppBl.map(k => curBP(G, k)));
  const oppLife = O.life.length, oppAll = O.field.filter(k => k.def.type === 'spirit').length;
  const myUn = P.field.filter(k => k.def.type === 'spirit' && !k.tapped).length;
  if (mine.length > oppBl.length && mine.length - oppBl.length >= oppLife) return { k: 'attack', iid: mine[0].iid };
  const safe = mine.filter(k => !oppBl.length || curBP(G, k) >= oppMax);
  if (!safe.length) return null;
  if (oppAll > 0 && myUn <= 1 && P.life.length <= 3 && !(oppBl.length === 0 && oppLife <= 1)) return null;
  return { k: 'attack', iid: safe[0].iid };
}
function cpuBlockOld(G, i, b) {
  const P = G.p[i], O = G.p[1 - i], A = O.field.find(x => x.iid === b.iid), ab = A ? curBP(G, A) : 0, dmg = A ? atkDmgPreview(G, b, A) : 1;
  const bl = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canBlockWith(G, k)).map(k => ({ k, bp: curBP(G, k) }));
  if (!bl.length) return { k: 'block', iid: null };
  const weak = bl.slice().sort((a, b2) => a.bp - b2.bp || a.k.def.cost - b2.k.def.cost)[0];
  const win = bl.filter(x => x.bp > ab).sort((a, b2) => a.bp - b2.bp)[0];
  if (win) return { k: 'block', iid: win.k.iid };
  const trade = bl.filter(x => x.bp === ab && A && x.k.def.cost <= A.def.cost + 1).sort((a, b2) => a.k.def.cost - b2.k.def.cost)[0];
  if (trade) return { k: 'block', iid: trade.k.iid };
  if (clashForced(G)) return { k: 'block', iid: weak.k.iid };
  if (P.life.length <= dmg || P.life.length <= 2) return { k: 'block', iid: weak.k.iid };
  return { k: 'block', iid: null };
}
function cpuDecide(G, i = 1) {
  const P = G.p[i], O = G.p[1 - i];
  if (G.winner != null) return null;
  if (G.pick) return G.pick.pi === i ? { k: 'setFirst', first: true } : null;
  if (G.mull) return G.mull.order[G.mull.idx] === i ? { k: 'mulligan', yes: cpuStrong(G, i) ? cpuWantMull(G, i) : false } : null;
  if (G.pending) {
    const pd = G.pending; if (pd.pi !== i) return null;
    if (pd.kind === 'ynx') return { k: 'choose', iids: ['yes'] };
    if (pd.kind === 'colorPick') { const cnt = {}; G.p[1 - i].field.forEach(k => { if (k.def.type === 'spirit') cnt[k.def.color] = (cnt[k.def.color] || 0) + 1; }); const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; return { k: 'choose', iids: best ? [best] : [] }; }
    if (pd.kind === 'sumPay') return { k: 'sumSkip' };
    if (pd.kind === 'order') return { k: 'orderPick', id: pd.x.opts[0].id };
    if (pd.kind === 'reveal') return pd.x.phase === 'pick' ? { k: 'revTake', iids: pd.x.groups ? pd.x.groups.map(g => g[0]).filter(Boolean) : pd.x.cands.slice(0, pd.x.takeN || 1) } : { k: 'revOrder', order: pd.x.restIds.slice() };
    if (pd.kind === 'coreSel') return { k: 'coreSel', ids: pd.x.cores.slice().sort((a, b) => (a.soul ? 1 : 0) - (b.soul ? 1 : 0)).slice(0, pd.n).map(c => c.id) };
    if (pd.kind === 'freeMagic' || pd.kind === 'costDiscard') return { k: 'choose', iids: [] };
    if (pd.kind === 'handPick') return { k: 'choose', iids: pd.cands.slice(0, pd.n) };
    if (pd.kind === 'act' && pd.place) {
      const ids = [], need = pd.place.min; P.reserve.slice(0, need).forEach(c => ids.push(c.id));
      if (ids.length < need) P.field.forEach(k => { if (k.iid !== pd.cands[0]) k.cores.slice(1).forEach(c => { if (ids.length < need) ids.push(c.id); }); });
      return ids.length >= need && !pd.opt ? { k: 'choose', iids: pd.cands.slice(0, 1), pay: ids } : { k: 'choose', iids: [], pay: [] };
    }
    if (pd.kind === 'act' && pd.both) { const bpb = id => { const k = O.field.concat(P.field).find(x => x.iid === id); return k ? curBP(G, k) : 0; }, mine = id => P.field.some(x => x.iid === id); const nn = Math.min(pd.n, pd.cands.length); return { k: 'choose', iids: pd.cands.filter(x => !(pd.camo && pd.camo[x])).sort((a, b) => (mine(a) - mine(b)) || (mine(a) ? bpb(a) - bpb(b) : bpb(b) - bpb(a))).slice(0, nn), pay: [] }; }   // CPUは、相手の強いスピリット→自分の弱いスピリットの順に指定する
    if (pd.kind === 'act' && pd.camo) { const non = pd.cands.filter(x => !pd.camo[x]).slice(0, pd.n); return { k: 'choose', iids: non, pay: [] }; }   // CPUは迷彩にコストを払って指定しない
    if (pd.kind === 'act' && pd.by != null && pd.by !== i && pd.qi === i) { const bpq = id => { const k = P.field.find(x => x.iid === id); return k ? curBP(G, k) : 0; }; return { k: 'choose', iids: pd.cands.slice().sort((a, b) => bpq(a) - bpq(b)).slice(0, Math.min(pd.n, pd.cands.length)) }; }   // 相手が指定する: CPUは一番弱いスピリットを差し出す
    const c = pd.cands.slice();
    if (pd.kind !== 'moveCores' && pd.qi !== i) { const bp = id => { const k = O.field.find(x => x.iid === id); return k ? curBP(G, k) : 0; }; const exv = id => { const k = O.field.find(x => x.iid === id); return k && k.def.symbols && k.def.symbols.ex ? cpuW(G, i).tEx : 0; }; c.sort((a, b) => (bp(b) - exv(b)) - (bp(a) - exv(a))); }
    if (pd.pair && pd.qi !== i) { const bpOf = id => { const k = O.field.find(x => x.iid === id); return k ? curBP(G, k) : 0; }; const lo = c.filter(id => bpOf(id) <= 3000); return { k: 'choose', iids: lo.length >= 2 ? lo.slice(0, 2) : c.slice(0, 1) }; }
    return { k: 'choose', iids: pd.opt && pd.kind === 'moveCores' ? [] : c.slice(0, Math.min(pd.n, c.length)) };
  }
  const b = G.battle;
  if (b) {
    if (b.phase === 'flash1' || b.phase === 'flash2') return b.prio === i ? { k: 'pass' } : null;
    if (b.phase === 'block') {
      if (b.prio !== i) return null;
      { const mb = mustBlocker(G); if (mb) return { k: 'block', iid: mb }; }
      if (cpuStrong(G, i)) return cpuW(G, i).old ? cpuBlockOld(G, i, b) : cpuBlockStrong(G, i, b);
      const A = O.field.find(x => x.iid === b.iid), ab = A ? curBP(G, A) : 0;
      const c = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canBlockWith(G, k)).map(k => ({ k, bp: curBP(G, k) })).filter(x => x.bp >= ab).sort((a, b2) => a.bp - b2.bp);
      if (!c.length && clashForced(G)) { const w = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canBlockWith(G, k)).sort((a, b2) => curBP(G, a) - curBP(G, b2)); return { k: 'block', iid: w[0].iid }; }
      return { k: 'block', iid: c.length ? c[0].k.iid : null };
    }
    return null;
  }
  if (G.turn !== i) return null;
  if (G.step === 'main' || G.step === 'main2') { const sm = cpuStrong(G, i) ? (cpuW(G, i).old ? (cpuSummon(G, i) || cpuMagicStrong(G, i)) : (cpuLevelStrong(G, i, cpuW(G, i).lvPre) || cpuSummonStrong(G, i) || cpuMagicStrong(G, i) || cpuLevelStrong(G, i))) : cpuSummon(G, i); if (sm) return sm; }
  if (G.step === 'attack' && !G.noAttack) {
    if (cpuStrong(G, i)) { const sa = cpuW(G, i).old ? cpuAttackOld(G, i) : cpuAttackStrong(G, i); return sa || { k: 'next' }; }
    const oppMax = Math.max(0, ...O.field.filter(k => k.def.type === 'spirit' && !k.tapped).map(k => curBP(G, k)));
    const atk = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canAttackNow(G, k) && (!atkToll(G, i, k) || P.reserve.length) && curBP(G, k) >= oppMax).sort((a, b) => curBP(G, b) - curBP(G, a))[0];
    if (atk) return { k: 'attack', iid: atk.iid };
  }
  return { k: 'next' };
}

/* --- 表示用の情報(相手の手札・デッキの中身は含めない) --- */
function symDynOf(G) {
  const m = {};
  G.p.forEach((P, pi) => P.field.forEach(k => { if (k.def.type !== 'spirit') return; let n = 0; k.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(k, e) && e.ops.some(o => o.op === 'dmgPlus') && evalCond(G, pi, e.cond)) e.ops.forEach(o => { if (o.op === 'dmgPlus' && !o.late) n += o.n | 0; }); }); if (n) m[k.iid] = n; }));
  return m;
}
function viewFor(G, i) {
  const me = G.p[i], op = G.p[1 - i];
  const pub = P => ({ exIid: P.exIid || null, myTurn: !!P.myTurn, symStat: P.symStat || {}, field: P.field, trash: P.trash, removed: P.removed, life: P.life, reserve: P.reserve, coreTrash: P.coreTrash, void: P.void, handN: P.hand.length, deckN: P.deck.length });
  return { names: (G.names || []).map(x => String(x || '').slice(0, 14)), pick: G.pick ? { pi: G.pick.pi } : null, mull: G.mull ? { pi: G.mull.order[G.mull.idx] } : null, me: i, turn: G.turn, turnNo: G.turnNo, step: G.step, pause: G.settings.pause, lifeLost: G.lifeLost, noAttack: G.noAttack, lifeManual: !!G.settings.lifeManual, battle: G.battle ? { pi: G.battle.pi, iid: G.battle.iid, phase: G.battle.phase, prio: G.battle.prio, blocker: G.battle.blocker, gone: G.battle.gone, bgone: G.battle.bgone, forced: clashForced(G) || !!mustBlocker(G) } : null,
           pending: G.pending ? { alt: G.pending.alt ? { base: G.pending.alt.base || '', label: G.pending.alt.label || '' } : null, altFree: !!(G.pending.alt && /リザーブ/.test(G.pending.alt.label || '') && G.pending.cands.length === 1), pi: G.pending.pi, name: G.pending.name, n: G.pending.n, cands: G.pending.cands, qi: G.pending.qi, text: G.pending.text, kind: G.pending.kind || 'destroy', hand: !!G.pending.hand, exTemp: !!G.pending.exTemp, opt: !!G.pending.opt, yn: !!G.pending.yn, upto: !!G.pending.upto, why: G.pending.why || '', camo: G.pending.camo || null, place: G.pending.place || null, by: G.pending.by == null ? null : G.pending.by, x: G.pending.x ? (G.pending.kind === 'reveal' ? G.pending.x.hidden && G.pending.pi !== i ? { cards: [], takeN: 1, cands: [], phase: 'order', take: 'hand', rest: 'bottom', mode: '', auto: false, optional: false, restIds: [], desc: '', live: [], hidden: true } : { cards: G.pending.x.cards.map(c => ({ iid: c.iid, def: c.def })), hidden: !!G.pending.x.hidden, takeN: G.pending.x.takeN || 1, cands: G.pending.x.cands, phase: G.pending.x.phase, take: G.pending.x.take, rest: G.pending.x.rest, mode: G.pending.x.mode || '', auto: !!G.pending.x.auto, optional: G.pending.x.optional, restIds: G.pending.x.restIds, desc: G.pending.x.desc, live: G.pending.x.live || [] } : G.pending.x) : null, fam: G.pending.fam || '' } : null, undoPlay: G.undoPlay && G.undoPlay.pi === i && !G.pending && (!G.battle || (G.undoPlay.kind === 'attack' && G.battle.pi === i && !G.battle.passes)) ? '「' + G.undoPlay.name + '」' + G.undoPlay.tail + 'に戻る' : null, canUndo: !!(G.undo && G.pending && !(G.pending.by != null && G.pending.by !== G.pending.pi)), evs: G.evs, winner: G.winner, loseWhy: G.loseWhy || '', usable: usableFor(G, i), trace: G.trace, fx: G.fx, seq: G.seq, notice: G.notice,
           noAtk: G.p.flatMap(Q => Q.field.filter(k => k.def.type === 'spirit' && !canAttackNow(G, k)).map(k => k.iid)), symDyn: symDynOf(G),
           bps: Object.fromEntries(G.p.flatMap(Q => Q.field.map(k => [k.iid, curBP(G, k)]))), bpx: Object.fromEntries(G.p.flatMap(Q => Q.field.map(k => { const w = []; curBP(G, k, w); return [k.iid, w]; }))), test: !!G.settings.test, log: G.log.slice(-100), cast: G.cast ? { n: G.cast.n, p: G.cast.pi, def: G.cast.def } : null,
           stamp: G.stamp ? { mine: G.stamp.p === i, e: G.stamp.e, n: G.stamp.n } : null,
           you: Object.assign(pub(me), { hand: me.hand, fl: me.fl }, G.settings.test ? { deck: me.deck } : {}), opp: pub(op) };
}

// 観戦・リプレイ用: 先攻側(席0)を手前に置いた、両方の手札が見える画面情報。操作に関わる情報(対象の選択・支払いなど)は含めない
function viewSpec(G) {
  const v = viewFor(G, 0), P0 = G.p[0], P1 = G.p[1];
  v.spec = 1; v.stamp = null; v.canUndo = false; v.undoPlay = null; v.usable = { hand: [], block: [], attack: [], abil: [] }; v.test = false;
  v.you = Object.assign(v.you, { hand: P0.hand, fl: P0.fl }); v.opp = Object.assign(v.opp, { hand: P1.hand, fl: P1.fl });
  const pd = G.pending; v.pending = null; v.wait = pd ? { pi: pd.pi, name: pd.name || '', kind: pd.kind || '' } : G.pick ? { pi: G.pick.pi, name: '', kind: 'pick' } : G.mull ? { pi: G.mull.order[G.mull.idx], name: '', kind: 'mull' } : null; v.pick = null; v.mull = null;
  v.rev = pd && pd.kind === 'reveal' && pd.x && !pd.x.mode && pd.x.cards && pd.x.cards.length ? { p: pd.pi, key: (pd.name || '') + ':' + pd.x.cards.map(c => c.iid).join(','), cards: pd.x.cards.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) } : null;
  v.log = G.log.slice(-60);
  return v;
}
// 記録(RECDB)から、n手目までの局面を作り直す
function replayBuild(rec, n) {
  const G = newGame(rec.defs[0], rec.defs[1], Object.assign({}, rec.s, { seed: rec.seed, norec: true, autoEnd: !!(rec.s && rec.s.autoEnd) }));
  G.names = (rec.names || []).slice();
  const m = n == null ? rec.acts.length : Math.min(n, rec.acts.length);
  for (let i = 0; i < m; i++) { const x = rec.acts[i]; act(G, x[0], JSON.parse(JSON.stringify(x[1]))); }
  return G;
}
/* --- レベル・BP・軽減の計算 --- */
// 「Lv2として扱う」の効果を、操作のたびに見直す
function playFlags(G, pi) { const P0 = G.p[pi]; return { oppS: G.p[1 - pi].field.some(k => k.def.type === 'spirit' && k.def.cost <= 3), noSp: !P0.field.some(k => k.def.type === 'spirit'), sk: !!(G.ownDes && G.ownDes.turn === G.turnNo && G.ownDes.p === pi) && P0.d6t !== G.turnNo, tp: P0.trash.every(x => x.def.color === 'purple'), or: G.p[1 - pi].reserve.length, atk2: G.turn === pi && !!(G.atkCnt && G.atkCnt.t === G.turnNo && G.atkCnt.n >= 2), ym: (G.mLog || []).some(m => m.pi === pi && m.turn === G.turnNo && m.color === 'yellow'), y82: sbN(G, pi, 'y82') ? P0.field.filter(k => k.def.type === 'spirit' && k.def.cost === 2).length : 0, b83: sbN(G, pi, 'b83'), venom: sbN(G, pi, 'venom'), y30: sbN(G, pi, 'y30'), x53: (G.turn === pi && (G.step === 'main' || G.step === 'main2') && G.p[1 - pi].field.some(k => k.def.effects.some(e => e.timing.kind === 'static' && effectActive(k, e) && e.ops.some(o => o.op === 'extraSummon3')))) ? 1 : 0 }; }
function sbN(G, pi, kind) { if (G.turn !== pi || (G.step !== 'main' && G.step !== 'main2')) return 0; return G.p[pi].field.filter(k => k.def.effects.some(e => e.timing.kind === 'static' && effectActive(k, e) && e.ops.some(o => o.op === 'sumSymBonus' && o.kind === kind))).length; }
function refreshLv(G) { G.p.forEach((Q, pi) => { Q.fl = playFlags(G, pi); Q.myTurn = G.turn === pi; Q.exIid = (Q.exTmp && Q.exTmp.t === G.turnNo && Q.exTmp.s === G.step) ? Q.exTmp.iid : null; Q.symStat = symStatOf(G, pi); Q.field.forEach(k => { if (k.def.type !== 'spirit') return; const e = k.def.effects.find(e => e.timing.kind === 'static' && e.ops.some(o => o.op === 'asLv2')); k.lvPlus = k.lvUpT === G.turnNo; k.asLv2 = !!(e && evalCond(G, pi, e.cond, { srcIid: k.iid })) || (k.lvUpB != null && !!G.battle && k.lvUpB === G.battleNo); }); }); }
function lvInfo(k) {
  const L = k.def.levels;
  if (!L.length) return null;
  const n = k.cores.length;
  let cur = null;
  for (const l of L) if (n >= l.core) cur = l;
  // 真界放: ソウルコア1個でレベル2扱い
  if (k.def.keywords.includes('shinkai') && k.cores.some(c => c.soul)) cur = L[L.length - 1];
  if (k.asLv2 || k.maxLv) cur = L[L.length - 1];
  else if (k.lvPlus && cur) { const ix = L.indexOf(cur); if (ix >= 0 && ix < L.length - 1) cur = L[ix + 1]; }
  if (k.lv1) cur = L[0];
  return cur;
}
function symStatOf(G, pi) { const st = {}; G.p[pi].field.forEach(k => k.def.effects.forEach(e => { if (e.timing.kind === 'static' && effectActive(k, e) && e.ops.some(o => o.op === 'symAddCond') && evalCond(G, pi, e.cond, { srcIid: k.iid })) e.ops.forEach(o => { if (o.op === 'symAddCond') st[o.color] = (st[o.color] | 0) + 1; }); })); return st; }
function fieldSymbols(P, color) {
  // EXシンボルも場では通常のシンボルと同じく1個として数える
  return ((P.symStat && P.symStat[color]) | 0) + P.field.filter(k => k.def.color === color && (k.def.symTurn !== 'own' || P.myTurn)).reduce((s, k) => s + k.def.symbols.normal + (k.def.symbols.ex ? 1 : 0), 0) + P.field.reduce((s, k) => s + (k.symx || []).filter(x => x.color === color).reduce((a, x) => a + x.n, 0), 0);
}
// 「効果の記述を持たないスピリット」の判定。EXシンボルや真界放などは効果の記述に含めない
const hasNoEffect = def => def.type === 'spirit' && def.vanilla === true;
