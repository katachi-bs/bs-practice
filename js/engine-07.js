// 疲労した時の誘発: 相手の効果で疲労/重疲労した時(050)、自分のスピリットが疲労した時(X16)
// トークン(ソーディッシュの能力値は未確認のため、仮の値。TOKEN_STATS を書き換えれば差し替えられます)
const TOKEN_STATS = { 'ソーディッシュ': { color: 'green', family: ['深淵'], cost: 0, symbols: 1, levels: [{ lv: 1, core: 1, bp: 2000 }], symTurn: 'own' } };
function makeTokenDef(name) { const t = TOKEN_STATS[name] || TOKEN_STATS['ソーディッシュ']; const d = cleanDef({ id: 'TOKEN-' + name, name, type: 'spirit', color: t.color, family: t.family, cost: t.cost, symbols: { normal: t.symbols, ex: false }, levels: t.levels, vanilla: true }); d.token = true; if (t.symTurn) d.symTurn = t.symTurn; return d; }
function untapEvt(G, pi, k) {
  if (!k || k.def.type !== 'spirit') return;
  k.def.effects.forEach((e, ei) => { const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'selfUntapped' || !effectActive(k, e)) return; if (t.when === 'attacking' && !(G.battle && G.battle.iid === k.iid && !G.battle.gone)) return; if (t.limit === 'turn') { if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; } enqueue(G, pi, k, e, { event: 'selfUntapped' }); });
}
function lifeUpEvt(G, pi) {
  G.p[pi].field.forEach(X => X.def.effects.forEach((e, ei) => { const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'lifeUp' || !effectActive(X, e)) return; if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; } enqueue(G, pi, X, e, { event: 'lifeUp' }); }));
}
function tapEvt(G, pi, k, by, fresh) {
  if (!k || k.def.type !== 'spirit') return;
  if (by === 'opp') k.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'selfTappedOpp' && effectActive(k, e)) enqueue(G, pi, k, e, { event: 'selfTappedOpp' }); });
  if (fresh) G.p[pi].field.forEach(X => X.def.effects.forEach((e, ei) => {
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyTapped' || !effectActive(X, e) || !matchT(G, pi, pi, k, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (t.step && G.step !== t.step) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, pi, X, e, { event: 'allyTapped', cost: k.def.cost });
  }));
}
// トラッシュにあるカードの誘発効果(同じタイミングでは、同じカード名は1枚分だけ発動する)
function trashTrigFire(G, pi, event) {
  const seen = new Set();
  G.p[pi].trash.slice().forEach(c => c.def.effects.forEach(e => {
    const t = e.timing; if (t.kind !== 'trashTrig' || t.event !== event || seen.has(c.def.name)) return;
    if (t.turn === 'you' && G.turn !== pi) return;
    seen.add(c.def.name); enqueue(G, pi, { def: c.def, iid: c.iid }, e, { event: 'trashTrig' });
  }));
}
function nexusTapEvt(G, pi, k) {
  if (G.turn !== pi || G.step !== 'attack') return;
  k.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'selfTapped' && effectActive(k, e)) enqueue(G, pi, k, e, { event: 'selfTapped' }); });
}
function abilityPay(G, pi, k, ei, disc) {
  const P = G.p[pi], e = k.def.effects[ei], c = e.cost || {}, b = G.battle;
  if (disc && c.discard && c.discard.to === 'bottom') { P.hand.splice(P.hand.indexOf(disc), 1); P.deck.unshift(disc); G.fx.push({ n: k.def.name, t: '', p: pi, r: ['手札の「' + disc.def.name + '」を相手に見せて、デッキの下に戻しました'] }); lg(G, pi, '　コスト: 手札の「' + disc.def.name + '」を相手に見せ、デッキの下に戻した'); }
  else if (disc) { P.hand.splice(P.hand.indexOf(disc), 1); P.trash.push(disc); G.evs.push({ t: 'discard', p: pi, cards: [{ iid: disc.iid, id: disc.def.id, name: disc.def.name, color: disc.def.color }] }); lg(G, pi, '　コスト: 手札の「' + disc.def.name + '」を破棄'); }
  if (c.tapSelf) { const wt0 = !k.tapped; k.tapped = true; nexusTapEvt(G, pi, k); if (wt0) tapEvt(G, pi, k, 'game', true); }
  let tnx = null; if (c.tapNexus) { tnx = P.field.find(x => x.def.type === 'nexus' && !x.tapped && x.def.family.includes(c.tapNexus)); if (tnx) { tnx.tapped = true; nexusTapEvt(G, pi, tnx); } }
  if (c.destroySelf) { G.effPi = pi; G.costFam = k.def.family; destroyCard(G, pi, k.iid); G.costFam = null; }
  if (c.soulTrash) { let sc = P.reserve.find(x => x.soul); if (!sc) { const hk = P.field.find(x => x.cores.length > 1 && x.cores.some(y => y.soul)); sc = hk && hk.cores.find(y => y.soul); } if (sc) moveCore(G, pi, sc.id, { zone: 'coreTrash' }); }
  let paySub = null; if (c.pay) { paySub = penSub(G, pi, k); if (paySub) { paySub.tapped = true; nexusTapEvt(G, pi, paySub); lg(G, pi, '　「' + paySub.def.name + '」を疲労させ、1コストを支払ったものとして扱った'); } }
  if (c.pay) { const take = P.reserve.slice().sort((x, y) => (x.soul ? 1 : 0) - (y.soul ? 1 : 0)).slice(0, c.pay - (paySub ? 1 : 0)); take.forEach(x => moveCore(G, pi, x.id, { zone: 'coreTrash' })); }
  if (e.timing.limit) { k.used = k.used || {}; k.used[ei] = e.timing.limit === 'battle' ? 'b' + G.battleNo : 't' + G.turnNo; }
  if (c.pay) { G.fx.push({ n: k.def.name, t: '', p: pi, r: ['コスト: ' + (paySub ? '「' + paySub.def.name + '」を疲労(1コスト分)' : '') + ((c.pay - (paySub ? 1 : 0)) > 0 ? 'リザーブのコア' + (c.pay - (paySub ? 1 : 0)) + '個をトラッシュへ支払いました' : '')], quick: true }); }
  lg(G, pi, '「' + k.def.name + '」の【起動】を使用' + (c.pay ? '(コア' + c.pay + '個をトラッシュへ)' : '') + (c.tapSelf ? '(疲労)' : '') + (tnx ? '(「' + tnx.def.name + '」を疲労)' : '') + (disc ? '(手札を破棄)' : ''));
  enqueue(G, pi, k, e, { event: 'ability', flash: e.timing.step === 'flash' });
  if (e.keyword === 'amp') G.p[pi].field.forEach(X => X.def.effects.forEach((e2, ei2) => {   // 【増幅】を発揮した時
    const t = e2.timing; if (t.kind !== 'trigger' || t.event !== 'ampUsed' || !effectActive(X, e2) || !matchT(G, pi, pi, k, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (t.turn === 'you' && G.turn !== pi) return; if (t.step && G.step !== t.step) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei2] === 't' + G.turnNo) return; (X.used = X.used || {})[ei2] = 't' + G.turnNo; }
    enqueue(G, pi, X, e2, { event: 'ampUsed', iid: k.iid });
  }));
  if (b) { b.passes = 0; b.prio = 1 - pi; }
  runQueue(G);
}
function blockAct(G, pi, iid) {
  const b = G.battle;
  if (!b || G.pending || b.phase !== 'block' || b.prio !== pi) return;
  if (!iid) { if (clashForced(G) || mustBlocker(G)) return; lifeDamage(G); return; }
  const mb = mustBlocker(G); if (mb && iid !== mb) return;
  const k = G.p[pi].field.find(x => x.iid === iid);
  if (!k || k.def.type !== 'spirit' || (k.tapped && iid !== mb && !(b.tapOk || []).includes(iid)) || !canBlockWith(G, k)) return;
  const Ab = G.p[b.pi].field.find(x => x.iid === b.iid);
  const tollOn = !!(Ab && Ab.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(Ab, e) && e.ops.some(o => o.op === 'blockToll')));
  k.tapped = true; b.blocker = k.iid; b.phase = 'flash2'; b.prio = pi; b.passes = 0; tapEvt(G, pi, k, 'game', true);
  { const nn = blockPayN(G, Ab, b.pi); if (nn) { G.p[pi].reserve.slice().sort((x, y) => (x.soul ? 1 : 0) - (y.soul ? 1 : 0)).slice(0, nn).forEach(x => moveCore(G, pi, x.id, { zone: 'coreTrash' })); lg(G, pi, '　ブロックのコスト: リザーブのコア' + nn + '個をトラッシュへ'); } }
  lg(G, pi, '「' + k.def.name + '」でブロック');
  if (tollOn) enqueue(G, pi, { def: Ab.def, iid: Ab.iid }, { ops: [{ op: 'act', target: { who: 'you', type: 'spirit', tapped: false, notIid: k.iid, count: 1, choose: true }, acts: [{ verb: 'tap' }] }], text: 'ブロックするスピリット以外の自分のスピリット1体を疲労させる' }, { event: 'blockToll' });
  applyTrig(G, pi, k, collectTrig(k, 'block'), { event: 'block', atkCost: Ab ? Ab.def.cost : null });
  G.p[pi].field.forEach(X => X.def.effects.forEach((e, ei) => {   // 自分のスピリットがブロックした時
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyBlock' || !effectActive(X, e) || !matchT(G, pi, pi, k, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (!evalCond(G, pi, e.cond, { srcIid: X.iid })) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, pi, X, e, { event: 'allyBlock' });
  }));
  if (Ab && G.grantBT && G.grantBT.turn === G.turnNo && G.grantBT.pi === b.pi && (Ab.def.team || []).includes(G.grantBT.team)) enqueue(G, b.pi, Ab, { ops: [{ op: 'act', target: { who: 'opp', type: 'spirit', count: 1, choose: true, tapped: false }, acts: [{ verb: 'tap' }] }], text: '回復状態の相手のスピリット1体を指定する。それを疲労させる。' }, { event: 'blocked' });
  if (Ab) applyTrig(G, b.pi, Ab, collectTrig(Ab, 'blocked'), { event: 'blocked', blockerBp: curBP(G, k) });
  if (Ab) G.p[b.pi].field.forEach(X => X.def.effects.forEach((e, ei) => {
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyBlocked' || !effectActive(X, e) || !matchT(G, b.pi, b.pi, Ab, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
    if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, b.pi, X, e, { event: 'allyBlocked' });
  }));
  runQueue(G);
}
function atkDmgPreview(G, b, A) {
  let dmg = A.symOvr ? A.symOvr.n : A.def.symbols.normal + (A.def.symbols.ex ? 1 : 0) + (A.symx || []).reduce((n, x) => n + x.n, 0);
  A.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && evalCond(G, b.pi, e.cond)) e.ops.forEach(o => { if (o.op === 'dmgPlus') dmg += o.n | 0; }); });
  return Math.max(1, dmg);
}
function lifeDamage(G) {
  const b = G.battle, d = 1 - b.pi, A = G.p[b.pi].field.find(x => x.iid === b.iid);
  if (!A) { endBattle(G); return; }
  if ((G.nodmg || []).some(x => x.pi === d && x.iid === A.iid && x.turn === G.turnNo)) {
    lg(G, d, '「' + A.def.name + '」のアタック: ライフが減りません');
    G.evs.push({ t: 'barrier', p: d, iid: A.iid, lifeIds: G.p[d].life.slice(-atkDmgPreview(G, b, A)).map(c => c.id), by: ((G.nodmg || []).find(x => x.pi === d && x.iid === A.iid && x.turn === G.turnNo) || {}).by || '' }); G.fx.push({ n: 'バリア', t: '', p: d, r: ['「' + A.def.name + '」のアタックでは、ライフが減りません'] });
    endBattle(G); return;
  }
  if (G.barrier && G.barrier.pi === d && G.barrier.turn === G.turnNo && (G.barrier.bn == null || G.barrier.bn === G.battleNo) && A.cores.length === 1) {
    lg(G, d, '「' + A.def.name + '」のアタック: バリアでライフが減りません');
    G.evs.push({ t: 'barrier', p: d, iid: A.iid, lifeIds: G.p[d].life.slice(-atkDmgPreview(G, b, A)).map(c => c.id) }); G.fx.push({ n: 'バリア', t: '', p: d, r: ['コア1個の「' + A.def.name + '」のアタックでは、ライフが減りません'] });
    endBattle(G); return;
  }
  let dmg = A.symOvr ? A.symOvr.n : A.def.symbols.normal + (A.def.symbols.ex ? 1 : 0) + (A.symx || []).reduce((n, x) => n + x.n, 0); const L = G.p[d].life; let n = 0;
  A.def.effects.forEach(e => { if (e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && evalCond(G, b.pi, e.cond)) e.ops.forEach(o => { if (o.op === 'dmgPlus') { dmg += o.n | 0; lg(G, b.pi, '「' + A.def.name + '」: 減るコアが+' + (o.n | 0)); if (o.late) G.evs.push({ t: 'plusDmg', iid: A.iid, n: o.n | 0, p: b.pi }); } }); });
  (G.symLoss || []).forEach(l => { if (l.pi === b.pi && l.turn === G.turnNo && G.step === 'attack' && curBP(G, A) <= l.bpMax && (!l.iid || l.iid === A.iid) && dmg > 0 && (A.def.color === l.color || (A.symx || []).some(x => x.color === l.color))) { dmg--; lg(G, b.pi, '「' + A.def.name + '」は' + COLOR_JP_E[l.color] + 'シンボル1つを失っている(ダメージ' + dmg + ')'); } });
  const toTr = G.step === 'attack' && G.turn === b.pi && A.def.effects.some(e => e.keyword === 'amp' && effectActive(A, e)) && G.p[b.pi].field.some(X => X.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'ampLifeTrash' && effectActive(X, e)));
  if ((G.dmgCap || []).some(x => x.pi === d && x.iid === A.iid && x.turn === G.turnNo) && dmg > 1) { dmg = 1; lg(G, d, '「' + A.def.name + '」: ライフは1しか減りません'); }
  while (n < dmg && L.length) { moveCore(G, d, L[L.length - 1].id, { zone: toTr ? 'coreTrash' : 'reserve' }); n++; }
  lg(G, b.pi, 'ライフで受けた: ライフ' + n + '個が' + (toTr ? 'トラッシュ' : 'リザーブ') + 'へ(残り' + L.length + ')');
  G.evs.push({ t: 'life', p: d, n });
  if (n > 0 && G.winner == null) applyTrig(G, b.pi, A, collectTrig(A, 'lifeHit'), { event: 'lifeHit' });
  if (n > 0 && G.winner == null) (G.lhv || []).forEach(h => { if (h.iid === A.iid && h.bn === G.battleNo && h.pi === b.pi && G.p[b.pi].life.length <= 3) { G.p[b.pi].life.push(mkCore(false)); G.evs.push({ t: 'lifeAdd', p: b.pi, n: 1 }); lg(G, b.pi, '「' + A.def.name + '」: ボイドからコア1個を自分のライフに置いた'); lifeUpEvt(G, b.pi); } });
  if (n > 0 && G.winner == null) (G.lhx || []).forEach(h => { if (h.turn === G.turnNo && h.iid === A.iid && h.pi === b.pi) enqueue(G, b.pi, { def: { name: h.name, type: 'magic' }, iid: A.iid }, { ops: [{ op: 'act', target: { who: 'opp', type: 'nexus', count: 1, choose: true, costMax: h.costMax }, acts: [{ verb: 'destroy' }] }], text: 'コスト' + h.costMax + '以下の相手のネクサス1つを指定する。それを破壊する。' }, { event: 'lifeHitX' }); });
  if (n > 0 && G.winner == null) {
    G.p[b.pi].field.forEach(X => X.def.effects.forEach((e, ei) => { const t = e.timing; if (t.kind === 'trigger' && t.event === 'allyLifeHit' && effectActive(X, e) && matchT(G, b.pi, b.pi, A, Object.assign({ type: 'spirit' }, t.flt || {}))) { if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; } enqueue(G, b.pi, X, e, { event: 'allyLifeHit' }); } }));
    G.p[d].field.forEach(X => X.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'lifeLoss' && effectActive(X, e)) enqueue(G, d, X, e, { event: 'lifeLoss' }); }));
    G.p[b.pi].field.forEach(X => X.def.effects.forEach((e, ei) => { const t = e.timing; if (t.kind === 'trigger' && t.event === 'oppLifeLoss' && effectActive(X, e)) { if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; } enqueue(G, b.pi, X, e, { event: 'oppLifeLoss' }); } }));
  }
  if (!L.length && G.winner == null) { G.winner = b.pi; G.loseWhy = 'life'; G.evs.push({ t: 'lifeZero', p: 1 - b.pi }); lg(G, -1, '相手のライフが0になりました'); }
  endBattle(G);
}
function resolveBattle(G) {
  const b = G.battle, A = G.p[b.pi].field.find(x => x.iid === b.iid), B = G.p[1 - b.pi].field.find(x => x.iid === b.blocker);
  if (!A || !B) { lg(G, -1, 'アタックまたはブロックしたスピリットがいないため、BP比べは行いません'); endBattle(G); return; }
  const a = curBP(G, A), bb = curBP(G, B);
  lg(G, -1, 'BP比べ: 「' + A.def.name + '」' + a + ' vs 「' + B.def.name + '」' + bb);
  const msg = a > bb ? '「' + A.def.name + '」は「' + B.def.name + '」を破壊した' : a < bb ? '「' + B.def.name + '」は「' + A.def.name + '」を破壊した' : '「' + A.def.name + '」と「' + B.def.name + '」は相打ち';
  G.fx.push({ head: 'BP比べ', n: '', t: 'BP' + a + ' - BP' + bb, p: b.pi, r: [msg], quick: true });
  const atkNk = A.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(A, e) && e.ops.some(o => o.op === 'noBpKill'));
  const killB = a >= bb && !atkNk && B.nbk !== G.turnNo && B.nbkB !== G.battleNo, killA = a <= bb && !atkNk && A.nbk !== G.turnNo && A.nbkB !== G.battleNo;
  if ((a >= bb && !killB) || (a <= bb && !killA)) lg(G, -1, 'BP比べで破壊されない効果が働いているため、破壊されません');
  G.inBD = true;
  const escOr = (qi, K) => { if (G.escape && G.escape.pi === qi && G.escape.turn === G.turnNo && K.def.type === 'spirit' && K.def.family.length >= 2) { lg(G, qi, '「' + K.def.name + '」は、BP比べで破壊されるため、手札に戻る'); moveCard(G, qi, K.iid, 'hand'); } else destroyCard(G, qi, K.iid); };
  if (killB) escOr(1 - b.pi, B);
  if (killA) escOr(b.pi, A);
  G.inBD = false;
  if (a <= bb && G.p[b.pi].field.every(x => x.iid !== A.iid)) G.p[b.pi].field.forEach(X => X.def.effects.forEach(e => { const t = e.timing; if (t.kind === 'trigger' && t.event === 'allyBpDestroyed' && effectActive(X, e) && matchT(G, b.pi, b.pi, A, Object.assign({ type: 'spirit' }, t.flt || {}))) (b.endQ = b.endQ || []).push([b.pi, X, e]); }));
  if (a !== bb && (a > bb ? killB : killA)) {   // BP比べで相手のスピリットだけを破壊した時
    const wo = a > bb ? b.pi : 1 - b.pi, W = a > bb ? A : B;
    (G.dBpWin || []).forEach(d => { if (d.turn !== G.turnNo || d.iid !== W.iid || d.pi !== wo) return; if (d.bn != null && d.bn !== G.battleNo) return; if (d.atkOnly && !(G.turn === wo && G.step === 'attack')) return; if (d.draw) { const nn = draw(G.p[wo], d.draw); lg(G, wo, '「' + W.def.name + '」: BP比べで勝ったため' + nn + '枚ドロー'); } if (d.bounce) enqueue(G, wo, W, { ops: [{ op: 'act', target: { who: 'opp', type: 'spirit', bpMax: d.bounce.bpMax, count: 1, choose: true }, acts: [{ verb: 'bounce' }] }], text: 'BP' + d.bounce.bpMax + '以下の相手のスピリット1体を指定する。それを手札に戻す。' }, { event: 'bpWinX' }); if (d.lifeOut) { const L = G.p[1 - wo].life; if (L.length) { moveCore(G, 1 - wo, L[L.length - 1].id, { zone: 'reserve' }); lg(G, wo, '「' + W.def.name + '」: 相手のライフのコア1個をリザーブへ'); if (!L.length && G.winner == null) { G.winner = wo; G.loseWhy = 'life'; lg(G, -1, '相手のライフが0になりました'); } } } });
    G.p[wo].field.forEach(X => X.def.effects.forEach(e => {
      const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'bpWin' || !effectActive(X, e)) return;
      if (t.of === 'ally' ? !matchT(G, wo, wo, W, Object.assign({ type: 'spirit' }, t.flt || {})) : X !== W) return;
      if (t.turn === 'you' && G.turn !== wo) return; if (t.turn === 'opp' && G.turn === wo) return;
      if (t.step && G.step !== t.step) return;
      if (t.flt && t.flt.destCostMax != null && !((a > bb ? B : A).def.cost <= t.flt.destCostMax)) return;
      if (t.when === 'blocking' && !(G.battle && G.battle.blocker === X.iid)) return;
      if (t.when === 'attacking' && !(G.battle && G.battle.iid === X.iid)) return;
      if (t.limit === 'turn') { const ei = X.def.effects.indexOf(e); if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
      enqueue(G, wo, X, e, { event: 'bpWin' });
    }));
  }
  endBattle(G);
}
// カードを出す・使う(フラッシュの窓の中では、優先権を持つ側だけが、使えるマジックを使える)
// 【操霊】: トラッシュのスピリットを、通常の召喚と同じようにコストを支払って召喚する
function sumPayAct(G, pi, a) {
  const pd = G.pending, P = G.p[pi], iid = String(a.iid);
  if (!pd.cands.includes(iid)) return;
  const k = (pd.hand ? P.hand : P.trash).find(x => x.iid === iid); if (!k) return;
  if (!pd.hand) { P.trash.splice(P.trash.indexOf(k), 1); P.hand.push(k); } G.pending = null;
  if (!playCard(G, pi, Object.assign({}, a, { iid, puppet: !pd.limbo && !pd.hand }))) { if (!pd.hand) { P.hand.splice(P.hand.indexOf(k), 1); P.trash.push(k); } G.pending = pd; return; }
  G.undo = null;
  const c = G.ctx, nk = P.field.find(x => x.iid === c.iid);
  if (nk && !pd.limbo && !pd.hand) nk.puppetTurn = G.turnNo;
  G.fx.push({ n: pd.name, t: '', p: pi, r: [pd.limbo ? '公開したカードの「' + c.name + '」を召喚/配置' : pd.hand ? '手札から「' + c.name + '」を召喚' : 'トラッシュから「' + c.name + '」を召喚'] });
  if (pd.limbo) { G.limboSummon = nk ? { nk, c } : null; limboDone(G, pd, pi, true); return; }
  if (nk) applyTrig(G, pi, nk, collectTrig(nk, 'summon'), c);
  G.queue[0].i++; runQueue(G);
}
function playAct(G, pi, a) {
  const P = G.p[pi], b = G.battle;
  if (G.pending) return;
  const card = P.hand.find(x => x.iid === a.iid); if (!card) return;
  if (b) {
    if (!(b.phase === 'flash1' || b.phase === 'flash2') || b.prio !== pi) return;
    const fsm = card.def.type === 'spirit' && G.turn !== pi && G.step === 'attack' && card.def.effects.some(e => e.keyword === 'flashSummon' && evalCond(G, pi, e.cond));
    if (!fsm && (card.def.type !== 'magic' || !card.def.effects.some(e => e.timing.kind === 'flash'))) return;
  } else {
    // バトル中のフラッシュタイミング以外では、アタックステップ・相手のターンに手札から使えない
    if (card.def.noMain) { G.notice = { n: G.notice.n + 1, m: '「' + card.def.name + '」はメインステップでは使用できません(バトル中のフラッシュタイミングで使います)' }; return; }
    if (!(G.turn === pi && (G.step === 'main' || G.step === 'main2'))) { if (G.step === 'attack') G.notice = { n: G.notice.n + 1, m: 'バトルの合間にはカードを使えません(アタックステップ中は、バトル中のフラッシュタイミングだけです)' }; return; }
  }
  const d = card.def;
  const before = JSON.stringify({ p: G.p, lifeLost: G.lifeLost, battle: G.battle, log: G.log });
  if (!playCard(G, pi, a)) return;
  const c = G.ctx;
  if (c.event === 'use') {
    const want = b ? 'flash' : (a.mode === 'flash' ? 'flash' : 'main');
    const eff = d.effects.find(e => e.timing.kind === want) || d.effects.find(e => e.timing.kind === 'flash' || e.timing.kind === 'main');
    if (eff) { c.flash = eff.timing.kind === 'flash'; enqueue(G, pi, { def: d }, eff, c); }
    P.field.forEach(k => k.def.effects.forEach((e, ei) => {
      const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'magicUsed' || !effectActive(k, e) || !matchDef(d, t.flt || {})) return;
      if (t.turn === 'you' && G.turn !== pi) return; if (t.turn === 'opp' && G.turn === pi) return;
      if (t.step && G.step !== t.step) return;
      if (t.limit === 'turn') { if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; }
      const bb = G.battle;
      if (t.when === 'attacking' && !(bb && bb.iid === k.iid && !bb.gone)) return;
      if (t.when === 'blocking' && !(bb && bb.blocker === k.iid && !bb.bgone)) return;
      enqueue(G, pi, k, e, { event: 'magicUsed', iid: c.iid });
    }));
  } else {
    const k = P.field.find(x => x.iid === c.iid);
    if (k) {
      applyTrig(G, pi, k, collectTrig(k, 'summon'), c);
      if (k.def.type === 'spirit') P.field.forEach(X => X.def.effects.forEach((e, ei) => {
        const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allySummon' || !effectActive(X, e) || !matchT(G, pi, pi, k, Object.assign({ type: 'spirit' }, t.flt || {}))) return;
        if (G.turn !== pi || !evalCond(G, pi, e.cond, c)) return;
        if (t.step === 'main' && !(G.step === 'main' || G.step === 'main2')) return;
        if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; }
        enqueue(G, pi, X, e, { event: 'allySummon', excludedEx: c.excludedEx });
      }));
    }
  }
  if (b) { b.passes = 0; b.prio = 1 - pi; }
  runQueue(G);
  G.undo = G.pending && G.pending.pi === pi ? before : null;   // 対象を決定するまでは、使わなかったことにして戻せる
}
// 今フラッシュで使えるカード・ブロックできるスピリット(光らせる用)
function usableFor(G, i) {
  const out = { hand: [], block: [], attack: [], abil: [] }, b = G.battle, P = G.p[i];
  P.field.forEach(k => k.def.effects.forEach((e, ei) => { if (e.timing.kind === 'ability' && abilityOK(G, i, k, ei)) out.abil.push(k.iid + ':' + ei); }));
  if (!b && !G.pending && G.winner == null && G.turn === i && G.step === 'attack' && !G.noAttack) out.attack = P.field.filter(k => k.def.type === 'spirit' && !k.tapped && canAttackNow(G, k) && (!atkToll(G, i, k) || P.reserve.length)).map(k => k.iid);
  if (!b || G.pending || G.winner != null || b.prio !== i) return out;
  if (b.phase === 'block') { const mb = mustBlocker(G); out.block = mb ? [mb] : P.field.filter(k => k.def.type === 'spirit' && (!k.tapped || (b.tapOk || []).includes(k.iid)) && canBlockWith(G, k)).map(k => k.iid); }
  if (b.phase === 'flash1' || b.phase === 'flash2') {
    const total = P.reserve.length + P.field.reduce((n, k) => n + k.cores.length, 0);
    const hasSoul = P.reserve.some(c => c.soul) || P.field.some(k => k.cores.some(c => c.soul));
    out.hand = P.hand.filter(k => {
      if (k.def.type === 'spirit' && G.turn !== i && k.def.effects.some(e => e.keyword === 'flashSummon' && evalCond(G, i, e.cond))) { const r = payRequirement(P, k.def, {}); return r.ok && P.reserve.length >= r.need + minPlaceOf(k.def); }
      if (k.def.type !== 'magic' || !k.def.effects.some(e => e.timing.kind === 'flash')) return false;
      const r = payRequirement(P, k.def, {});
      return (r.soulAvail && hasSoul) || (r.ok && total >= r.need);
    }).map(k => k.iid);
  }
  return out;
}

