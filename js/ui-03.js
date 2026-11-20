let _idMap = null, _idMapFor = null; const _defOk = new WeakMap();
function defById() { if (_idMapFor !== CARD_LIST) { _idMap = new Map(CARD_LIST.map(c => [c.def.id, c.def])); _idMapFor = CARD_LIST; } return _idMap; }
function packDefs(m) {
  const mp = defById();
  return JSON.parse(JSON.stringify(m, function (k, v) {
    if (k === 'def' && v && typeof v === 'object' && v.id && !Array.isArray(v)) {
      let ok = _defOk.get(v);
      if (ok === undefined) { const L = mp.get(v.id); ok = !!L && (L === v || JSON.stringify(L) === JSON.stringify(v)); _defOk.set(v, ok); }
      if (ok) return { __id: v.id };
    }
    return v;
  }));
}
function unpackDefs(o) {
  if (!o || typeof o !== 'object') return o;
  const mp = defById();
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = unpackDefs(o[i]); return o; }
  for (const k in o) { const v = o[k]; if (k === 'def' && v && typeof v === 'object' && v.__id) { const d = mp.get(v.__id); if (d) o[k] = d; } else if (v && typeof v === 'object') o[k] = unpackDefs(v); }
  return o;
}
function dsend(m) {
  if (!dc || !dc.open) return false;
  try {
    if (m && m.t === 'state') m = { t: 'state', v: packDefs(m.v), pk: 1 };
    // PeerJSは1回16300バイトまで(日本語は1文字3バイト)。UTF-8のバイト数で分割し、base64にして送る
    const bytes = new TextEncoder().encode(JSON.stringify(m)), CH = 9000;
    if (bytes.length <= 12000) dc.send(m);
    else {
      const id = Math.random().toString(36).slice(2, 8), n = Math.ceil(bytes.length / CH);
      for (let i = 0; i < n; i++) { const part = bytes.subarray(i * CH, (i + 1) * CH); let bin = ''; for (let k = 0; k < part.length; k += 3000) bin += String.fromCharCode.apply(null, part.subarray(k, k + 3000)); dc.send({ t: 'chunk', id, i, n, d: btoa(bin) }); }
    }
    return true;
  } catch (e) { return false; }
}
const inMatch = () => !cpu && !solo && !RP && !!(isHost ? G : V);
function connLost() {
  if (!inMatch()) { toast('接続が切断されました'); return; }
  toast('接続が切れました。つなぎ直しています…');
  if (!isHost) guestReconnect(); else if (peer && peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) { } }
}
function guestReconnect() {
  if (isHost || rcBusy || !lastRoom || !peer) return; rcBusy = true; let tries = 0;
  const go = () => {
    if (dc && dc.open) { rcBusy = false; return; }
    try {
      if (peer.destroyed) { peer = new Peer(); peer.on('open', go); peer.on('error', () => { }); return; }
      if (peer.disconnected) peer.reconnect();
      dc = peer.connect(lastRoom, { reliable: true, serialization: 'json' }); setupDC();
    } catch (e) { }
    setTimeout(() => { if (dc && dc.open) rcBusy = false; else if (++tries < 40) go(); else { rcBusy = false; toast('つなぎ直せませんでした。ページを再読み込みして入り直してください'); } }, 3000);
  };
  go();
}
setInterval(() => {
  if (!dc || !inMatch()) return;
  if (dc.open) { dsend({ t: 'ping' }); if (Date.now() - lastRx > 20000) { try { dc.close(); } catch (e) { } connLost(); lastRx = Date.now(); } }
  else if (!isHost && !rcBusy) guestReconnect();
}, 5000);
setInterval(() => {   // 部屋を作った側: 受付サーバーとの接続が切れていたら、つなぎ直す(相手は同じ部屋IDで戻ってくる)
  if (!isHost || !hostMeta || !G || solo || cpu || RP) return;
  try { if (!peer || peer.destroyed) asHost(hostMeta.id, 0, hostMeta.fr); else if (peer.disconnected) peer.reconnect(); } catch (e) { }
}, 4000);
const hostRecoverNow = () => { if (!isHost || !hostMeta || !G || solo || cpu || RP) return; try { if (!peer || peer.destroyed) asHost(hostMeta.id, 0, hostMeta.fr); else if (peer.disconnected) peer.reconnect(); } catch (e) { } };
['visibilitychange', 'pageshow', 'online', 'focus', 'resume'].forEach(ev => (ev === 'visibilitychange' ? document : window).addEventListener(ev, () => { if (!document.hidden) { hostRecoverNow(); setTimeout(hostRecoverNow, 1500); setTimeout(hostRecoverNow, 4000); } }));
document.addEventListener('visibilitychange', () => { if (document.hidden || !inMatch()) return; if (!dc || !dc.open) connLost(); });
/* 通信が切れたまま戻らないときは、いつでもホームへ戻れる(観戦・配信画面でも出る) */
let connLostAt = 0;
setInterval(() => {
  let bar = document.getElementById('connbar');
  const inGame = !!(G || V) && !$('game').hidden && !solo && !cpu && !RP && (SPEC || inMatch());
  const lost = inGame && (!dc || !dc.open);
  if (!lost) { connLostAt = 0; if (bar) bar.hidden = true; return; }
  if (!connLostAt) connLostAt = Date.now();
  if (Date.now() - connLostAt < 6000) return;
  if (!bar) { bar = document.createElement('div'); bar.id = 'connbar'; bar.innerHTML = '<span>通信が切れています。つなぎ直し中…</span><button id="connhome">ホームに戻る</button>'; document.body.appendChild(bar); bar.querySelector('button').addEventListener('click', () => { bar.hidden = true; connLostAt = 0; resetToHome('通信が切れたため、ホームに戻りました'); }); }
  bar.hidden = false;
}, 1500);
let cpu = false, matchTest = false, guestName = '';
const getName = () => { const v = ($('myName').value || '').trim().slice(0, 12); return v || 'プレイヤー'; };
const nameOk = () => !!($('myName').value || '').trim();
function nameGate() {
  const ok = nameOk(); document.body.classList.toggle('noname', !ok);
  document.querySelectorAll('#lobby .box:not(.b-name):not(.b-adm)').forEach(b => { try { b.inert = !ok; } catch (e) { } });
  const m = $('nameMsg'); if (m) m.hidden = ok;
}
try { $('myName').value = localStorage.getItem('bs-name') || ''; } catch (e) { }
let nameT = 0;
$('myName').oninput = () => { try { localStorage.setItem('bs-name', $('myName').value.trim().slice(0, 12)); } catch (e) { } nameGate(); clearTimeout(nameT); nameT = setTimeout(() => { try { pushSync(); } catch (e) { } }, 1500); };
nameGate();
$('bMatch').onclick = async () => {
  const d = getDeck(); if (!d) return;
  const id = await roomId(); if (!id) return;
  myDefs = d.defs; matchTest = false; cpu = false;
  asHost(id, 0);
};
// 同じ合言葉で先に待っていた側が部屋になり、後から入った側が参加する(利用者はホスト/ゲストを意識しない)
let hostMeta = null;
function asHost(id, n, fr) {
  hostMeta = { id, fr }; isHost = true; if (peer) { try { peer.destroy(); } catch (e) { } }
  peer = new Peer(id);
  peer.on('open', () => { if (fr) { say('部屋を作りました。参加する人を待っています…(この画面を開いたままにしてください)'); freeReg(); } else say('同じ合言葉の相手を待っています…(この画面を開いたままにしてください)'); });
  peer.on('connection', c => {
    if (G && !solo && !cpu) { specIntake(c, true); return; }   // 対戦が始まっている: 戻ってきたゲストか、観戦者か
    if (dc && dc.open) { c.close(); return; }
    if (fr && free.mine) { free.mine.st = 'play'; free.mine.n2 = ''; freeReg(); }   // 部屋は消さず「対戦中」として一覧に残す
    dc = c; setupDC();
  });
  peer.on('close', () => { setTimeout(() => { try { if (isHost && G && hostMeta && !solo && !cpu) hostRecoverNow(); } catch (e) { } }, 1500); });
  peer.on('disconnected', () => { try { if (isHost && peer && !peer.destroyed) setTimeout(() => { try { if (peer && peer.disconnected && !peer.destroyed) peer.reconnect(); } catch (e) { } }, 1000); } catch (e) { } });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && G && !solo && !cpu) { setTimeout(() => { if (isHost && G) asHost(id, 0, fr); }, 3000); return; }
    if (e.type === 'unavailable-id' && fr && n < 5) { const nid = 'bsprac-f-' + Math.random().toString(36).slice(2, 10); if (free.mine) free.mine.id = nid; asHost(nid, n + 1, true); }
    else if (e.type === 'unavailable-id' && n < 3) asGuest(id, n + 1); else say('エラー: ' + e.type);
  });
}
function asGuest(id, n, fr) {
  isHost = false; if (peer) { try { peer.destroy(); } catch (e) { } }
  say(fr ? '部屋に入っています…' : '相手を探しています…');
  peer = new Peer();
  peer.on('open', () => { lastRoom = id; dc = peer.connect(id, { reliable: true, serialization: 'json' }); setupDC(); });
  peer.on('error', e => {
    if (fr && e.type === 'peer-unavailable') { say('この部屋はもう閉じられていました。一覧を更新します'); try { peer.destroy(); } catch (x) { } peer = null; lastRoom = null; free.joining = false; freeStart(); freeAsk(); return; }
    if (e.type === 'peer-unavailable' && n < 3) setTimeout(() => asHost(id, n + 1), 800); else { free.joining = false; say('エラー: ' + e.type); }
  });
}
/* --- フリー対戦(合言葉なし): 募集中の部屋の一覧 ---
   固定IDの「ロビー係」を、最初に画面を開いた人が受け持つ。ほかの人はそこへつないで一覧をもらう。受け持ちの人が抜けたら、次の人が引き継ぐ。 */
