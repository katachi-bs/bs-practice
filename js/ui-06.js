function bcTop() {
  const t = $('bctop'); if (!t || !V) return;
  { const fd = BC.on && !!(V.mull || V.pick || (V.wait && (V.wait.kind === 'pick' || V.wait.kind === 'mull'))); if (BC.fd && !fd) { BC.hold = true; BC.holdT = Date.now(); }   // マリガン等が終わっても、スタートステップに入るまで伏せたまま。入った瞬間に両者の手札を一斉に表にする
    if (BC.hold && !fd && !BC.flip && ((animStep || V.step) === 'start' || (BC.holdT && Date.now() - BC.holdT > 9000) || (V.turnNo > 1) || ((animStep || V.step) !== 'start' && V.step !== 'start' && !animStep && V.turnNo > 0 && Date.now() - BC.holdT > 4000))) {
      BC.hold = false; BC.flip = true; document.body.classList.add('bcfl1'); setTimeout(() => { document.body.classList.remove('bcfd', 'bcfl1'); document.body.classList.add('bcfl2'); setTimeout(() => { document.body.classList.remove('bcfl2'); BC.flip = false; }, 700); }, 330);
    }
    BC.fd = fd; if (!BC.flip) document.body.classList.toggle('bcfd', fd || !!BC.hold); } const cur = animStep || V.step, b = V.battle;
  const started = V.turnNo != null && V.turnNo > 0 && BC_STEP[cur];
  const fl = b && (b.phase === 'flash1' || b.phase === 'flash2') ? b.prio : null;
  const txt = fl != null ? 'フラッシュ' : (BC_STEP[cur] || ''), key = started ? V.turnNo + ':' + (V.turn === V.me ? 0 : 1) + ':' + txt : '';
  const chg = BC.stKey !== undefined && BC.stKey !== key && key; const old = BC.stTxt; BC.stKey = key; BC.stTxt = txt;
  const side = fl != null ? fl : V.turn, tp = started ? side : -1;
  const st = p => tp === p ? '<span class="stp' + (fl != null ? ' fl' : '') + '"><b class="stn' + (chg ? ' in' : '') + '">' + esc(txt) + '</b>' + (chg && old ? '<b class="sto">' + esc(old) + '</b>' : '') + '</span>' : '';
  t.innerHTML = '<span class="n nb"><s>' + esc(absName(V.me)) + '</s>' + st(V.me) + '</span><span class="m"><b>' + (started ? V.turnNo + 'ターン' : '準備中') + '</b></span><span class="n nr"><s>' + esc(absName(1 - V.me)) + '</s>' + st(1 - V.me) + '</span>';
}
function bcOn() {
  if (!document.body.classList.contains('adm')) { toast('配信モードは管理者モードでのみ使えます'); return; }
  if (!(SPEC || RP) || !V) { toast('観戦・リプレイの画面から使えます'); return; }
  BC.on = true; BC.q = []; orient = 'auto'; menuOpen = false; sideOpen = true; document.body.classList.add('bc'); document.body.classList.remove('fw');
  { const r = $('rpbar'); if (r && r.parentNode !== document.body) { BC.rpHome = { p: r.parentNode, n: r.nextSibling }; document.body.appendChild(r); } }
  $('bctop').hidden = false; $('bcfoot').hidden = false; $('bcbar').style.display = 'flex'; bcBar(); bcTop(); specBody(); render(); bcShow();
}
function bcOff() { BC.hold = false; clearTimeout(BC.pendT); clearTimeout(BC.dqT); BC.pend = null; BC.dq = []; BC.dqT = null; { const be = $('bcend'); if (be) be.remove(); } { const r = $('rpbar'); if (r && BC.rpHome) { BC.rpHome.p.insertBefore(r, BC.rpHome.n); BC.rpHome = null; } } BC.on = false; BC.q = []; { const s = $('stage'); if (s) { s.style.removeProperty('--cwb'); s.style.removeProperty('--cw'); } } ['hand', 'oppHand'].forEach(id => { const e = $(id); if (e) e.style.removeProperty('--hcw'); }); document.body.classList.remove('bc', 'bchot', 'nohand', 'bcfd', 'bcopen'); $('bctop').hidden = true; $('bcfoot').hidden = true; $('bcbar').style.display = 'none'; specBody(); if (V) render(); }
function bcShow() { document.body.classList.add('bchot'); clearTimeout(BC.hot); BC.hot = setTimeout(() => { if (!document.querySelector('#side:hover,#rpbar:hover,#bcbar:hover,.sheet:hover')) document.body.classList.remove('bchot'); else BC.hot = setTimeout(bcShow, 1200); }, 1800); }
function bcNext() {
  if (RP) { rpPause(); if (RP.i < RP.n) rpGoto(RP.i + 1, true); bcBar(); return; }
  if (!BC.q.length) return; const raw = BC.q.shift(); lastRaw = raw; setV(flipV(raw)); bcBar();
}
function bcLatest() { if (!BC.q.length) return; const raw = BC.q[BC.q.length - 1]; BC.q = []; lastRaw = raw; setV(flipV(raw)); bcBar(); }
function bcBar() {
  const b = $('bcbar'); if (!b) return; const nq = BC.q.length, nh = document.body.classList.contains('nohand');
  const on = (k, t, f) => '<button class="' + (f ? 'on' : '') + '" data-bc="' + k + '">' + t + '</button>';
  b.innerHTML = (RP ? '' : on('manual', '手動送り ' + (BC.manual ? 'ON' : 'OFF'), BC.manual)) + '<button data-bc="next" title="Space / →">次へ ▶' + (nq ? ' (' + nq + ')' : '') + '</button>' + (nq > 1 ? '<button data-bc="latest">最新へ</button>' : '') +
    on('hands', '手札を隠す', nh) + on('fxoff', fxOff ? '詳細: 非表示' : '詳細: 表示', fxOff) + '<button data-bc="full">全画面</button><button data-bc="off" title="Esc">配信モード終了</button>' +
    '<div class="bcb-h">このメニューは、画面の上にマウスを持っていくと出ます。録画では出ません。Space/→で次へ</div>';
}
function bcClick(t) {
  const b = t.closest('#bcbar [data-bc]'); if (!b) return false; const k = b.dataset.bc;
  if (k === 'next') bcNext(); else if (k === 'latest') bcLatest();
  else if (k === 'manual') { BC.manual = !BC.manual; if (!BC.manual) bcLatest(); bcBar(); }
  else if (k === 'fxoff') { fxOff = !fxOff; if (fxOff) { const f = $('fx'); if (f) f.hidden = true; fxQ = []; } bcBar(); }
  else if (k === 'hands') { document.body.classList.toggle('nohand'); bcBar(); }
  else if (k === 'full') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { } }
  else if (k === 'off') bcOff();
  bcShow(); return true;
}
(function () {
  document.addEventListener('click', e => { if (BC.on && bcClick(e.target)) e.stopPropagation(); }, true);
  document.addEventListener('mousemove', e => { if (BC.on && (e.clientY < 70 || (e.target.closest && e.target.closest('#side,#rpbar,#bcbar')))) bcShow(); });
  document.addEventListener('touchstart', e => { if (BC.on && e.touches[0] && e.touches[0].clientY < 70) bcShow(); }, { passive: true });
  addEventListener('resize', () => { if (BC.on) bcFit(); });
  document.addEventListener('keydown', e => {
    if (!BC.on || (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
    if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); bcNext(); }
    else if (e.key === 'ArrowLeft' && RP) { e.preventDefault(); rpPause(); rpGoto(RP.i - 1, false); bcBar(); }
    else if (e.key === 'Escape') bcOff();
  });
})();

