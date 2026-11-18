function freeShuffle() {
  const ids = free.list.filter(r => r.st !== 'play').map(r => r.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  free.shown = ids.slice(0, FREE_MAX); freeRender(); freeAsk();
}
function freeRender() {
  const box = $('freeList'); if (!box) return;
  const me = free.mine && free.mine.st !== 'play' ? '<div class="frm mine"><div class="fn">' + esc(free.mine.name) + '(あなた)</div><div class="fm">' + esc(free.mine.msg || '(ひとことなし)') + '</div><button class="sec" disabled>募集中…</button></div>' : '';
  const cards = free.shown.map(i => free.list.find(r => r.id === i)).filter(Boolean).map(r => '<div class="frm"><div class="fn">' + esc(r.name) + '</div><div class="fm">' + esc(r.msg || '(ひとことなし)') + '</div><button data-fjoin="' + esc(r.id) + '">この部屋に入る</button></div>').join('');
  const pl = free.list.filter(r => r.st === 'play').slice(0, 40).map(r => '<div class="frm playing' + (r.sp ? '' : ' nospec') + '"><div class="fn">' + esc(r.name) + ' vs ' + esc(r.n2 || '…') + '</div><div class="fm">⚔ 対戦中' + (r.msg ? ' ・ ' + esc(r.msg) : '') + (r.sp ? ' ・ 観戦 ' + (r.ns | 0) + '人' : ' ・ 観戦できません') + '</div>' + (r.sp ? '<button class="sec" data-fspec="' + esc(r.id) + '">👁 観戦する</button>' : '<button class="sec" disabled>観戦不可</button>') + (r.name === getName() ? '<button class="sec" data-fdel="' + esc(r.id) + '">この部屋を削除</button>' : '') + '</div>').join('');
  box.innerHTML = me + pl + cards; box.hidden = !(me || pl || cards);
  const sb = $('bFreeShuffle'); if (sb) sb.hidden = free.list.filter(r => r.st !== 'play').length <= FREE_MAX || !cards;
}
$('bFreeMake').onclick = () => {
  if (free.mine) { freeCancelRoom(false); return; }
  const d = getDeck(); if (!d) return;
  myDefs = d.defs; matchTest = false; cpu = false; solo = false;
  const id = 'bsprac-f-' + Math.random().toString(36).slice(2, 10);
  free.mine = { id, name: getName(), msg: ($('freeMsg').value || '').trim().slice(0, 24), st: 'wait', n2: '', sp: $('freeSpec').checked ? 1 : 0, ns: 0, nt: 1 }; freeButtons(); freeRender();
  apiPost('/room', { name: getName(), msg: free.mine.msg, self: window.__pushEp || '' });   // 通知をオンにしている人へプッシュ通知
  asHost(id, 0, true);
};
$('bFreeShuffle').onclick = freeShuffle;
try { $('shareRec').checked = localStorage.getItem('bs-share') !== '0'; } catch (e) { }
$('shareRec').onchange = () => { try { localStorage.setItem('bs-share', $('shareRec').checked ? '1' : '0'); } catch (e) { } };
let ntAsked = false;
// 初期値は「通知を受け取る」。許可の確認は、最初に画面を触ったときに出す(端末の決まりで、操作のあとにしか出せない)
document.addEventListener('click', async () => {
  if (ntAsked || !ntPref() || !('Notification' in window) || Notification.permission !== 'default') return; ntAsked = true;
  try { await Notification.requestPermission(); pushSync(); } catch (e) { }
}, true);
$('freeList').addEventListener('click', e => {
  const sp = e.target.closest('[data-fspec]');
  if (sp) { if (free.mine) freeCancelRoom(false); myDefs = []; matchTest = false; cpu = false; solo = false; free.joining = true; wantSpec = true; asGuest(sp.dataset.fspec, 3, true); return; }
  { const d = e.target.closest('[data-fdel]'); if (d) { freeDelRoom(d.dataset.fdel); return; } }
  const b = e.target.closest('[data-fjoin]'); if (!b) return;
  const d = getDeck(); if (!d) return;
  if (free.mine) freeCancelRoom(false);
  myDefs = d.defs; matchTest = false; cpu = false; solo = false; free.joining = true;
  asGuest(b.dataset.fjoin, 3, true);
});
freeRender(); setTimeout(() => { if (!$('lobby').hidden) freeStart(); }, 600);
/* ===== 観戦・リプレイ(v35) ===== */
let SPEC = false, VP = 0, lastRaw = null, RP = null, wantSpec = false;
const SPECS = new Map();   // ホスト用: 観戦者の接続 peerId → { c, name }
let ROSTER = { pl: [], sp: [] }, specChat = [], chatOpen = false, chatUnread = 0, orient = 'auto';
const SPEC_STAMPS = ['👏', '😲', '🔥', '😂', '😭', '👍', '🤔', '🎉'];
const recDone = new Set(), RPKEY = 'bs-replays', RPMAX = 10;
const cl = o => JSON.parse(JSON.stringify(o));
const flipV = v => (v && VP === 1) ? Object.assign({}, v, { me: 1, you: v.opp, opp: v.you }) : v;
function bcApply(raw) { lastRaw = raw; setV(flipV(raw)); if (BC.on && V && V.spec) { try { specFxCollect(); } catch (e) { } } }
/* 配信モード: メイン中のコアの出し入れは、その都度描かず、ためておいて「効果の発動・ステップの変化・ほかの動き」の直前にまとめて素早く動かす */
function bcSig(r) {
  const sd = P => ({ h: (P.hand || []).map(k => k.iid), f: (P.field || []).map(k => [k.iid, k.tapped, k.heavy, k.mods && k.mods.length]), l: (P.life || []).length, t: (P.trash || []).map(k => k.iid), r: (P.removed || []).length, d: P.deckN, hn: P.handN });
  return JSON.stringify([r.step, r.turn, r.turnNo, r.battle, r.wait, r.winner, r.mull, r.cast && r.cast.n, sd(r.you || {}), sd(r.opp || {})]);
}
function bcQuietRaw(raw) { try { return !!lastRaw && !(raw.fx && raw.fx.length) && (raw.evs || []).every(e => e.t === 'cmove' || e.t === 'coreIn' || e.t === 'coreOut') && bcSig(raw) === bcSig(lastRaw); } catch (e) { return false; } }
function bcFlushPend() { clearTimeout(BC.pendT); const r = BC.pend; BC.pend = null; if (!r) return false; bcApply(r); return true; }
function bcDrain() { BC.dqT = null; const r = BC.dq.shift(); if (r) bcApply(r); if (BC.dq.length) BC.dqT = setTimeout(bcDrain, 300); }
function bcIn(raw) {
  if (bcQuietRaw(raw)) { if (BC.pend) raw.evs = (BC.pend.evs || []).concat(raw.evs || []); BC.pend = raw; clearTimeout(BC.pendT); BC.pendT = setTimeout(bcFlushPend, 4500); return; }
  const had = bcFlushPend();
  if (had || BC.dqT) { BC.dq.push(raw); if (!BC.dqT) BC.dqT = setTimeout(bcDrain, 350); return; }
  bcApply(raw);
}
function setSpecV(raw) { if (BC.on && BC.manual && SPEC && !RP && V) { BC.q.push(raw); bcBar(); return; } if (BC.on && SPEC && !RP && V) { bcIn(raw); return; } lastRaw = raw; setV(flipV(raw)); if (BC.on && V && V.spec) { try { specFxCollect(); } catch (e) { } }
  else if (!BC.on && !BC.autoDone && SPEC && !RP && V && V.spec) { BC.autoDone = true; try { if (document.body.classList.contains('adm') && innerWidth >= 900 && matchMedia('(hover:hover) and (pointer:fine)').matches) bcOn(); } catch (e) { } } }
function specReset() {
  if (BC.on) bcOff(); BC.autoDone = false;
  SPEC = false; wantSpec = false; VP = 0; lastRaw = null; orient = 'auto'; chatOpen = false; chatUnread = 0; specChat = []; ROSTER = { pl: [], sp: [] };
  if (SPECS.size) { specBroadcast({ t: 'sbye' }); const cs = [...SPECS.values()]; SPECS.clear(); setTimeout(() => cs.forEach(x => { try { x.c.close(); } catch (e) { } }), 150); }
  if (RP) { clearTimeout(RP.timer); RP = null; }
  ['spec', 'rp', 'fw'].forEach(c => document.body.classList.remove(c));
  const cb = $('chatbox'); if (cb) cb.hidden = true; const rb = $('rpbar'); if (rb) rb.hidden = true;
  const sf = $('specfx'); if (sf) sf.hidden = true; specFxQ.length = 0; specFxBusy = false; specFieldSeen = null;
  const rl = $('replay'); if (rl) rl.hidden = true;
}
function specBody() {
  const on = !!(SPEC || RP);
  document.body.classList.toggle('spec', on); document.body.classList.toggle('rp', !!RP);
  document.body.classList.toggle('fw', on && orient === 'land' && innerWidth > innerHeight);
  const rb = $('rpbar'); if (rb) { rb.hidden = !RP; if (RP) rb.innerHTML = rpBarHTML(); }
  const cb = $('chatbox'); if (cb) { cb.hidden = !(SPEC && chatOpen); if (SPEC && chatOpen) chatRender(); }
}
addEventListener('resize', () => { if (SPEC || RP) specBody(); });
const absName = p => { const n = V && V.names && V.names[p]; return n ? esc(n) : 'プレイヤー' + (p + 1); };

/* ---------- 通信: 送信を「分割する部分」と「送る部分」に分ける(観戦者全員に同じ内容を送るため) ---------- */
function wire(m) {
  if (m && m.t === 'state') m = { t: 'state', v: packDefs(m.v), pk: 1 };
  const bytes = new TextEncoder().encode(JSON.stringify(m)), CH = 9000;
  if (bytes.length <= 12000) return [m];
  const id = Math.random().toString(36).slice(2, 8), n = Math.ceil(bytes.length / CH), out = [];
  for (let i = 0; i < n; i++) { const part = bytes.subarray(i * CH, (i + 1) * CH); let bin = ''; for (let k = 0; k < part.length; k += 3000) bin += String.fromCharCode.apply(null, part.subarray(k, k + 3000)); out.push({ t: 'chunk', id, i, n, d: btoa(bin) }); }
  return out;
}
function rawSend(c, w) { if (!c || !c.open) return false; try { w.forEach(x => c.send(x)); return true; } catch (e) { return false; } }

/* ---------- ホスト側: 観戦者の受付 ---------- */
const specAllowed = () => !free.mine || !!free.mine.sp;
function specList() { return [...SPECS.values()].map(x => x.name); }
function specBroadcast(m, toPlayer) { const w = wire(m); SPECS.forEach(x => rawSend(x.c, w)); if (toPlayer && dc && dc.open) rawSend(dc, w); }
function specPushState() { if (!SPECS.size || !G || solo || cpu) return; const w = wire({ t: 'state', v: viewSpec(G) }); SPECS.forEach(x => rawSend(x.c, w)); }
function specRoster() {
  ROSTER = { pl: ((G && G.names) || []).slice(0, 2), sp: specList() };
  specBroadcast({ t: 'roster', pl: ROSTER.pl, sp: ROSTER.sp }, true);
  if (free.mine) { free.mine.ns = SPECS.size; freeReg(); }
  if (V && !$('game').hidden) render();
}
function specIntake(c, maybeGuest) {
  let done = false;
  const drop = () => { const x = SPECS.get(c.peer); if (x && x.c === c) { SPECS.delete(c.peer); specRoster(); } };
  c.on('close', drop); c.on('error', () => { });
  c.on('data', m => {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'bye') { drop(); try { c.close(); } catch (e) { } return; }
    if (!done) {
      const takeover = () => { done = true; c.removeAllListeners('data'); c.removeAllListeners('close'); const old = dc; dc = c; try { if (old && old !== c) old.close(); } catch (e) { } setupDC(); lastRx = Date.now(); c.emit('open'); c.emit('data', m); };
      if (maybeGuest && m.t === 'resync') { takeover(); return; }   // 切れていたゲストが戻ってきた
      if (maybeGuest && (m.t === 'deck' || m.t === 'chunk') && (!dc || !dc.open || Date.now() - lastRx > 30000)) { takeover(); return; }   // 席が空いていて、デッキを送ってきた=入り直したゲスト
      if (m.t === 'spec' || m.t === 'deck' || m.t === 'chunk') {
        done = true;
        if (!specAllowed()) { rawSend(c, wire({ t: 'specno', why: 'この部屋は観戦できません' })); setTimeout(() => { try { c.close(); } catch (e) { } }, 400); return; }
        if (SPECS.size >= 30 && !SPECS.has(c.peer)) { rawSend(c, wire({ t: 'specno', why: '観戦者が多いため入れません' })); setTimeout(() => { try { c.close(); } catch (e) { } }, 400); return; }
        SPECS.set(c.peer, { c, name: str(m.name, 12).trim() || '観戦者' });
        rawSend(c, wire({ t: 'specok', pl: ((G && G.names) || []).slice(0, 2), sp: specList(), chat: specChat.slice(-40) }));
        if (G) rawSend(c, wire({ t: 'state', v: viewSpec(G) }));
        specRoster(); toast('「' + SPECS.get(c.peer).name + '」さんが観戦に入りました');
      }
      return;
    }
    const x = SPECS.get(c.peer); if (!x || x.c !== c) return;
    if (m.t === 'schat') {
      const text = str(m.m, 120).trim(); if (!text) return;
      const now = Date.now(); if (x.lastChat && now - x.lastChat < 800) return; x.lastChat = now;
      const line = { n: x.name, m: text, at: now }; specChat.push(line); if (specChat.length > 80) specChat.shift();
      specBroadcast({ t: 'schat', n: line.n, m: line.m });
    } else if (m.t === 'sstamp' && SPEC_STAMPS.includes(m.e)) {
      const now = Date.now(); if (x.lastSt && now - x.lastSt < 300) return; x.lastSt = now;
      specBroadcast({ t: 'sstamp', n: x.name, e: m.e }, true); crowdStamp(m.e, x.name);
    }
  });
}
function specPrune() { let ch = false; SPECS.forEach((x, k) => { if (!x.c.open) { SPECS.delete(k); ch = true; } }); if (ch) specRoster(); }
setInterval(() => { if (SPECS.size) { specPrune(); specBroadcast({ t: 'ping' }); } }, 5000);

