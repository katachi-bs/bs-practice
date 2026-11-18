function execOp(G, it, op) {
  G.effPi = it.pi;
  if (op.cond && !evalCond(G, it.pi, op.cond, it.ctx)) { lg(G, it.pi, '　' + it.name + ': 条件を満たさないため、続きは行いません'); return; }
  { const xr = execOpX(G, it, op); if (xr !== XH) return xr; }
  if (op.op === 'blkAsAtkT') { G.blkAtkT = G.turnNo; G.blkAtkP = it.pi; const r = 'このターン中、系統:「白妙」を持つ自分のスピリットは、アタック時にブロック時効果1つを発揮します'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return; }
  if (op.op === 'barrier') { G.barrier = { pi: it.pi, turn: G.turnNo, bn: op.scope === 'battle' ? G.battleNo : null }; lg(G, it.pi, '　' + it.name + ': このターン中、コア1個の相手のスピリットのアタックではライフが減りません'); if (it.fx) it.fx.r.push('このターン中、コア1個の相手スピリットのアタックではライフが減りません'); return; }
  if (op.op === 'unbBlk') { const A2 = G.p[it.pi].field.find(x => x.iid === (it.ctx && it.ctx.iid)); if (G.battle && A2) { G.battle.unbBp = curBP(G, A2); G.battle.unbPi = it.pi; const m = 'このバトル中、自分のスピリットすべては、BP' + G.battle.unbBp + '以下の相手のスピリットからブロックされません'; lg(G, it.pi, '　' + it.name + ': ' + m); if (it.fx) it.fx.r.push(m); } return; }
  if (op.op === 'destroySrc') { const S = G.p[it.pi].field.find(x => x.iid === it.src); if (S) { lg(G, it.pi, '　' + it.name + ': バトル終了時、「' + S.def.name + '」を破壊'); if (it.fx) it.fx.r.push('「' + S.def.name + '」を破壊しました'); destroyCard(G, it.pi, S.iid); } return; }
  if (op.op === 'selfNx') { const S = G.p[it.pi].field.find(x => x.iid === it.src); if (S && nxToSpirit(G, S, op.dur)) { const r = '「' + S.def.name + '」を、' + (op.dur === 'battle' ? 'このバトル中' : 'このステップ中') + '、ネクサスの効果を発揮せず“Lv1 5000・Lv2 7000”のスピリットとして扱います'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); } return; }
  if (op.op === 'selfSym') { const S = G.p[it.pi].field.find(x => x.iid === it.src); if (S) { (S.symx = S.symx || []).push({ n: op.n || 1, color: op.color, d: op.dur || 'perm' }); G.evs.push({ t: 'coreAdd', p: it.pi, iid: S.iid, n: 1 }); const r = '「' + S.def.name + '」に' + (COLOR_JP_E[op.color] || '') + 'シンボル' + (op.n || 1) + 'つを追加しました'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); } return; }
  if (op.op === 'trashToReserve') {
    const P = G.p[it.pi], take = P.coreTrash.filter(c => op.soul === 'only' ? c.soul : !c.soul).slice(0, op.n || 1); let n = 0;
    take.forEach(c => { if (moveCore(G, it.pi, c.id, { zone: 'reserve' })) n++; });
    if (n) G.evs.push({ t: 'resIn', p: it.pi, n });
    const r = n ? 'トラッシュのコア' + n + '個をリザーブに置きました' : 'トラッシュに対象のコアがないため、何も起きません'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return;
  }
  if (op.op === 'handPick') {
    G.lastPickN = 0;
    const P = G.p[it.pi], cands = P.hand.filter(c => matchDef(c.def, op.filter || {})).map(c => c.iid);
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 対象の手札がありません'); if (it.fx) it.fx.r.push('対象の手札がないため、何も起きません'); return; }
    if (op.reveal) { const cards = P.hand.map(c => ({ iid: c.iid, def: c.def, inst: c })); G.pending = { pi: it.pi, name: it.name, n: 1, cands: [], qi: it.pi, text: it.text, kind: 'reveal', opt: true, x: { mode: 'handReturn', desc: 'デッキの下に戻すカード', cards, cands: cards.map(c => c.iid), phase: 'pick', take: 'hand', rest: 'bottom', optional: !!op.opt, picked: null, pickedList: [], takeN: op.n || 1, restIds: [] } }; return 'wait'; }
    const hn = op.nLastDraw ? Math.min(G.lastDrawN | 0, P.hand.length) : op.all ? P.hand.length : (op.n || 1);
    if ((op.nLastDraw || op.all) && hn < 1) { lg(G, it.pi, '　' + it.name + ': 手札がありません'); if (it.fx) it.fx.r.push('手札がないため、何も起きません'); return; }
    G.pending = { pi: it.pi, name: it.name, n: hn, cands, qi: it.pi, text: it.text, kind: 'handPick', opt: op.all ? true : !op.exact, upto: op.all ? false : !op.exact, x: { newIds: (G.lastDrawIds || []).slice(), desc: descFilter(op.filter || {}), drawFlat: op.drawFlat || null, discard: !!op.discard } }; return 'wait';
  }
  if (op.op === 'handBottom') {
    const P = G.p[it.pi], cards = P.hand.splice(0).map(c => ({ iid: c.iid, def: c.def, inst: c }));
    if (!cards.length) { lg(G, it.pi, '　' + it.name + ': 手札がありません'); if (it.fx) it.fx.r.push('手札がないため、何も起きません'); return; }
    lg(G, it.pi, '　' + it.name + ': 手札' + cards.length + '枚をデッキの下に戻す');
    if (cards.length === 1) { P.deck.unshift(cards[0].inst); const nn = draw(G.p[it.pi], G.p[1 - it.pi].hand.length); if (it.fx) it.fx.r.push('手札1枚をデッキの下に戻し、' + nn + '枚ドローしました'); lg(G, it.pi, '　' + it.name + ': ' + nn + '枚ドロー'); return; }
    G.pending = { pi: it.pi, name: it.name, n: 1, cands: [], qi: it.pi, text: it.text, kind: 'reveal', opt: true, x: { desc: '', cards, cands: [], phase: 'order', take: 'hand', rest: 'bottom', optional: false, picked: null, pickedList: [], takeN: 1, restIds: cards.map(c => c.iid), afterDraw: 'oppHand', immediate: false } };
    return 'wait';
  }
  if (op.op === 'returnMagic') {
    const P = G.p[it.pi], c = P.trash.find(x => x.iid === (it.ctx && it.ctx.iid));
    if (c) { P.trash.splice(P.trash.indexOf(c), 1); P.hand.push(c); lg(G, it.pi, '　' + it.name + ': 「' + c.def.name + '」を手札に戻した'); if (it.fx) it.fx.r.push('「' + c.def.name + '」を手札に戻しました'); } else if (it.fx) it.fx.r.push('戻せるカードがありません');
    return;
  }
  if (op.op === 'drawTo') {
    const P = G.p[it.pi], need = Math.max(0, (op.n || 3) - P.hand.length), n = need ? draw(P, need) : 0;
    const r = '手札が' + P.hand.length + '枚になるまでドロー(' + n + '枚)'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return;
  }
  if (op.op === 'draw') {
    if (op.needActed && !it.acted) { lg(G, it.pi, '　' + it.name + ': 前の処理が行われていないため、続きは行いません'); return; }
    const q = op.who === 'opp' ? 1 - it.pi : it.pi; const dn0 = ((op.n || 1) + (op.perEx ? op.perEx * (it.ctx && it.ctx.excludedEx ? it.ctx.excludedEx.length : 0) : 0)) * (op.perKw ? G.p[it.pi].field.filter(x => x.def.type === 'spirit' && matchT(G, it.pi, it.pi, x, { kw: op.perKw })).length : 1) * (op.perCnt ? G.p[op.perCnt.who === 'opp' ? 1 - it.pi : it.pi].field.filter(x => matchT(G, it.pi, op.perCnt.who === 'opp' ? 1 - it.pi : it.pi, x, op.perCnt)).length : 1); const hl0 = G.p[q].hand.length; const n = dn0 ? draw(G.p[q], dn0) : 0; G.lastDrawN = n; G.lastDrawIds = G.p[q].hand.slice(hl0).map(c => c.iid);
    lg(G, it.pi, '　' + it.name + ': ' + (q === it.pi ? '' : '相手が') + n + '枚ドロー'); if (it.fx) it.fx.r.push((q === it.pi ? '' : '相手が') + n + '枚ドローしました'); return;
  }
  if (op.op === 'destroy') {
    const t = Object.assign({}, op.target);
    if (op.replace && evalCond(G, it.pi, op.replace.cond, it.ctx)) Object.assign(t, op.replace.set);
    const qi = t.who === 'opp' ? 1 - it.pi : it.pi, n = t.count || 1;
    const cands = G.p[qi].field.filter(c => matchT(G, it.pi, qi, c, t) && !hexed(G, it, qi, c)).map(c => c.iid);
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 対象がありません'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    if (!t.choose) { cands.forEach(i => { const c = G.p[qi].field.find(x => x.iid === i); if (it.fx && c) it.fx.r.push('「' + c.def.name + '」を破壊'); destroyCard(G, qi, i); }); return; }
    G.pending = { pi: it.pi, name: it.name, n, cands, qi, text: it.text };
    if (!camoSetup(G, it, qi, cands, G.pending, false).length) { G.pending = null; lg(G, it.pi, '　' + it.name + ': 対象がありません(迷彩のコストを支払えません)'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    return 'wait';
  }
  if (op.op === 'moveCores' && op.from === 'self' && op.to && op.to.choose) {
    // このスピリットのコアを、条件に合う自分のスピリット(任意)へ置く
    const t = op.to, S = G.p[it.pi].field.find(x => x.iid === it.src);
    if (!S) { lg(G, it.pi, '　' + it.name + ': スピリットがいないため何も起きません'); if (it.fx) it.fx.r.push('スピリットが場にいないため、何も起きません'); return; }
    const cands = G.p[it.pi].field.filter(c => (!t.excludeSelf || c.iid !== S.iid) && matchT(G, it.pi, it.pi, c, Object.assign({}, t, { who: 'you' }))).map(c => c.iid);
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 対象がありません'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    G.pending = { pi: it.pi, name: it.name, n: t.count || 1, cands, qi: it.pi, text: it.text, kind: 'moveCores', opt: !!(op.optional || t.optional), nonSoul: !!op.nonSoul, bpAfter: op.bpAfter || 0, max: op.max || 1, src: S.iid, fam: t.family || '' }; return 'wait';
  }
  if (op.op === 'selfLock') { if (op.needActed && !it.acted) return; const S = G.p[it.pi].field.find(x => x.iid === it.src); if (S) { (G.lock = G.lock || []).push({ iid: S.iid, turn: G.turnNo, atk: true, blk: false }); const r = '「' + S.def.name + '」は、このターン中、アタックできません'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); } return; }
  if (op.op === 'nbkBattle') { const S = G.p[it.pi].field.find(x => x.iid === it.src); if (S) { S.nbkB = G.battleNo; const r = '「' + S.def.name + '」は、このバトル中、BP比べで破壊されません'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); } return; }
  if (op.op === 'token') {
    if (op.needActed && !it.acted) { lg(G, it.pi, '　' + it.name + ': 前の処理が行われていないため、続きは行いません'); return; }
    const n = op.n || 1; for (let i = 0; i < n; i++) { const k = mkInst(makeTokenDef(op.name)); k.cores = [mkCore(false)]; k.tapped = false; G.p[it.pi].field.push(k); G.evs.push({ t: 'coreAdd', p: it.pi, iid: k.iid, n: 1 }); }
    const r = 'トークンの「' + op.name + '」を' + n + '体出しました'; lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return;
  }
  if (op.op === 'quake') return;
  if (op.op === 'clearActed') { it.acted = false; return; }
  if (op.op === 'quakeBoost') { const b = G.battle; if (b && !b.gone) { b.quakeAdd = (b.quakeAdd | 0) + (op.n | 0); if (it.fx) it.fx.r.push('このバトル中、「' + ((G.p[b.pi].field.find(x => x.iid === b.iid) || { def: { name: 'アタックしているスピリット' } }).def.name) + '」の地鳴を+' + (op.n | 0) + '枚'); } return; }
  if (op.op === 'mill') { const q = op.who === 'you' ? it.pi : 1 - it.pi, n0 = (G.discards || []).length; mill(G, q, op.n | 0, it.name, { sep: true }); const nn = (G.discards || []).length - n0; if (it.fx) it.fx.r.push((q === it.pi ? '自分' : '相手') + 'のデッキの上から' + nn + '枚を破棄しました'); return; }
  if (op.op === 'trashCores') {
    const S = G.p[it.pi].field.find(x => x.iid === it.src);
    const n = S ? trashToCard(G, it.pi, S, op.n, op.soul) : 0;
    const r = !S ? 'スピリットが場にいないため、何も起きません' : n ? 'トラッシュのコア' + n + '個を「' + S.def.name + '」に置きました' : 'トラッシュに対象のコアがないため、何も起きません';
    lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return;
  }
  if (op.op === 'destroyTemp') { const pi0 = it.pi, S = G.p[pi0].field.find(x => x.iid === it.src); if (S) { lg(G, pi0, '　' + it.name + ': バトル終了時、「' + S.def.name + '」を破壊'); destroyCard(G, pi0, S.iid); } return; }
  if (op.op === 'recover') {
    const P = G.p[it.pi], t = op.target || {};
    const cands = P.trash.filter(c => t.selfTrash ? c.iid === it.src : matchDef(c.def, t)).map(c => c.iid);
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 対象がありません'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    G.pending = { pi: it.pi, name: it.name, n: t.count || 1, cands, qi: it.pi, text: it.text, deck: !!op.deck && !(op.altHand && evalCond(G, it.pi, op.altHand.cond, it.ctx)), kind: 'recover', exTemp: !!op.exTemp, opt: !!op.opt, upto: !!op.upto, field: !!op.field, sum: !!op.sum, tempSum: !!op.tempSum }; return 'wait';
  }
  if (op.op === 'reveal') {
    let nn0 = op.n || 1; if (op.nAlt && evalCond(G, it.pi, op.nAlt.cond, it.ctx)) nn0 = op.nAlt.n; if (op.nPerEx) { nn0 = (it.ctx && it.ctx.excludedEx ? it.ctx.excludedEx.length : 0) * op.nPerEx; if (!nn0) { lg(G, it.pi, '　' + it.name + ': 除外したEXシンボルがないため、何も起きません'); if (it.fx) it.fx.r.push('継召で除外したEXシンボルがないため、何も起きません'); return; } }
    const P = G.p[it.pi], n = Math.min(nn0, P.deck.length);
    if (!n) { lg(G, it.pi, '　' + it.name + ': デッキがありません'); return; }
    if (op.opt && !it.revAsk && !op.auto && !G.autoYn) {   // 「オープンできる」: まず、オープンするかどうかを選ぶ
      it.revAsk = true; G.pending = { pi: it.pi, name: it.name, n: 1, cands: ['yes'], qi: it.pi, text: it.text, kind: 'ynx', yn: true, opt: true, x: { q: 'デッキの上から' + n + '枚をオープンしますか?', skipOp: true } }; return 'wait';
    }
    it.revAsk = false;
    const cards = []; for (let i = 0; i < n; i++) { const c = P.deck.pop(); cards.push({ iid: c.iid, def: c.def, inst: c }); }
    const grp = op.groups ? op.groups.map(f => cards.filter(c => matchDef(c.def, f)).map(c => c.iid)) : null;
    const cands = grp ? [...new Set([].concat(...grp))] : cards.filter(c => matchDef(c.def, op.filter || {})).map(c => c.iid);
    lg(G, it.pi, '　' + it.name + ': デッキの上から' + n + '枚をオープン(' + cards.map(c => '「' + c.def.name + '」').join('') + ')');
    G.pending = { pi: it.pi, name: it.name, n: 1, cands, qi: it.pi, text: it.text, kind: 'reveal', opt: true, x: { desc: op.groups ? op.groups.map(f => descFilter(f)).join('と') : descFilter(op.filter || {}), cards, cands, phase: 'pick', take: op.take || 'hand', rest: op.rest || 'bottom', optional: !!op.opt, picked: null, pickedList: [], takeN: grp ? Math.max(1, grp.filter(g => g.length).length) : ((op.pickAlt && evalCond(G, it.pi, op.pickAlt.cond, it.ctx)) ? op.pickAlt.n : (op.pick || 1)), groups: grp, restIds: [] } };
    if (op.all) { G.pending.x.all = true; G.pending.x.optional = false; G.pending.x.takeN = Math.max(1, cands.length); }   // 条件に合うカードをすべて加える(強制)
    if (op.auto) G.pending.x.auto = true;
    G.pending.x.immediate = true;
    if (!cands.length && !op.auto) G.pending.x.phase = 'none';
    if (!cands.length && !op.auto) { revAdvance(G); if (!G.pending) return; }
    G.pending.x.immediate = false; return 'wait';
  }
  if (op.op === 'handSum') {   // 手札のカードを、コストを支払って召喚できる
    const P = G.p[it.pi], cands = P.hand.filter(c => matchDef(c.def, op.filter || {}) && payRequirement(P, c.def, {}).ok && P.reserve.length >= payRequirement(P, c.def, {}).need + minPlaceOf(c.def)).map(c => c.iid);
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 召喚できるカードがありません'); if (it.fx) it.fx.r.push('召喚できるカードがないため、何も起きません'); return; }
    G.pending = { pi: it.pi, name: it.name, n: 1, cands, qi: it.pi, text: it.text, kind: 'sumPay', hand: true, opt: true }; return 'wait';
  }
  if (op.op === 'sumTrash' || op.op === 'freeMagic') {
    const P = G.p[it.pi], f = op.filter || {};
    const fam = c => !f.family || c.def.family.includes(f.family);
    let cands;
    if (op.op === 'sumTrash') {
      const tot = P.reserve.length + P.field.reduce((n, k) => n + k.cores.length, 0);
      cands = P.trash.filter(c => c.def.type === 'spirit' && fam(c) && (f.costMax == null || c.def.cost <= f.costMax)).map(c => c.iid);
    } else cands = P.hand.filter(c => c.def.type === 'magic' && fam(c) && c.def.effects.some(e => e.timing.kind === 'flash')).map(c => c.iid);
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 対象がありません'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    G.pending = { pi: it.pi, name: it.name, n: 1, cands, qi: it.pi, text: it.text, kind: op.op === 'sumTrash' ? 'sumPay' : 'freeMagic', opt: true, spell: it.kw === 'spell' }; return 'wait';
  }
  if (op.op === 'selfBp' || op.op === 'selfAct' || op.op === 'voidCore') {
    const S = G.p[it.pi].field.find(x => x.iid === it.src);
    let r = '';
    if (op.op === 'voidCore') {
      if (op.perTapped) op = Object.assign({}, op, { n: G.p[it.pi].field.filter(x => x.def.type === 'spirit' && x.tapped).length });
      if (op.n === 0) r = '疲労状態のスピリットがいないため、何も起きません'; else
      if (op.to === 'self') { if (!S) r = 'スピリットが場にいないため、何も起きません'; else { for (let i = 0; i < (op.n || 1); i++) S.cores.push(mkCore(false)); r = 'ボイドからコア' + (op.n || 1) + '個を「' + S.def.name + '」に置きました'; G.evs.push({ t: 'coreAdd', p: it.pi, iid: S.iid, n: op.n || 1 }); } }
      else if (op.to === 'reserve') { for (let i = 0; i < (op.n || 1); i++) G.p[it.pi].reserve.push(mkCore(false)); G.evs.push({ t: 'resIn', p: it.pi, n: op.n || 1 }); r = 'ボイドからコア' + (op.n || 1) + '個を自分のリザーブに置きました'; }
      else if (op.to === 'life') { for (let i = 0; i < (op.n || 1); i++) G.p[it.pi].life.push(mkCore(false)); G.evs.push({ t: 'lifeAdd', p: it.pi, n: op.n || 1 }); r = 'ボイドからコア' + (op.n || 1) + '個を自分のライフに置きました'; lifeUpEvt(G, it.pi); }
      else { for (let i = 0; i < (op.n || 1); i++) G.p[it.pi].coreTrash.push(mkCore(false)); G.evs.push({ t: 'ctAdd', p: it.pi, n: op.n || 1 }); r = 'ボイドからコア' + (op.n || 1) + '個を自分のトラッシュに置きました'; }
    } else if (!S) r = 'スピリットが場にいないため、何も起きません';
    else if (op.op === 'selfBp') { const mul = op.per && op.per.nexus ? G.p[it.pi].field.filter(x => x.def.type === 'nexus').length : op.per ? G.p[it.pi].field.filter(x => x.def.type === 'spirit' && (!op.per.family || x.def.family.includes(op.per.family))).length : 1; (S.mods = S.mods || []).push({ a: (op.amount | 0) * mul, d: op.dur || 'turn', s: it.name }); r = '「' + S.def.name + '」をBP' + ((op.amount | 0) * mul >= 0 ? '+' : '') + (op.amount | 0) * mul + (op.dur === 'battle' ? '(このバトル中)' : '(このターン中)'); }
    else if (op.verb === 'untap' && S.heavy) { S.heavy = false; r = '「' + S.def.name + '」を回復させました(重疲労→疲労)'; }
    else { const wasT = S.tapped; if (op.verb === 'tap' && !S.tapped) tapEvt(G, it.pi, S, 'self', true); S.tapped = op.verb === 'tap'; if (op.verb === 'untap' && wasT) untapEvt(G, it.pi, S); r = '「' + S.def.name + '」を' + (op.verb === 'tap' ? '疲労' : '回復') + 'させました'; }
    lg(G, it.pi, '　' + it.name + ': ' + r); if (it.fx) it.fx.r.push(r); return;
  }
  if (op.op === 'symLoss') {
    G.pending = { pi: it.pi, name: it.name, n: 1, cands: ['red', 'blue', 'green', 'yellow', 'purple', 'white'], qi: it.pi, text: it.text, kind: 'colorPick', opt: true, x: { bpMax: op.bpMax == null ? 1000 : op.bpMax } }; return 'wait';
  }
  if (op.needActed && !it.acted) { lg(G, it.pi, '　' + it.name + ': 前の処理が行われていないため、続きは行いません'); return; }
  if (op.op === 'act') {
    if (op.skipIfActed && it.acted) return;
    if (op.altAuto && evalCond(G, it.pi, op.altAuto.cond, it.ctx)) op = Object.assign({}, op, { acts: op.altAuto.acts });
    let t = op.target; const qi = t.who === 'opp' ? 1 - it.pi : it.pi;
    if (t.resetLast) G.lastCost = 0;
    if (op.resetN) G.lastN = 0;
    if (op.replace && evalCond(G, it.pi, op.replace.cond, it.ctx)) t = Object.assign({}, t, op.replace.set);
    if (t.countLastN) { const cn = G.lastN | 0; if (cn < 1) { lg(G, it.pi, '　' + it.name + ': 疲労したネクサスがないため、何も起きません'); if (it.fx) it.fx.r.push('疲労したネクサスがないため、何も起きません'); return; } t = Object.assign({}, t, { count: cn }); }
    if (t.countCtxEx) { const cn = (it.ctx && it.ctx.excludedEx ? it.ctx.excludedEx.length : 0); if (cn < 1) { lg(G, it.pi, '　' + it.name + ': 除外したEXシンボルがないため、何も起きません'); if (it.fx) it.fx.r.push('継召で除外したEXシンボルがないため、何も起きません'); return; } t = Object.assign({}, t, { count: cn }); }
    if (t.countCtxEx1) t = Object.assign({}, t, { count: 1 + (it.ctx && it.ctx.excludedEx ? it.ctx.excludedEx.length : 0) });
    if (t.countSelfBp) { const S1 = G.p[it.pi].field.find(x => x.iid === it.src), cn = S1 ? Math.floor(curBP(G, S1) / t.countSelfBp) : 0; if (cn < 1) { lg(G, it.pi, '　' + it.name + ': BPが足りないため、対象は指定できません'); if (it.fx) it.fx.r.push('BPが足りないため、何も起きません'); return; } t = Object.assign({}, t, { count: cn }); }
    if (t.costMaxCtx) t = Object.assign({}, t, { costMax: it.ctx && it.ctx.cost });
    if (t.notSelf) t = Object.assign({}, t, { notIid: it.src });
    if (t.bpPlusEv) { const cn = G.p[it.pi].field.filter(x => x.def.type === 'spirit' && x.def.effects.some(e2 => e2.timing.kind === 'trigger' && e2.timing.event === t.bpPlusEv && effectActive(x, e2))).length; t = Object.assign({}, t, { bpMax: (t.bpMax | 0) + 1000 * cn }); }
    if (t.bpEqCtx) t = Object.assign({}, t, { bpEq: it.ctx && it.ctx.selfBp });
    if (t.bpPlusKw) { const cn = G.p[it.pi].field.filter(x => x.def.type === 'spirit' && matchT(G, it.pi, it.pi, x, { kw: t.bpPlusKw })).length; t = Object.assign({}, t, { bpMax: (t.bpMax | 0) + 1000 * cn }); }
    if (t.countRest) { const r = t.countRest - (G.lastActN | 0) - (G.stashN | 0); if (r < 1) { lg(G, it.pi, '　' + it.name + ': 指定できる残り体数がありません'); return; } t = Object.assign({}, t, { count: r }); }
    if (t.bpEqSrc) { const S0 = G.p[it.pi].field.find(x => x.iid === it.src); if (S0) t = Object.assign({}, t, { bpEq: curBP(G, S0) }); }
    if (t.countDiv) { const cn = Math.floor(G.p[it.pi].field.filter(x => matchT(G, it.pi, it.pi, x, Object.assign({ who: 'you' }, t.countDiv.flt))).length / t.countDiv.d); if (cn < 1) { lg(G, it.pi, '　' + it.name + ': 指定できる体数が0です'); if (it.fx) it.fx.r.push('何も起きません'); return; } t = Object.assign({}, t, { count: cn }); }
    if (t.costPlusLast) t = Object.assign({}, t, { costMax: (t.costMax | 0) + (G.lastCost | 0) });
    if (t.costPlusField) t = Object.assign({}, t, { costMax: (t.costMax | 0) + G.p[it.pi].field.length + (((it.ctx && it.ctx.waitField) || []).length) });
    if (t.bpMaxLastLv1) { const L0 = (G.lastActCards || [])[0]; t = Object.assign({}, t, { bpMax: L0 && L0.def.levels.length ? L0.def.levels[0].bp : -1 }); }
    if (t.bpMaxExPer) t = Object.assign({}, t, { bpMax: t.bpMaxExPer.base + t.bpMaxExPer.per * ((it.ctx && it.ctx.excludedEx) || []).filter(x => (x.family || []).some(f => t.bpMaxExPer.famAny.includes(f))).length });
    if (t.costMaxPer) t = Object.assign({}, t, { costMax: t.costMaxPer.base + G.p[it.pi].field.filter(x => matchT(G, it.pi, it.pi, x, Object.assign({ who: 'you', type: 'spirit' }, t.costMaxPer.per))).length });
    if (t.costEqCtx) { const ac = it.ctx && it.ctx.atkCost; t = Object.assign({}, t, { costMax: ac, costMin: ac }); }
    if (t.countNexusDiv) { const cn = Math.floor(G.p[it.pi].field.filter(x => x.def.type === 'nexus').length / t.countNexusDiv); if (cn < 1) { lg(G, it.pi, '　' + it.name + ': ネクサスが足りません'); if (it.fx) it.fx.r.push('ネクサスが足りないため、何も起きません'); return; } t = Object.assign({}, t, { count: cn }); }
    if (t.countKw) { const cn = G.p[it.pi].field.filter(x => x.def.type === 'spirit' && matchT(G, it.pi, it.pi, x, { kw: t.countKw })).length; if (cn < 1) { lg(G, it.pi, '　' + it.name + ': 対象にできる数が0です'); if (it.fx) it.fx.r.push('何も起きません'); return; } t = Object.assign({}, t, { count: cn }); }
    const tc = op.acts.find(a => a.verb === 'trashCores');
    if (tc && !G.p[it.pi].coreTrash.some(c => tc.soul === 'only' ? c.soul : !c.soul)) { lg(G, it.pi, '　' + it.name + ': トラッシュに対象のコアがありません'); if (it.fx) it.fx.r.push('トラッシュに対象のコアがないため、何も起きません'); return; }
    if (t.tapped == null && op.acts.length && op.acts.every(a => a.verb === 'untap')) t = Object.assign({}, t, { tapped: true });   // 回復させる効果は、疲労しているものだけを対象にする
    else if (t.tapped == null && op.acts.length && op.acts.every(a => a.verb === 'tap')) t = Object.assign({}, t, { tapped: false });   // 疲労させる効果は、回復状態のものだけを対象にする
    const byOpp = op.chooser === 'opp';
    if (t.upToAll) t = Object.assign({}, t, { count: Math.max(1, G.p[qi].field.filter(c => matchT(G, it.pi, qi, c, t)).length) });   // 「相手が指定する」: 相手が自分のスピリットから選ぶ(迷彩のコストは不要)
    let cands = (t.who === 'both' ? [it.pi, 1 - it.pi] : [qi]).flatMap(q => G.p[q].field.filter(c => matchT(G, it.pi, q, c, t) && !(t.notSelf && c.iid === it.src) && (!t.selfOnly || c.iid === it.src) && (!t.blkOfSrc || (((G.battle && { iid: G.battle.iid, blocker: G.battle.blocker }) || (G.lastB && G.lastB.bn === G.battleNo && G.lastB)) || {}).iid === it.src && (G.battle ? G.battle.blocker : (G.lastB || {}).blocker) === c.iid) && !hexed(G, it, q, c)).map(c => c.iid));
    { const lvA = op.acts.find(a => a.leave != null); if (lvA) cands = cands.filter(i => { const c = G.p[0].field.concat(G.p[1].field).find(x => x.iid === i); return c && c.cores.length > lvA.leave; }); }   // コアを減らせない(すでに残す数以下の)スピリットは、そもそも対象にしない
    if (t.sumMax) cands = cands.filter(i => { const c = G.p[0].field.concat(G.p[1].field).find(x => x.iid === i); return c && (t.sumMax.k === 'cost' ? c.def.cost : curBP(G, c)) <= t.sumMax.max; });   // 合計の上限を超える1体だけのものは、そもそも選べない
    if (!cands.length) { lg(G, it.pi, '　' + it.name + ': 対象がありません'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    const camoAny = !t.all && !byOpp && qi !== it.pi && it.st === 'spirit' && cands.some(i => camoCost(G, G.p[qi].field.find(x => x.iid === i)) > 0);
    if (t.all || ((t.autoFit || byOpp) && !camoAny && cands.length <= (t.count || 1))) { G.pending = { pi: byOpp ? qi : it.pi, by: it.pi, name: it.name, n: cands.length, cands, qi, text: it.text, kind: 'act', acts: op.acts, alt: null, opt: false, upto: false }; chooseAct(G, byOpp ? qi : it.pi, cands, false); return 'wait'; }
    const VJ = { trashCores: 'トラッシュのコアを置く', addSym: 'シンボル追加', destroy: '破壊', bounce: '手札に戻す', untap: '回復', tap: '疲労', noLifeDmg: 'ライフが減らない', mustAttack: '最初にアタック', heavyTap: '重疲労', mustBlock: 'ブロック強制', bpMod: 'BP増減', coreOut: 'コアをリザーブへ', coreSel: 'コアをリザーブへ(相手が選ぶ)', addCore: 'コアを置く', deckBottom: 'デッキの下へ', open: 'デッキの上をオープン', soulFromTrash: '[ソウルコア]を置く', unb: 'ブロックされない' };
    G.pending = { pi: byOpp ? qi : it.pi, by: it.pi, name: it.name, n: t.count || 1, cands, qi, text: it.text, kind: 'act', acts: dynActs(G, it, op), alt: (op.alt && evalCond(G, it.pi, op.alt.cond, it.ctx)) ? op.alt : null, opt: !!op.opt, yn: !!(t.selfOnly && op.opt && !op.alt && !op.upto && !t.pair3000 && cands.length === 1), upto: !!op.upto, pair: !!t.pair3000, sumMax: t.sumMax || null,
      why: op.acts.filter(a => VJ[a.verb]).map(a => VJ[a.verb] + (a.verb === 'bpMod' ? (a.amount >= 0 ? '+' : '') + a.amount : '')).join('→') + (t.costPlusField ? ' / 指定できるコストは' + t.costMax + '以下(場のスピリット/ネクサス' + (G.p[it.pi].field.length + ((it.ctx && it.ctx.waitField) || []).length) + '+3、コスト支払いで消滅したものも含む)' : '') };
    if (byOpp) { G.pending.opt = false; G.pending.why = '相手の「' + it.name + '」の効果: あなたのスピリットを選びます(' + G.pending.why + ')'; }
    else if (t.who === 'both') {   // 自分と相手をまとめて指定する。必ず指定できる数(足りなければ全部)を指定する
      const ownC = cands.filter(i => G.p[it.pi].field.some(x => x.iid === i)), oppC = cands.filter(i => !ownC.includes(i));
      G.pending.both = true; G.pending.qi = it.pi; G.pending.upto = false; G.pending.opt = false;
      const pdn = G.pending; pdn.cands = oppC; camoSetup(G, it, 1 - it.pi, oppC, pdn, false); pdn.cands = ownC.concat(pdn.cands);
      if (!pdn.camo) pdn.n = Math.min(pdn.n, pdn.cands.length);
      if (!pdn.cands.length) { G.pending = null; lg(G, it.pi, '　' + it.name + ': 対象がありません'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    }
    else if (!camoSetup(G, it, qi, cands, G.pending, false).length) { G.pending = null; lg(G, it.pi, '　' + it.name + ': 対象がありません(迷彩のコストを支払えません)'); if (it.fx) it.fx.r.push('対象がいないため、何も起きません'); return; }
    { const nxa = op.acts.find(a => a.verb === 'nxSpirit' && a.place);
      if (nxa && G.pending) {
        const P0 = G.p[it.pi], av0 = c0 => P0.reserve.length + P0.field.reduce((sm, x) => sm + (x.iid === c0 ? 0 : x.cores.length), 0);
        G.pending.cands = G.pending.cands.filter(c0 => av0(c0) >= nxa.place);
        if (!G.pending.cands.length) { G.pending = null; lg(G, it.pi, '　' + it.name + ': 置けるコアがありません'); if (it.fx) it.fx.r.push('置けるコアがないため、何も起きません'); return; }
        G.pending.place = { min: nxa.place }; G.pending.why = ((G.pending.why ? G.pending.why + ' / ' : '') + 'リザーブ/場のコアを' + nxa.place + '個以上置いて、スピリットとして扱う').slice(0, 200);
      } }
    return 'wait';
  }
  if (op.op !== 'manual') lg(G, it.pi, '※「' + it.name + '」の「' + op.op + '」は自動処理に未対応です');
  lg(G, it.pi, '※「' + it.name + '」の効果は自動処理に未対応です。手動で処理してください: ' + it.text);
  if (it.fx) it.fx.r.push('自動処理に未対応です。手動で処理してください');
  G.notice = { n: G.notice.n + 1, m: '「' + it.name + '」の効果は自動処理に未対応です。手動で処理してください' };
}
function ampSnap(G) { const m = {}; G.p.forEach(P => P.field.forEach(k => { if (k.def.type === 'spirit' && k.def.effects.some(e => e.keyword === 'amp' && effectActive(k, e))) m[k.iid] = curBP(G, k); })); return m; }
