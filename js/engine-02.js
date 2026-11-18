/* --- コスト支払い(召喚・配置・使用) --- */
// 場の同色シンボル・継召のEX除外・ソウルマジックから、実際に支払うコアの数を計算する
function payRequirement(P, d, opt) {
  opt = opt || {};
  let fs = fieldSymbols(P, d.color);
  const fsExY = d.effects && d.effects.some(e => e.keyword === 'allYellow') ? P.field.filter(k => k.def.family.includes('詩姫') && k.def.color !== 'yellow').reduce((n, k) => n + k.def.symbols.normal + (k.def.symbols.ex ? 1 : 0), 0) : 0;
  const soulAvail = !!d.soulMagic && fs + fsExY > 0;
  // 召喚コストの特例(021/X15: 軽減シンボルすべてを満たす、059: 2回以上アタックしていればトラッシュのシンボルも数える)
  const fl = opt.fl || P.fl || {}, rule = ((((d.effects || []).find(e => e.keyword === 'costRule') || {}).ops || [])[0] || {}).rule;
  const fullR = (rule === 'puppetFull' && !!opt.puppet) || (rule === 'ymagicFull' && !!fl.ym);
  let cost0 = d.cost;
  { const ro = (((d.effects || []).find(e => e.keyword === 'costRule') || {}).ops || [])[0]; if (ro && ro.rule === 'perFam') cost0 = Math.max(0, d.cost - Math.min(ro.max, ro.per * P.field.filter(k => k.def.type === 'spirit' && k.def.family.includes(ro.fam)).length)); }
  if (rule === 'cost4OppS' && fl.oppS) cost0 = 4; if (rule === 'cost4NoSp' && fl.noSp) cost0 = 4; if (rule === 'cost6Sk' && fl.sk) cost0 = 6;
  if (rule === 'oppResSym' && fl.tp) fs += fl.or | 0;
  if (d.type === 'spirit' && d.color === 'yellow' && d.family.includes('黄玉') && (d.cost === 6 || d.cost === 8)) fs += fl.y82 | 0;
  if (d.type === 'spirit' && d.color === 'blue' && d.vanilla === true && d.cost >= 6) fs += fl.b83 | 0;
  if (d.type === 'spirit' && d.name.includes('仮面ライダー王蛇')) fs += fl.venom | 0;
  if (d.type === 'spirit' && d.color === 'yellow' && (d.team || []).includes('イエローライズ') && d.cost >= 7) fs += fl.y30 | 0;
  if (rule === 'trashSym' && fl.atk2) fs += P.trash.filter(x => x.def.color === d.color).reduce((n, x) => n + x.def.symbols.normal + (x.def.symbols.ex ? 1 : 0), 0);
  if (opt.soulMagic) {
    if (!soulAvail) return { ok: false, need: cost0, fs, applied: 0, exCards: [], soul: false, soulAvail };
    return { ok: true, need: 1, fs, applied: 0, exCards: [], soul: true, soulAvail };
  }
  const exIds = [...new Set(opt.ex || [])];
  const exCards = P.trash.filter(k => exIds.includes(k.iid) && ((k.def.symbols.ex && k.def.color === d.color) || (P.exIid === k.iid && k.def.color === d.color)));
  const exOk = exCards.length === exIds.length && (exIds.length === 0 || (d.keywords.includes('inheritance') && exIds.length <= d.reduction));
  if (!exOk) return { ok: false, need: cost0, fs, applied: 0, exCards: [], soul: false, soulAvail };
  const applied = fullR ? d.reduction : Math.min(d.reduction, fs + exCards.length);
  return { ok: true, need: Math.max(0, cost0 - applied) + (d.type === 'spirit' && d.cost <= 3 ? (fl.x53 | 0) : 0), fs, applied, exCards, soul: false, soulAvail };
}
const minPlaceOf = d => d.type === 'spirit' ? Math.max(1, d.levels.length ? d.levels[0].core : 1) : 0;
function playCard(G, pi, a) {
  const P = G.p[pi];
  const idx = P.hand.findIndex(x => x.iid === a.iid);
  if (idx < 0) return false;
  const k = P.hand[idx], d = k.def;
  const fl0 = playFlags(G, pi);
  const info = payRequirement(P, d, { ex: a.ex, soulMagic: !!a.soulMagic, puppet: !!a.puppet, fl: fl0 });
  if (!info.ok) return false;
  const uniq = arr => [...new Set((Array.isArray(arr) ? arr : []).slice(0, 40).map(String))];
  const pay = uniq(a.pay), place = uniq(a.place);
  if (pay.length !== info.need || pay.some(id => place.includes(id))) return false;
  const rOnly = !!G.battle && d.effects.some(e => e.keyword === 'flashSummon');
  const payF = pay.map(id => findCore(P, id));
  if (payF.some(f => !f || (f.zone !== 'reserve' && f.zone !== 'card'))) return false;      // 支払いはリザーブか場のカードから
  if (info.soul && !(pay.length === 1 && payF[0].arr[payF[0].i].soul)) return false;           // ソウルマジックはソウルコア1個
  if (rOnly && payF.some(f => f.zone !== 'reserve')) return false;
  const placeF = place.map(id => findCore(P, id));
  if (rOnly && placeF.some(f => f && f.zone !== 'reserve')) return false;
  if (placeF.some(f => !f || (f.zone !== 'reserve' && f.zone !== 'card'))) return false;      // 置くコアはリザーブか場のカードから
  if (d.type === 'magic' ? place.length !== 0 : place.length < minPlaceOf(d)) return false;
  { const rmBy = new Map(); payF.concat(placeF).forEach(f => { if (f && f.zone === 'card') rmBy.set(f.card, (rmBy.get(f.card) || 0) + 1); }); for (const [kc, n] of rmBy) if (coreFloorBlock(G, pi, kc, n)) return false; }
  const paidSoul = payF.some(f => f.arr[f.i].soul);
  const fieldBefore = P.field.slice();   // コアの支払いで消滅するカードも「待機状態」として効果の計算に含める
  const exInfo = info.exCards.map(c => ({ id: c.def.id, name: c.def.name, family: c.def.family, team: c.def.team || [] }));
  info.exCards.forEach(c => { P.trash.splice(P.trash.indexOf(c), 1); P.removed.push(c); });
  // 消滅防止: 支払いでコアが0になるカードに、リザーブの通常コアを1個載せる(支払いや置くコアに使わないコアだけ)
  { const used = new Set(pay.concat(place)), fi = new Set(); (Array.isArray(a.fill) ? a.fill : []).slice(0, 10).forEach(f => {
      if (!f || used.has(String(f.id)) || fi.has(String(f.id))) return; const tc = P.field.find(x => x.iid === String(f.iid)), cf = findCore(P, String(f.id));
      if (!tc || !cf || cf.zone !== 'reserve' || cf.arr[cf.i].soul) return; fi.add(String(f.id));
      const sm = tc.cores.some(c => c.soul && used.has(c.id)); if (moveCore(G, pi, String(f.id), { zone: 'card', iid: tc.iid })) lg(G, pi, '　' + (sm ? 'フィールドの「' + tc.def.name + '」からソウルコアを移動します。代わりにリザーブのコアを1個「' + tc.def.name + '」に置きました' : '「' + tc.def.name + '」はコアが0になるため、リザーブのコア1個を載せて消滅を防ぎました')); }); }
  pay.forEach(id => moveCore(G, pi, id, { zone: 'coreTrash' }));
  P.hand.splice(P.hand.indexOf(k), 1);
  if (d.type === 'magic') { P.trash.push(k); lg(G, pi, '「' + d.name + '」を使用'); }
  else {
    k.tapped = false; P.field.push(k);
    place.forEach(id => moveCore(G, pi, id, { zone: 'card', iid: k.iid }));
    lg(G, pi, '「' + d.name + '」を' + (d.type === 'spirit' ? '召喚' : '配置'));
  }
  lg(G, pi, '　コスト: コア' + pay.length + '個をトラッシュへ' + (info.applied ? '(軽減' + info.applied + ')' : '') + (info.soul ? '(ソウルマジック)' : '') + (exInfo.length ? '、EXシンボル' + exInfo.length + '枚を除外' : ''));
  // 効果の処理で使うための記録(召喚時にソウルコアを使ったか、除外したEXの名前・系統)
  G.ctx = { event: d.type === 'magic' ? 'use' : 'summon', pi, iid: k.iid, name: d.name, paidWithSoulCore: paidSoul, excludedEx: exInfo, waitField: d.type === 'magic' ? fieldBefore.filter(x => !P.field.includes(x)).map(x => ({ def: x.def })) : [] };
  G.cast = { n: (G.cast ? G.cast.n : 0) + 1, pi, def: d };
  if (fl0.sk && d.effects.some(e => e.keyword === 'costRule' && ((e.ops[0] || {}).rule) === 'cost6Sk')) P.d6t = G.turnNo;
  if (d.type === 'magic') (G.mLog = G.mLog || []).push({ pi, turn: G.turnNo, fam: d.family.slice(), team: (d.team || []).slice(), color: d.color });
  return true;
}