/* ---------- クリック ---------- */
function specClick(t) {
  if (t.closest('[data-bcon]')) { if (BC.on) bcOff(); else bcOn(); return true; }
  if (rpClick(t)) return true;
  let b;
  if (t.closest('[data-rclose]')) { $('result').hidden = true; resShown = true; specNoResult = true; return true; }
  if (t.closest('[data-sleave]')) { if (RP) { rpPause(); specReset(); resetForNew(); document.body.classList.remove('ingame'); $('game').hidden = true; V = null; snap = null; lastSeq = null; rpOpenList(); } else { try { if (dc && dc.open) dsend({ t: 'bye' }); } catch (e) { } resetToHome(''); } return true; }
  if (t.closest('[data-sview]')) { specView(); return true; }
  if ((b = t.closest('[data-sori]'))) { specOri(b.dataset.sori); return true; }
  if (t.closest('[data-roster]')) { openRoster(); return true; }
  if (t.closest('[data-chat]')) { chatOpen = !chatOpen; if (chatOpen) chatUnread = 0; specBody(); render(); if (chatOpen) setTimeout(() => { const i = $('chatIn'); if (i && !('ontouchstart' in window)) i.focus(); }, 50); return true; }
  if (t.closest('[data-chatsend]')) { chatSend(); return true; }
  if (t.closest('[data-sstampbtn]')) { openSpecStamps(); return true; }
  if ((b = t.closest('[data-sstamp]'))) { const pal = $('specPal'); if (pal) pal.hidden = true; if (Date.now() - (specStAt || 0) > 400) { specStAt = Date.now(); specSendMsg({ t: 'sstamp', e: b.dataset.sstamp }); } return true; }
  { const pal = $('specPal'); if (pal && !pal.hidden && !t.closest('#specPal')) pal.hidden = true; }
  return false;
}
let specStAt = 0, specNoResult = false;

/* ---------- ロビー側のボタン ---------- */
let rpLastN = null;
function rpEditNote(sp) {
  const e = rpLoad()[+sp.dataset.rpn]; if (!e) return;
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'rpni'; inp.maxLength = 60; inp.value = e.note || ''; inp.placeholder = '一行メモ';
  sp.replaceWith(inp); inp.focus(); inp.select(); let done = false;
  const fin = save => { if (done) return; done = true; if (save) rpPatch(e, { note: inp.value.trim().slice(0, 60) }); rpList(); };
  inp.onkeydown = ev => { if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); };
  inp.onblur = () => fin(true);
}
$('bReplay').onclick = rpOpenList; $('bRpImport').onclick = rpImportDialog; $('rpBack').onclick = rpCloseList; $('rpImp').onclick = rpImportDialog;
$('replay').addEventListener('click', e => {
  const t = e.target; let b;
  if ((b = t.closest('[data-rpplay]'))) { const x = rpLoad()[+b.dataset.rpplay]; if (x) rpStart(x); }
  else if ((b = t.closest('[data-rpexp]'))) rpExport(+b.dataset.rpexp);
  else if ((b = t.closest('[data-rptab]'))) { rpTab = b.dataset.rptab; rpList(); }
  else if ((b = t.closest('[data-rpfav]'))) { const e = rpLoad()[+b.dataset.rpfav]; if (e) { rpPatch(e, { fav: !e.fav }); rpList(); } }
  else if ((b = t.closest('[data-rpn]'))) { const now = Date.now(), i = b.dataset.rpn; if (rpLastN && rpLastN.i === i && now - rpLastN.t < 450) { rpLastN = null; rpEditNote(b); } else rpLastN = { i, t: now }; }
  else if ((b = t.closest('[data-rpdel]'))) { const a = rpLoad(); a.splice(+b.dataset.rpdel, 1); rpSaveAll(a); rpList(); }
});
$('rpFile').onchange = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => rpImportText(String(r.result || '')); r.readAsText(f); };

/* --- バグ・要望報告掲示板 ---
   BBS_DB に Firebase Realtime Database のURLを入れると、投稿が保存されて一覧に出る(管理人はFirebaseの画面でも読める)。
   空のままのときは、GitHubの「新しいIssue」の画面を開いて投稿する(GitHubのアカウントが必要)。 */