/* ---------- 観戦者・ゲスト側: 受信 ---------- */
function specMsg(m) {   // onDcData から呼ばれる。処理したら true
  if (m.t === 'specok') {
    SPEC = true; wantSpec = false; guestStarted = true; ROSTER = { pl: m.pl || [], sp: m.sp || [] }; specChat = Array.isArray(m.chat) ? m.chat.slice(-40) : [];
    free.joining = false; $('side').textContent = '観戦の準備をしています…'; specBody(); return true;
  }
  if (m.t === 'specno') { toast(m.why || '観戦できませんでした'); resetToHome(m.why || '観戦できませんでした'); return true; }
  if (m.t === 'sbye') { resetToHome('対戦が終わったため、観戦を終了しました'); return true; }
  if (m.t === 'snew') { resetForNew(); specNoResult = false; V = null; lastRaw = null; specFxSeq = null; ROSTER.pl = m.pl || ROSTER.pl; return true; }
  if (m.t === 'roster') { ROSTER = { pl: m.pl || [], sp: m.sp || [] }; if (V) render(); return true; }
  if (m.t === 'schat') { specChat.push({ n: str(m.n, 12), m: str(m.m, 120) }); if (specChat.length > 80) specChat.shift(); if (!chatOpen) chatUnread++; if (SPEC) { chatRender(); if (V) render(); } return true; }
  if (m.t === 'sstamp') { if (SPEC_STAMPS.includes(m.e)) crowdStamp(m.e, str(m.n, 12)); return true; }
  if (m.t === 'rec') { if (m.rec && Array.isArray(m.rec.acts)) { if (rpAdd(m.rec)) toast('この対戦のリプレイを保存しました(ホームの「リプレイ」から見られます)'); } return true; }
  return false;
}
function specSendMsg(m) { if (dc && dc.open) dsend(m); }