/* --- 効果の処理・アタック(バトル) --- */
const ownerOf = (G, k) => G.p[0].field.includes(k) ? 0 : G.p[1].field.includes(k) ? 1 : -1;
function markGone(G, iid) {
  const b = G.battle; if (!b) return;
  if (b.iid === iid) b.gone = true;
  if (b.blocker === iid) b.bgone = true;
}
// 真界放状態: 真界放を持つカードに、ソウルコアが乗っている、またはLv2に必要な数のコアが乗っている
function isShin(k) { const L = k.def.levels || []; return k.def.keywords.includes('shinkai') && (k.cores.some(c => c.soul) || (L.length > 1 && k.cores.length >= L[L.length - 1].core)); }
// 対象の条件(si=効果の持ち主、qi=対象の持ち主)
function matchT(G, si, qi, k, t) {
  if (!t || typeof t !== 'object') return false;
  if (t.or) { if (t.who === 'you' && qi !== si) return false; if (t.who === 'opp' && qi === si) return false; return t.or.some(o => matchT(G, si, qi, k, Object.assign({}, o, { who: t.who, notIid: t.notIid }))); }
  if (t.who === 'you' && qi !== si) return false;
  if (t.who === 'opp' && qi === si) return false;
  if (t.type && t.type !== 'any' && k.def.type !== t.type) return false;
  if (t.color && k.def.color !== t.color) return false;
  if (t.family && !k.def.family.includes(t.family)) return false;
  if (t.state === 'notBlocking' && G.battle && G.battle.blocker === k.iid && !G.battle.bgone) return false;
  if (t.state === 'blocking' && !(G.battle && G.battle.blocker === k.iid && !G.battle.bgone)) return false;
  if (t.state === 'tapped' && !k.tapped) return false;
  if (t.notIid && k.iid === t.notIid) return false;
  if (t.state === 'attacking' && !(G.battle && G.battle.iid === k.iid && !G.battle.gone)) return false;
  if (t.bpMax != null && curBP(G, k) > t.bpMax) return false;
  if (t.bpEq != null && curBP(G, k) !== t.bpEq) return false;
  if (t.noSoul && k.cores.some(c => c.soul)) return false;
  if (t.hasSoul && !k.cores.some(c => c.soul)) return false;
  if (t.bpMin != null && curBP(G, k) < t.bpMin) return false;
  if (t.bpOut && !(curBP(G, k) <= t.bpOut[0] || curBP(G, k) >= t.bpOut[1])) return false;
  if (t.notHeavy && k.heavy) return false;
  if (t.state === 'notAttacking' && G.battle && G.battle.iid === k.iid && !G.battle.gone) return false;
  if (t.pup && k.puppetTurn !== G.turnNo) return false;
  if (t.nx0 && !k.baseDef) return false;                                   // 本来はネクサス
  if (t.hasEv && !k.def.effects.some(e => e.timing.kind === 'trigger' && e.timing.event === t.hasEv && effectActive(k, e))) return false;   // 〜時効果を持つ
  if (t.symEq != null && (k.def.symbols.normal + (k.def.symbols.ex ? 1 : 0) + (k.symx || []).reduce((n, x) => n + x.n, 0)) !== t.symEq) return false;
  if (t.symMin != null && (k.def.symbols.normal + (k.def.symbols.ex ? 1 : 0) + (k.symx || []).reduce((n, x) => n + x.n, 0)) < t.symMin) return false;
  if (t.name && k.def.name !== t.name) return false;
  if (t.coreMax != null && k.cores.length > t.coreMax) return false;
  if (t.coreMin != null && k.cores.length < t.coreMin) return false;
  if (t.famAny && !t.famAny.some(f => k.def.family.includes(f))) return false;
  if (t.kw && !k.def.effects.some(e => e.keyword === t.kw && effectActive(k, e)) && !(t.kw === 'clash' && k.clashT === G.turnNo)) return false;
  if (t.bpPlus) { const w0 = []; curBP(G, k, w0); if (!w0.some(x => x.a > 0)) return false; }   // 「BPを+する」効果を受けている
  if (t.costIn && !t.costIn.includes(k.def.cost)) return false;
  if (t.noText && !(k.def.type === 'spirit' && k.def.vanilla === true)) return false;
  if (t.team && !(k.def.team || []).includes(t.team)) return false;
  if (t.nameHas && !k.def.name.includes(t.nameHas)) return false;
  if (t.nameAny && !t.nameAny.some(n => k.def.name.includes(n))) return false;
  if (t.family2 && !k.def.family.includes(t.family2)) return false;
  if (t.noShinkai && isShin(k)) return false;
  if (t.shinkaiOn && !isShin(k)) return false;
  if (t.lv != null && !(lvInfo(k) && lvInfo(k).lv === t.lv)) return false;
  if (t.exColor && !(k.def.symbols.ex && k.def.color === t.exColor)) return false;
  if (t.costMax != null && k.def.cost > t.costMax) return false;
  if (t.costMin != null && k.def.cost < t.costMin) return false;
  if (t.tapped != null && !!k.tapped !== !!t.tapped) return false;
  if (t.notShinkai && isShin(k)) return false;
  return true;
}
function perCount(G, si, per, self) { return G.p[si].field.filter(x => x.def.type === 'spirit' && !(per.notSelf && self && x === self) && (!per.team || (x.def.team || []).includes(per.team)) && (!per.family || x.def.family.includes(per.family)) && (!per.kw || x.def.effects.some(e2 => e2.keyword === per.kw && effectActive(x, e2))) && (!per.hasEv || x.def.effects.some(e2 => e2.timing.kind === 'trigger' && e2.timing.event === per.hasEv && effectActive(x, e2)))).length; }
// 今のBP(レベルのBP + 有効な常時効果)
function curBP(G, k, why) {
  const li = lvInfo(k); let bp = li ? li.bp : 0;
  const add = (a, l) => { bp += a; if (why && a) why.push({ l, a }); };
  const qi = ownerOf(G, k); if (qi < 0) return bp;
  G.p.forEach((Q, si) => Q.field.forEach(c => c.def.effects.forEach(e => {
    const t = e.timing;
    if (t.kind !== 'static' || !effectActive(c, e)) return;
    if (t.when === 'attacking' || t.when === 'blocking' || t.when === 'always' || t.when === 'attblk') {
      const isA = !!(G.battle && G.battle.iid === k.iid && !G.battle.gone), isB = !!(G.battle && G.battle.blocker === k.iid && !G.battle.bgone);
      const on = t.when === 'always' ? true : t.when === 'attacking' ? isA : t.when === 'attblk' ? (isA || isB) : isB;
      if (c === k && on && evalCond(G, si, e.cond, { srcIid: c.iid, srcTapped: !!c.tapped })) e.ops.forEach(o => {
        if (o.op !== 'bp' || o.target !== 'self') return;
        const mul = o.perCore ? c.cores.length : o.perNexus ? G.p[si].field.filter(x => x.def.type === 'nexus' && (o.perNexus === 'any' || x.def.color === o.perNexus)).length : o.per ? perCount(G, si, o.per, c) : 1;
        add((o.amount | 0) * mul, c.def.name + ' ' + (t.when === 'attacking' ? 'アタック中' : t.when === 'always' ? '常時' : t.when === 'attblk' ? 'アタック/ブロック中' : 'ブロック中') + (mul > 1 ? '(×' + mul + ')' : ''));
      });
      return;
    }
    if (t.when === 'step') {
      if (t.nodup && G.p[si].field.findIndex(x => x.def.name === c.def.name && x.def.effects.some(f => f.timing.nodup && f.text === e.text && effectActive(x, f))) < G.p[si].field.indexOf(c)) return;   // 〔重複不可〕
      if (!evalCond(G, si, e.cond)) return;
      if (t.step && G.step !== t.step) return;
      if (t.turn === 'you' && G.turn !== si) return;
      if (t.turn === 'opp' && G.turn === si) return;
      e.ops.forEach(o => { if (o.op === 'bp' && (o.target === 'self' ? c === k : matchT(G, si, qi, k, o.target))) { const mm = o.perNexus ? G.p[si].field.filter(x => x.def.type === 'nexus' && (o.perNexus === 'any' || x.def.color === o.perNexus)).length : o.per ? perCount(G, si, o.per, c) : 1; add((o.amount | 0) * mm, c.def.name + ' の常時効果' + (mm > 1 ? '(×' + mm + ')' : '')); } });
    }
  })));
  (k.mods || []).forEach(m => { add(m.a | 0, (m.d === 'battle' ? 'このバトル中' : 'このターン中') + (m.s ? '(' + m.s + ')' : '')); });
  return bp;
}
function evalCond(G, pi, c, ctx) {
  if (!c) return true;
  const who = o => (o === 'opp' ? 1 - pi : pi);
  if (c.handCount) { const n = G.p[who(c.handCount.of)].hand.length; if (c.handCount.lte != null && n > c.handCount.lte) return false; if (c.handCount.gte != null && n < c.handCount.gte) return false; }
  if (c.lifeLost) { const n = G.lifeLost[who(c.lifeLost.of)]; if (c.lifeLost.gte != null && n < c.lifeLost.gte) return false; if (c.lifeLost.lt != null && n >= c.lifeLost.lt) return false; }
  if (c.lifeCount) { const n = G.p[who(c.lifeCount.of)].life.length; if (c.lifeCount.lte != null && n > c.lifeCount.lte) return false; if (c.lifeCount.gte != null && n < c.lifeCount.gte) return false; }
  if (c.symbolCount && fieldSymbols(G.p[who('you')], c.symbolCount.color) < c.symbolCount.gte) return false;
  if (c.nexusCount) { const nn = G.p[who('you')].field.filter(x => x.def.type === 'nexus' && (!c.nexusCount.color || x.def.color === c.nexusCount.color)).length; if (c.nexusCount.gte != null && nn < c.nexusCount.gte) return false; if (c.nexusCount.lt != null && nn >= c.nexusCount.lt) return false; }
  if (c.oppAtkStep && !(G.turn !== pi && G.step === 'attack')) return false;
  if (c.nexusAllFam) { const nx = G.p[pi].field.filter(x => x.def.type === 'nexus'); if (!nx.length || !nx.every(x => x.def.family.includes(c.nexusAllFam))) return false; }
  if (c.notInherited && ctx && ctx.excludedEx && ctx.excludedEx.length) return false;
  if (c.trashAllColor && !G.p[pi].trash.every(x => x.def.color === c.trashAllColor)) return false;
  if (c.effKillPurple && !(G.effKillP && G.effKillP.turn === G.turnNo && G.effKillP.p === pi)) return false;
  if (c.magicUsed && !(G.mLog || []).some(m => m.pi === pi && m.turn === G.turnNo && (!c.magicUsed.family || m.fam.includes(c.magicUsed.family)) && (!c.magicUsed.team || (m.team || []).includes(c.magicUsed.team)))) return false;
  if (c.ctxFree && !(ctx && ctx.free)) return false;
  if (c.fchange && !(ctx && ctx.fchange)) return false;
  if (c.ownAtkStep && !(G.turn === pi && G.step === 'attack')) return false;
  if (c.noSoulSelf) { const S0 = G.p[pi].field.find(x => x.iid === (ctx && ctx.srcIid)); if (S0 && S0.cores.some(x => x.soul)) return false; }
  if (c.coreTrashSoul && !G.p[pi].coreTrash.some(x => x.soul)) return false;
  if (c.lastPickN != null && (G.lastPickN | 0) < c.lastPickN) return false;
  if (c.ownMain && !(G.turn === pi && (G.step === 'main' || G.step === 'main2'))) return false;
  if (c.lastAct && !(G.lastActCards || []).some(k => matchT(G, pi, pi, k, Object.assign({}, c.lastAct)))) return false;
  if (c.ctxSpell && !(ctx && ctx.spell)) return false;
  if (c.blockerBpMax != null && !(ctx && ctx.blockerBp <= c.blockerBpMax)) return false;
  if (c.byOpp && !(ctx && ctx.byOpp)) return false;
  if (c.ownAtkStep && !(G.turn === pi && G.step === 'attack')) return false;
  if (c.hasNexus && !G.p[who(c.hasNexus.of)].field.some(x => x.def.type === 'nexus')) return false;
  if (c.exists && !G.p[who(c.exists.who === 'opp' ? 'opp' : 'you')].field.some(x => matchT(G, pi, who(c.exists.who === 'opp' ? 'opp' : 'you'), x, c.exists.notSelf ? Object.assign({}, c.exists, { notIid: ctx && ctx.srcIid }) : c.exists))) return false;
  if (c.cnt) { const q = who(c.cnt.who === 'opp' ? 'opp' : 'you'); if (G.p[q].field.filter(x => matchT(G, pi, q, x, c.cnt)).length < (c.cnt.gte || 1)) return false; }
  if (c.notVanished && (G.vanLog || []).some(v => v.turn === G.turnNo && v.p === 1 - pi && v.by === pi)) return false;
  if (c.vanished && !(G.vanLog || []).some(v => v.turn === G.turnNo && v.p === 1 - pi && v.by === pi)) return false;
  if (c.notExists && G.p[who(c.notExists.who === 'opp' ? 'opp' : 'you')].field.some(x => matchT(G, pi, who(c.notExists.who === 'opp' ? 'opp' : 'you'), x, c.notExists))) return false;
  if (c.cntLte) { const q = who(c.cntLte.who === 'opp' ? 'opp' : 'you'); if (G.p[q].field.filter(x => matchT(G, pi, q, x, c.cntLte)).length > c.cntLte.lte) return false; }
  if (c.inherited && !(ctx && ctx.excludedEx && ctx.excludedEx.length)) return false;
  if (c.noTrashEx && G.p[pi].trash.some(x => x.def.symbols.ex)) return false;
  if (c.atkNthMin && !(G.atkCnt && G.atkCnt.t === G.turnNo && G.atkCnt.n >= c.atkNthMin)) return false;
  if (c.effKill && !(G.effKill && G.effKill.turn === G.turnNo && G.effKill.p === pi)) return false;
  if (c.trashCount) { const n = G.p[who(c.trashCount.of)].trash.length; if (c.trashCount.gte != null && n < c.trashCount.gte) return false; }
  if (c.srcTapped && !(ctx && ctx.srcTapped)) return false;
  if (c.srcBlocked && !(ctx && ctx.srcBlocked)) return false;
  if (c.srcBpMin != null && !(ctx && ctx.srcBp != null && ctx.srcBp >= c.srcBpMin)) return false;
  if (c.allyDestroyed && !(G.desLog || []).some(d => d.turn === G.turnNo && d.p === pi)) return false;
  if (c.paidWithSoulCore != null && !!(ctx && ctx.paidWithSoulCore) !== !!c.paidWithSoulCore) return false;
  if (c.not && evalCond(G, pi, c.not, ctx)) return false;
  if (c.oppTurn && G.turn === pi) return false;
  if (c.allSpFam && !G.p[pi].field.filter(x => x.def.type === 'spirit').every(x => c.allSpFam.some(f => x.def.family.includes(f)))) return false;
  if (c.srcAtk && !(ctx && ctx.srcIid && G.battle && G.battle.iid === ctx.srcIid && !G.battle.gone)) return false;
  if (c.srcUntapped && ctx && ctx.srcTapped) return false;
  if (c.reserveMin && G.p[who(c.reserveMin.of)].reserve.length < c.reserveMin.gte) return false;
  if (c.atkCostMax != null && !(ctx && ctx.atkCost != null && ctx.atkCost <= c.atkCostMax)) return false;
  if (c.allSp && !G.p[pi].field.filter(x => x.def.type === 'spirit').every(x => matchT(G, pi, pi, x, Object.assign({}, c.allSp, { who: 'you' })))) return false;
  if (c.allField && !(G.p[pi].field.every(x => matchT(G, pi, pi, x, Object.assign({}, c.allField, { who: 'you' }))) && ((ctx && ctx.waitField) || []).every(w => matchT(G, pi, pi, { def: w.def, iid: 'w', cores: [], tapped: false, mods: [] }, Object.assign({}, c.allField, { who: 'you' }))))) return false;
  if (c.onlyColorSym) { const P0 = G.p[pi]; if (fieldSymbols(P0, c.onlyColorSym) < 1 || ['red', 'purple', 'green', 'white', 'yellow', 'blue'].some(co => co !== c.onlyColorSym && fieldSymbols(P0, co) > 0)) return false; }
  if (c.reserveSoul && !G.p[pi].reserve.some(x => x.soul)) return false;
  if (c.exclTeam && !(ctx && ctx.excludedEx && ctx.excludedEx.filter(x => (x.team || []).includes(c.exclTeam.team)).length >= c.exclTeam.gte)) return false;
  if (c.trashFam && !G.p[pi].trash.some(x => x.def.family.includes(c.trashFam))) return false;
  if (c.trashCnt && G.p[pi].trash.filter(x => (!c.trashCnt.type || x.def.type === c.trashCnt.type) && (!c.trashCnt.family || x.def.family.includes(c.trashCnt.family))).length < c.trashCnt.gte) return false;
  if (c.exclMin && !(ctx && ctx.excludedEx && ctx.excludedEx.length >= c.exclMin)) return false;
  if (c.millSpirit && !(G.lastMill && G.lastMill.turn === G.turnNo && G.lastMill.sp)) return false;
  if (c.lastDiscFam) { const ld = (G.discards || []).slice(-1)[0]; if (!(ld && ld.turn === G.turnNo && ld.p === pi && (ld.fam || []).includes(c.lastDiscFam))) return false; }
  if (c.battleAtkUntapped && !(G.battle && G.p[G.battle.pi].field.some(x => x.iid === G.battle.iid && !x.tapped))) return false;
  if (c.ownFam && !(ctx && ctx.ownFam && c.ownFam.some(f => ctx.ownFam.includes(f)))) return false;
  return true;
}
function enqueue(G, qi, k, e, ctx) {
  // 〔重複不可〕: 同じタイミングでは同名カードの同じ効果は1つしか発動しない(別タイミングなら2枚目も発動する)
  if (e.timing && e.timing.nodup && G.queue.some(q => q.nd && q.i === 0 && q.pi === qi && q.name === k.def.name && q.text === e.text)) {
    const ei = k.def.effects.indexOf(e);
    if (k.used && ei >= 0 && (k.used[ei] === 't' + G.turnNo || k.used[ei] === 'b' + G.battleNo)) delete k.used[ei];   // 発動していないのでターン1回を消費させない
    return;
  }
  G.queue.push({ nd: !!(e.timing && e.timing.nodup),  fam: (k.def && k.def.family) || [], pi: qi, name: k.def.name, ops: e.ops, cond: e.cond, text: e.text, ctx: ctx || {}, i: 0, src: k.iid, st: k.def.type, kw: e.keyword, cid: k.def.id }); }
