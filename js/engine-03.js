/* --- ネクサスをスピリットとして扱う(効果は発揮しないバニラ: Lv1 5000 / Lv2 7000)。期間が過ぎる/場を離れる/消えると、元のネクサスに戻る --- */
const NXSP_LV = [{ lv: 1, core: 1, bp: 5000 }, { lv: 2, core: 3, bp: 7000 }];
function nxToSpirit(G, k, dur) {
  if (!k || (k.def.type !== 'nexus' && !k.asSp)) return false;
  if (!k.asSp) { k.baseDef = k.def; k.def = Object.assign({}, k.def, { type: 'spirit', levels: NXSP_LV, effects: [], keywords: (k.def.keywords || []).filter(x => x !== 'shinkai'), vanilla: true }); }
  k.asSp = { dur: dur || 'step', turn: G.turnNo };
  G.evs.push({ t: 'cardGlow', iid: k.iid }); return true;
}
function nxRevert(G, k) { if (k && k.baseDef) { k.def = k.baseDef; delete k.baseDef; } if (k) delete k.asSp; }
function nxCleanup(G, dur) { G.p.forEach(Q => Q.field.slice().forEach(k => { if (k.asSp && (!dur || k.asSp.dur === dur)) nxRevert(G, k); })); }
function clearMods(G, dur) {
  if (!dur || dur === 'battle') { nxCleanup(G, dur); G.p.forEach(Q => Q.field.forEach(k => { k.symOvr = null; })); }
  G.p.forEach(Q => Q.field.forEach(k => { if (!dur || dur === 'battle') k.lv1 = false; if (!dur) k.maxLv = false; if (k.mods && k.mods.length) k.mods = dur ? k.mods.filter(m => m.d !== dur) : []; if (k.symx && k.symx.length) k.symx = dur ? k.symx.filter(m => m.d !== dur) : []; }));
}
function untapNoTarget(G, pi, e, k) {   // 「回復させる」だけの効果で、疲労している対象がいなければ発動しない
  const ops = e.ops || []; if (!ops.length) return false;
  if (k && ops.every(o => o.op === 'selfAct' && o.verb === 'untap')) return !k.tapped;
  return ops.every(o => o.op === 'act' && o.target && o.target.who === 'you' && o.target.type === 'spirit' && (o.acts || []).length && o.acts.every(a => a.verb === 'untap') && !G.p[pi].field.some(x => x.tapped && matchT(G, pi, pi, x, Object.assign({}, o.target, { who: 'you' }))));
}
function destroyCard(G, qi, iid) {
  const k = G.p[qi].field.find(x => x.iid === iid); if (!k) return;
  const bt0 = G.battle, isSp0 = k.def.type === 'spirit', todo = collectTrig(k, 'destroyed'), bp0 = k.def.type === 'spirit' ? curBP(G, k) : 0;           // 場を離れるときのレベルで判定する
  if (k.def.type === 'spirit' && G.effPi === qi && todo.act.length) G.effKill = { turn: G.turnNo, p: qi };
  if (k.def.type === 'spirit' && G.effPi === qi && k.def.color === 'purple') G.effKillP = { turn: G.turnNo, p: qi };
  if (G.quiet === iid) todo.act.length = 0;   // 破壊したカードの効果を発揮させない   // 自分の効果で、破壊時効果を持つ自分のスピリットを破壊した
  if (isSp0) (G.desLog = G.desLog || []).push({ turn: G.turnNo, p: qi });
  if (isSp0 && G.effPi === qi) G.ownDes = { turn: G.turnNo, p: qi };
  const ownFam = G.effPi === qi ? (G.costFam || (G.queue[0] && G.queue[0].fam) || null) : null;
  lg(G, qi, '「' + k.def.name + '」が破壊された');
  { const q0 = G.queue[0]; if (k.def.type === 'spirit' && q0 && q0.ctx && q0.ctx.event === 'use' && q0.pi === 1 - qi && G.turn === q0.pi && G.cast && G.cast.def.family.includes('雷竜')) G.p[q0.pi].field.forEach(X => X.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'ampMagicKill' && effectActive(X, e)) enqueue(G, q0.pi, X, e, { event: 'ampMagicKill' }); })); }
  moveCard(G, qi, iid, (isSp0 && G.bp0Dest === iid && bp0Bottom(G, qi, k)) ? 'deckBottom' : 'trash');
  if (isSp0) G.p[qi].trash.slice().forEach(c => { if (c === k) return; c.def.effects.forEach(e => { if (e.timing.kind === 'trashTrig' && e.timing.event === 'allyDestroyed' && (!e.timing.flt || !e.timing.flt.family || k.def.family.includes(e.timing.flt.family))) { G.rtUsed = G.rtUsed || {}; if (G.rtUsed[c.def.name] === G.turnNo) return; G.rtUsed[c.def.name] = G.turnNo; enqueue(G, qi, { def: c.def, iid: c.iid }, e, { event: 'trashTrig' }); } }); });
  if (isSp0 && G.battle && G.turn !== qi && G.step === 'attack') G.battle.hits = (G.battle.hits || 0) + 1;
  applyTrig(G, qi, k, todo, { selfBp: bp0, byOpp: !!G.inBD || G.effPi === 1 - qi, ownFam });
  G.p[qi].field.forEach(X => X.def.effects.forEach((e, ei) => {   // 自分のスピリット(flt.nexusならネクサス)が破壊された時(場の効果が見張る)
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyDestroyedAny' || !effectActive(X, e)) return;
    if (t.flt && t.flt.nexus) { if (!(k.def.type === 'nexus' || (k.baseDef && k.baseDef.type === 'nexus'))) return; } else if (!isSp0) return;
    if (t.step && G.step !== t.step) return; if (t.turn === 'you' && G.turn !== qi) return; if (t.turn === 'opp' && G.turn === qi) return;
    if (t.flt && t.flt.family && !k.def.family.includes(t.flt.family)) return;
    if (t.flt && t.flt.costIn && !t.flt.costIn.includes(k.def.cost)) return; if (t.flt && t.flt.notSelf && X === k) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, qi, X, e, { event: 'allyDestroyedAny', desIid: iid });
  }));
  if (isSp0 && (!!G.inBD || G.effPi === 1 - qi)) {   // 相手によって破壊された時(場の効果が見張る)
    const wasB = !!(bt0 && (bt0.iid === iid || bt0.blocker === iid));
    G.p[qi].field.forEach(X => X.def.effects.forEach((e, ei) => {
      const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyDestroyedOpp' || !effectActive(X, e)) return;
      if (t.step && G.step !== t.step) return; if (t.flt && t.flt.effOnly && G.inBD) return; if (t.flt && t.flt.notBattling && wasB) return; if (t.flt && t.flt.family && !k.def.family.includes(t.flt.family)) return;
      if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
      enqueue(G, qi, X, e, { event: 'allyDestroyedOpp' });
    }));
  }
  if (isSp0 && G.effPi === 1 - qi && G.queue[0] && G.queue[0].st === 'spirit') G.p[1 - qi].field.forEach(X => X.def.effects.forEach((e, ei) => {   // 自分のスピリットの効果で相手のスピリットを破壊した時
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'effKillOpp' || !effectActive(X, e)) return;
    if (t.when === 'attacking' && !(G.battle && G.battle.iid === X.iid)) return;
    if (t.flt && t.flt.killerFam && !t.flt.killerFam.some(f => ((G.queue[0] && G.queue[0].fam) || []).includes(f))) return;
    if (t.flt && t.flt.destBpMax != null && !(bp0 <= t.flt.destBpMax)) return;
    if (t.flt && t.flt.destCostMax != null && !(k.def.cost <= t.flt.destCostMax)) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, 1 - qi, X, e, { event: 'effKillOpp' });
  }));
}
// BP0で破壊された相手のスピリットを、トラッシュに置くかわりにデッキの下へ戻す(覇王樹壁)
const bp0Bottom = (G, qi, k) => G.turn === 1 - qi && G.step === 'attack' && k.def.cost <= 5 && G.p[1 - qi].field.some(X => X.def.effects.some(e => e.keyword === 'bp0Bottom' && effectActive(X, e)));
// 盤面以外(トラッシュ・デッキ・手札)のカードの条件。固有効果はレベルに関係なく「持っている」扱い
function matchDef(d, t) {
  if (t.type && d.type !== t.type) return false;
  if (t.team && !(d.team || []).includes(t.team)) return false;
  if (t.typeAny && !t.typeAny.includes(d.type)) return false;
  if (t.costIn && !t.costIn.includes(d.cost)) return false;
  if (t.color && d.color !== t.color) return false;
  if (t.family && !d.family.includes(t.family)) return false;
  if (t.family2 && !d.family.includes(t.family2)) return false;
  if (t.costMax != null && d.cost > t.costMax) return false;
  if (t.costMin != null && d.cost < t.costMin) return false;
  if (t.kw && !d.effects.some(e => e.keyword === t.kw)) return false;
  if (t.name && d.name !== t.name) return false;
  if (t.famAny && !t.famAny.some(f => d.family.includes(f))) return false;
  if (t.hasEv && !d.effects.some(e => e.timing.kind === 'trigger' && e.timing.event === t.hasEv)) return false;
  if (t.vanilla && d.vanilla !== true) return false;
  if (t.notName && d.name === t.notName) return false;
  if (t.typeAny && !t.typeAny.includes(d.type)) return false;
  return true;
}
function descFilter(f) {
  const CJ = { red: '赤', blue: '青', green: '緑', yellow: '黄', purple: '紫', white: '白' }, KJ = { clash: '激突', puppet: '操霊', flow: '水流', quake: '地鳴', amp: '増幅', spell: '魔述', camo: '迷彩' }, TJ = { spirit: 'スピリット', magic: 'マジック', nexus: 'ネクサス' };
  const a = [];
  if (f.notName) a.push('「' + f.notName + '」以外の'); if (f.costMax != null) a.push('コスト' + f.costMax + '以下の'); if (f.costMin != null) a.push('コスト' + f.costMin + '以上の');
  if (f.family) a.push('系統「' + f.family + '」を持つ'); if (f.famAny) a.push('系統「' + f.famAny.join('」/「') + '」を持つ'); if (f.hasEv) a.push('ブロック時効果を持つ'); if (f.kw) a.push('【' + KJ[f.kw] + '】を持つ'); if (f.color) a.push(CJ[f.color] + 'の');
  return a.join('') + (TJ[f.type] || '') + 'カード';
}
function revAdvance(G) {
  const pd = G.pending, x = pd.x, P = G.p[pd.pi], op = pd.op;
  const pl = x.pickedList || [], rest = x.cards.filter(c => !pl.includes(c.iid));
  const pcs = pl.map(i => x.cards.find(c => c.iid === i)).filter(Boolean), pc = pcs;
  if (x.take === 'play' && pcs.length) {
    // 召喚/配置する: いったんトラッシュ扱いで置き、コストを払って出す(払えない/しないなら残りと一緒にデッキの下へ)
    const c0 = pcs[0]; P.trash.push(c0.inst);
    G.pending = { pi: pd.pi, name: pd.name, n: 1, cands: [c0.iid], qi: pd.pi, text: pd.text, kind: 'sumPay', opt: true, limbo: { iid: c0.iid, rest: rest.map(c => c.iid), x } };
    return;
  }
  if (x.take === 'free') pcs.forEach(pc => { const c = pc.inst; freeSummonCard(G, pd.pi, c, {}); });
  for (const pc of pcs) {
    if (x.take === 'free') continue;
    if (x.take === 'trash') { G.evs.push({ t: 'sweep', p: pd.pi, cards: [{ iid: pc.iid, id: pc.def.id, name: pc.def.name, color: pc.def.color }] }); P.trash.push(pc.inst); (G.discards = G.discards || []).push({ fam: pc.def.family, turn: G.turnNo, p: pd.pi, iid: pc.iid, id: pc.def.id, name: pc.def.name, type: pc.def.type, ex: !!pc.def.symbols.ex, color: pc.def.color, src: pd.name }); lg(G, pd.pi, '　' + pd.name + ': 「' + pc.def.name + '」を破棄'); }
    else { P.hand.push(pc.inst); lg(G, pd.pi, '　' + pd.name + ': 「' + pc.def.name + '」を手札に加えた'); G.evs.push({ t: 'recover', p: pd.pi, from: 'deck', cards: [{ iid: pc.iid, id: pc.def.id, name: pc.def.name, color: pc.def.color }] }); }
  }
  if (x.rest === 'trash') { if (rest.length) G.evs.push({ t: 'sweep', p: pd.pi, cards: rest.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) }); rest.forEach(c => { P.trash.push(c.inst); (G.discards = G.discards || []).push({ turn: G.turnNo, p: pd.pi, iid: c.iid, id: c.def.id, name: c.def.name, type: c.def.type, ex: !!c.def.symbols.ex, color: c.def.color, src: pd.name }); }); if (rest.length) lg(G, pd.pi, '　' + pd.name + ': 残り' + rest.length + '枚を破棄(' + rest.map(c => '「' + c.def.name + '」').join('') + ')'); return revDone(G, pcs, rest.length); }
  if (rest.length <= 1) {
    rest.forEach(c => { if (x.restTop) P.deck.push(c.inst); else P.deck.unshift(c.inst); });
    if (x.auto && rest.length) { G.evs.push({ t: 'deckReturn', p: pd.pi, to: x.restTop ? 'top' : 'bottom', cards: rest.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) }); lg(G, pd.pi, '　' + pd.name + ': 「' + rest[0].def.name + '」をデッキの' + (x.restTop ? '上' : '下') + 'に戻した'); }
    return revDone(G, pcs, rest.length);
  }
  x.phase = 'order'; x.restIds = rest.map(c => c.iid);
}
function revDone(G, pc, n) {
  const pd = G.pending; if (!pd.x.hidden) G.fx.push({ n: pd.name, t: '', p: pd.pi, r: ['デッキの上から' + pd.x.cards.length + '枚をオープン' + (pc && pc.length ? ': ' + pc.map(c => '「' + c.def.name + '」').join('') + 'を' + (pd.x.take === 'trash' ? '破棄' : '手札に加えた') : '')] });
  if ((pd.x.afterDraw === 'oppHand' || pd.x.afterDraw === 'returned') && pd.x.cards.length) { const nn = draw(G.p[pd.pi], pd.x.afterDraw === 'returned' ? (pd.x.drawFlat ? (pd.x.cards.length >= pd.x.drawFlat.n ? pd.x.drawFlat.draw : 0) : pd.x.cards.length) : G.p[1 - pd.pi].hand.length); G.fx.push({ n: pd.name, t: '', p: pd.pi, r: [pd.x.drawFlat && pd.x.drawFlat.draw === 0 ? '手札をデッキの下に戻しました' : (pd.x.afterDraw === 'returned' ? '戻したカード1枚につき1枚、' : '相手の手札1枚につき1枚、') + nn + '枚ドローしました'] }); lg(G, pd.pi, '　' + pd.name + ': ' + nn + '枚ドロー'); }
  const im = pd.x.immediate; G.pending = null; G.undo = null; if (im) return; limboFinish(G, pd.pi);
}
function limboFinish(G, pi) {
  const ls = G.limboSummon; G.limboSummon = null;
  if (ls) applyTrig(G, pi, ls.nk, collectTrig(ls.nk, 'summon'), ls.c);
  G.queue[0].i++; runQueue(G);
}
// 公開したカードを召喚/配置したあと(またはしなかったあと)、残りをデッキの下へ戻す
function limboDone(G, pd, pi, played) {
  const P = G.p[pi], L = pd.limbo, x = L.x;
  if (!played) { const k = P.trash.find(c => c.iid === L.iid); if (k) P.trash.splice(P.trash.indexOf(k), 1); }
  const rest = x.cards.filter(c => L.rest.includes(c.iid) || (!played && c.iid === L.iid));
  G.fx.push({ n: pd.name, t: '', p: pi, r: [played ? '公開したカードを召喚/配置しました' : '召喚/配置しませんでした'] });
  if (rest.length <= 1) { rest.forEach(c => P.deck.unshift(c.inst)); limboFinish(G, pi); return; }
  G.pending = { pi, name: pd.name, n: 1, cands: [], qi: pi, text: pd.text, kind: 'reveal', opt: true, x: Object.assign({}, x, { phase: 'order', cards: rest, pickedList: [], picked: null, restIds: rest.map(c => c.iid), immediate: false }) };
}
// 迷彩: 相手のスピリットの効果で指定される時に必要なコスト(コア個数)
function camoCost(G, c) {
  if (!c || c.def.type !== 'spirit') return 0; let n = 0;
  c.def.effects.forEach(e => { if (e.keyword === 'camo' && effectActive(c, e)) n = Math.max(n, ...(e.ops.length ? e.ops.map(o => o.n | 0) : [1])); });
  G.p.forEach(Q => { if (Q.field.includes(c)) Q.field.forEach(X => X.def.effects.forEach(e => { if (e.timing.kind === 'static' && effectActive(X, e)) e.ops.forEach(o => { if (o.op === 'camoAll' && c.def.color === o.color) n = Math.max(n, o.n | 0); }); })); });
  return n;
}
const coreAvail = (G, pi) => G.p[pi].reserve.length + G.p[pi].field.reduce((s, k) => s + k.cores.length, 0);
// 候補のうち迷彩を持つものを調べて、pendingに迷彩のコストを付ける(スピリットの効果で指定する時だけ)
function camoSetup(G, it, qi, cands, pd, byOpp) {
  if (byOpp || qi === it.pi || it.st !== 'spirit') return cands;
  const camo = {}; let av = coreAvail(G, it.pi), out = [];
  cands.forEach(i => { const c = G.p[qi].field.find(x => x.iid === i), n = camoCost(G, c); if (n > 0) { if (n > av) return; camo[i] = n; } out.push(i); });
  pd.cands = out;
  if (Object.keys(camo).length) {
    pd.camo = camo; pd.upto = true;
    if (out.every(i => camo[i])) pd.opt = true;
    pd.why = ((pd.why ? pd.why + ' / ' : '') + '迷彩のスピリットを指定するには、コアを数だけ支払います').slice(0, 200);
  }
  return out;
}
const hexed = (G, it, qi, c) => qi !== it.pi && ((!!G.battle && !!(it.ctx && it.ctx.event === 'use') && (G.hex || []).some(h => h.iid === c.iid && h.bn === G.battleNo)) || (!!(it.ctx && it.ctx.event === 'use') && c.def.effects.some(e => e.timing.kind === 'static' && effectActive(c, e) && (!e.timing.step || G.step === e.timing.step) && (!e.timing.turn || (e.timing.turn === 'you') === (G.turn === qi)) && (!e.cond || evalCond(G, qi, e.cond)) && e.ops.some(o => o.op === 'noMagicTarget'))) || (!!(it.ctx && it.ctx.event === 'use') && G.p[qi].field.some(X => X.def.effects.some(e => e.timing.kind === 'static' && effectActive(X, e) && e.ops.some(o => o.op === 'noMagicTargetT' && matchT(G, qi, qi, c, Object.assign({ who: 'you' }, o.target)))))));