/* ---------- 観客のスタンプ・チャット ---------- */
function crowdStamp(e, name) {
  const box = $('crowd'); if (!box) return;
  const el = document.createElement('div'); el.className = 'cst';
  const left = Math.random() < .5, x = left ? 1 + Math.random() * 7 : 92 - Math.random() * 7, y = 22 + Math.random() * 62, sc = 1.1 + Math.random() * 1.1, dx = (Math.random() - .5) * 40;
  el.style.cssText = 'left:' + x + 'vw;top:' + y + 'vh;--sc:' + sc + ';--dx:' + dx + 'px;animation-duration:' + (2.4 + Math.random() * 1.2) + 's';
  el.innerHTML = '<span>' + e + '</span><small>' + esc(name || '') + '</small>';
  box.appendChild(el); setTimeout(() => el.remove(), 3800);
  while (box.children.length > 40) box.firstChild.remove();
}
function chatRender() {
  const cb = $('chatbox'); if (!cb) return;
  const keep = cb.querySelector('input') ? cb.querySelector('input').value : '', foc = document.activeElement && document.activeElement.id === 'chatIn';
  const list = cb.querySelector('.cl'), atEnd = !list || list.scrollTop + list.clientHeight >= list.scrollHeight - 30;
  cb.innerHTML = '<div class="ch"><b>💬 観戦チャット</b><a class="lk" data-chat="1">閉じる</a></div><div class="cl">' + (specChat.length ? specChat.map(l => '<div><b>' + esc(l.n) + '</b> ' + esc(l.m) + '</div>').join('') : '<div class="dim">まだ発言はありません(観戦者どうしだけに見えます)</div>') + '</div><div class="cr"><input id="chatIn" maxlength="120" placeholder="メッセージ" autocomplete="off"><button data-chatsend="1">送信</button></div>';
  const nl = cb.querySelector('.cl'); if (nl && atEnd) nl.scrollTop = nl.scrollHeight;
  const ni = $('chatIn'); if (ni) { ni.value = keep; if (foc) ni.focus(); ni.onkeydown = ev => { if (ev.key === 'Enter' && !ev.isComposing) chatSend(); }; }
}
function chatSend() { const i = $('chatIn'); if (!i) return; const t = i.value.trim(); if (!t) return; i.value = ''; specSendMsg({ t: 'schat', m: t }); }

