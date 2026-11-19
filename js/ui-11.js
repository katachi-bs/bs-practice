/* --- 操作がしばらく無いとき: 終了ボタンを光らせ、画面中央に「あなたのターンです」を出す(カーソルを動かす/触ると消える) --- */
let idleLast = Date.now(), idleOn = false; const IDLE_MS = 12000;
function idleHide() { idleOn = false; const m = document.getElementById('idlemsg'); if (m) m.remove(); document.querySelectorAll('.idleglow').forEach(b => b.classList.remove('idleglow')); }
function idleReset() { idleLast = Date.now(); if (idleOn) idleHide(); }
['mousemove', 'pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => document.addEventListener(ev, idleReset, { passive: true }));
setInterval(() => {
  if (idleOn || !V || SPEC || RP || Date.now() - idleLast < IDLE_MS || Date.now() < gateUntil) return;
  if (V.winner != null || V.turn !== V.me || V.pending || V.battle || V.mull || V.pick || pay || animStep || document.hidden) return;
  if (!['main', 'main2', 'attack', 'end'].includes(V.step)) return;
  const btns = [...document.querySelectorAll('[data-next]:not([disabled])')]; if (!btns.length) return;
  idleOn = true; btns.forEach(b => b.classList.add('idleglow'));
  const m = document.createElement('div'); m.id = 'idlemsg'; m.innerHTML = 'あなたのターンです<small>' + esc(STEP_JP[V.step] || '') + 'ステップ</small>'; document.body.appendChild(m);
}, 1000);
// スマホ: 支払いポップアップが自分のフィールドにかぶらないよう、高さを「自分のフィールドの手前まで」に収める(長い効果文はポップの中でスクロール)
function fitPay() {
  const pw = document.querySelector('.paywrap'); if (!pw) return;
  if (!window.matchMedia('(max-width:899px),(max-height:559px)').matches) { pw.style.maxHeight = ''; return; }
  const me = $('me'); if (!me) return;
  const top = pw.getBoundingClientRect().top, lim = me.getBoundingClientRect().top - top - 6;
  pw.style.maxHeight = Math.max(150, lim) + 'px';
}
/* ---------- 差分描画: 変わった部分だけDOMを更新する(全部作り直すとスマホでチカチカするため) ---------- */
const MORPH_KEYS = ['data-slot', 'data-card', 'data-lcid', 'data-core', 'data-iid', 'data-fjoin', 'data-fspec'];
const morphKey = n => { if (n.nodeType !== 1) return null; for (const k of MORPH_KEYS) { const v = n.getAttribute(k); if (v !== null) return k + '=' + v; } return null; };
function morphAttrs(o, n) {
  for (const a of [...o.attributes]) if (!n.hasAttribute(a.name)) o.removeAttribute(a.name);
  for (const a of [...n.attributes]) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
}
function morphNode(o, n) {
  if (o.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
  if (o.nodeType !== 1) return;
  morphAttrs(o, n);
  if (o.tagName === 'INPUT' || o.tagName === 'TEXTAREA' || o.tagName === 'SELECT') return;
  morphKids(o, n);
}
function sameKind(o, n) { return o.nodeType === n.nodeType && (o.nodeType !== 1 || (o.tagName === n.tagName && morphKey(o) === morphKey(n))); }
function morphKids(parent, np) {
  const olds = [...parent.childNodes], news = [...np.childNodes], byKey = new Map();
  olds.forEach(o => { const k = morphKey(o); if (k && !byKey.has(k)) byKey.set(k, o); });
  const used = new Set(), res = []; let oi = 0;
  news.forEach(n => {
    const k = morphKey(n); let o = null;
    if (k) { o = byKey.get(k); if (o && used.has(o)) o = null; }
    else { while (oi < olds.length && (used.has(olds[oi]) || morphKey(olds[oi]))) oi++; const c = olds[oi]; if (c && sameKind(c, n)) { o = c; oi++; } }
    if (o) { used.add(o); morphNode(o, n); res.push(o); } else res.push(n);
  });
  olds.forEach(o => { if (!used.has(o)) parent.removeChild(o); });
  res.forEach((node, i) => { if (parent.childNodes[i] !== node) parent.insertBefore(node, parent.childNodes[i] || null); });
}
function setH(el, html) {
  if (!el || el._h === html) return; el._h = html;
  const t = document.createElement('template'); t.innerHTML = html; morphKids(el, t.content);
}
function render() { render0(); if (BC.on) { bcTop(); bcFit(); applyHandFlip(); } }
/* 対戦の画像を先に読み込んでおく(使うときに読み込みが間に合わず、黒く見えるのを防ぐ)。ソーディッシュを出すカードがあるときは、その画像も用意する */
let _preG = null, _preMyD = null, _preRun = 0;
function preloadGameArt() {
  try {
    const ids = new Set(), addD = d => {
      if (!d || !d.id) return; ids.add(String(d.id));
      let tk = false; try { tk = JSON.stringify(d).indexOf('ソーディッシュ') >= 0; } catch (e) { }   // 効果や文面に「ソーディッシュ」があるカードは、トークンの画像も用意する
      if (tk || (d.effects || []).some(e => (e.ops || []).some(o => o && o.op === 'token'))) Object.keys(TOKEN_STATS).forEach(n => ids.add('TOKEN-' + n));
    };
    if (G && G.p) G.p.forEach(P => Object.values(P).forEach(v => { if (Array.isArray(v)) v.forEach(k => k && k.def && addD(k.def)); }));   // 自分と相手の、両方のデッキ
    (myDefs || []).forEach(d => addD(d && d.def ? d.def : d));
    const list = [...ids], run = ++_preRun, t0 = Date.now(), g0 = gateUntil;
    const us = list.map(id => { try { return artSm(id); } catch (e) { return ''; } }).filter(Boolean);   // 小さい画像(対戦中に使う画像)を、すべて読み込む
    const left = () => us.filter(u => !_artOk.has(u) && !_artBad.has(u));
    if (left().length) {
      gateUntil = Math.max(gateUntil, t0 + 8000);   // 読み込みが終わるまで、対戦を始めない(最大8秒。それでも読み込みは続ける)
      let shown = false;
      const chk = () => {
        if (run !== _preRun) return;
        const n = left().length;
        if (!n || Date.now() - t0 > 8000) { gateUntil = Math.max(g0, Date.now()); if (shown) toast('カード画像の読み込みが終わりました'); warmBig(list); return; }
        if (!shown && Date.now() - t0 > 900) { shown = true; toast('カード画像を読み込み中… (' + us.length + '枚)'); }
        setTimeout(chk, 100);
      };
      chk();
    } else warmBig(list);
  } catch (e) { }
}
/* 大きい元画像(拡大表示・カットイン用)は、対戦が始まってから、じゃまにならないようにゆっくり先に読み込んでおく(端末に保存されるだけで、メモリには置かない) */
function warmBig(ids) {
  const q = ids.map(id => { try { return artQ(id); } catch (e) { return ''; } }).filter(u => u && u.slice(0, 5) !== 'blob:' && u.slice(0, 5) !== 'data:');
  const next = () => { const u = q.shift(); if (!u) return; const im = new Image(); im.onload = im.onerror = () => setTimeout(next, 150); im.src = u; };
  next(); next();
}
function render0() {
  if (!V) return;
  if (G && G !== _preG) { _preG = G; preloadGameArt(); } else if (!G && myDefs && myDefs !== _preMyD && V && V.me != null) { _preMyD = myDefs; preloadGameArt(); }
  { const pd = V.pending, b0 = V.battle;   // カードを選ぶ場面(対象の指定・ブロック宣言)では、カード上のコアの判定をなくして、カードを選びやすくする
    const selCard = !!(pd && pd.pi === V.me && pd.cands && pd.cands.length && !['coreSel', 'colorPick', 'order', 'reveal'].includes(pd.kind) && !pd.camo && !pd.place) || !!(b0 && b0.phase === 'block' && b0.prio === V.me);
    document.body.classList.toggle('selcard', selCard && !pay); }
  const you = V.you, opp = V.opp, my = V.turn === V.me;
  let mine = new Set(allCores(you).map(c => c.id));
  if (pay) { const pd0 = (you.hand.find(k => k.iid === pay.iid) || {}).def; if (pd0 && V.battle && pd0.effects.some(e => e.keyword === 'flashSummon')) mine = new Set(you.reserve.map(c => c.id)); }
  if (!canMoveCores() && !camoMode()) sel.clear();
  [...sel].forEach(id => { if (!mine.has(id)) sel.delete(id); });
  if (pay) {
    if (!you.hand.some(k => k.iid === pay.iid) && !(V.pending && V.pending.kind === 'sumPay' && you.trash.some(k => k.iid === pay.iid))) pay = null;
    else { ['pay', 'place'].forEach(b => [...pay[b]].forEach(id => { if (!mine.has(id)) pay[b].delete(id); })); pay.ex = pay.ex.filter(i => you.trash.some(k => k.iid === i)); }
  }
  const hs = document.querySelector('.handrow'), hsl = hs ? hs.scrollLeft : 0;
  $('side').className = (my ? 'mine' : 'theirs') + (sideOpen ? ' open' : '');
  setH($('side'), V.spec ? specCtlHTML() : ctlHTML());
  setH($('oppHand'), V.spec ? specOppHandHTML() : '相手の手札 <b>' + opp.handN + '</b> ' + new Array(Math.min(opp.handN, 14)).fill('<span class="mb"></span>').join(''));
  if (BC.on) BC.plan = bcPlan();
  setH($('opp'), sideHTML(opp, false)); SG = null;
  setH($('me'), sideHTML(you, true)); SG = null;
  $('me').classList.toggle('tp', V.turn === V.me); $('opp').classList.toggle('tp', V.turn !== V.me);
  const pickMine = !V.spec && !!(V.pick && V.pick.pi === V.me), mulMine = !V.spec && (!!(V.mull && V.mull.pi === V.me) || pickMine);
  $('hand').classList.toggle('mull', mulMine);
  { const mb = $('mullbox'); mb.hidden = !mulMine; mb.innerHTML = pickMine ? '<div class="mt"><div class="fl" style="font-size:17px">先攻・後攻を選んでください</div></div><div class="mrow">' + you.hand.map(k => cardHTML(k, true, 'mull')).join('') + '</div><div class="mbtn"><button data-first="1">先攻</button><button class="sec" data-first="0">後攻</button></div>' : mulMine ? '<div class="mt"><div class="fl">あなたは' + (V.me === V.turn ? '先攻' : '後攻') + 'です</div><b>マリガン: 手札を全て入れ替えますか?</b></div><div class="mrow">' + you.hand.map(k => cardHTML(k, true, 'mull')).join('') + '</div><div class="mbtn"><button data-mull="1">マリガン</button><button class="sec" data-mull="0">キープ</button></div>' : ''; }
  { const hd = $('hand'); if (pay && matchMedia('(min-width:900px)').matches) { if (!hd.classList.contains('paying')) hd.style.height = hd.offsetHeight + 'px'; hd.classList.add('paying'); } else { hd.classList.remove('paying'); hd.style.height = ''; } }
  setH($('hand'), V.spec ? specHandHTML() : pay ? payHTML() : '<div class="hn">あなたの手札 <b>' + you.hand.length + '</b> ' + (canHandNow() ? '<span class="dim">(カードを盤面へドラッグで召喚・使用)</span>' : '') + '</div><div class="handrow">' +
    (you.hand.length ? you.hand.map(k => cardHTML(k, true, 'hand')).join('') : '<span class="note">手札なし</span>') + '</div>');
  const nh = document.querySelector('.handrow'); if (nh) nh.scrollLeft = hsl;
  if (!(V.pending && V.pending.pi === V.me) && !(V.usable && V.usable.block.length)) pickSel.clear();
  if (sel.size && !camoMode() && !canMoveCores() && !pay) sel.clear();
  document.querySelectorAll('[data-card]').forEach(el => { const i = el.dataset.card; if (glowOf(i)) el.classList.add('glow'); if (pickSel.has(i)) el.classList.add('picked'); });
  renderResult();
  { const eb = $('endbtn'), busy2 = !!(V.battle || V.pending || V.mull || V.pick || V.winner != null);
    eb.hidden = !!V.spec || !(my && !busy2 && !pay);
    if (!eb.hidden) eb.innerHTML = '<button data-next="1">' + STEP_JP[V.step] + 'ステップを終了</button>'; }
  const pr = $('prompt'), ph = V.spec ? specPromptHTML() : promptHTML(), cb = $('cbtn');
  pr.hidden = !ph || mulMine; pr.innerHTML = ph ? ph.t : ''; pr.className = ph && ph.mine ? '' : 'wait';
  cb.classList.toggle('mid', mulMine); cb.hidden = mulMine || !(ph && ph.b && !pay); cb.innerHTML = !mulMine && ph && ph.b && !pay ? ph.b : ''; cb.classList.toggle('low', !!(ph && ph.low)); if (!(ph && ph.b)) cb.style.translate = '';
  renderRev();
  { const hr = {}; document.querySelectorAll('#hand [data-card],#oppHand [data-card]').forEach(el => { const r = el.getBoundingClientRect(); hr[el.dataset.card] = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); if (!pay && Object.keys(hr).length) lastHandRects = hr; }
  applyAnim();
  if (V.pending) { clearTimeout(fxTimer); fxQ.length = 0; fxBusy = false; }
  if (!fxBusy) showPendingFx();
  if (V.notice && V.notice.n !== seenNotice) { seenNotice = V.notice.n; if (V.notice.n) toast(V.notice.m); }
  $('logpanel').hidden = true;
  if (false) $('logpanel').innerHTML = '<div class="lh"><span>ログ</span><a class="lk" data-log="1">閉じる</a></div>' +
    V.log.slice().reverse().map(l => logLine(l)).join('');
  if (V.cast && V.cast.n !== seenCast) {
    seenCast = V.cast.n;
    if (!V.spec && (V.cast.p !== V.me || V.cast.def.type === 'magic')) {
      const d = V.cast.def, who = V.cast.p === V.me ? 'あなたが' : '相手が';
      $('banner').innerHTML = '<div><b>' + who + '「' + esc(d.name) + '」を' + VERB[d.type] + '</b> <a class="lk" data-bclose="1">閉じる</a></div>';
      $('banner').style.setProperty('--tint', COLOR_HEX[d.color] || '');
      $('banner').hidden = false; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { $('banner').hidden = true; }, 4000);
    }
  }
  fitPay();
  if (V.stamp) { if (seenStamp === null) seenStamp = V.stamp.n; else if (V.stamp.n !== seenStamp) { seenStamp = V.stamp.n; showStamp(V.stamp.mine, V.stamp.e); } } else if (seenStamp === null) seenStamp = 0;
  const pc = pay ? payState() : null;
  $('game').style.setProperty('--paycol', pc ? (pc.over ? 'var(--bad)' : pc.payOk && pc.placeOk ? 'var(--ok)' : 'var(--warn)') : 'var(--warn)');
  if (V.spec) specFxCollect();
}

/* --- カード詳細・操作シート --- */
function findK(iid) {
  for (const [own, P] of [[true, V.you], [false, V.opp]])
    for (const z of ['field', 'trash', 'removed', 'hand']) {
      const k = (P[z] || []).find(x => x.iid === iid);
      if (k) return { k, own, zone: z };
    }
  return null;
}
function showSheet(html, tint) { $('sheetBody').innerHTML = '<button class="xclose" data-close="1" aria-label="閉じる">✕</button>' + html; const pn = document.querySelector('#sheet .panel'); if (pn) { if (tint) pn.style.setProperty('--tint', tint); else pn.style.removeProperty('--tint'); } $('sheet').hidden = false; }
function hideSheet() { $('sheet').hidden = true; $('sheet').style.zIndex = ''; sheetActs = []; const pn = document.querySelector('#sheet .panel'); if (pn) pn.style.translate = ''; }
function sbtn(label, fn, sub) { sheetActs.push(fn); return '<button' + (sub ? ' class="sub"' : '') + ' data-sa="' + (sheetActs.length - 1) + '">' + label + '</button>'; }
function artFail(img) {
  const st = +img.dataset.st || 0, d = img.dataset.p;
  if (st === 0) { img.dataset.st = 1; img.src = d + '.png'; return; }
  const box = img.parentNode; if (!box) return;
  box.innerHTML = '<div class="artph"><span class="c">' + esc(img.dataset.cost) + '</span><span class="n">' + esc(img.dataset.name) + '</span><small>' + esc(img.dataset.id) + '<br>イラスト準備中</small></div>';
}
function artHTML(d) {
  const set = String(d.id).split('-')[0], pth = 'images/' + encodeURIComponent(set) + '/' + encodeURIComponent(d.id);
  return '<div class="art" style="--cc:' + (COLOR_HEX[d.color] || '#6a7499') + '"><img referrerpolicy="no-referrer" src="' + (artOf(d.id) || pth + '.jpg') + '" data-p="' + pth + '" data-cost="' + d.cost + '" data-name="' + esc(d.name) + '" data-id="' + esc(d.id) + '" alt="' + esc(d.name) + '" onerror="artFail(this)"></div>';
}
function detailHTML(k) {
  const d = k.def;
  return '<div class="cd">' + artHTML(d) + '<div class="info">' + detailText(k) + '</div></div>';
}
function detailText(k) {
  const d = k.def;
  return '<h3>' + esc(d.name) + ' <small>' + esc(d.id) + '</small></h3>' + (d.reading ? '<div class="meta">' + esc(d.reading) + '</div>' : '') +
    '<div class="meta">' + TYPE_JP[d.type] + ' / コスト' + d.cost + '(' + d.reduction + ')' + symLabel(d) + (d.soulMagic ? ' / ソウルマジック' : '') + '</div>' + (d.auto ? '<div class="meta" style="color:#e8b04a">※効果は未実装です(テキスト表示のみ)</div>' : d.partial ? '<div class="meta" style="color:#e8b04a">※一部の効果は未実装です(灰色の「未実装」と書かれた効果は動きません)</div>' : '') +
    (d.family.length ? '<div class="meta">系統: ' + d.family.map(esc).join('・') + '</div>' : '') + (d.team && d.team.length ? '<div class="meta">チーム: ' + d.team.map(esc).join('・') + '</div>' : '') +
    (d.keywords.filter(x => x !== 'shinkai').length ? '<div class="meta">キーワード: ' + d.keywords.filter(x => x !== 'shinkai').map(x => rich(esc(x === 'soulmagic' ? 'ソウルマジック:[' + (COLOR_JP[d.color] || '赤') + ']' : (KW_JP[x] || x)))).join('・') + '</div>' : '') +
    (d.levels.length ? '<div class="meta">' + d.levels.map((l, i, a) => 'Lv' + l.lv + ': コア' + l.core + (l.bp ? ' / BP' + l.bp : '') + (d.keywords.includes('shinkai') && i === a.length - 1 && a.length > 1 ? ' &lt;真界放&gt;' : '')).join('　') + '</div>' : '') +
    (() => { const li = lvInfo(k), now = V && V.bps ? V.bps[k.iid] : null; return li && now != null && now !== li.bp ? '<div class="meta bpnote">現在のBP: <b>' + now + '</b>(素のBP ' + li.bp + (now > li.bp ? ' +' : ' ') + (now - li.bp) + ' / 効果による)' + ((V.bpx && V.bpx[k.iid] || []).map(w => '<br>　' + esc(w.l) + ': ' + (w.a > 0 ? '+' : '') + w.a).join('')) + '</div>' : ''; })() +
    effectsHTML(k);
}
function effectsHTML(k) {
  const d = k.def, fk = k.iid && V ? findK(k.iid) : null, dim = !!(fk && fk.zone === 'field');   // 手札などでは薄くせず、場のカードだけレベルで薄くする
  if (hasNoEffect(d)) return '';
  if (!d.effects.length) return '<div class="txt">' + rich(esc(d.text || '(効果テキスト未入力)').replace(/\n/g, '<br>')) + '</div>';
  return '<div class="txt">' + effShow(d).map(xx => {
    const e = xx.e, act = !dim || effectActive(k, e), real = effectActive(k, e);
    const ei = xx.ei, ab = e.timing.kind === 'ability';
    const can = ab && V && V.usable && V.usable.abil && V.usable.abil.includes(k.iid + ':' + ei);
    return '<div style="margin-bottom:6px' + (act ? '' : ';opacity:.45') + '"><b>' + rich(esc(xx.head)) + '</b>' + (act ? '' : ' <small>(現在のレベルでは無効)</small>') + '<br>' + rich(esc(effBody(e, xx.head)).replace(/\n/g, '<br>')) + (ab && real && dim ? '<div style="margin-top:4px"><button ' + (can ? '' : 'disabled ') + 'data-abil="' + esc(k.iid) + ':' + ei + '">【起動】' + (e.timing.step === 'main' ? 'メイン' : 'フラッシュ') + 'で使う' + (e.cost && e.cost.pay ? '(コア' + e.cost.pay + '個)' : '') + '</button>' + (can ? '' : ' <small>(今は使えません)</small>') + '</div>' : '') + '</div>';
  }).join('') + '</div>';
}
function payPreview(k) {
  const d = k.def, fs = fieldSymbols(V.you, d.color), ap = Math.min(d.reduction, fs), base = Math.max(0, d.cost - ap);
  let s = '場の同色シンボル' + fs + '個 → 軽減' + ap + ' → 支払いコスト' + base;
  if (d.keywords.includes('inheritance') && d.reduction > ap) s += '(継召: トラッシュのEXシンボルを除外して最大' + (d.reduction - ap) + '追加で軽減できます)';
  if (d.soulMagic && fs > 0) s += ' / ソウルマジック: ソウルコア1個の支払いでも使用可';
  return '<div class="pv">' + s + '</div>';
}
function openCard(iid) {
  const f = findK(iid); if (!f) return;
  sheetActs = [];
  const { k, own, zone } = f, d = k.def;
  let h = detailHTML(k);
  if (V.mull || V.pick) { showSheet(h + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>', COLOR_HEX[d.color]); return; }
  if (!own || V.spec) { showSheet(h + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>', COLOR_HEX[d.color]); return; }
  if (zone === 'hand') h += payPreview(k);
  const mv = (label, to, sub) => sbtn(label, () => doAct({ k: 'moveCard', iid, to }), sub);
  let b = '';
  const vz = (zone === 'field' && d.type === 'spirit' && k.cores.length === 0 && V.turn === V.me && (V.step === 'main' || V.step === 'main2') && !V.battle && !V.pending) ? sbtn('消滅させる', () => doAct({ k: 'vanishZero', iid })) : '';   // メインステップでコアが0個になったとき、自分で消滅させる
  if (!V.test) {
    if (zone === 'hand') b = canCastNow(k) ? sbtn(VERB[d.type] + 'する', () => startPay(iid)) : '<button disabled>' + VERB[d.type] + 'する</button>';
    else if (zone === 'field' && V.turn === V.me && V.step === 'attack' && !V.noAttack && d.type === 'spirit' && !V.battle && !V.pending && !k.tapped) b = (V.noAtk || []).includes(iid) ? '<button disabled>このターンはアタックできません</button>' : sbtn('アタック', () => doAct({ k: 'attack', iid }));
  }
  else if (zone === 'hand') b = ((V.step === 'attack' && !V.battle) ? '<button disabled>' + VERB[d.type] + 'する(コスト支払い)</button>' : sbtn(VERB[d.type] + 'する(コスト支払い)', () => startPay(iid))) + (d.type !== 'magic' ? mv('コストなしで場に出す', 'field', 1) : '') + mv('トラッシュへ', 'trash', 1) + mv('デッキの下へ', 'deckBottom', 1) + mv('除外', 'removed', 1);
  else if (!V.test) b = b;
  else if (zone === 'field') b = (V.turn === V.me && V.step === 'attack' && !V.noAttack && d.type === 'spirit'
      ? (V.battle ? ''
        : !k.tapped && !V.battle ? ((V.noAtk || []).includes(iid) ? '<button disabled>このターンはアタックできません</button>' : sbtn('アタック', () => doAct({ k: 'attack', iid }))) : '')
      : sbtn(k.tapped ? '回復' : '疲労', () => doAct({ k: 'tap', iid }))) + mv('トラッシュへ(破壊)', 'trash', 1) + mv('手札へ', 'hand', 1) + mv('デッキの下へ', 'deckBottom', 1) + mv('除外', 'removed', 1);
  else if (zone === 'trash') b = mv('手札へ', 'hand') + (d.type !== 'magic' ? mv('場に出す', 'field', 1) : '') + mv('デッキの下へ', 'deckBottom', 1) + mv('除外', 'removed', 1);
  else if (zone === 'removed') b = mv('手札へ', 'hand') + mv('トラッシュへ', 'trash', 1);
  showSheet(h + '<div class="acts">' + vz + b + '<button class="sub" data-close="1">閉じる</button></div>', COLOR_HEX[d.color]);
}
let listMode = 'new';
function openList(who, zone) {
  const P = who ? V.you : V.opp;
  let arr = (P[zone] || []).slice().reverse();
  const isEx = k => !!k.def.symbols.ex;
  if (listMode === 'ex') arr = arr.filter(isEx);
  const tab = (m, l) => '<button class="chip' + (listMode === m ? ' on' : '') + '" data-lmode="' + m + '" data-lwho="' + (who ? 1 : 0) + '" data-lzone="' + zone + '">' + l + '</button>';
  showSheet('<h3>' + (who ? 'あなた' : '相手') + 'の' + (zone === 'trash' ? 'トラッシュ' : '除外') + '(' + arr.length + '枚)</h3>' +
    '<div class="chips">' + tab('new', 'すべて') + tab('ex', 'EXのみ') + '</div><div class="lrow">' +
    (arr.length ? arr.map(k => cardHTML(k, !!who, zone)).join('') : '<span class="note">カードなし</span>') + '</div><div class="acts"><button class="sub" data-close="1">閉じる</button></div>');
}
let deckQ = '', deckAll = false;
function deckResHTML() {
  const q = deckQ.trim();
  let arr;
  if (deckAll) arr = CARD_LIST.filter(c => !q || c.def.name.includes(q) || String(c.raw.id).includes(q)).map(c => ({ iid: 'pool:' + c.raw.id, def: c.def, cores: [], tapped: false }));
  else arr = (V.you.deck || []).filter(k => !q || k.def.name.includes(q)).sort((a, b) => a.def.name.localeCompare(b.def.name, 'ja'));
  const lim = arr.length > 60;
  return '<div class="lrow" style="margin-top:8px">' + (arr.length ? arr.slice(0, 60).map(k => cardHTML(k, true, 'deck')).join('') : '<span class="note">該当なし</span>') + '</div>' + (lim ? '<div class="note">先頭の60枚を表示中。絞り込んでください。</div>' : '');
}
function openDeck() {
  showSheet('<h3>カードを出す(テスト用)</h3><div class="note">本番の対戦では使えません。カードをタップして手札・場などへ出せます。デッキへ戻すときは、手札・場・トラッシュのカードから「デッキの下へ」を選びます。</div>' +
    '<div class="chips"><button class="chip' + (deckAll ? '' : ' on') + '" data-dmode="0">デッキ内(' + (V.you.deck || []).length + ')</button><button class="chip' + (deckAll ? ' on' : '') + '" data-dmode="1">全カード(' + CARD_LIST.length + ')</button></div>' +
    '<input id="deckq" type="text" autocomplete="off" placeholder="カード名・IDで絞り込み" value="' + esc(deckQ) + '" style="width:100%;margin:6px 0;padding:7px;border-radius:8px;border:1px solid var(--line);background:#12141c;color:var(--fg)">' +
    '<div id="deckres">' + deckResHTML() + '</div>' +
    '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>');
}
const deckQUpd = e => { if (e.target && e.target.id === 'deckq') { deckQ = e.target.value; const r = $('deckres'); if (r) r.innerHTML = deckResHTML(); } };
document.addEventListener('input', e => { if (!e.isComposing) deckQUpd(e); });
document.addEventListener('compositionend', deckQUpd);
function openDeckCard(iid) {
  const pool = iid.indexOf('pool:') === 0 ? CARD_LIST.find(c => String(c.raw.id) === iid.slice(5)) : null;
  const k = pool ? { iid, def: pool.def, cores: [], tapped: false } : (V.you.deck || []).find(x => x.iid === iid); if (!k) return;
  sheetActs = [];
  const mv = (label, to, sub) => sbtn(label, () => doAct(pool ? { k: 'fromPool', raw: pool.raw, to } : { k: 'fromDeck', iid, to }), sub);
  showSheet(detailHTML(k) + '<div class="acts">' + mv('手札へ', 'hand') + (k.def.type !== 'magic' ? mv('場に出す', 'field', 1) : '') + mv('トラッシュへ', 'trash', 1) + mv('除外', 'removed', 1) + '<button class="sub" data-back="deck">デッキに戻る</button></div>');
}

/* --- クリック(タップ)の処理 --- */
// コア以外をクリックしたら、コアの選択を解除する(支払いモード中は解除しない)
function clearOnOutside(t) {
  if (pay || !sel.size || camoMode()) return false;   // 迷彩の支払いコアを選んでいる間は、ほかをタップしても選択を消さない
  const keep = t.closest('[data-core][data-own="1"],[data-cc][data-own="1"],[data-dest],[data-keepsel]') ||
    t.closest('[data-card][data-zone="field"][data-own="1"]');
  if (keep) return false;
  sel.clear(); return true;
}
// 盤面のコアを動かして、スピリットのコアが0になるときは確認する(消滅は破壊とは別)
const canMoveCores = () => !!(V && !V.spec && V.turn === V.me && (V.step === 'main' || V.step === 'main2') && !V.battle && !V.pending && !V.mull && !V.pick && V.winner == null);
// 入れ替え可能か(支払い・配置に使えるコアの合計で、絶対に足りないときは召喚を押せなくする)
function canCastNow(k) {
  if (!V || !canMoveCores() || pay) return false;
  if (k.def.noMain) return false;
  const d = k.def, P = V.you, total = allCores(P).length;
  let need = payRequirement(P, d, {}).need;
  if (d.keywords.includes('inheritance')) { const ex = P.trash.filter(x => (x.def.symbols.ex && x.def.color === d.color) || (P.exIid === x.iid && x.def.color === d.color)).slice(0, d.reduction).map(x => x.iid); const i2 = payRequirement(P, d, { ex }); if (i2.ok) need = Math.min(need, i2.need); }
  const mp = minPlaceOf(d);
  if (need + mp <= total) return true;
  return !!(d.soulMagic && fieldSymbols(P, d.color) > 0 && allCores(P).some(c => c.soul) && 1 + mp <= total);
}
