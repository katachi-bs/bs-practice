// 支払いポップ上のコア(★/●)をドラッグして、別の枠へ移す・枠の中のコアと入れ替える
let tokDragged = false;
document.addEventListener('pointerdown', e => {
  const tk = e.target.closest && e.target.closest('.tok[data-prm]'); if (!tk || !pay || e.button > 0) return;
  const id = tk.dataset.prm, sx = e.clientX, sy = e.clientY; let g = null;
  const mv = ev => { if (!g && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { g = tk.cloneNode(true); g.classList.add('tokghost'); document.body.appendChild(g); tk.style.opacity = '.3'; } if (g) { g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px'; ev.preventDefault(); } };
  const up = ev => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
    if (!g) return; g.remove(); tokDragged = true; setTimeout(() => { tokDragged = false; }, 60); tk.style.opacity = '';
    const el = document.elementFromPoint(ev.clientX, ev.clientY), t2 = el && el.closest('.tok[data-prm]'), zn = el && el.closest('[data-pzone]');
    const st = payState(); if (!st) return; const A = pay.pay.has(id) ? 'pay' : pay.place.has(id) ? 'place' : null; if (!A) return;
    if (t2 && t2.dataset.prm !== id) { const id2 = t2.dataset.prm, B = pay.pay.has(id2) ? 'pay' : 'place'; if (A !== B) { pay[A].delete(id); pay[B].delete(id2); pay[A].add(id2); pay[B].add(id); } }
    else if (zn) { const B = zn.dataset.pzone; if (B !== A && !(B === 'place' && st.d.type === 'magic')) { payRoom(st, B, id); pay[A].delete(id); pay[B].add(id); } }
    render();
  };
  document.addEventListener('pointermove', mv, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
});
document.addEventListener('click', e => { if (tokDragged && e.target.closest && e.target.closest('[data-prm]')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
// 支払いの枠が満杯のときは、1つ外して入れ替える(選び直しやすくする)
function payRoom(st, b, id) {
  const mine = pay[b];
  if (b === 'pay' && !st.info.soul && st.need > 0 && !mine.has(id) && mine.size >= st.need) {
    const all = allCores(V.you), soulOf = x => { const c = all.find(y => y.id === x); return !!(c && c.soul); };
    const rm = [...mine].reverse().find(x => !soulOf(x)) || [...mine].reverse()[0]; if (rm) mine.delete(rm);
  }
}
// ドラッグで、コアを「支払い」「置く」の枠へ入れる
function payAdd(b, loc, soulId) {
  const st = payState(); if (!st) return;
  if (b === 'place' && st.d.type === 'magic') return;
  const okLoc = loc === 'reserve' || loc.indexOf('card:') === 0;
  if (!okLoc) { return; }
  if (b === 'pay' && st.info.soul && !soulId) { return; }
  const other = b === 'pay' ? pay.place : pay.pay, mine = pay[b];
  let id = soulId;
  if (!id) { const c = coresAt(loc).find(c => !c.soul && !mine.has(c.id) && !other.has(c.id)); if (!c) { return; } id = c.id; }
  payRoom(st, b, id);
  other.delete(id); mine.add(id); pay.bucket = b; render();
}
// 「ソウルコアで支払う」のON/OFF(支払いの1個をソウルコアに替える/戻す)
// 「置くコア」をレベルのボタンで選ぶ: 1=レベル1 / 2=レベル2(通常コア) / s=真界放(ソウルコア1個)。支払いに選んだコアは使わない
function plvOf(d) { const L = d.levels || []; return { l1: L[0] ? L[0].core : 0, l2: L[1] ? L[1].core : 0, shin: (d.keywords || []).includes('shinkai') && L.length > 1 }; }
function plvActive(st) {
  const cores = allCores(V.you), soul = [...pay.place].some(id => { const c = cores.find(x => x.id === id); return c && c.soul; }), v = plvOf(st.d);
  if (soul && v.shin) return 's';
  if (v.l2 && pay.place.size >= v.l2) return '2';
  return '1';
}
// 手持ち(リザーブ+場)のコアの数: 通常コア N / ソウルコア S。レベルのボタンが押せるかの判定に使う
const usableCores = () => [...V.you.reserve, ...V.you.field.flatMap(k => k.cores)];   // 支払い・配置に使えるコア(リザーブ+場)
function plvFeasible(st, m) {
  const v = plvOf(st.d), all = usableCores(), S = all.filter(c => c.soul).length, N = all.length - S, need = st.need;
  if (m === 's') return v.shin && S >= 1 && N >= need;
  if (m === '2') return v.l2 > 0 && N - (need - Math.min(S, need)) >= Math.max(st.minPlace, v.l2);
  return N + S >= need + st.minPlace;
}
function setPlaceLv(m) {
  const st = payState(); if (!st || st.d.type === 'magic') return;
  if (!plvFeasible(st, m)) { toast(m === 's' ? '真界放にするソウルコアか、支払うコアが足りません' : 'コアが足りないため、このレベルでは置けません'); return; }
  const v = plvOf(st.d), R = V.you.reserve, all = usableCores(), isSoul = id => { const c = all.find(x => x.id === id); return !!(c && c.soul); };
  const normsOut = () => R.filter(c => !c.soul && !pay.pay.has(c.id) && !pay.place.has(c.id)).concat(pickFieldCores(99, new Set([...pay.pay, ...pay.place]), false));
  const soulOut = () => R.concat(all.filter(c => !R.includes(c))).find(c => c.soul && !pay.pay.has(c.id) && !pay.place.has(c.id));
  pay.place = new Set();
  if (m === 's') {
    // ソウルコアを置くので、支払いにソウルコアが入っていたら通常コアに入れ替える
    const sp = [...pay.pay].find(isSoul);
    if (sp) { pay.pay.delete(sp); const n = normsOut()[0]; if (n) pay.pay.add(n.id); }
    const sc = soulOut(); if (sc) pay.place.add(sc.id);
  } else {
    const n = m === '2' ? Math.max(st.minPlace, v.l2) : st.minPlace;
    const take = () => { const o = normsOut(); o.slice(0, n - pay.place.size).forEach(c => pay.place.add(c.id)); };
    take();
    if (m === '2' && pay.place.size < n && pay.pay.size > 0) {   // 通常コアが足りない: 支払いのコアをソウルコアに入れ替えて、通常コアを空ける
      const sc = soulOut(), np = [...pay.pay].find(id => !isSoul(id));
      if (sc && np) { pay.pay.delete(np); pay.pay.add(sc.id); take(); }
    }
    if (m === '1') while (pay.place.size < n) { const sc = soulOut(); if (!sc) break; pay.place.add(sc.id); }   // ソウルコアしか残っていないときは、ソウルコアを置く
  }
  pay.bucket = 'place'; render();
}
// ソウルコアを支払いに使ったあとも、置くコアが足りなくならないよう自動で用意する
function fillPlace() {
  const st = payState(); if (!st || st.d.type === 'magic') return;
  [...pay.place].forEach(id => { if (pay.pay.has(id)) pay.place.delete(id); });
  const need = st.minPlace - pay.place.size; if (need <= 0) return;
  const used = () => new Set([...pay.pay, ...pay.place]);
  V.you.reserve.filter(c => !c.soul && !used().has(c.id)).slice(0, need).forEach(c => pay.place.add(c.id));
  if (pay.place.size < st.minPlace) pickFieldCores(st.minPlace - pay.place.size, used(), false).forEach(c => pay.place.add(c.id));
  if (pay.place.size < st.minPlace) V.you.reserve.filter(c => c.soul && !used().has(c.id)).slice(0, st.minPlace - pay.place.size).forEach(c => pay.place.add(c.id));
}
function toggleSoulPay() {
  const st = payState(); if (!st || st.info.soul) return;
  const all = allCores(V.you), isSoul = id => { const c = all.find(x => x.id === id); return !!(c && c.soul); };
  const cur = [...pay.pay].find(isSoul);
  if (cur) {
    pay.pay.delete(cur);
    const n = V.you.reserve.find(c => !c.soul && !pay.pay.has(c.id) && !pay.place.has(c.id)); if (n) pay.pay.add(n.id);
  } else {
    const sc = V.you.reserve.find(c => c.soul) || V.you.field.flatMap(k => k.cores).find(c => c.soul);
    if (!sc) { return; }
    pay.place.delete(sc.id);
    if (st.need > 0 && pay.pay.size >= st.need) pay.pay.delete([...pay.pay].reverse()[0]);
    pay.pay.add(sc.id);
  }
  fillPlace();
  render();
}

/* --- 左の縦バー(ステップの流れ・操作) --- */
function logName(t) { return esc(t).replace(/「([^「」]+)」/g, (m, n) => '「<a class="cn" data-cname="' + n + '">' + n + '</a>」'); }
function logLine(l, plain) {
  if (l.turn && !plain) return '<div class="lt">━ ' + l.turn + 'ターン目 ' + (V.spec ? absName(l.p) + 'の番' : l.p === V.me ? 'あなたの番' : '相手の番') + ' ━</div>';
  return '<div>' + (l.p < 0 ? '' : pn(l.p) + ': ') + logName(l.m) + '</div>';
}
function openByName(n) {
  let d = null;
  [V.you, V.opp].forEach(P => ['hand', 'field', 'trash', 'removed'].forEach(z => (P[z] || []).forEach(k => { if (!d && k.def.name === n) d = k.def; })));
  if (!d) { const c = CARD_LIST.find(c => c.def.name === n); if (c) d = c.def; }
  if (!d) return;
  sheetActs = []; showSheet(detailHTML({ def: d, cores: [], tapped: false, iid: '' }) + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>', COLOR_HEX[d.color]);
}
function ctlHTML() {
  const my = V.turn === V.me, curS = animStep || V.step, idx = STEPS.indexOf(curS);
  const stepsHTML = '<div class="vsteps">' + STEPS.map((s, i) => '<div class="vs' + (i === idx ? ' on' : i < idx ? ' done' : '') + (V.noAttack && (s === 'attack' || s === 'main2') ? ' skip' : '') + '"><span class="n">' + STEP_NUM[s] + '</span>' + STEP_SHORT[s] + (V.noAttack && (s === 'attack' || s === 'main2') ? '(省略)' : '') + (i === idx ? '<span class="ar">◀</span>' : '') + '</div>').join('') +
    '<div class="vs nxt">↓ ' + (my ? pn(1 - V.me) : 'あなた') + 'のターンへ</div>' +
    (my && !(V.battle || V.pending || V.mull || V.pick || V.winner != null || (!V.pause && PACE_STEPS.includes(V.step))) && !pay ? '<button class="endtop" data-next="1">' + STEP_SHORT[V.step] + '終了 ▶</button>' : '') + '</div>';
  const head = vsLine() + '<div class="turnbox"><b>' + V.turnNo + 'ターン目</b><span class="who">' + (my ? 'あなたの番' : pn(1 - V.me) + 'の番') + '</span></div>' + (pay ? stepsHTML.replace('class="vsteps"', 'class="vsteps pv2"') : '') + '<button class="sub sidetog" data-sidetog="1">' + (sideOpen ? '▲' : '▼') + '</button>';
  const warns = (V.noAttack ? '<div class="tag">先攻1ターン目: アタック不可</div>' : '') +
    '';
  const menuBtns = '<button class="sub" data-menu="1">' + (menuOpen ? '▲ メニュー' : '⚙ メニュー') + '</button><button class="sub" data-log="1">📜 ログ' + (logOpen ? ' ▲' : '') + '</button><button class="sub stampb" data-stampbtn="1" title="スタンプ">😃</button>';
  const menuBtns1 = '<button class="sub" data-menu="1">' + (menuOpen ? '▲メニュー' : 'メニュー') + '</button><button class="sub" data-log="1">ログ' + (logOpen ? '▲' : '') + '</button><button class="sub stampb" data-stampbtn="1" title="スタンプ">😃</button>';
  const undoBtn = V.undoPlay ? '<button class="sub undo" data-undoplay="1">↩ ' + esc(V.undoPlay) + '</button>' : '';
  const menuRow = '<div class="row">' + menuBtns + '</div>' + (logOpen ? '<div class="inlog">' + V.log.slice().reverse().map(l => logLine(l)).join('') + '</div>' : '') +
    // ソロ・テスト用のボタンはメニューの中に隠しておく
    (menuOpen ? '<div class="menu">' + undoBtn + '<button class="sub" data-pause="1">自動で進めない：' + (V.pause ? 'ON' : 'OFF') + '</button>' +
      '<button class="sub" data-home="1">ホームに戻る</button>' + ((ROSTER.sp || []).length ? '<button class="sub" data-roster="1">👁 観戦者 ' + ROSTER.sp.length + '人</button>' : '') + (solo ? '<button class="sub" data-stepback="1">◀ ステップを戻す(ソロ)</button>' : '') +
      (V.test ? '<button class="sub" data-lifem="1">ライフの手動操作: ' + (V.lifeManual ? 'ON' : 'OFF') + '</button>' : '') + (V.test ? '<button class="sub" data-deck="1">デッキ(テスト)</button>' : '') + (solo ? '<button class="sub" data-switch="1">視点切替</button>' : '') + '</div>' : '');
  // 支払い中は、ステップ一覧を1行に畳んで支払いパネルを上に出す(決定ボタンが必ず見える)
  if (pay) return head + '<div class="curstep">' + STEP_NUM[V.step] + ' ' + STEP_JP[V.step] + 'ステップ中</div><div class="note">コストの支払い中です。ポップアップは手札の位置に出ています。</div>' + menuRow;
  let h = head + warns;
  h += stepsHTML;
  if (animStep) h += '<div class="ticker">▶ ' + esc(animMsg) + '</div>';
  const busy = !!(V.battle || V.pending || V.mull || V.pick || V.winner != null || (!V.pause && PACE_STEPS.includes(V.step)));
  h += '<button class="big" data-next="1"' + (my && !busy ? '' : ' disabled') + '>' + STEP_JP[V.step] + 'ステップを終了</button>';
  h += '<div class="row r1">' + (V.test ? '<button class="sub" data-draw="1">ドロー</button><button class="sub" data-addcore="1">コア+1</button>' : '') + menuBtns1 + '</div>';
  if (sel.size) h += '<div class="note" style="color:var(--ok)"><b>コア' + sel.size + '個を選択中</b> 移動先をタップ(他をクリックで解除)</div>';
  h += menuRow.replace(/^<div class="row">.*?<\/div>/, '');
  const last = V.log[V.log.length - 1];
  h += '<div class="lastlog">' + (last ? logLine(last, 1) : '') + '</div>';
  return h;
}
const SYMI = '<i class="symi"></i>', SOULI = '<i class="souli"></i>';
const SYMP = '<i class="symp"></i>', SYMG = '<i class="symg"></i>', SYMW = '<i class="symw"></i>', SYMY = '<i class="symy"></i>', SYMB = '<i class="symb"></i>';
const rich = t => String(t).replace(/\[青\]/g, SYMB).replace(/青シンボル/g, SYMB + 'シンボル').replace(/\[黄\]/g, SYMY).replace(/黄シンボル/g, SYMY + 'シンボル').replace(/\[白\]/g, SYMW).replace(/白シンボル/g, SYMW + 'シンボル').replace(/\[緑\]/g, SYMG).replace(/緑シンボル/g, SYMG + 'シンボル').replace(/\[紫\]/g, SYMP).replace(/紫シンボル/g, SYMP + 'シンボル').replace(/\[赤\]/g, SYMI).replace(/赤シンボル/g, SYMI + 'シンボル').replace(/\[ソウルコア\]/g, SOULI);
const COLOR_JP = { red: '赤', blue: '青', green: '緑', yellow: '黄', purple: '紫', white: '白' };
// シンボル表記: EXも1個として数え、EXを持つ場合は<EX>を添える(例: 赤<EX> / 赤×2<EX>)
function symLabel(d) { const n = d.symbols.normal + (d.symbols.ex ? 1 : 0); return n ? ' / シンボル: ' + (d.color === 'red' ? SYMI : d.color === 'purple' ? SYMP : d.color === 'green' ? SYMG : d.color === 'white' ? SYMW : d.color === 'yellow' ? SYMY : d.color === 'blue' ? SYMB : (COLOR_JP[d.color] || esc(d.color))) + (n > 1 ? '×' + n : '') + (d.symbols.ex ? '&lt;EX&gt;' : '') : ''; }
const effHead = (e, d) => {
  const t = e.timing, l0 = t.limit === 'turn' ? 'ターン1回' : t.limit === 'battle' ? 'バトル1回' : '', lim = t.nodup || l0 ? '〔' + [t.nodup ? '重複不可' : '', l0].filter(Boolean).join('・') + '〕' : '';
  let main;
  if (t.kind === 'keyword' && KW_JP[e.keyword] === '') main = '';
  else if (t.kind === 'keyword') main = e.keyword === 'soulmagic' && d && d.color ? '《ソウルマジック:[' + (COLOR_JP[d.color] || '赤') + ']》' : e.keyword === 'camo' ? '【迷彩：' + ((e.ops && e.ops[0] && e.ops[0].n) || 1) + '】' : '《' + (KW_JP[e.keyword] || e.keyword) + '》';
  else if (t.label) main = t.nodup && !t.label.includes('重複不可') ? t.label + lim : t.label;
  else { const tl = timingLabel(t); main = (tl ? '『' + tl + '』' : '') + (t.kind === 'trigger' || t.kind === 'static' ? lim : ''); }
  return [lvLabel(e.levels), e.shinkai ? '《真界放》' : '', e.keyword && KW_JP[e.keyword] !== '' && t.kind !== 'keyword' && t.kind !== 'text' && t.kind !== 'ability' ? '【' + (KW_JP[e.keyword] || e.keyword) + '】' : '', main].filter(Boolean).join(' ');
};
// 効果の一覧表示: 本文が空の「ブロック時」などは、直前の同じ効果(アタック時)とまとめて「アタック/ブロック時」と表示する
let pdropK = '', pdropT = 0;
function pdropOn(pd) { const nk = pd && pd.x && pd.x.newIds && pd.x.newIds.length ? pd.name + pd.x.newIds.join() : ''; if (nk !== pdropK) { pdropK = nk; pdropT = Date.now(); } return !!nk && Date.now() - pdropT < 1100; }
const effBody = (e, head) => { const m = /^〔[^〕]*〕\n/.exec(e.text || ''); return m && head.includes(m[0].trim()) ? e.text.slice(m[0].length) : (e.text || ''); };
function effShow(d) {
  const out = [];
  d.effects.forEach((e, ei) => {
    const prev = out[out.length - 1];
    if (!e.text && prev && JSON.stringify(prev.e.ops) === JSON.stringify(e.ops) && JSON.stringify(prev.e.levels) === JSON.stringify(e.levels)) {
      const pe = prev.e.timing.event, ne = e.timing.event;
      if ((pe === 'attack' && ne === 'block') || (pe === 'allyAttack' && ne === 'allyBlock')) prev.head = effHead(prev.e, d).replace('アタック', 'アタック/ブロック');
      return;
    }
    if (!e.text && e.timing.kind !== 'keyword' && prev) return;   // 本文のない補助的な効果は表示しない
    out.push({ e, ei, head: effHead(e, d) });
  });
  return out;
}
function effectsPlain(d) {
  if (hasNoEffect(d)) return '';
  if (!d.effects.length) return '<div class="txt">' + esc(d.text || '').replace(/\n/g, '<br>') + '</div>';
  return '<div class="txt">' + effShow(d).map(x => '<div style="margin-bottom:5px"><b>' + rich(esc(x.head)) + '</b><br>' + rich(esc(effBody(x.e, x.head)).replace(/\n/g, '<br>')) + '</div>').join('') + '</div>';
}
const glowOf = iid => !pay && !!((V.usable && ((V.usable.abil || []).some(x => x.startsWith(iid + ':')) || V.usable.hand.includes(iid) || V.usable.block.includes(iid) || V.usable.attack.includes(iid))) || (V.pending && V.pending.pi === V.me && V.pending.cands.includes(iid)));
const fieldK = iid => V.you.field.find(k => k.iid === iid) || V.opp.field.find(k => k.iid === iid);
function promptHTML() {
  const R = (t, mine, b, low) => ({ t, mine: !!mine, b: b || '', low: !!low });
  if (V.winner != null) { const dk = V.loseWhy === 'deck'; return R('<b class="hl">' + (V.winner === V.me ? 'あなたの勝ちです!' + (dk ? '(相手がデッキ切れでドローできず)' : '') : '相手の勝ちです' + (dk ? '(あなたがデッキ切れでドローできず)' : '')) + '</b>', true); }
  if (V.pick) {
    if (V.pick.pi !== V.me) return R('相手が先攻・後攻を選んでいます…', false);
    return R('<b class="hl">先攻・後攻を選んでください</b>', true,
      '<div class="row2"><button data-first="1">先攻</button><button class="sec" data-first="0">後攻</button></div>');
  }
  if (V.mull) {
    if (V.mull.pi !== V.me) return R('相手がマリガンするか選んでいます…', false);
    return R('<b class="hl">マリガン: 手札を全て入れ替えますか?</b><span class="fl">' + (V.me === V.turn ? 'あなたは先攻です' : 'あなたは後攻です') + '</span>', true,
      '<div class="row2"><button data-mull="1">マリガン</button><button class="sec" data-mull="0">キープ</button></div>');
  }
  const b = V.battle, pd = V.pending;
  if (pd) {
    if (pd.kind === 'reveal') return null;
    if (pd.pi !== V.me) return R('相手が「' + esc(pd.name) + '」の効果を処理しています…', false);
    const n = Math.min(pd.n, pd.cands.length), mv = pd.kind === 'moveCores';
    if (pd.kind === 'sumPay' || pd.kind === 'freeMagic' || pd.kind === 'recover' || pd.kind === 'costDiscard' || pd.kind === 'handPick') {
      const zone = pd.kind === 'freeMagic' || pd.kind === 'costDiscard' || pd.kind === 'handPick' || (pd.kind === 'sumPay' && pd.hand) ? 'hand' : 'trash', arr = (zone === 'hand' ? V.you[zone].filter(k => pd.cands.includes(k.iid)) : V.you[zone].filter(k => pd.cands.includes(k.iid)).slice().reverse()), nn = Math.min(pd.n, pd.cands.length);
      const ttl = pd.kind === 'sumPay' && pd.limbo ? '公開したカードを、カードをクリックして召喚/配置します(コストを支払います。しない場合は「発動しない」)' : pd.kind === 'sumPay' ? (pd.hand ? '手札から召喚するスピリットを選んでください(コストを支払います。しない場合は「発動しない」)' : 'トラッシュから召喚するスピリットを選んでください(条件に合うカードをすべて表示。コストを支払います)') : pd.kind === 'handPick' ? (pd.x.free ? '手札から、コストを支払わずに' + (pd.x.free.fc ? '召喚(Fチェンジ)' : '出す') + 'カードを選んでください(カードをタップして「決定」)' : pd.x.discard ? '破棄する手札を' + nn + '枚選んでください(カードをタップして「決定」)' : '手札の' + (pd.x.desc || '') + 'を' + nn + '枚まで選んで、相手に見せてデッキの下に戻します') : pd.kind === 'recover' ? (pd.field ? 'トラッシュから、コストを支払わずに配置するカードを' + nn + '枚選んでください(カードをタップして「決定」)' : 'トラッシュから手札に戻すカードを' + nn + '枚選んでください') : pd.kind === 'costDiscard' ? (pd.x.to === 'bottom' ? 'コスト: 相手に見せてデッキの下に戻す' : 'コスト: 破棄する') + (pd.x.desc || '') + '手札を' + nn + '枚選んでください' : '使用するマジックを選んでください(コストなし)';
      return R('<b class="hl">「' + esc(pd.name) + '」: ' + ttl + '</b>', true,
        '<div class="dh">⠿ ドラッグで移動できます</div><div class="lrow pickrow">' + arr.map(k => '<div class="pickc' + (pickSel.has(k.iid) ? ' on' : '') + (pdropOn(pd) && pd.x.newIds.includes(k.iid) ? ' pdrop' : '') + '" data-pickc="' + esc(k.iid) + '">' + (pickSel.has(k.iid) && nn > 1 ? '<span class="pnum">' + ([...pickSel].indexOf(k.iid) + 1) + '</span>' : '') + (pd.x && pd.x.newIds && pd.x.newIds.includes(k.iid) ? '<span class="pnew">いま引いた</span>' : '') + cardHTML(k, true, zone) + '</div>').join('') + '</div><div class="row2">' +
        (pd.kind === 'recover' || pd.kind === 'costDiscard' || pd.kind === 'handPick' ? '<button data-pchoose="1"' + ((pd.upto ? pickSel.size >= 1 : pickSel.size === nn) ? '' : ' disabled') + '>決定(' + pickSel.size + '/' + nn + ')</button>' + (nn > 1 ? '<button class="sec" data-pselreset="1"' + (pickSel.size || sel.size ? '' : ' disabled') + '>選びなおし</button>' : '') : '') +
        (pd.kind === 'handPick' ? (pd.opt ? '<button class="sec" data-pnone="1">' + (pd.x.free ? '出さない' : pd.x.discard ? '破棄しない' : '戻さない') + '</button>' : '') : pd.kind === 'costDiscard' ? '<button class="sec" data-pnone="1">やめる</button>' : pd.kind === 'recover' ? (pd.opt ? '<button class="sec" data-pnone="1">戻さない</button>' : '') : '<button class="sec" data-' + (pd.kind === 'sumPay' ? 'sumskip' : 'pnone') + '="1">' + (pd.kind === 'sumPay' ? '発動しない' : '使用しない') + '</button>') + '</div>', true);
    }
    if (pd.kind === 'colorPick') {
      const cn = { red: '赤', blue: '青', green: '緑', yellow: '黄', purple: '紫', white: '白' }, sy = { red: SYMI, green: SYMG, yellow: SYMY, purple: SYMP, white: SYMW, blue: SYMB };
      return R('<b class="hl">「' + esc(pd.name) + '」: 色を1色指定できます(このステップ中、BP' + pd.x.bpMax + '以下の相手のスピリットはその色のシンボル1つを失う)</b>', true,
        '<div class="row2" style="flex-wrap:wrap">' + pd.cands.map(c => '<button data-pcolor="' + c + '">' + sy[c] + cn[c] + '</button>').join('') + '</div><div class="row2"><button class="sec" data-pnone="1">指定しない</button></div>');
    }
    if (pd.kind === 'coreSel') {
      const cx = pd.x, key = cx.iid + ':' + cx.rem + ':' + cx.cores.map(c => c.id).join(',');
      if (csKey !== key) { csKey = key; pickSel.clear(); }
      const sn = pickSel.size;
      return R('<b class="hl">「' + esc(pd.name) + '」: 「' + esc(cx.sname) + '」のコアをリザーブに置きます。置くコアを' + pd.n + '個選んでください</b>', true,
        '<div class="dh">⠿ ドラッグで移動できます</div><div class="csinfo">コアをクリックして選択 → リザーブへ(選択中 ' + sn + '/' + pd.n + ')</div><div class="csrow">' +
        cx.cores.map(c => '<span class="cscore' + (c.soul ? ' soul' : '') + (pickSel.has(c.id) ? ' on' : '') + '" data-csel="' + esc(c.id) + '" title="' + (c.soul ? 'ソウルコア' : '通常のコア') + '"></span>').join('') + '</div>' +
        '<div class="row2"><button class="sec" data-cskeep="normal"><i class="cmini"></i>通常のコアを残す</button><button class="sec" data-cskeep="soul"><i class="cmini soul"></i>ソウルコアを残す</button></div>' +
        '<div class="row2"><button data-csok="1"' + (sn === pd.n ? '' : ' disabled') + '>決定</button>' + (pd.n > 1 ? '<button class="sec" data-pselreset="1"' + (pickSel.size || sel.size ? '' : ' disabled') + '>選びなおし</button>' : '') + '</div>', true);
    }
    if (pd.kind === 'order') return R('<b class="hl">エンドステップ効果: 使う順番を選んでください(1つずつ処理します)</b>', true,
      '<div class="dh">⠿ ドラッグで移動できます</div><div class="ordl">' + pd.x.opts.map(o => '<button class="sec ordb" data-orderpick="' + esc(o.id) + '"><b>' + esc(o.name) + '</b><small>' + esc(o.text).replace(/\n/g, ' ') + '</small></button>').join('') + '</div>', true);
    if (pd.kind === 'reveal') return null;
    if (pd.yn && !pd.camo && !pd.place) return R('<b class="hl">「' + esc(pd.name) + '」の効果を使いますか?</b>' + (pd.x && pd.x.q ? '<span class="fl">' + esc(pd.x.q) + '</span>' : ''), true, '<div class="row2"><button data-pyes="' + esc(pd.cands[0]) + '">使う</button><button class="sec" data-pnone="1">使わない</button></div>');
    const camoNeed = pd.camo ? [...pickSel].reduce((sm, i) => sm + (pd.camo[i] | 0), 0) : 0, camoOk = !pd.camo || sel.size === camoNeed;
    const camoBox = pd.camo ? '<div class="camoh ' + (camoOk ? 'ok' : '') + '"><b>迷彩</b> ' + Object.keys(pd.camo).map(i => { const k = V.opp.field.find(x => x.iid === i); return esc(k ? k.def.name : '?') + '(コア' + pd.camo[i] + '個)'; }).join('、') + '<br>' + (camoNeed ? '指定した迷彩のぶん、リザーブ/場のコアを<b>' + camoNeed + '個</b>タップで選んでください(トラッシュへ支払います)  選択中 ' + sel.size + '/' + camoNeed + (sel.size > camoNeed ? ' ※多すぎます' : '') : '迷彩のスピリットを指定する場合は、数だけコアを支払います') + '</div>' : '';
    const placeOk = !pd.place || (pickSel.size === 0 ? sel.size === 0 : sel.size >= pd.place.min);
    const placeBox = pd.place ? '<div class="camoh ' + (placeOk && pickSel.size ? 'ok' : '') + '"><b>コアを置く</b> 選んだネクサスに置くコアを、リザーブ/場のコアからタップで<b>' + pd.place.min + '個以上</b>選んでください(そのネクサスはスピリットとして扱います)  選択中 ' + sel.size + '個</div>' : '';
    const smT = pd.sumMax ? [...pickSel].reduce((sm, i) => { const k = V.opp.field.concat(V.you.field).find(x => x.iid === i); return sm + (k ? (pd.sumMax.k === 'cost' ? k.def.cost : (V.bps && V.bps[k.iid]) || 0) : 0); }, 0) : 0, smOk = !pd.sumMax || smT <= pd.sumMax.max;
    const okSel = ((pd.upto ? pickSel.size >= 1 : pickSel.size === n) || !!pd.altFree) && camoOk && placeOk && smOk;
    return R('<b class="hl">' + (mv ? '「' + esc(pd.name) + '」: コアを置く' + (pd.fam ? '「' + esc(pd.fam) + '」の' : '') + 'スピリットを選んでください' + (pd.opt ? '(任意)' : '') : '「' + esc(pd.name) + '」の対象を' + (pd.upto ? n + '体まで' : n + '体') + '選んでください' + (pd.why ? '(' + esc(pd.why) + ')' : '') + (pd.opt && !pd.upto ? '(任意)' : '') + (pd.sumMax ? ' 合計' + (pd.sumMax.k === 'cost' ? 'コスト' : 'BP') + pd.sumMax.max + 'まで(今 ' + smT + (smOk ? '' : ' ✕多すぎます') + ')' : '')) + '</b><span>(' + pickSel.size + '/' + n + ')</span>', true,
      camoBox + placeBox + '<div class="row2"><button data-pchoose="1"' + (okSel ? '' : ' disabled') + '>' + (pd.alt ? esc(pd.alt.base || '決定') : '決定') + '</button>' + (n > 1 ? '<button class="sec" data-pselreset="1"' + (pickSel.size || sel.size ? '' : ' disabled') + '>選びなおし</button>' : '') + (pd.alt ? '<button data-pchoose="1" data-alt="1"' + (okSel ? '' : ' disabled') + '>' + esc(pd.alt.label) + '</button>' : '') + (pd.opt ? '<button class="sec" data-pnone="1">' + (pd.place ? 'スピリット化しない(次へ)' : '指定しない') + '</button>' : '') + (V.canUndo ? '<button class="sec" data-cancelcast="1">戻る</button>' : '') + '</div>');
  }
  if (!b) return null;
  const A = fieldK(b.iid), who = pn(b.pi);
  const head = '⚔ ' + who + 'のアタック: 「' + esc(A ? A.def.name : '(場を離れた)') + '」' + (A && V.bps ? ' BP' + V.bps[A.iid] : '') + ' ';
  if (b.phase === 'trigger') return R(head + 'アタック時効果を処理中…', false);
  if (b.phase === 'end') return R(head + 'バトル終了時の効果を処理中…', false);
  if (b.phase === 'flash1' || b.phase === 'flash2') {
    if (b.prio !== V.me) return R(head + '/ 相手のフラッシュ判断を待っています…', false);
    if (uiBusy()) return R(head + '効果を処理中…', false);
    const n = V.usable.hand.length;
    return R(head + '<b class="hl">フラッシュタイミング: あなたの番</b>', true,
      '<button data-pass="1">パス</button>');
  }
  if (b.phase === 'block') {
    if (b.prio !== V.me) return R(head + '/ 相手がブロックするか判断しています…', false);
    if (uiBusy()) return R(head + '効果を処理中…', false);
    const has = V.usable.block.length;
    return R(head + '<b class="hl">ブロック宣言: あなたの番</b><span>' + (b.forced ? '必ずブロックしなければなりません(【激突】など)' : has ? 'ブロックするスピリットを選んでください' : 'ブロックできるスピリットがいません') + '</span>', true,
      '<div class="row2">' + (has ? '<button data-doblock="1"' + (pickSel.size ? '' : ' disabled') + '>ブロックする</button>' : '') + (b.forced ? '' : '<button class="sec" data-noblock="1">ライフで受ける</button>') + '</div>');
  }
  return R(head, false);
}
