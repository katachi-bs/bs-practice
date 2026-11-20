function moveCoresGuarded(ids, to) {
  if (to.zone === 'coreTrash') { return; }
  if (!canMoveCores()) { return; }
  const gone = [];
  const go = () => doAct({ k: 'moveCores', ids, to });
  if (!gone.length) { go(); return; }
  sheetActs = [];
  showSheet('<h3>本当にコアを動かしますか?</h3><div class="txt">「' + gone.map(k => esc(k.def.name)).join('」「') + '」のコアがすべて無くなり、<b>消滅</b>します。<br>(破壊ではなく消滅です。破壊時の効果は働きません)</div><div class="acts">' + sbtn('消滅させてよい', go) + sbtn('やめる', () => {}, 1) + '</div>');
}
let seenStamp = null, stampAt = 0;
function stampPal(open) {
  let el = $('stampPal');
  if (!el) { el = document.createElement('div'); el.id = 'stampPal'; document.body.appendChild(el); }
  el.hidden = !open; el.innerHTML = open ? STAMPS.map(e => '<button data-stamp="' + e + '">' + e + '</button>').join('') : '';
}
function showStamp(mine, e) {
  const b = document.createElement('div'); b.className = 'stampfx ' + (mine ? 'mine' : 'opp'); b.textContent = e; document.body.appendChild(b); setTimeout(() => b.remove(), 2600);
}
function handleClick(t) {
  if (t.closest('[data-stampbtn]')) { const el = $('stampPal'); stampPal(!(el && !el.hidden)); return; }
  { const sb = t.closest('[data-stamp]'); if (sb) { if (Date.now() - stampAt < 1200) return; stampAt = Date.now(); stampPal(false); doAct({ k: 'stamp', e: sb.dataset.stamp }); return; } }
  if (!t.closest('#stampPal') && $('stampPal') && !$('stampPal').hidden) stampPal(false);
  if (V && V.pending && V.pending.altFree && V.pending.pi === V.me && t.closest('[data-altz]') && !t.closest('[data-pchoose]')) { pickSel.clear(); sel.clear(); doAct({ k: 'choose', iids: [V.pending.cands[0]], alt: true }); return; }
  const sa = t.closest('[data-sa]');
  if (sa) { const fn = sheetActs[+sa.dataset.sa]; hideSheet(); if (fn) fn(); return; }
  if (t.closest('[data-close]')) { hideSheet(); return; }
  { const cn = t.closest('[data-cname]'); if (cn && V) { openByName(cn.dataset.cname); return; } }
  if (t.closest('[data-back]')) { if (V) openDeck(); return; }
  if (!V) return;
  if (t.closest('[data-bclose]')) { $('banner').hidden = true; return; }
  if (t.closest('[data-roster]')) { openRoster(); return; }
  if (V.spec) {   // 観戦中は、見るだけの操作だけ
    if (specClick(t)) return;
    if (t.closest('[data-sidetog]')) { sideOpen = !sideOpen; render(); return; }
    if (t.closest('[data-log]')) { logOpen = !logOpen; render(); return; }
    if (t.closest('[data-menu]')) { menuOpen = !menuOpen; render(); return; }
    { const lm = t.closest('[data-lmode]'); if (lm) { listMode = lm.dataset.lmode; openList(lm.dataset.lwho === '1', lm.dataset.lzone); return; } }
    { const lk = t.closest('[data-list]'); if (lk) { openList(lk.dataset.own === '1', lk.dataset.list); return; } }
    { const card = t.closest('[data-card]'); if (card && card.dataset.zone !== 'deck') { openCard(card.dataset.card); return; } }
    return;
  }
  const fs = t.closest('[data-first]'); if (fs) { doAct({ k: 'setFirst', first: fs.dataset.first === '1' }); return; }
  const ml = t.closest('[data-mull]'); if (ml) { doAct({ k: 'mulligan', yes: ml.dataset.mull === '1' }); return; }
  if (t.closest('[data-sidetog]')) { sideOpen = !sideOpen; render(); return; }
  if (t.closest('[data-log]')) { logOpen = !logOpen; render(); return; }
  // --- 支払いパネル ---
  if (t.closest('[data-pok]')) { confirmPay(); return; }
  if (t.closest('[data-pcancel]')) { cancelPay(); return; }
  if (t.closest('[data-pdetail]')) { const k = pay && ((V.you.hand.find(x => x.iid === pay.iid)) || V.you.trash.find(x => x.iid === pay.iid)); if (k) showSheet(detailHTML({ def: k.def, cores: [], iid: '' }) + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>'); return; }
  const plv = t.closest('[data-plv]'); if (plv) { setPlaceLv(plv.dataset.plv); return; }
  if (t.closest('[data-pauto]')) { autoPay(); render(); return; }
  const tab = t.closest('[data-ptab]');
  if (tab && !t.closest('[data-prm]')) { pay.bucket = tab.dataset.ptab; render(); return; }
  if (t.closest('[data-pmode]')) { pay.mode = t.closest('[data-pmode]').dataset.pmode; render(); return; }
  if (t.closest('[data-psoul]')) { pay.soulMagic = t.closest('[data-psoul]').dataset.psoul === '1'; if (pay.soulMagic) pay.ex = []; autoPay(); render(); return; }
  const pex = t.closest('[data-pex]');
  if (pex) {
    const st = payState(); if (!st) return;
    const iid = pex.dataset.pex;
    if (pay.ex.includes(iid)) pay.ex = pay.ex.filter(i => i !== iid);
    else if (pay.ex.length < st.d.reduction) pay.ex.push(iid);
    autoPay(); render(); return;
  }
  // --- コア ---
  const cc = t.closest('[data-cc]');
  if (cc) {
    if (cc.dataset.own !== '1') return;
    if (pay) { payTap(cc.dataset.cc); return; }
    if (!canMoveCores() && !camoMode()) { return; }
    // 数字をタップするたびに1個ずつ選択、全部選んだ状態でもう一度タップすると解除
    const ids = coresAt(cc.dataset.cc).filter(c => !c.soul).map(c => c.id), picked = ids.filter(id => sel.has(id));
    if (picked.length < ids.length) sel.add(ids.find(id => !sel.has(id))); else picked.forEach(id => sel.delete(id));
    render(); return;
  }
  const core = t.closest('[data-core]');
  if (core) {
    if (core.dataset.own !== '1') return;
    if (pay) { payTap(core.dataset.loc, core.dataset.core); return; }
    if (!canMoveCores() && !camoMode()) { return; }
    const id = core.dataset.core; sel.has(id) ? sel.delete(id) : sel.add(id); render(); return;
  }
  if (t.closest('[data-menu]')) { menuOpen = !menuOpen; render(); return; }
  if (t.closest('[data-next]')) { doAct({ k: 'next' }); return; }
  if (t.closest('[data-pause]')) { doAct({ k: 'setPause', v: !V.pause }); return; }
  if (t.closest('.fxc') && !t.closest('.pend')) { skipFx(); return; }
  if (t.closest('.fxc.pend')) { fxDismissKey = $('fx').dataset.k; $('fx').hidden = true; return; }
  if (t.closest('[data-stepback]')) { stepBack(); return; }
  if (t.closest('[data-home]')) { goHome(); return; }
  if (t.closest('[data-rematch]')) { doRematch(); return; }
  if (t.closest('[data-leave]')) { leaveNow(); return; }
  if (t.closest('[data-psoulc]')) { toggleSoulPay(); return; }
  if (t.closest('[data-pass]')) { doAct({ k: 'pass' }); return; }
  if (t.closest('[data-abil]')) {
    const [i, e] = t.closest('[data-abil]').dataset.abil.split(':'); hideSheet();
    const ak = V.you.field.find(x => x.iid === i), ae = ak && ak.def.effects[+e], pn0 = ae && ae.cost && ae.cost.pay | 0;
    if (pn0) {   // コストの支払い: どこから払うかを見せて、確認してから使う
      const rv = V.you.reserve.length; sheetActs = [];
      showSheet('<h3>コストの支払い</h3><div class="txt">「' + esc(ak.def.name) + '」の【起動】を使います。<br>コスト: <b>リザーブのコア' + pn0 + '個</b>をトラッシュへ支払います。<br><span class="dim">リザーブ ' + rv + '個 → ' + Math.max(0, rv - pn0) + '個</span></div><div class="acts">' + sbtn('支払って使う', () => { hideSheet(); doAct({ k: 'ability', iid: i, ei: +e }); }) + sbtn('やめる', () => hideSheet(), true) + '</div>');
      return;
    }
    doAct({ k: 'ability', iid: i, ei: +e }); return;
  }
  if (t.closest('[data-noblock]')) { pickSel.clear(); doAct({ k: 'block', iid: null }); return; }
  if (t.closest('[data-doblock]')) { const i = [...pickSel][0]; pickSel.clear(); if (i) doAct({ k: 'block', iid: i }); return; }
  if (t.closest('[data-undoplay]')) { doAct({ k: 'undoPlay' }); return; }
  if (t.closest('[data-cancelcast]')) { pickSel.clear(); doAct({ k: 'cancelCast' }); return; }
  if (t.closest('[data-orderpick]')) { doAct({ k: 'orderPick', id: t.closest('[data-orderpick]').dataset.orderpick }); return; }
  if (t.closest('[data-rvall]')) { const pd = V.pending; if (pd && pd.kind === 'reveal') doAct({ k: 'revTake', iids: pd.x.cands.slice() }); return; }
  if (t.closest('[data-rvpick]')) { const l = revSel.slice(); revSel = []; doAct({ k: 'revTake', iids: l }); return; }
  if (t.closest('[data-rvinfo]')) { const pd = V.pending, id = t.closest('[data-rvinfo]').dataset.rvinfo, c = pd && pd.x && pd.x.cards.find(c => c.iid === id); if (c) { showSheet(detailHTML({ iid: c.iid, def: c.def, cores: [], tapped: false }) + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>', COLOR_HEX[c.def.color]); $('sheet').style.zIndex = 80; } return; }
  if (t.closest('[data-rvret]')) { doAct({ k: 'revTake', iids: [], top: t.closest('[data-rvret]').dataset.rvret === 'top' }); return; }
  if (t.closest('[data-rvnone]')) { doAct({ k: 'revTake', iid: null }); return; }
  if (t.closest('[data-rvreset]')) { revOrd = []; renderRev(); doAct({ k: 'revLive', order: [] }); return; }
  if (t.closest('[data-rvok]')) { const o = revOrd.slice(); revOrd = []; doAct({ k: 'revOrder', order: o }); return; }
  if (t.closest('[data-rv]')) {
    const pd = V.pending, id = t.closest('[data-rv]').dataset.rv;
    if (!pd || pd.kind !== 'reveal' || pd.pi !== V.me) return;
    if (pd.x.phase === 'pick' && !pd.x.cands.includes(id)) { const c = pd.x.cards.find(c => c.iid === id); if (c) { showSheet(detailHTML({ iid: c.iid, def: c.def, cores: [], tapped: false }) + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>', COLOR_HEX[c.def.color]); $('sheet').style.zIndex = 80; } return; }
    if (pd.x.phase === 'pick') { if (pd.x.cands.includes(id)) { if ((pd.x.takeN || 1) > 1) { const tn = Math.min(pd.x.takeN, pd.x.cands.length); if (revSel.includes(id)) revSel = revSel.filter(i => i !== id); else { if (revSel.length >= tn) revSel.shift(); revSel.push(id); } renderRev(); } else doAct({ k: 'revTake', iid: id }); } }
    else if (pd.x.restIds.includes(id) && !revOrd.includes(id)) { revOrd.push(id); renderRev(); doAct({ k: 'revLive', order: revOrd.slice() }); }
    return;
  }
  if (t.closest('[data-csel]') && V.pending && V.pending.kind === 'coreSel') { const id = t.closest('[data-csel]').dataset.csel; if (pickSel.has(id)) pickSel.delete(id); else { if (pickSel.size >= V.pending.n) pickSel.delete([...pickSel][0]); pickSel.add(id); } render(); return; }
  if (t.closest('[data-cskeep]') && V.pending && V.pending.kind === 'coreSel') {
    const pd = V.pending, keepSoul = t.closest('[data-cskeep]').dataset.cskeep === 'soul', cs = pd.x.cores;
    const order = cs.filter(c => keepSoul ? !c.soul : c.soul).concat(cs.filter(c => keepSoul ? c.soul : !c.soul));   // 残さない方を先に取り除く
    pickSel = new Set(order.slice(0, pd.n).map(c => c.id)); render(); return;
  }
  if (t.closest('[data-csok]') && V.pending && V.pending.kind === 'coreSel') { const ids = [...pickSel]; pickSel.clear(); doAct({ k: 'coreSel', ids }); return; }
  if (t.closest('[data-sumskip]')) { doAct({ k: 'sumSkip' }); return; }
  if (t.closest('[data-pickc]')) { const i = t.closest('[data-pickc]').dataset.pickc; if (V.pending && V.pending.kind === 'sumPay') startPay(i);
    else if (V.pending && (V.pending.kind === 'recover' || V.pending.kind === 'costDiscard' || V.pending.kind === 'handPick')) { const nn = Math.min(V.pending.n, V.pending.cands.length); if (pickSel.has(i)) pickSel.delete(i); else { if (pickSel.size >= nn) pickSel.delete([...pickSel][0]); pickSel.add(i); } render(); }
    else doAct({ k: 'choose', iids: [i] }); return; }
  if (t.closest('[data-pcolor]')) { doAct({ k: 'choose', iids: [t.closest('[data-pcolor]').dataset.pcolor] }); return; }
  { const py = t.closest('[data-pyes]'); if (py) { pickSel.clear(); sel.clear(); doAct({ k: 'choose', iids: [py.dataset.pyes] }); return; } }
  if (t.closest('[data-pnone]')) { pickSel.clear(); sel.clear(); doAct({ k: 'choose', iids: [] }); return; }
  if (t.closest('[data-pchoose]')) { const ids = [...pickSel]; if (!ids.length && V.pending && V.pending.altFree) ids.push(V.pending.cands[0]); const pd0 = V.pending, py = pd0 && (pd0.camo || pd0.place) ? [...sel] : []; pickSel.clear(); sel.clear(); doAct({ k: 'choose', iids: ids, alt: !!t.closest('[data-pchoose]').dataset.alt, pay: py }); return; }
  const prm = t.closest('[data-prm]');
  if (prm && pay) { pay.pay.delete(prm.dataset.prm); pay.place.delete(prm.dataset.prm); render(); return; }
  if (t.closest('[data-lifem]')) { doAct({ k: 'setLifeManual', v: !V.lifeManual }); return; }
  if (t.closest('[data-draw]')) { doAct({ k: 'draw', n: 1 }); return; }
  if (t.closest('[data-addcore]')) { doAct({ k: 'addCore' }); return; }
  if (t.closest('[data-deck]')) { openDeck(); return; }
  { const dm = t.closest('[data-dmode]'); if (dm) { deckAll = dm.dataset.dmode === '1'; openDeck(); return; } }
  if (t.closest('[data-switch]')) { viewer = 1 - viewer; sel.clear(); pay = null; pushState(); return; }
  const lm = t.closest('[data-lmode]');
  if (lm) { listMode = lm.dataset.lmode; openList(lm.dataset.lwho === '1', lm.dataset.lzone); return; }
  const lk = t.closest('[data-list]');
  if (lk) { openList(lk.dataset.own === '1', lk.dataset.list); return; }
  const card = t.closest('[data-card]');
  if (card) {
    if (card.dataset.zone === 'deck') { openDeckCard(card.dataset.card); return; }
    if (pay) { if (t.closest('#mat')) cancelPay(); return; }
    const cid = card.dataset.card;
    if (glowOf(cid)) {
      if (V.usable.hand.includes(cid) && card.dataset.zone === 'hand') { startPay(cid); return; }
      const pdn = V.pending && V.pending.pi === V.me ? Math.min(V.pending.n, V.pending.cands.length) : 0;
      if (pdn || V.usable.block.includes(cid)) {
        if (pickSel.has(cid)) pickSel.delete(cid); else { if (!pdn) pickSel.clear(); if (pdn && pickSel.size >= pdn) pickSel.delete([...pickSel][0]); pickSel.add(cid); }
        render(); return;
      }
    }
    if (sel.size && !camoMode() && card.dataset.own === '1' && card.dataset.zone === 'field') { moveCoresGuarded([...sel], { zone: 'card', iid: card.dataset.card }); sel.clear(); return; }
    openCard(card.dataset.card); return;
  }
  if (pay && t.closest('#mat') && !t.closest('[data-dest]')) { cancelPay(); return; }
  const dest = t.closest('[data-dest]');
  if (dest && sel.size && !camoMode()) { moveCoresGuarded([...sel], { zone: dest.dataset.dest }); sel.clear(); return; }
}
/* スマホ: 指を離した時点で、押したカード/コアと同じものの上なら、その場でタップとして処理する
   (画面が更新されて押した部品が作り直されると、クリックが出ずに反応しないことがあるため) */
let tapD = null, lastTapT = -1e9;
const tapKey = el => el ? (el.dataset.card || el.dataset.core || ('cc:' + el.dataset.cc + ':' + (el.dataset.loc || ''))) : null;
document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) { tapD = null; return; } const el = e.target.closest && e.target.closest('[data-card],[data-cc],[data-core]'); tapD = el ? { k: tapKey(el), x: e.clientX, y: e.clientY, t: e.timeStamp, moved: false } : null; }, true);
document.addEventListener('pointermove', e => { if (tapD && Math.hypot(e.clientX - tapD.x, e.clientY - tapD.y) > 9) tapD.moved = true; }, true);
document.addEventListener('pointerup', e => {
  const d = tapD; tapD = null;
  if (!d || d.moved || e.timeStamp - d.t > 700 || document.body.classList.contains('dragging') || !V || !$('sheet').hidden) return;
  const el = e.target.closest && e.target.closest('[data-card],[data-cc],[data-core]');
  if (!el || tapKey(el) !== d.k) return;
  lastTapT = e.timeStamp;
  const cleared = clearOnOutside(e.target); handleClick(e.target); if (cleared) render();
}, true);
document.addEventListener('click', e => {
  if (e.timeStamp - lastTapT < 700) return;   // 直前に指を離した時点で処理済み
  // ドロップの直後(30ms以内)に出るクリックは、ドラッグ操作そのものが生むものなので無視する
  if (dragEndT >= 0 && e.timeStamp - dragEndT < 30) { dragEndT = -1; return; }
  const cleared = clearOnOutside(e.target);
  handleClick(e.target);
  if (cleared) render();
});
addEventListener('scroll', () => { if (document.body.classList.contains('ingame') && innerWidth >= 900 && matchMedia('(hover:hover)').matches && (scrollX || scrollY)) scrollTo(0, 0); }, { passive: true });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('sheet').hidden) { hideSheet(); return; }
  if (pay) { cancelPay(); return; }
  if (sel.size) { sel.clear(); render(); }
});

/* --- ドラッグ&ドロップ(マウス・タッチ共通) --- */
// 手札のカード → 自分の盤面で「召喚・使用」/ トラッシュへ
// コア → 自分のリザーブ・トラッシュ・ボイド・場のカード(ライフには置けない)
// 場のカード → トラッシュ / 手札へ
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('pointerdown', e => {
  if (!V || V.spec || !$('sheet').hidden || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const el = e.target.closest('[data-card],[data-cc],[data-core]');
  if (!el || el.dataset.own !== '1') return;
  let d = null;
  if (pay) {
    if (el.dataset.card) return;
    d = { kind: 'paycore', loc: el.dataset.loc || el.dataset.cc, soulId: el.dataset.core || null, soul: !!el.dataset.soul };
  } else if (el.dataset.card) {
    const z = el.dataset.zone; if (z !== 'hand' && z !== 'field') return;
    if (z === 'field' && !V.test) return;
    if (z === 'hand' && !V.test && !canHandNow()) return;
    d = { kind: z, iid: el.dataset.card };
  } else if ((el.dataset.core || el.dataset.cc) && V.pending && V.pending.place && V.pending.pi === V.me) {
    // ネクサスをスピリット化する: コアをネクサスへドラッグして置く
    const ids = el.dataset.core ? [el.dataset.core] : coresAt(el.dataset.cc).filter(c => !c.soul && !sel.has(c.id)).slice(0, 1).map(c => c.id);
    if (!ids.length) return;
    d = { kind: 'placecore', ids, loc: el.dataset.loc || el.dataset.cc || '' };
  } else if (el.dataset.core) {
    if (!canMoveCores()) return;
    const id = el.dataset.core;
    d = { kind: 'core', ids: sel.has(id) ? [...sel] : [id], single: 'soul' };
  } else {
    if (!canMoveCores()) return;
    const list = coresAt(el.dataset.cc).filter(c => !c.soul);
    if (!list.length) return;
    const hit = sel.size && list.some(c => sel.has(c.id));
    d = { kind: 'core', ids: hit ? [...sel] : [list[0].id] };
  }
  Object.assign(d, { el, sx: e.clientX, sy: e.clientY, started: false, ghost: null, hot: null, marks: [] });
  drag = d;
});
function canHandNow() {
  if (!V || V.winner != null || V.mull || V.pick) return false;
  if (V.pending) return V.pending.pi === V.me && !!V.pending.hand;
  if (V.battle) return (V.battle.phase === 'flash1' || V.battle.phase === 'flash2') && V.battle.prio === V.me;
  return V.turn === V.me && (V.step === 'main' || V.step === 'main2');
}
function dragTargets(d) {
  if (d.kind === 'paycore') return [...document.querySelectorAll('[data-pzone]')];
  if (d.kind === 'placecore') return [...document.querySelectorAll('#me [data-card]')].filter(el => V.pending && V.pending.cands.includes(el.dataset.card));
  if (d.kind === 'core') return [...document.querySelectorAll('#me [data-dest],#me [data-slot]')];
  if (d.kind === 'hand') return [...document.querySelectorAll(V.test ? '#me .field,#me .trash' : '#me .field')];
  return [...document.querySelectorAll('#me .trash,#hand')];
}
function targetAt(x, y, d) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (!el.closest) continue;
    if (d.kind === 'paycore') { const z = el.closest('[data-pzone]'); if (z) return { type: 'pz', b: z.dataset.pzone, el: z }; continue; }
    if (d.kind === 'placecore') { const c = el.closest('#me [data-card]'); if (c && V.pending && V.pending.cands.includes(c.dataset.card)) return { type: 'pnx', iid: c.dataset.card, el: c }; const s2 = el.closest('#me [data-slot]'); if (s2 && V.pending && V.pending.cands.includes(s2.dataset.slot)) return { type: 'pnx', iid: s2.dataset.slot, el: s2.querySelector('.card') || s2 }; continue; }
    if (d.kind === 'core') {
      const z = el.closest('#me [data-dest]'); if (z) return { type: 'zone', zone: z.dataset.dest, el: z };
      const s = el.closest('#me [data-slot]'); if (s) return { type: 'card', iid: s.dataset.slot, el: s.querySelector('.card') || s };
      const nd = el.closest('#me [data-nodrop]'); if (nd) return { type: 'nodrop', el: nd };
    } else {
      const tr = el.closest('#me .trash'); if (tr) return { type: 'trash', el: tr };
      if (d.kind === 'hand' && el.closest('#me')) return { type: 'cast', el: $('me').querySelector('.field') };
      if (d.kind === 'field' && el.closest('#hand')) return { type: 'hand', el: $('hand') };
    }
  }
  return null;
}
function startDrag(d) {
  d.started = true;
  const g = document.createElement('div'); g.className = 'ghost';
  if (d.kind === 'paycore') {
    g.innerHTML = '<span class="' + (d.soul ? 'core' : 'cc') + '">' + (d.soul ? '★' : '1') + '</span>';
  } else if (d.kind === 'placecore') {
    g.innerHTML = '<span class="cc">' + d.ids.length + '</span>';
  } else if (d.kind === 'core') {
    const soul = d.ids.length === 1 && d.el.dataset.soul;
    g.innerHTML = '<span class="' + (soul ? 'core' : 'cc') + '">' + (soul ? '★' : d.ids.length) + '</span>';
  } else { const c = d.el.cloneNode(true); c.style.transform = 'none'; c.style.position = 'relative'; g.appendChild(c); }
  document.body.appendChild(g); d.ghost = g;
  document.body.classList.add('dragging');
  d.marks = dragTargets(d); d.marks.forEach(m => m.classList.add('tgt'));
}
function endDrag(d) {
  if (d.ghost) d.ghost.remove();
  document.body.classList.remove('dragging');
  d.marks.forEach(m => m.classList.remove('tgt', 'hot'));
}
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const d = drag;
  if (!d.started) {
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.hypot(dx, dy) < 7) return;
    // 手札を指で横になぞったときは、手札の横スクロールとして扱う(上下に動かしたときだけドラッグ)
    if (d.kind === 'hand' && e.pointerType !== 'mouse' && Math.abs(dx) > Math.abs(dy) * 1.2) d.scrolling = true;
    if (!d.scrolling) startDrag(d);
  }
  if (d.scrolling) { const hr = document.querySelector('.handrow'); if (hr) { hr.scrollLeft -= e.clientX - (d.lx === undefined ? d.sx : d.lx); } d.lx = e.clientX; return; }
  d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
  const t = targetAt(e.clientX, e.clientY, d);
  d.marks.forEach(m => m.classList.remove('hot'));
  if (t && t.type !== 'nodrop' && t.el) t.el.classList.add('hot');
});
document.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.started) { if (d.scrolling) dragEndT = e.timeStamp; return; }
  const t = targetAt(e.clientX, e.clientY, d);
  endDrag(d);
  dragEndT = e.timeStamp;
  if (!t) return;
  if (d.kind === 'placecore') { if (t.type === 'pnx' && V.pending) { pickSel.clear(); pickSel.add(t.iid); d.ids.forEach(id => sel.add(id)); render(); } }
  else if (d.kind === 'paycore') { if (t.type === 'pz') payAdd(t.b, d.loc, d.soulId); }
  else if (d.kind === 'core') {
    if (t.type === 'nodrop') { return; }
    moveCoresGuarded(d.ids, t.type === 'zone' ? { zone: t.zone } : { zone: 'card', iid: t.iid });
    sel.clear(); render();
  } else if (d.kind === 'hand') {
    if (t.type === 'cast') startPay(d.iid); else if (t.type === 'trash') doAct({ k: 'moveCard', iid: d.iid, to: 'trash' });
  } else {
    if (t.type === 'trash') doAct({ k: 'moveCard', iid: d.iid, to: 'trash' }); else if (t.type === 'hand') doAct({ k: 'moveCard', iid: d.iid, to: 'hand' });
  }
});
document.addEventListener('pointercancel', () => { if (drag) { const d = drag; drag = null; if (d.started) endDrag(d); } });
{ const upd = () => { const r = document.documentElement.style; r.setProperty('--sideh', ($('side').offsetHeight + 4) + 'px'); r.setProperty('--handh', ($('hand').offsetHeight + 6) + 'px'); };
  if (window.ResizeObserver) { const ro = new ResizeObserver(upd); ro.observe($('side')); ro.observe($('hand')); } }
/* 開発者モード(パスは gateopen。ソースコードは公開されているので、鍵としては飾りです) */
const APP_VER = 'v37.2.0 (2026/11/20)';
{ const v = document.createElement('div'); v.id = 'appver'; v.textContent = 'ver ' + APP_VER; document.body.appendChild(v); }
const DEV_PASS = 'gateopen';
let DEV = false;
function setDev(on) { DEV = on; document.body.classList.toggle('dev', on); $('devOff').hidden = on; $('devOn').hidden = !on; try { localStorage.setItem('bs-dev', on ? '1' : ''); } catch (e) { } }
$('devGo').onclick = () => { if ($('devPass').value === DEV_PASS) { $('devPass').value = ''; setDev(true); } else { $('devPass').value = ''; $('devPass').placeholder = '違います'; } };
$('devPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('devGo').click(); });
