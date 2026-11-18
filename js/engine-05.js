function ampHook(G, before) {
  if (G.turn == null || G.step !== 'attack') return; const pi = G.turn, now = ampSnap(G);
  G.p[pi].field.forEach(k => k.def.effects.forEach((e, ei) => {
    if (e.timing.kind !== 'trigger' || e.timing.event !== 'ampBp' || !effectActive(k, e)) return;
    const th = (e.timing.flt && e.timing.flt.bp) || 8000, self = !!(e.timing.flt && e.timing.flt.self);
    if (!Object.keys(now).some(i => before[i] != null && now[i] > before[i] && now[i] >= th && (self ? i === k.iid : G.p[pi].field.some(x => x.iid === i)))) return;
    if (e.timing.limit === 'turn') { if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; }
    enqueue(G, pi, k, e, { event: 'ampBp' });
  }));
}
function runQueue(G) {
  while (!G.pending && G.queue.length && G.winner == null) {
    const it = G.queue[0];
    if (it.i === 0 && !it.ynDone) {
      { const S0 = G.p[it.pi].field.find(x => x.iid === it.src); it.ctx = Object.assign({}, it.ctx, { srcIid: it.src, srcBp: S0 ? curBP(G, S0) : null, srcTapped: !!(S0 && S0.tapped), srcBlocked: !!(G.battle && G.battle.iid === it.src && G.battle.blocker) }); }
      if (!evalCond(G, it.pi, it.cond, it.ctx)) { lg(G, it.pi, '「' + it.name + '」の効果: 条件を満たさないため発動しません'); G.fx.push({ n: it.name, t: it.text, p: it.pi, r: ['条件を満たしていないため、発動しません'], fail: true }); G.queue.shift(); continue; }
      lg(G, it.pi, '「' + it.name + '」の効果が発動');
      it.fx = { n: it.name, t: it.text, p: it.pi, r: [], cid: it.cid }; G.fx.push(it.fx);
      // 「〜できる」の効果は、使うかどうかを選べる(自動で処理されるドロー・回復などは、先に確認する)
      const o0 = it.ops[0], c0 = ((it.text || '').split('。')[0]) || '';
      if (!G.autoYn && /できる/.test(c0) && o0 && (['draw', 'drawTo', 'selfAct', 'symLoss'].includes(o0.op) || (o0.op === 'act' && !o0.opt && o0.target && !o0.target.choose))) {
        it.ynDone = true; G.pending = { pi: it.pi, name: it.name, n: 1, cands: ['yes'], qi: it.pi, text: it.text, kind: 'ynx', yn: true, opt: true, x: { q: c0 } };
        return;
      }
      if (/できる/.test(c0) && o0 && o0.op === 'act' && !o0.opt && o0.target && o0.target.choose) it.ops = [Object.assign({}, o0, { opt: true })].concat(it.ops.slice(1));
    }
    while (it.i < it.ops.length) { const w = G.p.some(P => P.field.some(k => k.def.effects.some(e => e.timing.event === 'ampBp'))) ? ampSnap(G) : null; const rr = execOp(G, it, it.ops[it.i]); if (w) ampHook(G, w); if (rr === 'wait') return; it.i++; }
    G.queue.shift();
  }
  if (G.autoAfter && !G.pending && !G.queue.length && G.winner == null) { const an = G.autoAfter; G.autoAfter = 0; if (an === G.turnNo && G.step === 'draw' && !G.battle) { nextStep(G); return; } }
  if (G.autoEnd && G.settings.autoEnd && !G.pending && !G.queue.length && !(G.endLeft && G.endLeft.length) && G.winner == null) { const an = G.autoEnd; G.autoEnd = 0; if (an === G.turnNo && G.step === 'end' && !G.battle) { nextStep(G); return; } }
  if (!G.pending && !G.queue.length && G.endLeft && G.endLeft.length && G.winner == null) {
    if (G.endLeft.length === 1) { const it = G.endLeft.shift(); enqueue(G, G.turn, it.k, it.e, { event: 'endstep' }); return runQueue(G); }
    G.pending = { pi: G.turn, name: 'エンドステップ', n: 1, cands: [], qi: G.turn, text: '', kind: 'order', x: { opts: G.endLeft.map(i => ({ id: i.id, name: i.k.def.name, text: i.e.text, iid: i.k.iid })) } };
  }
  const b = G.battle;
  if (b && b.phase === 'end' && !G.pending && !G.queue.length) { G.lastB = G.battle ? { iid: G.battle.iid, blocker: G.battle.blocker, bn: G.battleNo } : null; G.battle = null; clearMods(G, 'battle'); lg(G, -1, 'バトル終了'); return; }
  if (b && b.phase === 'trigger' && !G.pending && !G.queue.length) { b.phase = 'flash1'; b.prio = 1 - b.pi; b.passes = 0; lg(G, b.prio, 'フラッシュタイミング(アタック時効果のあと)'); }
}
function chooseAct(G, pi, iids, useAlt, payIds) {
  const pd0 = G.pending;
  if (pd0 && pd0.kind === 'colorPick' && pd0.pi === pi && Array.isArray(iids)) {
    const col = pd0.cands.includes(String(iids[0])) ? String(iids[0]) : null; G.pending = null; G.undo = null;
    if (col) { (G.symLoss = G.symLoss || []).push({ pi: 1 - pi, color: col, bpMax: pd0.x.bpMax, turn: G.turnNo }); const r = COLOR_JP_E[col] + 'を指定。このステップ中、BP' + pd0.x.bpMax + '以下の相手のスピリットは' + COLOR_JP_E[col] + 'シンボル1つを失います'; lg(G, pi, '　' + pd0.name + ': ' + r); G.fx.push({ n: pd0.name, t: '', p: pi, r: [r] }); }
    else { lg(G, pi, '　' + pd0.name + ': 色を指定しない'); G.fx.push({ n: pd0.name, t: '', p: pi, r: ['色を指定しませんでした'] }); }
    G.queue[0].i++; runQueue(G); return;
  }
  if (pd0 && pd0.kind === 'ynx' && pd0.pi === pi && Array.isArray(iids)) {
    G.pending = null; G.undo = null; const yes = iids.map(String).includes('yes'), it = G.queue[0];
    if (yes) { lg(G, pi, '　' + pd0.name + ': 効果を使う'); runQueue(G); return; }
    lg(G, pi, '　' + pd0.name + ': 効果を使わない'); G.fx.push({ n: pd0.name, t: '', p: pi, r: ['効果を使いませんでした'] }); if (it) { if (pd0.x && pd0.x.skipOp) it.i++; else G.queue.shift(); } runQueue(G); return;
  }
  const pd = G.pending; if (!pd || pd.pi !== pi || !Array.isArray(iids) || pd.kind === 'sumPay' || pd.kind === 'reveal' || pd.kind === 'order' || pd.kind === 'coreSel') return;
  const ids = [...new Set(iids.map(String))].filter(i => pd.cands.includes(i));
  G.lastActN = ids.length;
  if (!(ids.length === Math.min(pd.n, pd.cands.length) || (pd.opt && ids.length === 0) || (pd.upto && ids.length <= pd.n))) return;
  if (pd.sumMax && ids.reduce((n, i) => { const c = G.p[pd.qi].field.find(x => x.iid === i); return n + (c ? (pd.sumMax.k === 'cost' ? c.def.cost : curBP(G, c)) : 0); }, 0) > pd.sumMax.max) { G.notice = { n: ((G.notice && G.notice.n) || 0) + 1, m: '合計' + (pd.sumMax.k === 'cost' ? 'コスト' : 'BP') + pd.sumMax.max + 'までしか指定できません' }; return; }
  if (pd.pair && ids.length === 2 && ids.some(i => { const c = G.p[pd.qi].field.find(x => x.iid === i); return c && curBP(G, c) > 3000; })) return;
  // 迷彩: 指定する迷彩の数だけ、リザーブ/場のコアを支払う(選んだコアが数と合わなければ確定しない)
  let camoPay = null;
  if (pd.camo) {
    const need = ids.reduce((sm, i) => sm + (pd.camo[i] | 0), 0), pids = [...new Set((Array.isArray(payIds) ? payIds : []).map(String))];
    if (pids.length !== need) return;
    if (need && !pids.every(id => { const f = findCore(G.p[pi], id); return f && (f.zone === 'reserve' || f.zone === 'card'); })) return;
    camoPay = need ? pids : null;
  }
  let placePay = null;
  if (pd.place) {
    const pids = [...new Set((Array.isArray(payIds) ? payIds : []).map(String))];
    if (ids.length) { if (pids.length < pd.place.min || !pids.every(id => { const f = findCore(G.p[pi], id); return f && (f.zone === 'reserve' || (f.zone === 'card' && !ids.includes(f.card.iid))); })) return; placePay = pids; }
    else if (pids.length) return;
  }
  G.pending = null; G.undo = null;
  if (placePay) { let np = 0; placePay.forEach((id, j) => { if (moveCore(G, pi, id, { zone: 'card', iid: ids[j % ids.length] })) np++; }); lg(G, pi, '　' + pd.name + ': コア' + np + '個をネクサスに置いた'); G.fx.push({ n: pd.name, t: '', p: pi, r: ['リザーブ/場のコア' + np + '個をネクサスに置きました'] }); }
  if (camoPay) {
    let paid = 0; camoPay.forEach(id => { if (moveCore(G, pi, id, { zone: 'coreTrash' })) paid++; });
    lg(G, pi, '　迷彩のコストとして、コア' + paid + '個をトラッシュへ支払った'); G.fx.push({ n: pd.name, t: '', p: pi, r: ['迷彩のコストとして、コア' + paid + '個を支払いました'] });
  }
  if (ids.length && G.queue[0]) G.queue[0].acted = true;
  if (pd.kind === 'handPick') {
    const P = G.p[pi], cs = ids.map(i => P.hand.find(c => c.iid === i)).filter(Boolean);
    G.lastPickN = cs.length;
    if (pd.x && pd.x.free) { const c = cs[0]; if (c) { P.hand.splice(P.hand.indexOf(c), 1); freeSummonCard(G, pi, c, { fchange: !!pd.x.free.fc }); } else lg(G, pi, '　' + pd.name + ': 出さなかった'); G.queue[0].i++; runQueue(G); return; }
    if (!cs.length) { const dsc = pd.x && pd.x.discard; G.fx.push({ n: pd.name, t: '', p: pi, r: [dsc ? '手札を破棄しませんでした' : '手札を戻しませんでした'] }); lg(G, pi, '　' + pd.name + (dsc ? ': 破棄しない' : ': 戻さない')); G.queue[0].i++; runQueue(G); return; }
    cs.forEach(c => P.hand.splice(P.hand.indexOf(c), 1));
    if (pd.x && pd.x.discard) {   // 手札を破棄する
      cs.forEach(c => { P.trash.push(c); (G.discards = G.discards || []).push({ turn: G.turnNo, p: pi, iid: c.iid, id: c.def.id, name: c.def.name, type: c.def.type, ex: !!c.def.symbols.ex, color: c.def.color, src: pd.name }); });
      G.evs.push({ t: 'discard', p: pi, cards: cs.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) });
      lg(G, pi, '　' + pd.name + ': 手札の' + cs.map(c => '「' + c.def.name + '」').join('') + 'を破棄'); G.fx.push({ n: pd.name, t: '', p: pi, r: ['手札の' + cs.map(c => '「' + c.def.name + '」').join('') + 'を破棄しました'] });
      G.queue[0].i++; runQueue(G); return;
    }
    if (pd.x && pd.x.drawFlat && pd.x.drawFlat.draw === 0) lg(G, pi, '　' + pd.name + ': 手札' + cs.length + '枚をデッキの下に戻す(相手には見せない)'); else lg(G, pi, '　' + pd.name + ': 手札の' + cs.map(c => '「' + c.def.name + '」').join('') + 'を相手に見せた');
    if (cs.length === 1) { P.deck.unshift(cs[0]); const dfl = pd.x && pd.x.drawFlat; const nn = draw(P, dfl ? (1 >= dfl.n ? (dfl.low != null && P.hand.length <= dfl.low ? dfl.draw2 : dfl.draw) : 0) : 1); G.fx.push({ n: pd.name, t: '', p: pi, r: ['手札の「' + cs[0].def.name + '」を相手に見せ、デッキの下に戻して' + nn + '枚ドローしました'] }); G.queue[0].i++; runQueue(G); return; }
    G.pending = { pi, name: pd.name, n: 1, cands: [], qi: pi, text: pd.text, kind: 'reveal', opt: true, x: { desc: '', cards: cs.map(c => ({ iid: c.iid, def: c.def, inst: c })), cands: [], phase: 'order', take: 'hand', rest: 'bottom', optional: false, picked: null, pickedList: [], takeN: 1, restIds: cs.map(c => c.iid), afterDraw: 'returned', drawFlat: pd.x && pd.x.drawFlat, hidden: !!(pd.x && pd.x.drawFlat && pd.x.drawFlat.draw === 0), immediate: false } };
    return;
  }
  if (pd.kind === 'costDiscard') {
    const k = G.p[pi].field.find(x => x.iid === pd.x.src), c = ids.length ? G.p[pi].hand.find(x => x.iid === ids[0]) : null;
    if (!c || !k) { lg(G, pi, '　' + pd.name + ': 【起動】をやめた'); G.seq++; return; }
    abilityPay(G, pi, k, pd.x.ei, c); return;
  }
  if (pd.kind === 'moveCores') {
    const S = G.p[pi].field.find(x => x.iid === pd.src), T = ids.length ? G.p[pi].field.find(x => x.iid === ids[0]) : null;
    if (!T) { G.fx.push({ n: pd.name, t: '', p: pi, r: ['対象を指定しませんでした'] }); lg(G, pi, '　' + pd.name + ': 対象を指定しない'); }
    else if (!S) { G.fx.push({ n: pd.name, t: '', p: pi, r: ['スピリットが場にいないため、何も起きません'] }); }
    else {
      // ソウルコアは残し、通常のコアから先に置く
      const take = S.cores.filter(c => !pd.nonSoul || !c.soul).sort((a, b) => (a.soul ? 1 : 0) - (b.soul ? 1 : 0)).slice(0, Math.min(pd.max || 1, S.cores.length));
      let n = 0; take.forEach(c => { if (moveCore(G, pi, c.id, { zone: 'card', iid: T.iid })) n++; });
      G.evs.push({ t: 'cmove', p: pi, from: S.iid, to: T.iid, n });
      if (pd.bpAfter) (T.mods = T.mods || []).push({ a: pd.bpAfter, d: 'battle', s: pd.name });
      lg(G, pi, '　' + pd.name + ': コア' + n + '個を「' + T.def.name + '」へ');
      G.fx.push({ n: pd.name, t: '', p: pi, r: ['「' + S.def.name + '」のコア' + n + '個を「' + T.def.name + '」に置きました'] });
    }
  } else if (pd.kind === 'recover' && pd.exTemp) {
    const c = ids.length ? G.p[pi].trash.find(x => x.iid === ids[0]) : null;
    if (c) { G.p[pi].exTmp = { iid: c.iid, t: G.turnNo, s: G.step }; refreshLv(G); lg(G, pi, '　' + pd.name + ': このステップ中、トラッシュの「' + c.def.name + '」のシンボル1つをEXシンボルとして扱う'); G.fx.push({ n: pd.name, t: '', p: pi, r: ['トラッシュの「' + c.def.name + '」の紫シンボル1つを、このステップ中、紫のEXシンボルとして扱います'] }); }
  } else if (pd.kind === 'recover') {
    const P = G.p[pi], got = [];
    if (pd.sum) { ids.forEach(i => { const c = P.trash.find(x => x.iid === i); if (c) { P.trash.splice(P.trash.indexOf(c), 1); c.cores = []; c.tapped = false; P.field.push(c); const need = (c.def.levels[0] && c.def.levels[0].core) || 1; for (let j = 0; j < need && P.reserve.length; j++) c.cores.push(P.reserve.pop()); lg(G, pi, '　' + pd.name + ': 「' + c.def.name + '」をコストを支払わずに召喚(コア' + c.cores.length + '個)'); G.fx.push({ n: pd.name, t: '', p: pi, r: ['トラッシュから「' + c.def.name + '」を召喚しました'] }); G.evs.push({ t: 'coreAdd', p: pi, iid: c.iid, n: c.cores.length }); if (pd.tempSum && G.battle) { (G.battle.endQ = G.battle.endQ || []).push([pi, c, { levels: [], timing: { kind: 'trigger', event: 'battleEnd' }, ops: [{ op: 'destroyTemp' }], text: 'このバトル終了時、召喚したそれを破壊する。' }]); } applyTrig(G, pi, c, collectTrig(c, 'summon'), { event: 'summon' }); } }); G.queue[0].i++; runQueue(G); return; }
    if (pd.field) { ids.forEach(i => { const c = P.trash.find(x => x.iid === i); if (c) { P.trash.splice(P.trash.indexOf(c), 1); const vb = c.def.type === 'spirit' ? '召喚' : '配置'; G.fx.push({ n: pd.name, t: '', p: pi, r: ['トラッシュから「' + c.def.name + '」を' + vb + 'しました'] }); freeSummonCard(G, pi, c, {}); } }); G.queue[0].i++; runQueue(G); return; }
    ids.forEach(i => { const c = P.trash.find(x => x.iid === i); if (c) { P.trash.splice(P.trash.indexOf(c), 1); (pd.deck ? P.deck : P.hand).push(c); got.push(c); } });
    if (got.length) { got.forEach(c => lg(G, pi, '　' + pd.name + ': 「' + c.def.name + '」をトラッシュから' + (pd.deck ? 'デッキの上へ' : '手札へ'))); G.evs.push({ t: 'recover', p: pi, from: 'trash', cards: got.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) }); }
    G.fx.push({ n: pd.name, t: '', p: pi, r: got.length ? got.map(c => 'トラッシュから「' + c.def.name + '」を' + (pd.deck ? 'デッキの上に' : '手札に') + '戻しました') : ['対象を指定しませんでした'] });
  } else if (pd.kind === 'freeMagic') {
    const P = G.p[pi], c = ids.length ? P.hand.find(x => x.iid === ids[0]) : null;
    if (!c) { G.fx.push({ n: pd.name, t: '', p: pi, r: ['使用しませんでした'] }); lg(G, pi, '　' + pd.name + ': 使用しない'); }
    else {
      P.hand.splice(P.hand.indexOf(c), 1); P.trash.push(c);
      lg(G, pi, '「' + c.def.name + '」をコストを支払わずに使用'); G.cast = { n: (G.cast ? G.cast.n : 0) + 1, pi, def: c.def }; (G.mLog = G.mLog || []).push({ pi, turn: G.turnNo, fam: c.def.family.slice(), team: (c.def.team || []).slice(), color: c.def.color });
      G.fx.push({ n: pd.name, t: '', p: pi, r: ['「' + c.def.name + '」のフラッシュ効果をコストなしで使用'] });
      const eff = c.def.effects.find(e => e.timing.kind === 'flash'); if (eff) enqueue(G, pi, { def: c.def, iid: c.iid }, eff, { event: 'use', pi, iid: c.iid, name: c.def.name, free: true, spell: !!pd.spell });
    }
  } else if (pd.kind === 'act') {
    const rs = [], jobs = []; G.effPi = pd.by != null ? pd.by : pi; G.effTapped = false; G.effHeavy = false;
    if (!ids.length) { rs.push('対象を指定しませんでした'); lg(G, pi, '　' + pd.name + ': 対象を指定しない'); }
    G.lastActCards = ids.map(i => G.p[0].field.concat(G.p[1].field).find(x => x.iid === i)).filter(Boolean);
    ids.forEach(i => {
      if (pd.both) pd.qi = G.p[0].field.some(x => x.iid === i) ? 0 : 1;
      const c = G.p[pd.qi].field.find(x => x.iid === i); if (!c) return;
      const nm = '「' + c.def.name + '」';
      for (const a of (useAlt && pd.alt ? pd.alt.acts : pd.acts)) {
        if (!G.p[pd.qi].field.includes(c) && a.verb !== 'voidReserve' && a.verb !== 'drawSelf') break;
        if (a.verb === 'voidReserve') { for (let j = 0; j < (a.n || 1); j++) G.p[pi].reserve.push(mkCore(false)); G.evs.push({ t: 'resIn', p: pi, n: a.n || 1 }); rs.push('ボイドからコア' + (a.n || 1) + '個を自分のリザーブに置きました'); }
        else if (a.verb === 'destroy') { if (G.queue[0]) G.queue[0].acted = true; rs.push(nm + 'を破壊'); if (c.def.type === 'nexus') G.lastCost = c.def.cost; destroyCard(G, pd.qi, i); }
        else if (a.verb === 'drawSelf') { const dn = draw(G.p[pi], a.n || 1); rs.push(dn + '枚ドローしました'); }
        else if (a.verb === 'tapSrc') { const q0 = G.queue[0], sx = q0 && G.p[pi].field.find(x => x.iid === q0.src); if (sx) { sx.tapped = true; rs.push('「' + sx.def.name + '」を疲労させました'); } }
        else if (a.verb === 'onBpWin' && a.ifCost != null && c.def.cost !== a.ifCost) { rs.push(nm + 'はコア' + a.ifCost + 'ではないため、効果は得られません'); }
        else if (a.verb === 'onBpWin') { (G.dBpWin = G.dBpWin || []).push({ pi, iid: i, turn: G.turnNo, draw: a.draw || 0, lifeOut: a.lifeOut || 0, bounce: a.bounce || null, atkOnly: !!a.atkOnly, bn: a.battle ? G.battleNo : null }); rs.push(nm + 'は、このターン中、BP比べで相手のスピリットだけを破壊した時に効果を得ます'); }
        else if (a.verb === 'asLv1') { c.lv1 = true; rs.push(nm + 'を、このバトル中Lv1として扱います'); }
        else if (a.verb === 'hexproof') { (G.hex = G.hex || []).push({ iid: i, bn: G.battleNo }); rs.push(nm + 'は、このバトル中、相手のマジックの効果では指定されません'); }
        else if (a.verb === 'bpMod' && a.oppAtk && !(G.turn !== pi && G.step === 'attack')) { rs.push('相手のアタックステップではないため、BPは増えません'); }
        else if (a.verb === 'tapBlock' && G.battle) { (G.battle.tapOk = G.battle.tapOk || []).push(c.iid); rs.push(nm + 'は、このバトル中、疲労状態でもブロックできます'); }
        else if (a.verb === 'lock') { (G.lock = G.lock || []).push({ iid: i, turn: G.turnNo, atk: !!a.atk, blk: !!a.blk }); rs.push(nm + 'は、このターン中、' + (a.atk && a.blk ? 'アタック/ブロック' : 'アタック') + 'できません'); }
        else if (a.verb === 'unb') { (G.unb = G.unb || []).push({ iid: i, turn: G.turnNo, bpMax: a.bpMax, costMax: a.costMax, costMin: a.costMin, bn: a.battle ? G.battleNo : null }); rs.push(nm + 'は、このターン中、' + (a.bpMax != null ? 'BP' + a.bpMax + '以下の' : a.costMax != null ? 'コスト' + a.costMax + '以下の' : '') + '相手のスピリットからブロックされません'); }
        else if (a.verb === 'coreToLife') { const cr = c.cores.find(x => !x.soul); if (cr && coreFloorBlock(G, pd.qi, c, 1)) { rs.push(nm + 'は、コアが1個より少なくならないため、コアを移せません'); } else if (cr) { c.cores.splice(c.cores.indexOf(cr), 1); G.p[pd.qi].life.push(cr); G.evs.push({ t: 'lifeAdd', p: pd.qi, n: 1 }); G.evs.push({ t: 'lifeGlow', p: pd.qi }); rs.push(nm + 'のコア1個をライフに置きました'); lifeUpEvt(G, pd.qi); if (!c.cores.length) vanishCard(G, pd.qi, c); } else rs.push('ソウルコア以外のコアがありません'); }
        else if (a.verb === 'destroyMill') { if (G.queue[0]) G.queue[0].acted = true; const qv = c.def.effects.reduce((sm, e) => sm + (e.timing.kind === 'static' && e.timing.when === 'attacking' && effectActive(c, e) ? e.ops.filter(o => o.op === 'quake').reduce((x, o) => x + (o.n | 0), 0) : 0), 0); rs.push(nm + 'を破壊'); destroyCard(G, pd.qi, i); if (qv) mill(G, 1 - pi, qv, pd.name); }
        else if (a.verb === 'puppetFx') { const pe = c.def.effects.find(e => e.keyword === 'puppet' && e.timing.kind === 'trigger' && effectActive(c, e)); if (pe) { enqueue(G, pi, c, pe, { event: 'summon' }); rs.push(nm + 'の【操霊】を発揮'); } else rs.push(nm + 'には発揮できる【操霊】がありません'); }
        else if (a.verb === 'bounceX') { const q0 = G.queue[0], sx = q0 && G.p[pi].field.find(x => x.iid === q0.src); if (c.def.type === 'nexus') { moveCard(G, pd.qi, i, 'hand'); if (sx) (sx.symx = sx.symx || []).push({ n: 1, color: 'white', d: 'battle' }); rs.push(nm + 'を手札に戻し、白シンボル1つを追加(このバトル中)'); } else { moveCard(G, pd.qi, i, 'hand'); if (sx) { sx.cores.push(mkCore(false)); G.evs.push({ t: 'coreAdd', p: pi, iid: sx.iid, n: 1 }); } rs.push(nm + 'を手札に戻し、コア1個を置きました'); } }
        else if (a.verb === 'summonFx') { const te = collectTrig(c, 'summon').act; if (te.length) { enqueue(G, pi, c, te[0], { event: 'summon' }); rs.push(nm + 'の召喚時効果を発揮'); } else rs.push(nm + 'には発揮できる召喚時効果がありません'); }
        else if (a.verb === 'bounce') { rs.push(nm + 'を手札に戻しました'); moveCard(G, pd.qi, i, 'hand'); }
        else if (a.verb === 'deckBottom') { rs.push(nm + 'をデッキの下に戻しました'); moveCard(G, pd.qi, i, 'deckBottom'); }
        else if (a.verb === 'tap') { if (a.rec && !c.tapped) G.lastN = (G.lastN | 0) + 1; const wt0 = !c.tapped; if (wt0) G.effTapped = true; c.tapped = true; if (wt0) tapEvt(G, pd.qi, c, G.effPi !== pd.qi ? 'opp' : 'self', true); rs.push(nm + 'を疲労させました'); }
        else if (a.verb === 'tapStep') { if (c.tapped) { c.heavy = true; rs.push(nm + 'は疲労状態なので、重疲労させました'); } else { c.tapped = true; rs.push(nm + 'は回復状態なので、疲労させました'); } }
        else if (a.verb === 'noBlockBattle' && G.battle) { (G.battle.noBlk = G.battle.noBlk || []).push(c.iid); rs.push(nm + 'は、このバトル中、ブロックできません'); }
        else if (a.verb === 'grantClash') { c.clashT = G.turnNo; rs.push(nm + 'に、このターン中【激突】(アタック中、相手のスピリットすべては可能ならブロックする)を与えました'); }
        else if (a.verb === 'untap') { if (c.heavy) { c.heavy = false; rs.push(nm + 'を回復させました(重疲労→疲労)'); } else { const wt = c.tapped; c.tapped = false; rs.push(nm + 'を回復させました'); if (wt) untapEvt(G, pd.qi, c); } }
        else if (a.verb === 'noLifeDmg') { (G.nodmg = G.nodmg || []).push({ pi, iid: i, turn: G.turnNo, by: pd.name }); rs.push(nm + 'のアタックでは、このターン中、自分のライフが減りません'); }
        else if (a.verb === 'mustAttack') { G.mustAtk = { pi: pd.qi, iid: i, turn: G.turnNo }; rs.push(nm + 'は、可能なら最初にアタックしなければなりません'); }
        else if (a.verb === 'heavyTap') { const wt0 = !c.tapped, wh0 = !c.heavy; c.tapped = true; c.heavy = true; if (wh0) { tapEvt(G, pd.qi, c, G.effPi !== pd.qi ? 'opp' : 'self', wt0); if (G.effPi !== pd.qi) G.effHeavy = true; } rs.push(nm + 'を重疲労させました'); }
        else if (a.verb === 'mustBlock' && G.battle) { G.battle.must = c.iid; rs.push(nm + 'は、このバトル中、可能なら疲労状態でもブロックしなければなりません'); }
        else if (a.verb === 'bpMod') { const am = a.perTapped ? a.amount * G.p[pi].field.filter(x => x.def.type === 'spirit' && x.tapped).length : (a.alt && c.def.name.includes(a.alt.nameHas) ? a.alt.amount : a.amount) + (a.perEx ? a.perEx * ((G.queue[0] && G.queue[0].ctx && G.queue[0].ctx.excludedEx) ? G.queue[0].ctx.excludedEx.length : 0) : 0); if (a.perTapped && !am) { rs.push(nm + ': 疲労状態のスピリットがいないため、BPは上がりません'); continue; } (c.mods = c.mods || []).push({ a: am, d: a.dur || 'turn', s: pd.name }); rs.push(nm + 'をBP' + (am >= 0 ? '+' : '') + am + '(' + (a.dur === 'battle' ? 'このバトル中' : 'このターン中') + ')'); bpFlashHook(G, G.effPi, c, am); }
        else if (a.verb === 'pullCores') { const S0 = G.p[pi].field.find(x => x.iid === (G.queue[0] && G.queue[0].src)); const mv = c.cores.slice(0, Math.max(0, c.cores.length - 1)); if (S0 && mv.length) { mv.forEach(x => moveCore(G, pi, x.id, { zone: 'card', iid: S0.iid })); G.evs.push({ t: 'cmove', p: pi, from: c.iid, to: S0.iid, n: mv.length }); if (G.queue[0]) G.queue[0].acted = true; rs.push(nm + 'のコア' + mv.length + '個を「' + S0.def.name + '」に置きました'); } else rs.push('移せるコアがありません'); }
        else if (a.verb === 'lvPlus1') { c.lvUpT = G.turnNo; refreshLv(G); rs.push(nm + 'を、このターン中、Lvを1つ上のものとして扱います'); }
        else if (a.verb === 'trashCoreTo') { const P2 = G.p[pi], take = P2.coreTrash.filter(x => !x.soul).slice(0, a.n || 1); take.forEach(x => moveCore(G, pi, x.id, { zone: 'card', iid: c.iid })); rs.push(take.length ? 'トラッシュのコア' + take.length + '個を' + nm + 'に置きました' : 'トラッシュに置けるコアがありません'); }
        else if (a.verb === 'bottomIf0') { if (curBP(G, c) <= 0) { rs.push(nm + 'のBPが0になったため、デッキの下に戻しました'); moveCard(G, pd.qi, i, 'deckBottom'); } }
        else if (a.verb === 'noBpKill') { c.nbk = G.turnNo; rs.push(nm + 'は、このターン中、BP比べで破壊されません'); }
        else if (a.verb === 'maxLv') { c.maxLv = true; rs.push(nm + 'を、このターン中、最高Lvとして扱います'); }
        else if (a.verb === 'destroyIf0') { if (curBP(G, c) <= 0) { rs.push(nm + 'のBPが0になったため破壊'); const q0 = G.queue[0], own = q0 && G.p[pi].field.find(x => x.iid === q0.src); G.bp0Dest = i; destroyCard(G, pd.qi, i); G.bp0Dest = null; if (own && own.def.type === 'spirit' && pd.qi !== pi) bp0KillHook(G, pi); } }
        else if (a.verb === 'onLifeHitNx') { (G.lhx = G.lhx || []).push({ pi, iid: i, turn: G.turnNo, name: pd.name, costMax: a.costMax || 4 }); rs.push(nm + 'は、このターン中、相手のライフを減らした時に、相手のネクサス1つを破壊します'); }
        else if (a.verb === 'battleEndDestroy') { if (G.battle) { (G.battle.endQ = G.battle.endQ || []).push([pd.qi, c, { ops: [{ op: 'destroySrc' }], text: 'このバトル終了時、破壊する' }]); rs.push(nm + 'は、このバトル終了時に破壊されます'); } }
        else if (a.verb === 'setSym' && a.ifCost != null && c.def.cost !== a.ifCost) { rs.push(nm + 'はコア' + a.ifCost + 'ではないため、シンボルは変わりません'); }
        else if (a.verb === 'setSym') { const colO = a.color === 'own' ? c.def.color : a.color; c.symOvr = { n: a.n || 1, color: colO, d: a.dur || 'battle' }; rs.push(nm + 'を、このバトル中、' + (COLOR_JP_E[colO] || '') + 'シンボル' + (a.n || 1) + 'つにします'); G.evs.push({ t: 'cardGlow', iid: c.iid }); }
        else if (a.verb === 'destroyQuiet') { if (G.queue[0]) G.queue[0].acted = true; rs.push(nm + 'を破壊(破壊時効果は発揮しない)'); G.quiet = i; destroyCard(G, pd.qi, i); G.quiet = null; }
        else if (a.verb === 'nxSpirit') { if (a.fromSelf) { const q0 = G.queue[0], s0 = q0 && G.p[pi].field.find(x => x.iid === q0.src); if (!s0 || !s0.cores.length) { rs.push(nm + 'に置けるコアがありません'); return; } moveCore(G, pi, s0.cores[s0.cores.length - 1].id, { zone: 'card', iid: c.iid }); rs.push('このスピリットのコア1個を' + nm + 'に置きました'); } if (nxToSpirit(G, c, a.dur)) rs.push(nm + 'を、' + (a.dur === 'battle' ? 'このバトル中' : 'このステップ中') + '、ネクサスの効果を発揮せず“Lv1 5000・Lv2 7000”のスピリットとして扱います'); }
        else if (a.verb === 'addCore') { for (let j = 0; j < (a.n || 1); j++) c.cores.push(mkCore(false)); rs.push(nm + 'にボイドからコア' + (a.n || 1) + '個を置きました'); G.evs.push({ t: 'coreAdd', p: pd.qi, iid: c.iid, n: a.n || 1 }); G.evs.push({ t: 'cardGlow', iid: c.iid }); }
        else if (a.verb === 'trashCoresTotal') { const m = ids.length, ix = ids.indexOf(i), nn = Math.floor(a.total / m) + (ix < a.total % m ? 1 : 0); const n = nn ? trashToCard(G, pd.qi, c, nn, a.soul) : 0; rs.push(n ? nm + 'にトラッシュのコア' + n + '個を置きました' : nm + ': 置けるコアがありません'); }
        else if (a.verb === 'trashCores') { const n = trashToCard(G, pd.qi, c, a.n, a.soul); rs.push(n ? nm + 'にトラッシュのコア' + n + '個を置きました' : 'トラッシュに対象のコアがありません'); }
        else if (a.verb === 'addSym') { const colA = a.color === 'own' ? c.def.color : a.color; (c.symx = c.symx || []).push({ n: a.n || 1, color: colA, d: a.dur || 'battle' }); rs.push(nm + 'に' + (COLOR_JP_E[colA] || '') + 'シンボル' + (a.n || 1) + 'つを追加(' + (a.dur === 'turn' ? 'このターン中' : 'このバトル中') + ')'); G.evs.push({ t: 'coreAdd', p: pd.qi, iid: c.iid, n: 1 }); }
        else if (a.verb === 'payUntap') { const rv = G.p[pi].reserve, n2 = a.n || 2; if (rv.length < n2) rs.push('リザーブのコアが足りません'); else { rv.slice().sort((x, y) => (x.soul ? 1 : 0) - (y.soul ? 1 : 0)).slice(0, n2).forEach(x => moveCore(G, pi, x.id, { zone: 'coreTrash' })); if (c.heavy) c.heavy = false; else { const wt = c.tapped; c.tapped = false; if (wt) untapEvt(G, pd.qi, c); } rs.push(n2 + 'コストを支払い、' + nm + 'を回復させました'); } }
        else if (a.verb === 'untapAct') { if (c.tapped || c.heavy) { if (G.queue[0]) G.queue[0].acted = true; if (c.heavy) c.heavy = false; else { c.tapped = false; untapEvt(G, pd.qi, c); } rs.push(nm + 'を回復させました'); } else rs.push(nm + 'はすでに回復状態です'); }
        else if (a.verb === 'reserveToLife') { const cr = G.p[pd.qi].reserve.find(x => !x.soul); if (cr) { moveCore(G, pd.qi, cr.id, { zone: 'coreTrash' }); const L = G.p[pd.qi].coreTrash.pop(); G.p[pd.qi].life.push(L); G.evs.push({ t: 'lifeAdd', p: pd.qi, n: 1 }); rs.push('リザーブのコア1個を自分のライフに置きました'); lifeUpEvt(G, pd.qi); } else rs.push('リザーブにソウルコア以外のコアがありません'); }
        else if (a.verb === 'coreOut') jobs.push({ qi: pd.qi, iid: i, keep: a.keep != null ? a.keep : null, n: (a.total ? Math.max(1, Math.floor(a.total / ids.length)) : (a.n || 1)) + (a.perKw ? G.p[pi].field.filter(x => x.def.type === 'spirit' && matchT(G, pi, pi, x, { kw: a.perKw })).length : 0), non: a.soul === 'non', vdraw: !!a.vdraw });
        else if (a.verb === 'payRes') { const rv = G.p[pi].reserve; let nn = a.n || 1; { const q0 = G.queue[0], sk = q0 && G.p[pi].field.find(x => x.iid === q0.src), pl = penSub(G, pi, sk); if (pl && nn >= 1) { pl.tapped = true; nexusTapEvt(G, pi, pl); nn--; rs.push('「' + pl.def.name + '」を疲労させ、1コストを支払ったものとして扱いました'); } } if (rv.length < nn) { rs.push(nn + 'コストを支払えないため、効果は行いません'); break; } for (let j = 0; j < nn; j++) { const c0 = rv.slice().sort((x, y) => (x.soul ? 1 : 0) - (y.soul ? 1 : 0))[0]; moveCore(G, pi, c0.id, { zone: 'coreTrash' }); } rs.push(nn + 'コストを支払いました(リザーブ→トラッシュ)'); }
        else if (a.verb === 'lifeHitVoid') { (G.lhv = G.lhv || []).push({ pi: pd.qi, iid: i, bn: G.battleNo }); rs.push(nm + 'は、このバトル中、アタックで相手のライフを減らした時、自分のライフが3以下ならボイドからコア1個をライフに置きます'); }
        else if (a.verb === 'loseSym') { (G.symLoss = G.symLoss || []).push({ pi: pd.qi, color: c.def.color, bpMax: 999999, turn: G.turnNo, iid: i }); rs.push(nm + 'は、このステップ中、シンボル1つを失います'); }
        else if (a.verb === 'dmgCap1') { (G.dmgCap = G.dmgCap || []).push({ pi, iid: i, turn: G.turnNo }); rs.push('このターン中、自分のライフは' + nm + 'から1しか減らされません'); }
        else if (a.verb === 'open') { if (G.queue[0]) G.queue[0].acted = true; }
        else if (a.verb === 'soulFromTrash') { const Pq = G.p[pd.qi]; let srcLoc = 'coreTrash'; let sc = Pq.coreTrash.find(x => x.soul); if (!sc && a.any) { const oc = Pq.field.find(x => x !== c && x.cores.some(y => y.soul)); sc = oc ? oc.cores.find(y => y.soul) : null; if (oc) srcLoc = 'card:' + oc.iid; } /* フィールド(他のカードの上)/トラッシュのみ。リザーブは不可 */ if (sc && moveCore(G, pd.qi, sc.id, { zone: 'card', iid: i })) { if (G.queue[0]) G.queue[0].acted = true; rs.push('[ソウルコア]を' + nm + 'に置きました'); G.evs.push({ t: 'coreAdd', p: pd.qi, iid: i, n: 1, from: srcLoc, soul: true }); } else rs.push('置ける[ソウルコア]がありません'); }
        else if (a.verb === 'coreSel') { const cn2 = a.total ? Math.max(1, Math.floor(a.total / ids.length)) : a.perKwN ? G.p[pi].field.filter(x => x.def.type === 'spirit' && matchT(G, pi, pi, x, { kw: a.perKwN })).length : (a.n || 1); if (cn2 > 0) jobs.push({ qi: pd.qi, iid: i, choose: true, keep: a.keep != null ? a.keep : null, leave: a.leave != null ? a.leave : null, n: cn2 + (a.perEx && G.queue[0] && G.queue[0].ctx && G.queue[0].ctx.excludedEx ? G.queue[0].ctx.excludedEx.length : 0) }); }
      }
    });
    if (G.effTapped && G.effPi != null && G.turn === G.effPi) { const ow = G.effPi; G.effTapped = false; G.p[ow].field.forEach(X => X.def.effects.forEach((e, ei) => { const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'effTap' || !effectActive(X, e)) return; if (t.limit === 'turn') { if (X.used && X.used[ei] === 't' + G.turnNo) return; (X.used = X.used || {})[ei] = 't' + G.turnNo; } enqueue(G, ow, X, e, { event: 'effTap' }); })); }
    if (G.effHeavy) { G.effHeavy = false; if (G.effPi != null && G.turn === G.effPi) trashTrigFire(G, G.effPi, 'effHeavy'); }
    if (jobs.length) { G.cs = { pi, name: pd.name, jobs, rs }; if (coreOutNext(G) === 'wait') return; G.effPi = null; G.queue[0].i++; runQueue(G); return; }
    rs.forEach(r => lg(G, pi, '　' + pd.name + ': ' + r));
    G.fx.push({ n: pd.name, t: '', p: pi, r: rs });
  } else {
    G.fx.push({ n: pd.name, t: '', p: pi, r: ids.map(i => { const c = G.p[pd.qi].field.find(x => x.iid === i); return '「' + (c ? c.def.name : '?') + '」を破壊'; }) });
    ids.forEach(i => destroyCard(G, pd.qi, i));
  }
  G.queue[0].i++;
  runQueue(G);
}