/* ---------- 観戦画面の部品 ---------- */
function specBadge() { return '<div class="specbadge">' + (RP ? '▶ リプレイ' : '👁 観戦中') + '</div>'; }
function specCtlHTML() {
  const curS = animStep || V.step, idx = STEPS.indexOf(curS);
  const steps = '<div class="vsteps">' + STEPS.map((s, i) => '<div class="vs' + (i === idx ? ' on' : i < idx ? ' done' : '') + '"><span class="n">' + STEP_NUM[s] + '</span>' + STEP_SHORT[s] + (i === idx ? '<span class="ar">◀</span>' : '') + '</div>').join('') + '</div>';
  const head = specBadge() + '<div class="vsname"><b>' + absName(V.me) + '</b> vs <b>' + absName(1 - V.me) + '</b></div><div class="turnbox"><b>' + V.turnNo + 'ターン目</b><span class="who">' + absName(V.turn) + 'の番</span></div><button class="sub sidetog" data-sidetog="1">' + (sideOpen ? '▲' : '▼') + '</button>';
  const nSp = (ROSTER.sp || []).length;
  const btns = '<div class="row r1"><button class="sub" data-menu="1">' + (menuOpen ? '▲メニュー' : 'メニュー') + '</button><button class="sub" data-log="1">ログ' + (logOpen ? '▲' : '') + '</button>' +
    (SPEC ? '<button class="sub stampb" data-sstampbtn="1" title="スタンプ">😃</button><button class="sub chatb" data-chat="1" title="チャット">💬' + (chatUnread ? '<i class="bdg">' + Math.min(chatUnread, 9) + '</i>' : '') + '</button>' : '') + '</div>';
  const menu = menuOpen ? '<div class="menu">' +
    '<div class="mt2">視点変更</div><button class="sub" data-sview="1">' + absName(V.me) + ' が手前 → ' + absName(1 - V.me) + ' が手前にする</button>' +
    '<div class="mt2">画面の向き</div><div class="row"><button class="sub' + (orient === 'auto' ? ' on' : '') + '" data-sori="auto">自動</button><button class="sub' + (orient === 'land' ? ' on' : '') + '" data-sori="land">横向き(1画面)</button></div>' +
    (document.body.classList.contains('adm') ?     '<div class="mt2">配信・録画</div><button class="sub" data-bcon="1">📺 ' + (BC.on ? '配信モードをやめる' : '配信モード(録画向けの画面)') + '</button>' : '') +
    '<button class="sub" data-roster="1">👥 名簿(観戦者 ' + nSp + '人)</button>' +
    '<button class="sub" data-sleave="1">' + (RP ? 'リプレイをやめる' : '観戦をやめてホームに戻る') + '</button></div>' : '';
  const last = V.log[V.log.length - 1];
  return head + steps + (animStep ? '<div class="ticker">▶ ' + esc(animMsg) + '</div>' : '') + btns + menu + (logOpen ? '<div class="inlog">' + V.log.slice().reverse().map(l => logLine(l)).join('') + '</div>' : '') + '<div class="lastlog">' + (last ? logLine(last, 1) : '') + '</div>';
}
function specOppHandHTML() {
  const o = V.opp; return '<span class="ohn">' + absName(1 - V.me) + 'の手札 <b>' + o.hand.length + '</b></span><div class="handrow orow">' + (o.hand.length ? o.hand.map(k => cardHTML(k, false, 'ohand')).join('') : '<span class="note">手札なし</span>') + '</div>';
}
function specHandHTML() {
  const y = V.you; return '<div class="hn">' + absName(V.me) + 'の手札 <b>' + y.hand.length + '</b></div><div class="handrow">' + (y.hand.length ? y.hand.map(k => cardHTML(k, false, 'shand')).join('') : '<span class="note">手札なし</span>') + '</div>';
}
function specPromptHTML() {
  const R = (t, b) => ({ t, mine: false, b: b || '', low: false });
  if (V.winner != null) return R('<b class="hl">' + absName(V.winner) + ' の勝ち!' + (V.loseWhy === 'deck' ? '(デッキ切れ)' : '') + '</b>');
  const w = V.wait;
  if (w) {
    const who = absName(w.pi);
    if (w.kind === 'pick') return R(who + 'が先攻・後攻を選んでいます…');
    if (w.kind === 'mull') return R(who + 'がマリガンを選んでいます…');
    return R(who + (w.name ? 'が「' + esc(w.name) + '」の効果を処理しています…' : 'が選んでいます…'));
  }
  const b = V.battle;
  if (b && (b.phase === 'flash1' || b.phase === 'flash2')) return R(absName(b.prio) + 'のフラッシュタイミング…');
  if (b && b.phase === 'block') return R(absName(b.prio) + 'がブロックを選んでいます…');
  return null;
}
function specResultHTML() {
  const wn = absName(V.winner);
  return '<div class="rb"><div class="big win">' + wn + '</div><div class="rs">の勝ち' + (V.loseWhy === 'deck' ? '(デッキ切れ)' : '') + '</div><div class="rbtn"><button class="sec" data-rclose="1">盤面を見る</button><button data-sleave="1">' + (RP ? 'リプレイをやめる' : 'ホームに戻る') + '</button></div></div>';
}