const HUB_ID = 'bsprac-free-hub-v1', FREE_MAX = 8;
const free = { peer: null, hub: false, conns: new Map(), rooms: new Map(), link: null, mine: null, list: [], shown: [], stopped: true, timer: null, joining: false, got: false };
const freeSay = m => { };   // 部屋がある時だけ一覧を表示する(状態の文言は出さない)
const roomOf = m => ({ ic: icoOk(m.ic) && m.ic.length < 4000 ? m.ic : '', id: m.id, name: m.name, msg: m.msg, st: m.st === 'play' ? 'play' : 'wait', n2: str(m.n2, 12), sp: m.sp ? 1 : 0, ns: Math.min(99, +m.ns || 0), nt: m.nt ? 1 : 0 });
const freeSnap = () => { const t = Date.now(); free.rooms.forEach((r, k) => { if (r._at && t - r._at > 60000) free.rooms.delete(k); }); return [...free.rooms.values()].map(r => ({ ic: r.ic || '', id: r.id, name: r.name, msg: r.msg, st: r.st, n2: r.n2, sp: r.sp, ns: r.ns, nt: r.nt })); };   // 一定時間(60秒)更新のない部屋は、残骸として一覧から消す
function hubBroadcast() { const rs = freeSnap(); free.conns.forEach(c => { try { if (c.open) c.send({ t: 'rooms', rooms: rs }); } catch (e) { } }); freeGotRooms(rs); }
function hubHandle(c, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'reg' && typeof m.id === 'string') { free.rooms.set(m.id.slice(0, 40), Object.assign(roomOf({ id: m.id.slice(0, 40), name: str(m.name, 12) || 'プレイヤー', msg: str(m.msg, 24), st: m.st, n2: m.n2, sp: m.sp, ns: m.ns, nt: m.nt }), { _at: Date.now() })); c._room = m.id; hubBroadcast(); }
  else if (m.t === 'unreg') { free.rooms.delete(String(m.id)); hubBroadcast(); }
  else if (m.t === 'list') { try { c.send({ t: 'rooms', rooms: freeSnap() }); } catch (e) { } }
}
function freeStart() {
  if (!free.stopped || typeof Peer === 'undefined' || free.joining) return;
  free.stopped = false; free.got = false; freeSay('ロビーにつないでいます…');
  if (SRV_FLAGS.lobby !== false && !free.srvOff) { freeSrvStart(); return; }   // サーバーのロビー(つながらないときは、これまでの端末同士の方式)
  freeTryHub();
}
/* サーバーのロビー: 部屋の一覧はサーバーが持つ。対戦そのものは、これまでどおり端末同士の直接通信 */
async function freeSrvPoll() {
  const r = await apiPost('/lobby/list', { name: nameOk() ? getName() : '', dev: devId(), plat: platOf() });
  if (r && Array.isArray(r.rooms)) { if (!free.stopped) freeGotRooms(r.rooms); return r; }
  return null;
}
async function freeSrvStart() {
  const r = await freeSrvPoll(); if (free.stopped) return;
  if (!r) { free.srvOff = true; freeTryHub(); return; }   // サーバーにつながらない: 端末同士の方式に切り替える
  free.srv = true; free.srvFail = 0; clearInterval(free.pollT);
  free.pollT = setInterval(async () => {
    if (free.stopped || document.hidden) return;
    const x = await freeSrvPoll();
    if (x) free.srvFail = 0; else if (++free.srvFail >= 3 && !free.stopped) { clearInterval(free.pollT); free.srv = false; free.srvOff = true; freeTryHub(); }
  }, 8000);
  if (free.mine) freeReg();
}
document.addEventListener('visibilitychange', () => { try { if (!document.hidden && free.srv && !free.stopped) freeSrvPoll(); } catch (e) { } });
addEventListener('pagehide', () => { try { if (free.srv && free.mine && !(G && !solo && !cpu)) apiPost('/lobby/unreg', { id: free.mine.id }); } catch (e) { } });   // 画面を閉じたら、募集中の部屋をすぐ消す
function freeStop() {
  free.stopped = true; clearTimeout(free.timer); clearInterval(free.pollT); free.srv = false;
  const p = free.peer; free.peer = null; free.hub = false; free.link = null; free.conns.clear(); free.rooms.clear();
  try { if (p) p.destroy(); } catch (e) { }
  free.list = []; free.shown = []; freeRender();
}
function freeRetry(ms) { if (free.stopped) return; const p = free.peer; free.peer = null; free.hub = false; free.link = null; free.conns.clear(); free.rooms.clear(); try { if (p) p.destroy(); } catch (e) { } clearTimeout(free.timer); free.timer = setTimeout(freeTryHub, ms || (1500 + Math.random() * 2500)); }
function freeTryHub() {
  if (free.stopped || free.peer) return;
  let p; try { p = new Peer(HUB_ID); } catch (e) { return; }
  free.peer = p;
  p.on('open', () => {
    if (free.peer !== p) return; free.hub = true; freeSay('ロビーに接続しました(募集中の部屋を表示します)');
    if (free.mine && peer && !peer.destroyed) free.rooms.set(free.mine.id, Object.assign(roomOf(free.mine), { _at: Date.now() }));
    hubBroadcast();
  });
  p.on('connection', c => {
    free.conns.set(c.peer, c);
    c.on('open', () => { try { c.send({ t: 'rooms', rooms: freeSnap() }); } catch (e) { } });
    c.on('data', m => hubHandle(c, m));
    c.on('close', () => { free.conns.delete(c.peer); if (c._room) free.rooms.delete(c._room); hubBroadcast(); });
    c.on('error', () => { });
  });
  p.on('disconnected', () => { try { if (free.peer === p && !p.destroyed) p.reconnect(); } catch (e) { } });
  p.on('error', e => {
    if (free.peer !== p) return;
    if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { } free.peer = null; freeJoinHub(); }
    else freeRetry();
  });
}
function freeJoinHub() {
  if (free.stopped || free.peer) return;
  let p; try { p = new Peer(); } catch (e) { return; }
  free.peer = p; let c = null;
  const giveUp = setTimeout(() => { if (free.peer === p && !(c && c.open)) freeRetry(); }, 9000);
  p.on('open', () => {
    if (free.peer !== p) return;
    c = p.connect(HUB_ID, { reliable: true, serialization: 'json' });
    c.on('open', () => { if (free.peer !== p) return; clearTimeout(giveUp); free.link = c; freeSay('ロビーに接続しました(募集中の部屋を表示します)'); if (free.mine) freeReg(); c.send({ t: 'list' }); });
    c.on('data', m => { if (m && m.t === 'rooms' && Array.isArray(m.rooms)) freeGotRooms(m.rooms); });
    c.on('close', () => { if (free.peer === p) freeRetry(800 + Math.random() * 1500); });
    c.on('error', () => { });
  });
  p.on('error', e => { if (free.peer !== p) return; clearTimeout(giveUp); freeRetry(); });
  p.on('disconnected', () => { try { if (free.peer === p && !p.destroyed) p.reconnect(); } catch (e) { } });
}
function freeAsk() { try { if (free.srv) { freeSrvPoll(); return; } if (free.link && free.link.open) free.link.send({ t: 'list' }); else if (free.hub) hubBroadcast(); } catch (e) { } }
function freeReg() {
  const m = free.mine; if (!m) return;
  if (free.srv) { apiPost('/lobby/reg', Object.assign(roomOf(m), { dev: devId(), plat: platOf() })); return; }
  if (free.hub) { free.rooms.set(m.id, Object.assign(roomOf(m), { _at: Date.now() })); hubBroadcast(); }
  else if (free.link && free.link.open) { try { free.link.send(Object.assign({ t: 'reg' }, roomOf(m))); } catch (e) { } }
}
function freeUnreg() {
  const m = free.mine; if (!m) return;
  if (free.srv) { apiPost('/lobby/unreg', { id: m.id }); return; }
  if (free.hub) { free.rooms.delete(m.id); hubBroadcast(); }
  else if (free.link && free.link.open) { try { free.link.send({ t: 'unreg', id: m.id }); } catch (e) { } }
}
setInterval(() => { try { if (free.mine && peer && !peer.destroyed) freeReg(); } catch (e) { } }, 15000);   // 部屋の生存通知
function freeDelRoom(id) { if (free.srv) { apiPost('/lobby/unreg', { id }); setTimeout(freeSrvPoll, 400); } else if (free.hub) { free.rooms.delete(id); hubBroadcast(); } else if (free.link && free.link.open) { try { free.link.send({ t: 'unreg', id }); } catch (e) { } } toast('部屋を削除しました'); }
function freeCancelRoom(started) {
  freeUnreg(); free.mine = null;
  if (!started) { const pr = peer; peer = null; isHost = false; try { if (pr) pr.destroy(); } catch (e) { } say(''); }
  freeButtons();
}
function freeButtons() { const b = $('bFreeMake'); if (b) b.textContent = free.mine ? '募集をやめる' : '部屋を作る'; }
function freeGotRooms(rs) {
  const first = !free.got; free.got = true; free.list = (Array.isArray(rs) ? rs : []).filter(r => r && typeof r.id === 'string' && !(free.mine && r.id === free.mine.id)).slice(0, 200);
  { const sn = free.seen || (free.seen = new Set()); if (sn.size > 500) sn.clear(); free.list.forEach(r => { if (sn.has(r.id)) return; sn.add(r.id); if (!first && r.nt && r.st !== 'play') freeNotify(r); }); }
  const wait = free.list.filter(r => r.st !== 'play'), ids = new Set(wait.map(r => r.id)), keep = free.shown.filter(i => ids.has(i));   // いま見えている部屋は、残っていればそのまま(対戦中の部屋は別枠で常に表示)
  const rest = wait.map(r => r.id).filter(i => !keep.includes(i));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  free.shown = keep.concat(rest).slice(0, FREE_MAX); freeRender();
}
const API = 'https://bsp.standard-reg-fuk.workers.dev';   // Cloudflare Worker(対戦記録の受け取り・通知・設定の配信)
let SRV_FLAGS = {};   // サーバーから届く設定(cpuRec=false にするとCPU対戦の記録は送らない)
let PUSH_KEY = '', pushOn = false;
const u8 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const r = atob(s), u = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; };
function devId() { try { let d = localStorage.getItem('bs-devid'); if (!d) { d = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 14); localStorage.setItem('bs-devid', d); } return d; } catch (e) { return 'tmp' + Math.random().toString(36).slice(2, 10); } }   // 端末ごとのランダムなID(名前とは無関係)
function platOf() { const u = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Win' : /Mac/.test(u) ? 'Mac' : /Linux|CrOS/.test(u) ? 'Linux' : ''; }
function seenPing() { try { if (nameOk()) apiPost('/seen', { name: getName(), dev: devId(), plat: platOf() }); } catch (e) { } }   // 最終ログイン・オンライン状態の記録(サーバー側で、30秒に1回までしか書き込まない)
async function apiPost(path, body, method) { try { const r = await fetch(API + path, { method: method || 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }); return r.ok ? await r.json() : null; } catch (e) { return null; } }
setTimeout(seenPing, 2500); setInterval(() => { if (!document.hidden) seenPing(); }, 60000);   // アプリを開いて見えている間は、60秒ごとに「オンライン」を知らせる
 try { $('myName').addEventListener('change', seenPing); document.addEventListener('visibilitychange', () => { if (!document.hidden) seenPing(); }); } catch (e) { }
// サーバーの設定(通知文・CPUの重み・通知用の鍵)を読み込む
(async function loadSrvCfg() {
  try {
    const r = await fetch(API + '/cfg', { cache: 'no-cache' }); if (!r.ok) return; const j = await r.json();
    if (j.title) window.__ntFile = Object.assign({}, window.__ntFile || {}, { title: j.title, body: j.body != null ? j.body : '' });
    if (j.w && typeof j.w === 'object') Object.keys(j.w).forEach(k => { if (k in CPUW && typeof j.w[k] === 'number') CPUW[k] = j.w[k]; });
    if (j.flags && typeof j.flags === 'object') SRV_FLAGS = j.flags;
    if (Array.isArray(j.samples) && j.samples.length) { window.SAMPLE_DECKS = j.samples; window.__srvSamples = true; try { bRefreshSelects(); } catch (e) { } }   // 管理者が配信したサンプルデッキ(フォルダ・内蔵より優先)
    try { if (typeof admSmLoad === 'function') admSmLoad(); } catch (e) { }
    showNotice(j.notice); PUSH_KEY = j.vapid || ''; pushSync();
  } catch (e) { }
})();
// トップのお知らせ(URLの変更など)。管理者メニューから出し入れできる

/* 旧サイト(GitHub Pages)を開いたとき、ホームに来るたびに引っ越しの案内を大きく出す */
const NEW_URL = 'https://bsp-app.standard-reg-fuk.workers.dev';
function isOldSite() { try { return /\.github\.io$/i.test(location.hostname) || /[?&]oldsite=1/.test(location.search); } catch (e) { return false; } }
function oldSiteShow() {
  if (!isOldSite()) return; const m = $('oldSite'); if (!m) return;
  $('oldSiteUrl').href = NEW_URL; $('oldSiteUrl').textContent = NEW_URL; $('oldSiteGo').href = NEW_URL; m.hidden = false;
}
$('oldSiteX').onclick = () => { $('oldSite').hidden = true; };
$('oldSiteCp').onclick = () => { const b = $('oldSiteCp'); const ok = () => { b.textContent = 'コピーしました'; setTimeout(() => b.textContent = 'URLをコピー', 1500); };
  try { navigator.clipboard.writeText(NEW_URL).then(ok, () => { prompt('コピーしてください', NEW_URL); }); } catch (e) { prompt('コピーしてください', NEW_URL); } };
oldSiteShow();
function showNotice(n) {
  const bar = $('noticeBar'); if (!bar) return;
  let gone = ''; try { gone = localStorage.getItem('bs-notice-x') || ''; } catch (e) { }
  if (!n || !n.text || String(n.id) === gone) { bar.hidden = true; return; }
  $('noticeTx').textContent = n.text; const a = $('noticeGo'); if (n.url) { a.href = n.url; a.textContent = n.label || '開く'; a.hidden = false; } else a.hidden = true;
  bar.hidden = false; bar.dataset.id = n.id;
}
$('noticeX').onclick = () => { const b = $('noticeBar'); b.hidden = true; try { localStorage.setItem('bs-notice-x', b.dataset.id || ''); } catch (e) { } };
// このアプリの通知(プッシュ)の登録。通知がオンで許可されているときだけ、プレイヤー名と一緒にサーバーへ登録する
async function pushSync() {
  try {
    if (!PUSH_KEY || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!(ntPref() && Notification.permission === 'granted')) { if (sub) { const ep = sub.endpoint; await sub.unsubscribe().catch(() => { }); apiPost('/sub', { endpoint: ep }, 'DELETE'); } pushOn = false; return; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(PUSH_KEY) });
    const name = (($('myName').value || '').trim().slice(0, 12)); if (!name) { pushOn = false; return; }
    const r = await apiPost('/sub', { sub: sub.toJSON(), name }); pushOn = !!r; window.__pushEp = sub.endpoint;
  } catch (e) { pushOn = false; }
}
try { navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.t === 'push') toast(e.data.title); }); } catch (e) { }
const NT_DEF = { title: '{name}が部屋を作成しました', body: '{msg}' };
function ntOnly() { let a = null; try { a = JSON.parse(localStorage.getItem('bs-nt-tpl') || 'null'); } catch (e) { } const l = a && Array.isArray(a.only) ? a.only : (window.__ntFile && Array.isArray(window.__ntFile.only) ? window.__ntFile.only : []); return l.map(x => String(x).trim()).filter(Boolean); }
function ntTpl() { let a = {}; try { a = JSON.parse(localStorage.getItem('bs-nt-tpl') || '{}') || {}; } catch (e) { } if (!a.title && window.__ntFile) a = window.__ntFile; return { title: a.title || NT_DEF.title, body: a.body != null && a.title ? a.body : (a.body != null ? a.body : NT_DEF.body) }; }
try { fetch('notify.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.title) window.__ntFile = j; }).catch(() => { }); } catch (e) { }
function ntPref() { try { return localStorage.getItem('bs-nt-off') !== '1'; } catch (e) { return true; } }   // 通知のオン・オフ(設定で切り替える。初期はオン)
function ntOn() { try { return ntPref() && 'Notification' in window && Notification.permission === 'granted'; } catch (e) { return false; } }
function freeNotify(r) {
  try {
    if (!ntOn() || pushOn) return;   // プッシュ通知が使えるときは、サーバーからの通知にまかせる
    { const ol = ntOnly(); if (ol.length && !ol.includes((getName() || '').trim())) return; }   // 管理者が指定したプレイヤー名の人だけに通知
    const tp = ntTpl(), fm = x => String(x || '').replace(/\{name\}/g, r.name || 'プレイヤー').replace(/\{msg\}/g, r.msg || '');
    const title = fm(tp.title);
    if (document.visibilityState === 'visible') { toast(title); return; }
    const opt = { body: fm(tp.body), tag: 'bs-room', renotify: true, icon: 'icons/icon-192.png' };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opt)).catch(() => { try { new Notification(title, opt); } catch (e) { } });
    else new Notification(title, opt);
  } catch (e) { }
}