const BBS_DB = 'https://bs-project-1c372-default-rtdb.firebaseio.com';
const BBS_REPO = 'katachi-bs/bs-practice';
let bbsLast = 0;
let bbsRows = [], bbsPage = 0;
const BBS_PER = 10;
function bbsShow() {
  const box = $('bbsList'); if (!box) return;
  const pages = Math.max(1, Math.ceil(bbsRows.length / BBS_PER)); bbsPage = Math.min(Math.max(0, bbsPage), pages - 1);
  const rows = bbsRows.slice(bbsPage * BBS_PER, bbsPage * BBS_PER + BBS_PER);
  box.innerHTML = (rows.map(x => '<div class="bbsi"><b' + (x.adm ? ' class="adm"' : '') + '>' + esc(String(x.name || '').slice(0, 12)) + '</b><small>' + (x.ts ? new Date(x.ts).toLocaleString('ja-JP') : '') + '</small><br>' + esc(String(x.text || '').slice(0, 400)) + '</div>').join('') || '<div class="note">まだ投稿はありません。</div>') +
    (pages > 1 ? '<div class="bbspg"><button class="sub" data-bbspg="-1"' + (bbsPage === 0 ? ' disabled' : '') + '>◀ 新しい</button><span>' + (bbsPage + 1) + ' / ' + pages + ' ページ(全' + bbsRows.length + '件)</span><button class="sub" data-bbspg="1"' + (bbsPage >= pages - 1 ? ' disabled' : '') + '>古い ▶</button></div>' : '');
}
async function bbsLoad() {
  const box = $('bbsList'); if (!box) return;
  if (!BBS_DB) { box.innerHTML = ''; return; }
  try {
    const r = await fetch(BBS_DB.replace(/\/$/, '') + '/reports.json?orderBy=%22$key%22&limitToLast=200'); const d = await r.json();
    bbsRows = Object.values(d || {}).sort((a, b) => (b.ts || 0) - (a.ts || 0)); bbsPage = 0; bbsShow();
  } catch (e) { box.innerHTML = '<div class="note">掲示板を読み込めませんでした。</div>'; }
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bbspg]'); if (b) { bbsPage += +b.dataset.bbspg; bbsShow(); } });
$('bbsPost').onclick = async () => {
  const name = ($('bbsName').value || '').trim().slice(0, 12) || ($('myName') && $('myName').value.trim().slice(0, 12)) || 'プレイヤー', text = ($('bbsText').value || '').trim().slice(0, 400), st = $('bbsStat');
  if (!text) { st.textContent = '内容を書いてください'; return; }
  if (!BBS_DB) { window.open('https://github.com/' + BBS_REPO + '/issues/new?title=' + encodeURIComponent('【報告】' + text.slice(0, 30)) + '&body=' + encodeURIComponent('投稿者: ' + name + '\nバージョン: ' + APP_VER + '\n\n' + text), '_blank'); st.textContent = 'GitHubの画面が開きます'; return; }
  if (Date.now() - bbsLast < 20000) { st.textContent = '少し待ってからもう一度投稿してください'; return; }
  st.textContent = '送信中…';
  try {
    const r = await fetch(BBS_DB.replace(/\/$/, '') + '/reports.json', { method: 'POST', body: JSON.stringify({ name, text, adm: document.body.classList.contains('adm') ? 1 : 0, ver: APP_VER, ts: { '.sv': 'timestamp' } }) });
    if (!r.ok) throw 0; bbsLast = Date.now(); $('bbsText').value = ''; st.textContent = '投稿しました。ありがとうございます'; bbsLoad();
  } catch (e) { st.textContent = '送信できませんでした。しばらくしてからもう一度お試しください'; }
};
setTimeout(bbsLoad, 800);
/* サンプルデッキ: cards/サンプルデッキ/一覧.txt に書かれたファイル名の .txt(デッキ書き出しの文字)を読み込む。読めないときは cards-data.js に入っているものを使う */
(async function loadSampleFolder() {
  try {
    const base = 'cards/' + encodeURIComponent('サンプルデッキ') + '/';
    const r = await fetch(base + encodeURIComponent('一覧.txt'), { cache: 'no-cache' }); if (!r.ok) return;
    const names = (await r.text()).replace(/^\uFEFF/, '').split(/\r?\n/).map(x => x.trim()).filter(x => x && x[0] !== '#');
    const out = [];
    let bad = 0;
    for (const n of names) { try { const rr = await fetch(base + encodeURIComponent(n), { cache: 'no-cache' }); if (!rr.ok) { bad++; continue; } const o = JSON.parse((await rr.text()).replace(/^\uFEFF/, '').trim()); if (o && o.name && Array.isArray(o.cards)) out.push(o); else bad++; } catch (e) { bad++; } }
    if (!out.length || bad) return;   // 1つでも読めないときは、一部だけが表示されないよう、アプリに入っている一覧(cards-data.js)をそのまま使う
    if (window.__srvSamples) return; window.SAMPLE_DECKS = out; bRefreshSelects();
  } catch (e) { }
})();

$('cpuLv').onchange = () => { try { localStorage.setItem('bs-cpulv', $('cpuLv').value); } catch (e) { } };
$('bCpu').onclick = () => {
  const d = getDeck(); if (!d) return;
  cpu = true; solo = false; isHost = true; myDefs = d.defs; cpuSkip.clear(); oppD = oppDefsFor($('cpuDeck').value, d.defs);
  showGame();
  G = newGame(d.defs, oppD, { first: $('first').value, test: DEV && $('testModeCpu').checked, mulligan: $('mullOn').checked, paced: true });
  G.cpuLv = 'strong'; G.names = [getName(), 'CPU'];
  pushState();
};

$('bSolo').onclick = () => {
  const d = getDeck(); if (!d) return;
  solo = true; isHost = true; myDefs = d.defs; HIST.length = 0; oppD = oppDefsFor($('soloDeck').value, d.defs);
  showGame();
  G = newGame(d.defs, oppD, { first: $('first').value, test: DEV && $('testMode').checked, mulligan: $('mullOn').checked, paced: true });
  G.names = [getName(), '相手'];
  viewer = focusP() !== null ? focusP() : G.turn; pushState();
};