// ---- 拡張の効果部品(未対応のopは XH を返し、execOp本体で処理する) ----
const XH = { x: 1 };
function insertOps(it, ops) { it.ops = it.ops.slice(); it.ops.splice(it.i + 1, 0, ...ops); }
function dynActs(G, it, op) {
  if (!op.dynBp) return op.acts;
  const d = op.dynBp; let n = 0;
  if (d.perTeam) n = G.p[it.pi].field.filter(x => x.def.type === 'spirit' && (x.def.team || []).includes(d.perTeam)).length;
  if (d.perTrash) n = G.p[it.pi].trash.filter(x => (!d.perTrash.type || x.def.type === d.perTrash.type) && (!d.perTrash.family || x.def.family.includes(d.perTrash.family))).length;
  const amt = Math.max(0, d.base - d.d * n);
  return op.acts.map(a => a.verb === 'bpMod' ? Object.assign({}, a, { amount: -amt }) : a);
}
function freeSummonCard(G, pi, c, ctx) {
  const P = G.p[pi]; c.cores = []; c.tapped = false; P.field.push(c);
  if (c.def.type === 'spirit') { const need = minPlaceOf(c.def); for (let j = 0; j < need && P.reserve.length; j++) c.cores.push(P.reserve.pop()); G.evs.push({ t: 'coreAdd', p: pi, iid: c.iid, n: c.cores.length, sum: 1 }); }
  lg(G, pi, '　「' + c.def.name + '」をコストを支払わずに' + (c.def.type === 'spirit' ? '召喚' : '配置') + (ctx && ctx.fchange ? '(Fチェンジ)' : ''));
  G.ctx = { event: 'summon', pi, iid: c.iid, name: c.def.name, paidWithSoulCore: false, excludedEx: [] };
  applyTrig(G, pi, c, collectTrig(c, 'summon'), Object.assign({ event: 'summon' }, ctx || {}));
  if (c.def.type === 'spirit') P.field.forEach(X => X.def.effects.forEach((e, ei) => {
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allySummon' || !effectActive(X, e) || !matchT(G, pi, pi, c, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (G.turn !== pi || !evalCond(G, pi, e.cond, G.ctx)) return;
    if (t.step === 'main' && !(G.step === 'main' || G.step === 'main2')) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, pi, X, e, { event: 'allySummon', excludedEx: [] });
  }));
}
// 手札から無料で出せるカード(Fチェンジ等)の候補
function handFreeCands(G, pi, S, op) {
  const P = G.p[pi], low = G.p[0].life.length <= 3 || G.p[1].life.length <= 3;
  const room = P.reserve.length + (op.src === 'bounce' && S ? S.cores.length : 0);
  return P.hand.filter(c => {
    const d = c.def; if (op.type && d.type !== op.type) return false;
    if (op.nameHas && !d.name.includes(op.nameHas)) return false;
    if (op.color && d.color !== op.color) return false;
    if (op.diffName && S && d.name === S.def.name) return false;
    if (op.costIn) { const ok = op.costIn.includes(d.cost) || (low && d.effects.some(e => e.keyword === 'fc5') && op.costIn.includes(5)); if (!ok) return false; }
    if (d.type === 'spirit' && room < minPlaceOf(d)) return false;
    return true;
  });
}
function penSub(G, pi, src) {   // 【グリーンウェーブ】を持つ自分の効果でコストを支払う時、ペンライトウェーブを疲労して1コスト分とする
  if (!src || !(src.def.team || []).includes('グリーンウェーブ')) return null;
  return G.p[pi].field.find(x => x.def.type === 'nexus' && !x.tapped && x.def.effects.some(e => e.timing.kind === 'static' && effectActive(x, e) && e.ops.some(o => o.op === 'costSub'))) || null;
}
function bpFlashHook(G, own, c, am) {   // 自分の「BPを+する」フラッシュ効果で、自分のスピリットのBPが増加した時
  const q = G.queue[0]; if (!(am > 0) || own == null || !q || !q.ctx || !q.ctx.flash || G.turn !== own) return;
  G.p[own].field.forEach(X => X.def.effects.forEach((e, ei) => {
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'bpPlusFlash' || !effectActive(X, e) || !matchT(G, own, own, c, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (t.step && G.step !== t.step) return; if (!evalCond(G, own, e.cond, { srcIid: X.iid })) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, own, X, e, { event: 'bpPlusFlash' });
  }));
}
function execOpX(G, it, op) {
  if (op.op === 'escapeRoute') { G.escape = { pi: it.pi, turn: G.turnNo }; const r = 'このターン中、系統2つ以上を持つ自分のスピリットは、BP比べで破壊された時、手札に戻ります'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return; }
  if (op.op === 'handFree') {   // Fチェンジ: 疲労状態のこのスピリットを手札に戻し(またはデッキの下に戻し)、手札の別のカードを無料で出す
    const P = G.p[it.pi], S = P.field.find(x => x.iid === it.src);
    if (!S) { lg(G, it.pi, '　' + it.name + ': 場にいないため、続きは行いません'); return; }
    if (op.needTap && !S.tapped) { lg(G, it.pi, '　' + it.name + ': 疲労状態ではないため、続きは行いません'); if (it.fx) it.fx.r.push('疲労状態ではないため、何も起きません'); return; }
    const cs = handFreeCands(G, it.pi, S, op);
    if (!cs.length) { lg(G, it.pi, '　' + it.name + ': 出せるカードが手札にありません'); if (it.fx) it.fx.r.push('手札に出せるカードがないため、何も起きません'); return; }
    if (op.src !== 'none') { moveCard(G, it.pi, S.iid, op.src === 'bottom' ? 'deckBottom' : 'hand'); if (it.fx) it.fx.r.push('「' + S.def.name + '」を' + (op.src === 'bottom' ? 'デッキの下' : '手札') + 'に戻しました'); }
    const cs2 = handFreeCands(G, it.pi, null, Object.assign({}, op, { diffName: false })).filter(c => cs.includes(c));
    G.pending = { pi: it.pi, name: it.name, n: 1, cands: cs2.map(c => c.iid), qi: it.pi, text: it.text, kind: 'handPick', opt: !!op.opt, upto: !!op.opt, x: { desc: op.fc ? 'Fチェンジで召喚するカード' : (op.nameHas || '') + 'のカード', free: { fc: !!op.fc }, drawFlat: null, discard: false } }; return 'wait';
  }
  if (op.op === 'lvUp') {   // 【レベルアップ】このターンの最初のアタック/ブロックなら、このバトル中Lv2として扱う
    const S = G.p[it.pi].field.find(x => x.iid === it.src); if (!S) return;
    const first = !(S.abT && S.abT === G.turnNo); S.abT = G.turnNo;
    if (!first) { lg(G, it.pi, '　' + it.name + ': このターンの最初のアタック/ブロックではないため、何も起きません'); if (it.fx) it.fx.r.push('このターンの最初のアタック/ブロックではないため、何も起きません'); return; }
    const L0 = (lvInfo(S) || {}).lv;
    S.lvUpB = G.battleNo; refreshLv(G);
    { // レベルが上がったので、新しく有効になったアタック時/ブロック時の効果も発動する
      const evn = G.battle && G.battle.iid === S.iid ? 'attack' : G.battle && G.battle.blocker === S.iid ? 'block' : null;
      if (evn) S.def.effects.forEach((e, ei) => { const t = e.timing; if (t.kind !== 'trigger' || t.event !== evn || e.keyword === 'levelup' || (e.levels || []).includes(L0) || !effectActive(S, e)) return; if (t.limit === 'turn') { if (S.used && S.used[ei] === 't' + G.turnNo) return; (S.used = S.used || {})[ei] = 't' + G.turnNo; } enqueue(G, it.pi, S, e, { event: evn }); });
    }
    lg(G, it.pi, '　' + it.name + ': このバトル中、Lv2として扱う'); if (it.fx) it.fx.r.push('このバトル中、「' + S.def.name + '」をLv2として扱います'); return;
  }
  const P = G.p[it.pi];
  if (op.needActed && !it.acted && op.op !== 'act') { lg(G, it.pi, '　' + it.name + ': 前の処理が行われていないため、続きは行いません'); return; }
  if (op.op === 'soulGuard') {   // 【ソウル覚醒】: リザーブ以外(コアトラッシュ/他のカードの上)にソウルコアがないときは発動できない
    const Pq = G.p[it.pi];
    if (!Pq.coreTrash.some(x => x.soul) && !Pq.field.some(x => x.iid !== it.src && x.cores.some(y => y.soul))) { lg(G, it.pi, '　' + it.name + ': リザーブ以外に置ける[ソウルコア]がないため、発動できません'); if (it.fx) it.fx.r.push('リザーブ以外に置ける[ソウルコア]がないため、発動できません'); it.ops = it.ops.slice(0, it.i + 1); return; }
    return;
  }
  if (op.op === 'nameOnce') {   // 「自身は同じカード名のこの効果をターンに1回しか使えない」
    G.nameUsed = G.nameUsed || {}; const key = it.pi + '|' + op.key + (op.shared ? '' : '|' + (op.key === 'x3a' || op.self ? it.src : it.name));   // 「自身は…ターンに1回」はそのカード1枚ごと / 「同じカード名の…」は同名で共有
    if (G.nameUsed[key] === G.turnNo) { lg(G, it.pi, '　' + it.name + ': ' + (op.shared ? '【響走】は、このターンすでにどちらかが使っているため、続きは行いません' : '同じカード名のこの効果は、このターンすでに使っているため、続きは行いません')); if (it.fx) it.fx.r.push('同じカード名のこの効果は、このターン中すでに使っているため、何も起きません'); it.ops = it.ops.slice(0, it.i + 1); return; }
    G.nameUsed[key] = G.turnNo; return;
  }
  if (op.op === 'openAsk') { it.acted = false; return XH; }
  if (op.op === 'topOpen') {   // デッキの上をオープン(分岐)。times回くり返す(毎回「できる」を確認)
    const c = P.deck.length ? P.deck[P.deck.length - 1] : null;
    if (op.auto && (op.iter | 0) > 0) { it.fx = { n: it.name, t: '', p: it.pi, r: [] }; G.fx.push(it.fx); }   // 2回目以降は、効果の表示をあらためて出す
    const iterTxt = op.auto ? '(' + ((op.iter | 0) + 1) + '/' + (op.tot || op.times) + '回目) ' : '';
    if (!c) { lg(G, it.pi, '　' + it.name + ': デッキがありません'); if (it.fx) it.fx.r.push('デッキがないため、何も起きません'); return; }
    P.deck.pop(); const oev = { t: 'open', p: it.pi, to: 'deck', cards: [{ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color }] }; G.evs.push(oev);
    lg(G, it.pi, '　' + it.name + ': デッキの上から「' + c.def.name + '」(コスト' + c.def.cost + ')をオープン');
    let rr = iterTxt + 'デッキの上の「' + c.def.name + '」(コスト' + c.def.cost + ')をオープンしました', add = [], keep = false;
    for (const br of (op.branch || [])) {
      if (!matchDef(c.def, br.flt || {})) continue;
      if (br.toHand) { oev.to = 'hand'; P.hand.push(c); keep = true; rr += '。手札に加えました'; lg(G, it.pi, '　' + it.name + ': 「' + c.def.name + '」を手札に加えた'); }
      add = add.concat(br.ops || []); break;
    }
    if (!keep) { if (op.back === 'top') P.deck.push(c); else P.deck.unshift(c); }
    if (it.fx) it.fx.r.push(rr);
    const more = [];
    if ((op.times || 1) > 1 && op.auto) more.push(Object.assign({}, op, { times: op.times - 1, iter: (op.iter | 0) + 1, tot: op.tot || op.times }));   // 毎回確認せず、決まった回数を最後まで自動でくり返す
    else if ((op.times || 1) > 1) more.push({ op: 'act', target: { who: 'you', type: 'spirit', count: 1, choose: true, selfOnly: true }, acts: [{ verb: 'open' }], opt: true }, Object.assign({}, op, { times: op.times - 1, needActed: true }));
    insertOps(it, add.concat(more)); if (more.length && !op.auto) it.acted = false; return;
  }
  if (op.op === 'oppLifeToReserve') { const Q = G.p[1 - it.pi]; const c = Q.life[Q.life.length - 1]; if (c && moveCore(G, 1 - it.pi, c.id, { zone: 'reserve' })) { G.evs.push({ t: 'life', p: 1 - it.pi, n: 1 }); const r = '相手のライフのコア1個をリザーブに置きました(残り' + Q.life.length + ')'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); if (!Q.life.length && G.winner == null) { G.winner = it.pi; G.loseWhy = 'life'; G.evs.push({ t: 'lifeZero', p: 1 - it.pi }); } } return; }
  if (op.op === 'mark') { it.mk = (G.vanLog || []).length; G.lastActN = 0; return; }
  if (op.op === 'stashN') { G.stashN = G.lastActN | 0; G.lastActN = 0; return; }   // 破壊した体数を、次の指定との合計用に覚える
  if (op.op === 'drawSum') { const t = (G.stashN | 0) + (G.lastActN | 0); G.stashN = 0; if (t < 1) { lg(G, it.pi, '　' + it.name + ': 破壊したスピリットがいないため、ドローしません'); if (it.fx) it.fx.r.push('破壊したスピリットがいないため、ドローしません'); return; } const n = draw(G.p[it.pi], t); G.lastDrawN = n; lg(G, it.pi, '　' + it.name + ': 破壊した' + t + '体ぶん、' + n + '枚ドロー'); if (it.fx) it.fx.r.push(n + '枚ドローしました'); return; }
  if (op.op === 'vanCore') { if ((G.vanLog || []).length > (it.mk | 0)) { const S = P.field.find(x => x.iid === it.src); if (S) { S.cores.push(mkCore(false)); G.evs.push({ t: 'coreAdd', p: it.pi, iid: S.iid, n: 1 }); const r = 'コアが消滅したので、ボイドからコア1個を「' + S.def.name + '」に置きました'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); } } return; }
  if (op.op === 'trashCoreToLife') { const c = P.coreTrash.find(x => !x.soul); if (c && P.coreTrash.splice(P.coreTrash.indexOf(c), 1) && P.life.push(c)) { G.evs.push({ t: 'lifeAdd', p: it.pi, n: 1 }); const r = 'トラッシュのコア1個を自分のライフに置きました'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); lifeUpEvt(G, it.pi); } else if (it.fx) it.fx.r.push('トラッシュに対象のコアがないため、何も起きません'); return; }
  if (op.op === 'reserveCoreToLife') { const c = P.reserve.find(x => !x.soul); if (c && P.reserve.splice(P.reserve.indexOf(c), 1) && P.life.push(c)) { G.evs.push({ t: 'lifeAdd', p: it.pi, n: 1 }); const r = 'リザーブのコア1個を自分のライフに置きました'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); lifeUpEvt(G, it.pi); } else if (it.fx) it.fx.r.push('リザーブに対象のコアがないため、何も起きません'); return; }
  if (op.op === 'trashCoresLast') { const S = P.field.find(x => x.iid === it.src); const n = G.lastActN | 0; if (S && n > 0) { const m = trashToCard(G, it.pi, S, n, 'non'); const r = 'トラッシュのコア' + m + '個を「' + S.def.name + '」に置きました'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); } return; }
  if (op.op === 'oppHandBottom') { const Q = G.p[1 - it.pi]; if (!Q.hand.length) { if (it.fx) it.fx.r.push('相手の手札がないため、何も起きません'); return; } G.pending = { pi: 1 - it.pi, name: it.name, n: 1, cands: Q.hand.map(c => c.iid), qi: 1 - it.pi, text: it.text, kind: 'handPick', opt: false, upto: false, x: { desc: 'デッキの下に戻すカード', drawFlat: { n: 1, draw: 0 }, discard: false } }; return 'wait'; }
  if (op.op === 'handAllBottom') { const cs = P.hand.splice(0); const all = cs.every(c => (c.def.team || []).includes(op.team)); cs.forEach(c => P.deck.unshift(c)); const r = '手札' + cs.length + '枚を相手に見せ、デッキの下に戻しました' + (all ? '(すべて【' + op.team + '】)' : ''); lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); if (all) { const n = draw(P, op.n || 3); if (it.fx) it.fx.r.push(n + '枚ドローしました'); } return; }
  if (op.op === 'grantBlockedTap') { G.grantBT = { pi: it.pi, turn: G.turnNo, team: op.team }; const r = 'このターン中、【' + op.team + '】を持つ自分のスピリットは、アタック中にブロックされた時、回復状態の相手のスピリット1体を疲労させます'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return; }
  if (op.op === 'recoverDes') {   // 破壊されたスピリット(ctx.desIid)を手札に戻す
    const c = P.trash.find(x => x.iid === (it.ctx && it.ctx.desIid));
    if (!c) { if (it.fx) it.fx.r.push('戻せるカードがありません'); return; }
    P.trash.splice(P.trash.indexOf(c), 1); P.hand.push(c); lg(G, it.pi, '　' + it.name + ': 「' + c.def.name + '」を手札に戻した'); if (it.fx) it.fx.r.push('「' + c.def.name + '」を手札に戻しました'); G.evs.push({ t: 'handIn', p: it.pi, n: 1 }); return;
  }
  return XH;
}