/* ---------- 効果が出たら、反対側の盤面にカードを大きく見せる ---------- */
let specFxT = null; const specFxRecent = {}; let specFieldSeen = null; const specFxQ = []; let specFxBusy = false, specCastSeen = 0, specFxSeq = null;
const defOfId = id => { const c = CARD_LIST.find(x => String(x.raw.id) === String(id)); return c ? c.def : null; };
/* 観戦・配信: オープン効果(デッキの上から数枚を公開)を、デッキ破棄のようなアニメで見せる */
let revSpec = { key: '', els: [], p: 0 };
function specRevealSync() {
  const r = V && V.spec ? V.rev : null;
  if (r && r.key !== revSpec.key) {
    revSpecClose(true);
    const key = r.p === V.me ? 'me' : 'opp', n = r.cards.length, dk = rectC(document.querySelector('#' + key + ' .deck')) || { x: innerWidth - 60, y: innerHeight / 2 }, fd = rectC(document.querySelector('#' + key + ' .field')) || { x: innerWidth / 2, y: innerHeight / 2, w: 600 };
    const gap = Math.min(96, Math.max(60, ((fd.w || 600) - 40) / Math.max(1, n))), DEAL = 190, FLIP = 160, W = 46, H = 65, at = (x, y, sc, sx) => 'translate(' + (x - W) + 'px,' + (y - H) + 'px) scale(' + sc + ') scaleX(' + sx + ')';
    revSpec = { key: r.key, els: [], p: r.p };
    r.cards.forEach((c, i) => {
      const el = faceEl(c, true); el.style.width = '92px'; el.style.height = '130px'; const ex = fd.x + (i - (n - 1) / 2) * gap, ey = fd.y; el.style.zIndex = 9991; revSpec.els.push({ el, c, ex, ey }); revRects[c.iid] = { x: ex, y: ey };
      el.animate([{ transform: at(dk.x, dk.y, .59, 1), opacity: 0 }, { transform: at(dk.x, dk.y, .59, 1), opacity: 1, offset: .08 }, { transform: at(ex, ey, 1, 1), opacity: 1 }], { duration: 520, delay: 150 + i * DEAL, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
      setTimeout(() => { if (revSpec.key !== r.key) return; el.animate([{ transform: at(ex, ey, 1, 1) }, { transform: at(ex, ey, 1, 0) }], { duration: FLIP, fill: 'both' }).onfinish = () => { el.paint(false); el.animate([{ transform: at(ex, ey, 1, 0) }, { transform: at(ex, ey - 8, 1, 1) }, { transform: at(ex, ey, 1, 1) }], { duration: FLIP * 1.4, fill: 'both' }); }; }, 150 + i * DEAL + 520);
    });
  } else if (!r && revSpec.key) revSpecClose(false);
}
function revSpecClose(quick) {
  const k = revSpec; revSpec = { key: '', els: [], p: 0 };
  k.els.forEach(({ el, c, ex, ey }) => {
    const P = V && V.spec ? (k.p === V.me ? V.you : V.opp) : null, inHand = !quick && P && (P.hand || []).some(h => h.iid === c.iid), hd = inHand && rectC($(k.p === V.me ? 'hand' : 'opp'));
    if (hd) { el.animate([{ transform: 'translate(' + (ex - 46) + 'px,' + (ey - 65) + 'px) scale(1)', opacity: 1 }, { transform: 'translate(' + (hd.x - 46) + 'px,' + (hd.y - 65) + 'px) scale(.47)', opacity: .2 }], { duration: 650, delay: 300, easing: 'ease-in', fill: 'both' }).onfinish = () => el.remove(); setTimeout(() => { try { el.remove(); } catch (e) { } }, 1500); }
    else setTimeout(() => { try { el.remove(); } catch (e) { } }, quick ? 0 : 250);
  });
}
function specFxCollect() {
  if (V && V.spec) { try { specRevealSync(); } catch (e) { } }
  if (!V || !V.spec || V.seq === specFxSeq) return; const first = specFxSeq === null; specFxSeq = V.seq; if (first) { specCastSeen = V.cast ? V.cast.n : 0; specFieldSeen = new Set(); [V.you, V.opp].forEach(P => (P.field || []).forEach(k => specFieldSeen.add(k.iid))); return; }
  const items = [];
  const add = (p, cid, name, label, text, def) => { const key = name || cid; if (true) { const sk = V.turnNo + ':' + V.step; if (specFxRecent.sk !== sk) { for (const q in specFxRecent) delete specFxRecent[q]; specFxRecent.sk = sk; } if (specFxRecent[key + ':' + p]) return; specFxRecent[key + ':' + p] = 1; } const ex = items.find(x => x.key === key && x.p === p); if (ex) { if (text && !ex.text) ex.text = text; if (label === '効果') ex.label = ex.label === '効果' ? '効果' : ex.label + '・効果'; return; } items.push({ key, p, cid, name, label, text, def }); };
  if (V.cast && V.cast.n !== specCastSeen) { specCastSeen = V.cast.n; if (V.cast.def && V.cast.def.type === 'magic') delete specFxRecent[V.cast.def.name + ':' + V.cast.p]; add(V.cast.p, V.cast.def && V.cast.def.id, V.cast.def && V.cast.def.name, V.cast.def ? (V.cast.def.type === 'magic' ? '使用' : V.cast.def.type === 'nexus' ? '配置' : '召喚') : '', '', V.cast.def); }
  const noneR = f => f.fail || (f.r && f.r.length && f.r.every(x => /何も起きません|いないため|ありません|行いません/.test(x)));
  { const cur = new Set(); [V.you, V.opp].forEach((P, pi) => (P.field || []).forEach(k => { cur.add(k.iid); if (specFieldSeen && !specFieldSeen.has(k.iid) && k.def) add(pi === 0 ? V.me : 1 - V.me, k.def.id, k.def.name, k.def.type === 'nexus' ? '配置' : '召喚', '', k.def); })); specFieldSeen = cur; }
  (V.fx || []).forEach(f => { if (f && f.n && !noneR(f)) add(f.p, f.cid, f.n, '効果', f.t || '', null); });
  const ent = items.filter(it => it.label !== '効果'), rest = items.filter(it => it.label === '効果');
  if (ent.length) { specFxQ.unshift(...ent); if (specFxBusy) { clearTimeout(specFxT); specFxBusy = false; } }   // 召喚・配置・使用は、表示中のものを切り上げてすぐ出す
  rest.forEach(it => specFxQ.push(it)); specFxNext();
}