function showGame() { seenStamp = null; if (!free.mine) freeStop(); free.joining = false; $('lobby').hidden = true; $('game').hidden = false; document.body.classList.add('ingame'); }
let homeArm = 0;
let resTimer = null, resShown = false, rematchMine = false, rematchOpp = false;
function renderResult() {
  const rs = $('result');
  if (!V || V.winner == null) { clearTimeout(resTimer); resTimer = null; resShown = false; specNoResult = false; rs.hidden = true; { const be = $('bcend'); if (be) be.remove(); } return; }
  if (!resShown) { if (!resTimer) resTimer = setTimeout(() => { resTimer = null; resShown = true; renderResult(); }, 2600); return; }
  if (V.spec && BC.on) {
    rs.hidden = true; let be = $('bcend');
    if (specNoResult) { if (be) be.remove(); return; }
    if (be) return;
    be = document.createElement('div'); be.id = 'bcend'; const wn = absName(V.winner);
    const cols = ['#ffd24a', '#ff5a6e', '#4f8dff', '#6fe3a1', '#fff', '#ff9a3c']; let cf = '';
    for (let i = 0; i < 46; i++) cf += '<i class="cf" style="left:' + (Math.random() * 100) + '%;background:' + cols[i % 6] + ';animation-duration:' + (2.4 + Math.random() * 2.6) + 's;animation-delay:' + (-Math.random() * 4) + 's"></i>';
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, d = 90 + Math.random() * 160; cf += '<i class="ex" style="left:' + (15 + Math.random() * 70) + '%;top:' + (20 + Math.random() * 60) + '%;background:' + cols[i % 6] + ';box-shadow:0 0 12px ' + cols[i % 6] + ';--dx:' + Math.cos(a) * d + 'px;--dy:' + Math.sin(a) * d + 'px;animation-delay:' + (Math.random() * 1.6) + 's"></i>'; }
    be.innerHTML = cf + '<div><div class="w">' + esc(wn) + '</div><div class="s">の勝ち' + (V.loseWhy === 'deck' ? '(デッキ切れ)' : '') + '</div></div>';
    be.onclick = () => { specNoResult = true; be.remove(); };
    document.body.appendChild(be); return;
  }
  if (V.spec) { if (specNoResult) { rs.hidden = true; return; } rs.innerHTML = specResultHTML(); rs.hidden = false; return; }
  const win = V.winner === V.me, dk = V.loseWhy === 'deck';
  const why = dk ? (win ? '相手がデッキ切れでドローできず' : 'あなたがデッキ切れでドローできず') : '';
  let cv = null; try { cv = coverOf(loadDecks()[$('lobbyDeck').value]); } catch (e) { }
  const cvart = cv ? artOf(String(cv.raw.id)) : '';
  const online = !solo && !cpu;
  const st = rematchMine ? '相手の返事を待っています…' : rematchOpp ? '相手が連戦を希望しています' : '';
  rs.innerHTML = '<div class="rb">' + (win && cv ? '<div class="rcover" style="' + coverStyle(cv) + '">' + (cvart ? '' : esc(cv.def.name)) + '</div>' : '') + '<div class="big ' + (win ? 'win' : 'lose') + '">' + (win ? '勝利' : '敗北') + '</div><div class="why">' + why + '</div>' +
    '<div class="rbtn"><button data-rematch="1"' + (rematchMine ? ' disabled' : '') + '>連戦する</button><button class="sec" data-leave="1">ホームに戻る</button></div>' +
    '<div class="rs">' + (online ? st : '') + '</div></div>';
  rs.hidden = false;
}
function resetForNew() {
  clearTimeout(animTimer); clearTimeout(fxTimer); animStep = null; fxQ = []; fxBusy = false; $('fx').hidden = true; $('fx').dataset.k = '';
  pay = null; sel.clear(); pickSel.clear(); snap = null; lastSeq = null; seenCast = 0; seenNotice = 0; wasFocus = false;
  rematchMine = rematchOpp = false; resShown = false; clearTimeout(resTimer); resTimer = null; $('result').hidden = true; hideSheet(); $('banner').hidden = true;
}
function doRematch() {
  if (cpu || solo) {
    resetForNew();
    if (cpu) { G = newGame(myDefs, oppD || myDefs.slice(), { first: $('first').value, test: DEV && $('testModeCpu').checked, mulligan: $('mullOn').checked, paced: true }); G.cpuLv = 'strong'; G.names = [getName(), 'CPU']; }
    else { HIST.length = 0; G = newGame(myDefs, oppD || myDefs, { first: $('first').value, test: DEV && $('testMode').checked, mulligan: $('mullOn').checked, paced: true }); G.names = [getName(), '相手']; viewer = focusP() !== null ? focusP() : G.turn; }
    pushState(); return;
  }
  rematchMine = true;
  try { dsend({ t: 'rematch' }); } catch (e) { /* 切断時は無視 */ }
  if (isHost) tryRematch(); else renderResult();
}
function tryRematch() {
  if (rematchMine && rematchOpp) { resetForNew(); try { dsend({ t: 'rematchgo' }); } catch (e) { } startGame(); }
  else renderResult();
}
function leaveNow() { try { if (dc && dc.open) dsend({ t: 'bye' }); } catch (e) { } resetToHome(''); }
function goHome() {
  if (Date.now() - homeArm > 3500) { homeArm = Date.now(); toast('もう一度押すと、対戦をリセットしてホームに戻ります'); return; }
  try { if (dc && dc.open) dsend({ t: 'bye' }); } catch (e) { /* 接続が切れていても戻れる */ }
  resetToHome('');
}
function resetToHome(msg) {
  specReset(); $('result').hidden = true; clearTimeout(animTimer); clearTimeout(fxTimer); animStep = null; fxQ = []; fxBusy = false; $('fx').hidden = true; $('fx').dataset.k = '';
  pay = null; sel.clear(); pickSel.clear(); G = null; V = null; snap = null; lastSeq = null; seenCast = 0; seenNotice = 0; solo = false; cpu = false; clearTimeout(cpuT); isHost = false; viewer = 0; guestDefs = null; wasFocus = false; guestStarted = false; lastRoom = null;
  const pr = peer, c = dc; peer = null; dc = null;
  setTimeout(() => { try { if (c) c.close(); if (pr) pr.destroy(); } catch (e) { /* 無視 */ } }, 200);
  hideSheet(); $('banner').hidden = true; $('logpanel').hidden = true; logOpen = false; menuOpen = false;
  $('game').hidden = true; $('lobby').hidden = false; document.body.classList.remove('ingame');
  say(msg || ''); try { freeUnreg(); } catch (e) { } free.mine = null; freeButtons(); free.joining = false; setTimeout(freeStart, 1200);
  oldSiteShow();
}
function startGame() {
  G = newGame(myDefs, guestDefs, { first: $('first').value, test: false, mulligan: $('mullOn').checked, paced: true });
  G.names = [getName(), guestName || 'ゲスト'];
  if (free.mine) { free.mine.st = 'play'; free.mine.n2 = G.names[1]; freeReg(); }
  specBroadcast({ t: 'snew', pl: G.names.slice(0, 2) });
  pushState();
}
// ソロでは、判断が必要な側(フラッシュの優先権・ブロック・対象選択)へ視点を自動で切り替える
function focusP() {
  if (G.pick) return G.pick.pi;
  if (G.mull) return G.mull.order[G.mull.idx];
  if (G.pending) return G.pending.pi;
  const b = G.battle;
  return b && (b.phase === 'flash1' || b.phase === 'flash2' || b.phase === 'block') ? b.prio : null;
}
// ステップが自動で進んだときは、1つずつ短く(約0.3秒)見せる
const TICK = 800;   // スタート〜リフレッシュの自動処理の1ステップあたり(ms)。以前は400
const FXW = 2000;   // 効果の文言が出てから、実際の動きを見せるまでの待ち(ms)
const sumFxDone = new Set();
function slotHasSummonFx(id) { let k = null; [V.you, V.opp].forEach(P => { const f = (P.field || []).find(x => x.iid === id); if (f) k = f; }); return !!(k && k.def && (k.def.effects || []).some(e => /召喚時/.test(e.text || ''))); }
let lastHandRects = null;
let fxQ = [], fxBusy = false, anim = { hvrel: new Map(), hv90: new Set(), lvchg: new Map(), until: 0, coreUp: new Map(), tap: new Map(), summon: new Map(), flip: new Map(), drawn: new Map(), untap: new Map(), pop: {}, oppN: 0, oppAt: 0 };
function zoneRect(root, loc) {
  const el = document.querySelector(root + ' .cores[data-zloc="' + loc + '"]'); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
// 動きの比較用に、プレイヤーごと(席の番号ごと)の前回の状態を覚えておく(ソロで視点が変わっても比べられる)
let snap = null;
function bcFxWait() { if (!BC.on || !V || !V.spec) return 0; const n = (V.fx || []).filter(f => f && f.n && !f.fail && !(f.r && f.r.length && f.r.every(x => /何も起きません|いないため|ありません|行いません/.test(x)))).length; return n ? n * 1750 + 250 : 0; }
function snapOf(v) {
  const pl = []; pl[v.me] = v.you; pl[1 - v.me] = v.opp;
  const tapped = {}, cn = {}, lv = {}, hv = {}; pl.forEach(P => P.field.forEach(k => { tapped[k.iid] = k.tapped; hv[k.iid] = !!k.heavy; cn[k.iid] = (k.cores || []).length; try { const li = k.def.levels && k.def.levels.length ? lvInfo(k) : null; lv[k.iid] = li ? li.lv : 0; } catch (e) { } }));
  let maxC = 0; const mc = c => { const m = /(\d+)/.exec(c.id || ''); if (m && +m[1] > maxC) maxC = +m[1]; }; pl.forEach(P => { (P.reserve || []).forEach(mc); (P.coreTrash || []).forEach(mc); (P.life || []).forEach(mc); (P.field || []).forEach(k => (k.cores || []).forEach(mc)); });
  return { tapped, hv, cn, lv, maxC, p: pl.map((P, i) => {
    const hand = solo ? G.p[i].hand : (i === v.me || v.spec ? P.hand : null);
    return { hand: hand ? new Set(hand.map(k => k.iid)) : null, handN: hand ? hand.length : P.handN, life: new Set(P.life.map(c => c.id)), lifeArr: P.life.map(c => ({ id: c.id, soul: c.soul })), ct: new Set(P.coreTrash.map(c => c.id)), resN: P.reserve.length, resIds: new Set(P.reserve.map(c => c.id)) };
  }) };
}
let cutinT = null, busyUntil = 0, busyTimer = null;
function busyCheck() { clearTimeout(busyTimer); if (typeof uiBusy === 'function' && uiBusy()) { busyTimer = setTimeout(busyCheck, 400); return; } render(); }
const uiBusy = () => Date.now() < busyUntil;
function setV(v) {
  idleReset();
  const pre = { me: zoneRect('#me', 'coreTrash'), opp: zoneRect('#opp', 'coreTrash') };
  const oldS = snap, oldMe = V ? V.me : null, preRect = pre, prr = grabRects();
  { const hr = {}; document.querySelectorAll('#hand [data-card],#oppHand [data-card]').forEach(el => { const r = el.getBoundingClientRect(); hr[el.dataset.card] = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); anim.prevHand = !pay && Object.keys(hr).length ? hr : (lastHandRects || {}); }   // 支払い中は手札が支払い画面に置き換わっているので、直前に見えていた位置を使う
  V = v; snap = snapOf(V);
  if (oldMe !== null && oldMe !== V.me) {   // ソロで視点が入れ替わったときは、前の画面の位置を点対称に移す(盤面は上下左右が対面になっているため)
    const m = document.querySelector('#mat').getBoundingClientRect(), mx = m.left + m.width / 2, my = m.top + m.height / 2;
    Object.values(prr.cards).forEach(r => { r.cx = 2 * mx - r.cx; r.cy = 2 * my - r.cy; });
    Object.values(prr.life).forEach(r => { r.x = 2 * mx - r.x; r.y = 2 * my - r.y; });
  }
  const fieldNew = !!(oldS && Object.keys(snap.tapped).some(id => !(id in oldS.tapped)));   // 効果のない召喚はseqが進まないので、盤面に新しいカードが増えたかでも判定する
  const undone = (V.evs || []).some(e => e.t === 'undo');
  if (undone) { ['me', 'opp'].forEach(k => { ctHold[k] = null; lifeHold[k] = null; resHold[k] = null; }); pendingFly.length = 0; gateUntil = 0; for (const k in soulHold) delete soulHold[k]; for (const k in coreHoldN) delete coreHoldN[k]; Object.keys(anim).forEach(k => { const m = anim[k]; if (m && typeof m.clear === 'function') m.clear(); }); anim.until = 0; anim.pop = {}; if (typeof specFxQ !== 'undefined') specFxQ.length = 0; }
  const newSeq = !undone && (V.seq !== lastSeq || fieldNew), tr = V.trace || [];
  if (undone) lastSeq = V.seq;
  if (newSeq && (V.evs || []).some(e => e.t === 'gate')) { gateUntil = Date.now() + 2000; $('gate').hidden = false; setTimeout(() => { $('gate').hidden = true; }, 2000); }
  if (newSeq && lastSeq !== null) {
    const ct = (V.evs || []).filter(e => (e.t === 'turn' && !RP && (e.p === V.me || V.spec)) || e.t === 'attack')[0];
    if (ct) {
      const el = $('cutin'), art = ct.t === 'attack' && ct.id ? artOf(String(ct.id)) : '';
      el.className = (ct.t === 'attack' || V.spec ? ct.p : V.me) === V.me ? '' : 'opp';
      el.innerHTML = (art ? '<img src="' + art + '" alt="">' : '') + '<span class="ct">' + (ct.t === 'attack' ? esc('「' + ct.name + '」がアタック!') : V.spec ? absName(ct.p) + 'のターン' : 'あなたのターン') + '</span>';
      const gOff = (V.evs || []).some(e => e.t === 'gate') ? 2300 : 0;   // 「ゲートオープン」と「あなたのターン」が重ならないように、あとから出す
      clearTimeout(cutinT); el.hidden = true;
      const showCut = () => { el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(cutinT); cutinT = setTimeout(() => { el.hidden = true; }, 1350); };
      if (gOff) setTimeout(showCut, gOff); else showCut();
      gateUntil = Math.max(gateUntil, Date.now() + gOff + 1350);
    }
  }
  if (newSeq && oldS && lastSeq !== null && ((V.fx && V.fx.length) || V.pending)) {   // カードが出る → 効果が出る → 動き、の順にするため、登場演出の間は効果の表示を待たせる
    const appeared = Object.keys(snap.tapped).some(id => !(id in oldS.tapped)), casted = V.cast && V.cast.n !== seenCast;
    if (appeared || casted) gateUntil = Math.max(gateUntil, Date.now() + 1300);
  }
  const gd = Math.max(0, gateUntil - Date.now());
  if (gd > 0) setTimeout(() => { try { render(); } catch (e) { } }, gd + 60);
  const had = lastSeq !== null;
  if (newSeq) {
    if (had && tr.length > 1) { if (gd) setTimeout(() => playTrace(tr), gd); else playTrace(tr); }
    if (had && V.fx && V.fx.length) { const fl = V.fx.slice(); if (gd) setTimeout(() => playFx(fl), gd); else playFx(fl); }
    lastSeq = V.seq;
  }
  const idx = s => { const i = tr.findIndex(x => x.s === s); return i < 0 ? 0 : i * TICK; };
  if (newSeq && had && oldS) {
    const now = Date.now() + gd, fxd = V.fx && V.fx.length ? FXW : (V.pending ? FXW : 0), hasDraw = tr.some(x => x.s === 'draw');
    const pOff = (V.paced && tr.length <= 1 && (V.step === 'core' || V.step === 'draw' || V.step === 'refresh')) ? PACE_BEAT : 0;   // 1ステップずつ進めるときは、ステップが変わってから一拍おいて動かす
    const dAt = now + pOff + (hasDraw ? idx('draw') : fxd), rAt = now + pOff + idx('refresh');
    snap.p.forEach((n, i) => {
      const o = oldS.p[i], mine = i === V.me, key = mine ? 'me' : 'opp';
      if (n.hand && o.hand && (mine || V.spec)) (mine ? V.you : V.opp).hand.forEach(k => { if (!o.hand.has(k.iid)) anim.drawn.set(k.iid, V.spec && revRects[k.iid] ? now + 950 : dAt); });
      if (!mine && !V.spec && n.handN > o.handN) { anim.oppN = n.handN - o.handN; anim.oppAt = dAt; }
      const moved = [...o.ct].filter(id => n.resIds.has(id)).length;
      { const grow = n.ct.size - o.ct.size, pay = Math.max(0, o.resN - n.resN), held = Math.min(Math.max(0, grow), Math.max(Math.max(0, grow - pay), (V.evs || []).filter(e => e.t === 'ctAdd' && e.p === i).reduce((a, e) => a + (e.n || 0), 0)));   // 効果でトラッシュにコアが増えるときは、召喚の少しあとに「増えた」演出つきで反映する
        if (held > 0 && !ctHold[key]) { const until = now + Math.max(BC.on ? 1700 : 1300, (V.fx && V.fx.length ? FXW : 0) + 500); ctHold[key] = { until, n: held }; setTimeout(() => { try { if (!V) return; render(); const z = zoneRect(key === 'me' ? '#me' : '#opp', 'coreTrash'); if (z) { coreFly({ cx: z.x, cy: z.y - 220 }, { cx: z.x, cy: z.y }, held); popText('トラッシュ+' + held, z.x, z.y - 34); } } catch (e) { } }, Math.max(0, until - Date.now()) + 20); } }
      const lostN = [...o.life].filter(id => !n.life.has(id)).length;
      { const vN = Math.min(6, [...n.resIds].filter(id => !o.resIds.has(id) && (+(/(\d+)/.exec(id) || [])[1] || 0) > (oldS.maxC || 0)).length); if (vN > 0) setTimeout(() => { try { const zr = zoneRect(mine ? '#me' : '#opp', 'reserve'); if (zr) { const tg = { cx: zr.x, cy: zr.y }; coreFly(voidOrigin(i, tg), tg, vN, false, 0); } } catch (e) { } }, Math.max(0, rAt - Date.now())); }
      if (n.resN > o.resN) {
        anim.pop[key] = rAt + (moved ? 700 + Math.min(moved, 8) * 90 : 0);
        const arr = [];
        for (let j = 0; j < Math.min(moved, 8); j++) arr.push(rAt + 700 + j * 90);
        const lAt = now + Math.max(V.fx && V.fx.some(f => f.quick) ? 3300 : (V.fx && V.fx.length ? FXW : 0), bcFxWait()) + 150;
        for (let j = 0; j < lostN; j++) arr.push(lAt + j * 160 + 650);
        setResHold(key, o.resN, arr.sort((a, b) => a - b), Math.max(0, n.resN - o.resN - arr.length));
      }
      if (moved) {
        // 飛ぶ前の位置は、前回の画面のトラッシュ(視点が同じときだけ取れる)
        const from = oldMe === V.me ? preRect[key] : null;
        pendingFly.push({ key, n: moved, from, at: rAt });
      }
    });
    if (!V.spec) { const mi = snap.p[V.me], mo = oldS.p[V.me]; if (mi && mo && mi.hand && mo.hand) V.you.hand.forEach(k => {   // オープンで見えていたカードが手札に加わるときは、その場所から手札へ飛ばす
      if (mo.hand.has(k.iid) || !revRects[k.iid]) return; const el = document.querySelector('#hand [data-card="' + k.iid + '"]'); if (!el) return;
      const r = el.getBoundingClientRect(), o2 = revRects[k.iid]; delete revRects[k.iid]; anim.drawn.set(k.iid, now + 700);
      try { const f = faceEl({ id: k.def.id, name: k.def.name, color: k.def.color }, false); f.style.width = '92px'; f.style.height = '130px'; f.style.zIndex = 9991; const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
        f.animate([{ transform: 'translate(' + (o2.x - 46) + 'px,' + (o2.y - 65) + 'px) scale(1)', opacity: 1 }, { transform: 'translate(' + (tx - 46) + 'px,' + (ty - 65) + 'px) scale(.55)', opacity: .35 }], { duration: 650, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' }).onfinish = () => f.remove(); setTimeout(() => { try { f.remove(); } catch (e) { } }, 1400); } catch (e) { } }); }
    (V.evs || []).forEach(ev => { if (ev.t === 'mull' && ev.yes && ev.p === V.me) V.you.hand.forEach((k, i) => anim.drawn.set(k.iid, now + i * 130)); });
    (V.evs || []).forEach(ev => { if (ev.t === 'coreAdd' && !ev.soul && !ev.sum && ev.iid && ev.n > 0) { const dl = V.fx && V.fx.some(f => f.quick) ? 3300 : (V.fx && V.fx.length ? FXW : 0), h0 = coreHoldN[ev.iid], un = now + dl + 1000; coreHoldN[ev.iid] = { until: Math.max(un, h0 && h0.until > now ? h0.until : 0), n: ev.n + (h0 && h0.until > now ? h0.n : 0) }; setTimeout(() => { if (typeof render === 'function' && V) render(); }, dl + 1050); } });
    (V.evs || []).forEach(ev => { if (ev.t === 'coreAdd' && ev.soul) { const dl = V.fx && V.fx.some(f => f.quick) ? 3300 : (V.fx && V.fx.length ? FXW : 0); soulHold[ev.iid] = now + dl + 1100; setTimeout(() => { if (typeof render === 'function' && V) render(); }, dl + 1150); } });   // ソウルコアが飛んで乗るまでは、カードの上に出さない
    Object.keys(snap.tapped).forEach(id => { if (oldS.tapped[id] && !snap.tapped[id]) anim.untap.set(id, soulHold[id] > now ? soulHold[id] + 450 : rAt); });
    Object.keys(snap.hv || {}).forEach(id => { if (oldS.hv && oldS.hv[id] && !snap.hv[id] && snap.tapped[id]) anim.hvrel.set(id, rAt); });   // 重疲労 → 疲労(リフレッシュ)も、回復と同じように動かす
    Object.keys(snap.tapped).forEach(id => { if (id in oldS.tapped && !oldS.tapped[id] && snap.tapped[id]) anim.tap.set(id, now); });
    Object.keys(snap.hv || {}).forEach(id => { if (oldS.hv && id in oldS.hv && !oldS.hv[id] && snap.hv[id]) { anim.tap.set(id, now); if (oldS.tapped[id]) anim.hv90.add(id); else anim.hv90.delete(id); } });
    Object.keys(snap.tapped).forEach(id => { if (!(id in oldS.tapped)) { anim.summon.set(id, Date.now()); try { specFxEnter(id); } catch (e) { } } });
    if (BC.on || V.spec || true) {   // 場の上のコアの移動: 減ったカード→増えたカードへ飛ばす(個別の動きの指示がないとき)
      const evT = (V.evs || []).map(e => e.t);
      if (!evT.some(t => t === 'cmove' || t === 'coreAdd' || t === 'coreOut' || t === 'coreIn' || t === 'destroy' || t === 'vanish')) {
        const dec = [], inc = []; Object.keys(snap.cn).forEach(id => { if (id in oldS.cn) { const d = snap.cn[id] - oldS.cn[id]; if (d < 0) dec.push([id, -d]); else if (d > 0) inc.push([id, d]); } });
        let di = 0; inc.forEach(([to, n]) => { while (n > 0 && di < dec.length) { const m = Math.min(n, dec[di][1]); const f = prr.cards[dec[di][0]], t = grabRects().cards[to]; if (f && t) coreFly(f, t, m); n -= m; dec[di][1] -= m; if (!dec[di][1]) di++; } });
      }
      Object.keys(snap.lv || {}).forEach(id => { if (oldS.lv && id in oldS.lv && oldS.lv[id] !== snap.lv[id]) anim.lvchg.set(id, { t: Date.now(), up: snap.lv[id] > oldS.lv[id] }); });
    }
    { const cuW = V.fx && V.fx.some(f => f.quick) ? 3300 : (V.fx && V.fx.length ? FXW : 0);   // 効果でコアが増えたカードを光らせる(効果の文言のあと)
      const covered = new Set((V.evs || []).filter(e => e.iid && (e.t === 'coreAdd' || e.t === 'coreIn')).map(e => e.iid));
      if ((V.fx && V.fx.length) || (V.evs || []).some(e => e.t === 'coreAdd' || e.t === 'coreIn' || e.t === 'cmove')) Object.keys(snap.cn || {}).forEach(id => { if (oldS.cn && id in oldS.cn && snap.cn[id] > oldS.cn[id]) anim.coreUp.set(id, { at: now + cuW + 300, n: snap.cn[id] - oldS.cn[id], pop: !covered.has(id) }); }); }
    anim.until = now + 4500;
    // 破壊(ガラスが割れてトラッシュへ)・消滅(ふわっと消えて粒子がトラッシュへ)
    const fxWait = Math.max(V.fx && V.fx.some(f => f.quick) ? 3300 : (V.fx && V.fx.length ? FXW : 0), bcFxWait());
    const eAt = fxWait;
    (V.evs || []).filter(ev => ev.t === 'destroy' || ev.t === 'vanish').forEach((ev, i) => { evQ.push({ ev, rc: prr.cards[ev.iid], key: ev.p === V.me ? 'me' : 'opp', at: now + eAt + i * 250 }); holdTrash(ev.p === V.me ? 'me' : 'opp', [ev.iid], eAt + i * 250 + 1400, true); });   // 位置が取れなくても、アニメが終わるまではトラッシュに見せない
    // ライフで受けた: ライフのコアが弾けて、リザーブへ
    snap.p.forEach((n, i) => {
      const lost = [...oldS.p[i].life].filter(id => !n.life.has(id)); if (!lost.length) return;
      lifeQ.push({ key: i === V.me ? 'me' : 'opp', lost, rects: lost.map(id => prr.life[id]).filter(Boolean), at: now + eAt + 150 });
      if (oldS.p[i].lifeArr) { const k2 = i === V.me ? 'me' : 'opp', until = now + eAt + 150; lifeHold[k2] = { until, list: oldS.p[i].lifeArr }; setTimeout(() => { try { if (V) render(); } catch (e) { } }, Math.max(0, until - Date.now()) + 20); }
    });
  }
  { const ev0 = (V.evs || []).filter(e => e.t === 'destroy' || e.t === 'vanish');
    if (newSeq && had && ev0.length) {   // 破壊などの演出が終わるまで、パス・ブロックのボタンを出さない
      const w = (ev0.some(e => e.t === 'destroy') ? 1200 : 650) + (V.fx && V.fx.length ? (V.fx.some(f => f.quick) ? 3300 : 1300) : 0);
      busyUntil = Math.max(busyUntil, Date.now() + gd + w);
      clearTimeout(busyTimer); busyTimer = setTimeout(busyCheck, Math.max(60, busyUntil - Date.now() + 60));
    } }
  if (G && G.settings && G.settings.paced && newSeq) {   // 1ステップずつ進めるとき、次へ進むまでの最低の待ち(演出の長さ)
    const st = V.step, hasE = !!((V.fx && V.fx.length) || (V.evs || []).length);
    let w = 0;
    if (st === 'start') w = 1000;
    else if (st === 'core') w = V.turnNo === 1 && G.first === V.turn ? 900 : PACE_BEAT + 1500;
    else if (st === 'draw') w = PACE_BEAT + 1600;
    else if (st === 'refresh') w = PACE_BEAT + 1200 + Math.min(8, oldS && oldS.p[V.turn] ? oldS.p[V.turn].ct.size : 0) * 90;
    else if (st === 'end') w = hasE ? 2200 : 700;
    else w = hasE ? 600 : 0;
    paceHold(w);
  }
  render();
  paceKick();
  // 場のカードが抜けたら、残りのカードが横にスライドして詰まる(効果の演出が終わってから)
  if (oldMe === V.me) {
    const nw = grabRects().cards, now2 = Date.now();
    const evs = (V.evs || []).filter(e => e.t === 'destroy' || e.t === 'vanish'), hasFx = V.fx && V.fx.length;
    const wait = evs.length ? (evs.some(e => e.t === 'destroy') ? (BC.on ? 2200 : 1200) : (BC.on ? 1100 : 650)) + Math.max(hasFx ? (V.fx.some(f => f.quick) ? 3300 : 1300) : 0, bcFxWait()) : 0;
    Object.keys(nw).forEach(id => {
      const o = prr.cards[id], n = nw[id]; if (!o) return;
      const dx = o.cx - n.cx, dy = o.cy - n.cy;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) { anim.flip.set(id, { dx, dy, start: now2 + wait, dur: 380 }); anim.until = Math.max(anim.until, now2 + wait + 500); }
    });
  }
  if (newSeq && had && oldS) {
    let oi = 0;
    (V.evs || []).forEach(ev => {
      if (ev.t === 'open') openAnim(ev, oi++);
      if (ev.t === 'turn') { const el = $(ev.p === V.me ? 'me' : 'opp'); if (el) { el.classList.remove('turnglow'); void el.offsetWidth; el.classList.add('turnglow'); setTimeout(() => el.classList.remove('turnglow'), 2600); } }
      if (ev.t === 'coreAdd') { let t = grabRects().cards[ev.iid]; if (t && ev.soul) { const se = document.querySelector('#mat .core[data-soul][data-loc="card:' + ev.iid + '"]'); if (se) { const rr = se.getBoundingClientRect(); if (rr.width) t = Object.assign({}, t, { cx: rr.left + rr.width / 2, cy: rr.top + rr.height / 2 }); } } let z = null; if (ev.from && ev.from.startsWith('card:')) { const fr = grabRects().cards[ev.from.slice(5)]; if (fr) z = { x: fr.cx, y: fr.cy }; } else if (ev.from) z = zoneRect(ev.p === V.me ? '#me' : '#opp', ev.from); else if (t) z = null; if (t) { if (!ev.from && !(z)) z = voidOrigin(ev.p, t); if (z && z.cx !== undefined) z = { x: z.cx, y: z.cy }; const dl = V.fx && V.fx.some(f => f.quick) ? 3300 : (V.fx && V.fx.length ? FXW : 0); coreFly(z ? { cx: z.x, cy: z.y } : { cx: t.cx, cy: t.cy - 90 }, t, ev.n, ev.soul, dl); setTimeout(() => popText(ev.soul ? 'ソウルコア+1' : 'コア+' + ev.n, t.cx, t.cy), dl + 900); } }
      if (ev.t === 'lifeAdd') { const ls = [...document.querySelectorAll((ev.p === V.me ? '#me' : '#opp') + ' .lc')], l = ls[ls.length - 1], z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'reserve'); if (l) { const r = l.getBoundingClientRect(), c = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; coreFly(z ? { cx: z.x, cy: z.y } : { cx: c.cx, cy: c.cy - 80 }, c, ev.n); popText('ライフ+' + ev.n, c.cx, c.cy); } }
      if (ev.t === 'plusDmg') { const r = grabRects().cards[ev.iid]; if (r) popText('減るコア+' + ev.n + '!', r.cx, r.cy - 40); }
      if (ev.t === 'lifeZero') {
        const z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'life') || { x: innerWidth / 2, y: innerHeight / 2 };
        const d = document.createElement('div'); d.className = 'lz'; d.style.left = z.x + 'px'; d.style.top = z.y + 'px'; d.innerHTML = '<i></i><i></i><i></i><i></i><i></i>' + Array.from({ length: 28 }, (_, j) => { const a = j / 28 * 6.283, r = 140 + (j % 4) * 70; return '<b style="--dx:' + Math.cos(a) * r + 'px;--dy:' + Math.sin(a) * r + 'px;background:' + ['#ffd24a', '#ff5a6e', '#fff', '#ff9a3c'][j % 4] + '"></b>'; }).join(''); document.body.appendChild(d);
        const f = document.createElement('div'); f.id = 'lzflash'; document.body.appendChild(f);
        document.body.classList.add('shake'); setTimeout(() => { d.remove(); f.remove(); document.body.classList.remove('shake'); }, 2600);
      }
      if (ev.t === 'mill') millAnim(ev);
      if (ev.t === 'recover') recoverAnim(ev);
      if (ev.t === 'deckReturn') deckRetAnim(ev);
      if (ev.t === 'cardGlow') { const r = grabRects().cards[ev.iid]; if (r) { const d = document.createElement('div'); d.className = 'cardglow'; d.style.left = r.cx + 'px'; d.style.top = r.cy + 'px'; d.style.width = (r.w + 14) + 'px'; d.style.height = (r.h + 14) + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1900); } }
      if (ev.t === 'lifeGlow') { const z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'life'); if (z) { const d = document.createElement('div'); d.className = 'lifeglow'; d.style.left = z.x + 'px'; d.style.top = z.y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 2300); } }
      if (ev.t === 'discard') discardAnim(ev);
      if (ev.t === 'resIn') { const a = zoneRect(ev.p === V.me ? '#me' : '#opp', 'coreTrash'), b2 = zoneRect(ev.p === V.me ? '#me' : '#opp', 'reserve'); if (a && b2) { coreFly({ cx: a.x, cy: a.y }, { cx: b2.x, cy: b2.y }, ev.n); popText('コア+' + ev.n, b2.x, b2.y); } }
      if (ev.t === 'sweep') sweepAnim(ev);
      if (ev.t === 'coreOut') { const f = prr.cards[ev.iid] || grabRects().cards[ev.iid], z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'reserve'); if (f && z) { coreFly({ cx: f.cx, cy: f.cy }, { cx: z.x, cy: z.y }, ev.n); popText('コア-' + ev.n, f.cx, f.cy); } }
      if (ev.t === 'barrier') {
        const lf = grabRects().life, ids = (ev.lifeIds || []).filter(id => lf[id]); let cx = 0, cy = 0;
        if (ids.length) { ids.forEach(id => { const z = lf[id], d = document.createElement('div'); d.className = 'barrier sm'; d.style.left = z.x + 'px'; d.style.top = z.y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 2000); cx += z.x; cy += z.y; }); cx /= ids.length; cy /= ids.length; }
        else { let z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'life'); if (!z) { const el = $(ev.p === V.me ? 'me' : 'opp'); if (el) { const r = el.getBoundingClientRect(); z = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } } if (z) { const d = document.createElement('div'); d.className = 'barrier'; d.style.left = z.x + 'px'; d.style.top = z.y + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 2000); cx = z.x; cy = z.y; } }
        if (cx || cy) popText(ev.by ? '「' + ev.by + '」ライフが減りません!' : 'バリア!', cx, cy - 50);
      }
      if (ev.t === 'coreIn') { const t = grabRects().cards[ev.iid], z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'coreTrash'); if (t) { coreFly(z ? { cx: z.x, cy: z.y } : { cx: t.cx, cy: t.cy - 90 }, t, ev.n); popText('コア+' + ev.n, t.cx, t.cy); } }
      if (ev.t === 'cmove') { const z = zoneRect(ev.p === V.me ? '#me' : '#opp', 'coreTrash'); coreFly(prr.cards[ev.from] || (z ? { cx: z.x, cy: z.y } : null), grabRects().cards[ev.to], ev.n); }
    });
  }
  applyAnim();
  flushFly(); flushEv();
}