function trigEffects(k, event) {
  return k.def.effects.filter(e => e.timing.kind === 'trigger' && e.timing.event === event && (!e.timing.of || e.timing.of === 'self') && effectActive(k, e));
}
// 誘発効果の集め方: 今のレベルで有効なものは発動、無効なものは「なぜ発動しないか」を表示する
function collectTrig(k, event) {
  const act = [], inact = [];
  k.def.effects.forEach(e => {
    if (e.timing.kind !== 'trigger' || e.timing.event !== event || (e.timing.of && e.timing.of !== 'self')) return;
    if (effectActive(k, e)) act.push(e); else inact.push({ e, lv: (lvInfo(k) || {}).lv });
  });
  return { act, inact };
}
function applyTrig(G, qi, k, todo, ctx) {
  todo.act.forEach(e => { if (e.cond && e.timing.limit === 'turn' && !evalCond(G, qi, e.cond, Object.assign({ srcIid: k.iid, srcTapped: !!k.tapped }, ctx))) return; if (e.timing.limit === 'turn') { const ei = k.def.effects.indexOf(e); if (k.used && k.used[ei] === 't' + G.turnNo) return; (k.used = k.used || {})[ei] = 't' + G.turnNo; } enqueue(G, qi, k, e, ctx); });
  if (false) todo.inact.forEach(x => {   // レベルが足りない効果は、そもそも効果を持っていないのと同じなので何も表示しない
    const why = '現在のレベル(' + (x.lv ? 'Lv' + x.lv : '—') + ')では効果が働きません(' + lvLabel(x.e.levels) + (x.e.shinkai ? '《真界放》' : '') + 'が必要)';
    lg(G, qi, '「' + k.def.name + '」の「' + (EVENT_JP[x.e.timing.event] || '') + '」効果: ' + why);
    G.fx.push({ n: k.def.name, t: x.e.text, p: qi, r: [why], fail: true });
  });
}
const COLOR_JP_E = { red: '赤', blue: '青', green: '緑', yellow: '黄', purple: '紫', white: '白' };
// トラッシュのコアをカードに置く(ソウルコアを置く/ソウルコア以外を置く)
function trashToCard(G, pi, card, n, soul) {
  const P = G.p[pi], take = P.coreTrash.filter(c => soul === 'only' ? c.soul : !c.soul).slice(0, n || 1);
  let k = 0; take.forEach(c => { if (moveCore(G, pi, c.id, { zone: 'card', iid: card.iid })) k++; });
  if (k) G.evs.push({ t: 'coreIn', p: pi, iid: card.iid, n: k, from: 'coreTrash' });
  return k;
}
