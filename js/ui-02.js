function bRender() {
  const list = bFiltered();
  $('bGrid').innerHTML = list.length ? list.map(c => thumbHTML(c, 'pool')).join('') : '<span class="note">該当するカードがありません</span>';
  const rows = [...B.deck].map(([id, n]) => ({ c: cardById(id), id, n })).filter(x => x.c);
  $('bList').innerHTML = rows.length ? rows.map(({ c, n }) => thumbHTML(c, 'deck', n)).join('') : '<span class="note">左のカードをクリックで追加(同名3枚まで)。ここのカードをクリックで1枚減らし、右下の「削除」で全部抜きます。長押ししてドラッグすると並べ替えできます。</span>';
  const tot = deckTotal(), by = { spirit: 0, nexus: 0, magic: 0 }, curve = new Array(10).fill(0);
  rows.forEach(({ c, n }) => { by[c.def.type] += n; curve[Math.min(9, c.def.cost)] += n; });
  const mx = Math.max(1, ...curve);
  $('bStats').innerHTML = '<span class="tot ' + (tot >= 40 ? 'ok' : 'ng') + '">' + tot + '枚</span> / 40枚以上　スピリット' + by.spirit + '・ネクサス' + by.nexus + '・マジック' + by.magic +
    '<div class="curve">' + curve.map(v => '<i style="height:' + Math.round(v / mx * 100) + '%">' + (v ? '<b>' + v + '</b>' : '') + '</i>').join('') + '</div><div class="curve" style="height:auto">' + curve.map((_, i) => '<span>' + (i === 9 ? '9+' : i) + '</span>').join('') + '</div>';
  $('bCount2').textContent = tot;
  { const cc = coverOf({ cover: B.cover, cards: [...B.deck] }); const ce = $('bCover'); ce.setAttribute('style', coverStyle(cc)); ce.textContent = cc && artOf(String(cc.raw.id)) ? '' : (cc ? cc.def.name.slice(0, 5) : '表紙'); }
  $('bPackInfo').textContent = '';
  lazyBg();
}
/* 画像の読み込み順: ①使うデッキ ②保存済みのデッキ ③デッキ作成の一覧は、画面に見えているカードだけ */
let _bgIO = null;
function lazyBg() {
  const els = [...document.querySelectorAll('#bGrid [data-bg]')]; if (!els.length) return;
  const set = el => { const u = el.dataset.bg; if (u) { el.style.backgroundImage = 'url(' + u + ')'; el.removeAttribute('data-bg'); } };
  if (!window.IntersectionObserver) { els.forEach(set); return; }
  if (_bgIO) _bgIO.disconnect();
  _bgIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { set(e.target); _bgIO.unobserve(e.target); } }), { root: $('bGrid'), rootMargin: '400px' });
  els.forEach(el => _bgIO.observe(el));
}
function preloadDeckArt() {
  const all = loadDecks(), ord = loadDeckOrder(); let cur = ''; try { cur = $('lobbyDeck').value || localStorage.getItem('bs-deck-sel') || ''; } catch (e) { }
  const names = Object.keys(all).sort((a, b) => (a === cur ? -1 : b === cur ? 1 : 0) || ((ord.indexOf(a) + 1 || 999) - (ord.indexOf(b) + 1 || 999)));
  const ids = [], seen = new Set();
  names.forEach(n => { const d = all[n], cv = coverOf(d); if (cv && !seen.has(String(cv.raw.id))) { seen.add(String(cv.raw.id)); ids.push(String(cv.raw.id)); } });
  names.forEach(n => (all[n].cards || []).forEach(([id]) => { id = String(id); if (!seen.has(id)) { seen.add(id); ids.push(id); } }));
  const urls = ids.map(id => artOf(id)).filter(Boolean); let i = 0;
  const next = () => { if (i >= urls.length) return; const im = new Image(); im.onload = im.onerror = next; im.src = urls[i++]; };
  for (let k = 0; k < 4; k++) next();
}
function bRefreshSelects() {
  const sets = loadDecks(), ord = loadDeckOrder(), names = Object.keys(sets).sort((a, b) => { const ia = ord.indexOf(a), ib = ord.indexOf(b); if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1; return (sets[b].t || 0) - (sets[a].t || 0); });
  const opt = '<option value="">(保存済みのデッキ)</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
  $('bSaved').innerHTML = opt;
  const cur = $('lobbyDeck').value;
  $('lobbyDeck').innerHTML = '<option value="">(デッキを選ぶ)</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
  ['cpuDeck', 'soloDeck'].forEach(id => { const c0 = $(id).value; $(id).innerHTML = '<option value="">自分と同じデッキ</option>' + names.map(n => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join(''); $(id).value = c0; });
  try { $('lobbyDeck').value = cur || localStorage.getItem('bs-deck-sel') || ''; } catch (e) { }
  renderDeckPick();
  $('bSet').innerHTML = '<option value="">収録</option>' + SET_NAMES.map(n => '<option>' + esc(n) + '</option>').join('');
  $('bSet').value = B.set;
  if (!$('bCost').options.length || $('bCost').options.length < 3) $('bCost').innerHTML = '<option value="">コスト</option>' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => '<option value="' + i + '">' + i + '</option>').join('') + '<option value="9">9以上</option>';
}
function bLoad(name) {
  const d = loadDecks()[name]; if (!d) return;
  B.name = name; B.orig = name; B.isNew = false; B.cover = d.cover || ''; B.deck = new Map(); let miss = 0;
  let cs = (d.cards || []).filter(([id]) => cardById(id)); miss = (d.cards || []).length - cs.length;
  if (!d.ord) cs = cs.slice().sort((a, b) => cardById(a[0]).def.cost - cardById(b[0]).def.cost || cardById(a[0]).def.name.localeCompare(cardById(b[0]).def.name, 'ja'));
  cs.forEach(([id, n]) => B.deck.set(id, n));
  $('bName').value = name; bRender();
  if (miss) toast('見つからないカードが' + miss + '種ありました(カード情報を読み込んでいるか確認してください)');
}
function renderLobbyList() {
  let arr = []; try { arr = JSON.parse($('deckText').value || '[]'); } catch (e) { }
  const m = new Map(); (Array.isArray(arr) ? arr : []).forEach(r => { const id = String(r.id), n = Math.max(1, r.count | 0 || 1); const o = m.get(id) || { r, n: 0 }; o.n += n; m.set(id, o); });
  const rows = [...m].map(([id, o]) => ({ id, r: o.r, n: o.n, c: cardById(id) }));
  $('lobbyDeckList').innerHTML = rows.map(x => x.c ? thumbHTML(x.c, 'view', x.n) : '<div class="bc" style="--cc:#6a7499"><span class="bcost">' + (x.r.cost | 0) + '</span><span class="bn">' + esc(x.r.name || x.id) + '</span><span class="bcnt">' + x.n + '</span></div>').join('');
}
function lobbyApply(name) {
  const d = loadDecks()[name]; if (!d) return;
  const miss = (d.cards || []).filter(([id]) => !cardById(id)).length;
  $('deckText').value = deckToJSON((d.cards || []).filter(([id]) => cardById(id)));
  renderLobbyList();
  const n = (d.cards || []).reduce((a, [id, c]) => a + (cardById(id) ? c : 0), 0);
  $('lobbyDeckNote').textContent = '「' + name + '」' + n + '枚' + (n < 40 ? '(40枚未満です)' : '') + (miss ? ' ※見つからないカード' + miss + '種' : '');
  $('fillDummy').checked = n < 40;
  try { localStorage.setItem('bs-deck-sel', name); } catch (e) { }
  renderDeckPick();
}
function openBuilder(isNew, name) {
  $('lobby').hidden = true; $('builder').hidden = false;
  bRefreshSelects();
  B.isNew = !!isNew; B.orig = '';
  if (isNew || !name) { B.name = ''; B.cover = ''; B.deck = new Map(); $('bName').value = ''; B.isNew = true; bRender(); }
  else bLoad(name);
  $('bImportJson').style.display = B.isNew ? '' : 'none';
  B.snap = bSnap();
}
function bSnap() { return JSON.stringify([$('bName').value.trim(), B.cover, [...B.deck]]); }
function bTryClose() {
  if (bSnap() === B.snap) { closeBuilder(); return; }
  sheetActs = [];
  showSheet('<h3>保存していません</h3><div class="note">このまま戻ると、編集した内容は消えます。本当によいですか?</div><div class="acts">' + sbtn('保存しないで戻る', closeBuilder) + sbtn('編集を続ける', () => { }, 1) + '</div>');
}
function closeBuilder() { $('builder').hidden = true; $('lobby').hidden = false; bRefreshSelects(); if ($('lobbyDeck').value) lobbyApply($('lobbyDeck').value); }
function bSave(quiet) {
  const name = $('bName').value.trim(); if (!name) { toast('デッキ名を入力してください'); return false; }
  const all = loadDecks(); const renamed = !B.isNew && B.orig && B.orig !== name;
  if ((B.isNew || renamed) && all[name]) { toast('同じ名前のデッキがあります。別の名前にしてください'); return false; }
  if (renamed) { delete all[B.orig]; const o = loadDeckOrder(), k = o.indexOf(B.orig); if (k >= 0) { o[k] = name; try { localStorage.setItem('bs-deck-order', JSON.stringify(o)); } catch (e) { } } }
  all[name] = { t: Date.now(), ord: true, cards: [...B.deck], cover: (B.cover && B.deck.has(B.cover)) ? B.cover : '' };
  if (!saveDecks(all)) { toast('保存できませんでした(ブラウザの保存が無効かもしれません)'); return false; }
  B.name = name; B.orig = name; B.isNew = false; $('bImportJson').style.display = 'none'; bRefreshSelects(); $('bSaved').value = name; $('lobbyDeck').value = name; B.snap = bSnap(); if (!quiet) { sheetActs = []; showSheet('<h3>保存しました</h3><div class="note">「' + esc(name) + '」(' + deckTotal() + '枚)</div><div class="acts">' + sbtn('編集画面に戻る', () => { }) + sbtn('ホームに戻る', closeBuilder, 1) + '</div>'); } return true;
}
$('bBuilder').onclick = () => openBuilder(true); $('bClose').onclick = bTryClose;
$('lobbyDeck').onchange = () => { if ($('lobbyDeck').value) lobbyApply($('lobbyDeck').value); };

/* デッキ画像: デッキ名と、カード(右下に枚数)だけのシンプルな画像を作る。スマホは共有シートから「画像を保存」で写真に入る */
async function deckImageBlob() {
  const name = ($('bName').value || '').trim() || '無題のデッキ';
  const list = [...B.deck].map(([id, n]) => ({ c: cardById(id), id, n })).filter(x => x.c);
  const total = list.reduce((a, x) => a + x.n, 0);
  const CW = 200, CH = 290, G = 14, PAD = 36, COLS = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(list.length * 1.4)))), ROWS = Math.max(1, Math.ceil(list.length / COLS)), HEAD = 96;
  const W = PAD * 2 + COLS * CW + (COLS - 1) * G, H = HEAD + PAD + ROWS * CH + (ROWS - 1) * G + PAD;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = '#0f1424'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff'; x.font = '900 46px system-ui,"Hiragino Sans","Noto Sans JP",sans-serif'; x.textBaseline = 'middle';
  let t = name; while (x.measureText(t).width > W - PAD * 2 - 160 && t.length > 1) t = t.slice(0, -1); if (t !== name) t += '…';
  x.fillText(t, PAD, HEAD / 2 + 8);
  x.textAlign = 'right'; x.fillStyle = '#9fb4ff'; x.font = '800 34px system-ui,"Hiragino Sans",sans-serif'; x.fillText(total + '枚', W - PAD, HEAD / 2 + 8); x.textAlign = 'left';
  const load = u => new Promise(r => { if (!u) return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u; });
  const imgs = await Promise.all(list.map(e => load(artOf(String(e.id)))));
  list.forEach((e, i) => {
    const cx = PAD + (i % COLS) * (CW + G), cy = HEAD + PAD / 2 + Math.floor(i / COLS) * (CH + G);
    x.save(); x.beginPath(); x.roundRect ? x.roundRect(cx, cy, CW, CH, 12) : x.rect(cx, cy, CW, CH); x.clip();
    if (imgs[i]) { x.imageSmoothingQuality = 'high'; x.drawImage(imgs[i], cx, cy, CW, CH); }
    else { x.fillStyle = '#26305a'; x.fillRect(cx, cy, CW, CH); x.fillStyle = '#fff'; x.font = '800 22px system-ui,sans-serif'; x.textAlign = 'center'; x.fillText(e.c.def.name.slice(0, 9), cx + CW / 2, cy + CH / 2); x.textAlign = 'left'; }
    x.restore();
    const bx = cx + CW - 30, by = cy + CH - 30;
    x.fillStyle = '#000d'; x.beginPath(); x.arc(bx, by, 26, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = '#ffd34d'; x.stroke();
    x.fillStyle = '#fff'; x.font = '900 30px system-ui,sans-serif'; x.textAlign = 'center'; x.fillText('×' + e.n, bx, by + 1); x.textAlign = 'left';
  });
  return { blob: await new Promise(r => cv.toBlob(r, 'image/png')), name, url: cv.toDataURL('image/png') };
}
$('bImg').onclick = async () => {
  if (!deckTotal()) { toast('カードが入っていません'); return; }
  toast('画像を作っています…');
  try {
    const r = await deckImageBlob(), fn = r.name.replace(/[\\/:*?"<>|]/g, '_') + '.png';
    sheetActs = [];
    const file = new File([r.blob], fn, { type: 'image/png' });
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    showSheet('<h3>デッキ画像</h3><div class="note">' + (canShare ? '「写真に保存・共有」を押すと、共有メニューに「画像を保存」が出ます。' : '「ダウンロード」で保存できます。画像を長押しして保存もできます。') + '</div><div style="text-align:center"><img src="' + r.url + '" alt="" style="max-width:100%;max-height:52vh;border-radius:8px"></div><div class="acts">' +
      (canShare ? sbtn('写真に保存・共有', async () => { try { await navigator.share({ files: [file], title: r.name }); } catch (e) { } }) : '') +
      sbtn('ダウンロード', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = fn; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 1500); }, canShare ? 1 : 0) +
      '<button class="sub" data-close="1">閉じる</button></div>');
  } catch (e) { toast('画像を作れませんでした'); }
};
$('bSave').onclick = () => bSave();
$('bUse').onclick = () => { if (!$('bName').value.trim()) $('bName').value = '無題のデッキ'; if (!deckTotal()) { toast('カードが入っていません'); return; } if (bSave(true)) { lobbyApply(B.name); closeBuilder(); say('デッキ「' + B.name + '」を使います'); } };
['bQ', 'bColor', 'bType', 'bCost', 'bSet'].forEach(id => { $(id).oninput = () => { B.q = $('bQ').value; B.color = $('bColor').value; B.type = $('bType').value; B.cost = $('bCost').value; B.set = $('bSet').value; bRender(); }; });
$('bEx').onchange = () => { B.ex = $('bEx').checked; bRender(); };
$('bExport').onclick = () => { const t = JSON.stringify({ name: $('bName').value.trim() || '無題', cards: [...B.deck] }); showSheet('<h3>デッキを書き出す</h3><div class="note">下の文字をコピーして保存すれば、別の端末でも「取り込む」で復元できます。</div><textarea readonly style="height:120px" onfocus="this.select()">' + esc(t) + '</textarea><div class="acts"><button class="sub" data-close="1">閉じる</button></div>'); };
$('bImportJson').onclick = () => { showSheet('<h3>デッキを取り込む</h3><div class="note">書き出した文字を貼り付けてください。</div><textarea id="bImpText" style="height:120px"></textarea><div class="acts"><button id="bImpOk">取り込む</button><button class="sub" data-close="1">閉じる</button></div>'); $('bImpOk').onclick = () => { try { const o = JSON.parse($('bImpText').value); if (!o || !Array.isArray(o.cards)) throw 0; B.deck = new Map(); o.cards.forEach(([id, n]) => { if (cardById(String(id)) && n > 0) B.deck.set(String(id), Math.min(3, +n | 0)); }); B.name = String(o.name || '無題'); $('bName').value = B.name; hideSheet(); bRender(); toast('取り込みました'); } catch (e) { toast('形式が正しくありません'); } }; };
document.querySelectorAll('[data-btab]').forEach(b => { b.onclick = () => { $('builder').dataset.tab = b.dataset.btab; document.querySelectorAll('[data-btab]').forEach(x => x.classList.toggle('on', x === b)); }; });
$('builder').addEventListener('click', e => {
  if (dragSuppress) return;
  const t = e.target;
  const inf = t.closest('[data-binfo]'); if (inf) { const c = cardById(inf.dataset.binfo); if (c) showSheet(detailHTML({ def: c.def, cores: [], iid: '' }) + '<div class="acts"><button data-bpick="' + esc(c.raw.id) + '">デッキに入れる</button><button class="sub" data-close="1">閉じる</button></div>'); return; }
  const del = t.closest('[data-bdelall]'); if (del) { B.deck.delete(del.dataset.bdelall); bRender(); return; }
  const inc = t.closest('[data-binc]'); if (inc) { bAdd(inc.dataset.binc, 1); return; }
  const dec = t.closest('[data-bdec]'); if (dec) { bAdd(dec.dataset.bdec, -1); return; }
  const add = t.closest('[data-badd]'); if (add) bAdd(add.dataset.badd, 1);
});
document.addEventListener('click', e => { const p = e.target.closest && e.target.closest('[data-bpick]'); if (p) { bAdd(p.dataset.bpick, 1); hideSheet(); } });
(function () {   // 右のデッキ一覧: 長押し(スマホ)/ドラッグ(PC)で並べ替え
  let tm = null, drag = null, sx = 0, sy = 0, cand = null, mouse = false;
  const box = () => $('bList');
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('#bList .bc'); if (!el) return;
    if (e.target.closest('[data-bcover],[data-bdelall],[data-binfo],.bstep b')) return;
    sx = e.clientX; sy = e.clientY; clearTimeout(tm); mouse = e.pointerType === 'mouse'; cand = el;
    if (mouse) { if (e.button !== 0) cand = null; return; }
    tm = setTimeout(() => { drag = el; el.classList.add('lift'); try { navigator.vibrate && navigator.vibrate(25); } catch (x) { } toast('ドラッグして入れ替えできます'); }, 450);
  });
  document.addEventListener('pointermove', e => {
    if (!drag) { const mv = Math.hypot(e.clientX - sx, e.clientY - sy); if (mouse && cand && (e.buttons & 1) && mv > 6) { drag = cand; drag.classList.add('lift'); } else { if (mv > 8) clearTimeout(tm); return; } }
    const t = document.elementFromPoint(e.clientX, e.clientY), o = t && t.closest && t.closest('#bList .bc');
    if (o && o !== drag && box().contains(o)) { const kids = [...box().children]; if (kids.indexOf(o) > kids.indexOf(drag)) o.after(drag); else o.before(drag); }
  });
  const end = () => {
    clearTimeout(tm); cand = null; if (!drag) return;
    const ids = [...box().children].map(x => x.dataset.bdec).filter(Boolean), m = new Map();
    ids.forEach(id => { if (B.deck.has(id)) m.set(id, B.deck.get(id)); }); B.deck = m;
    drag.classList.remove('lift'); drag = null; dragSuppress = true; setTimeout(() => { dragSuppress = false; }, 150); bRender();
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('#bList .bc')) e.preventDefault(); });
})();
// ドラッグ(PC): 一覧→デッキで追加 / デッキ→一覧で削除
let bDragId = null, bDragFrom = '';
$('builder').addEventListener('dragstart', e => { const a = e.target.closest('[data-badd],[data-bdrag]'); if (!a) return; bDragId = a.dataset.badd || a.dataset.bdrag; bDragFrom = a.dataset.badd ? 'pool' : 'deck'; try { e.dataTransfer.setData('text/plain', bDragId); e.dataTransfer.effectAllowed = 'copyMove'; } catch (x) { } });
$('builder').addEventListener('dragover', e => { if (!bDragId) return; const over = e.target.closest('.bdeck,.bpool'); if (over && ((over.classList.contains('bdeck') && bDragFrom === 'pool') || (over.classList.contains('bpool') && bDragFrom === 'deck'))) { e.preventDefault(); over.classList.add('drop'); } });
$('builder').addEventListener('dragleave', e => { const o = e.target.closest('.bdeck,.bpool'); if (o) o.classList.remove('drop'); });
$('builder').addEventListener('drop', e => { document.querySelectorAll('.bdeck.drop,.bpool.drop').forEach(x => x.classList.remove('drop')); const over = e.target.closest('.bdeck,.bpool'); if (!over || !bDragId) return; e.preventDefault(); if (over.classList.contains('bdeck') && bDragFrom === 'pool') bAdd(bDragId, 1); else if (over.classList.contains('bpool') && bDragFrom === 'deck') bAdd(bDragId, -1); bDragId = null; });
$('builder').addEventListener('dragend', () => { bDragId = null; document.querySelectorAll('.bdeck.drop,.bpool.drop').forEach(x => x.classList.remove('drop')); });
try { const s = localStorage.getItem('bs-deck'); if (s) $('deckText').value = s; } catch (e) { }
setTimeout(() => { try { renderLobbyList(); } catch (e) { } }, 0);

function oppDefsFor(name, mine) {
  const d = name ? loadDecks()[name] : null; if (!d) return mine.slice();
  const r = parseDeck(deckToJSON((d.cards || []).filter(([id]) => cardById(id))), { fill: false });
  return r.err || !r.defs.length ? mine.slice() : r.defs;
}
let oppD = null;
function getDeck() {
  if (!nameOk()) { toast('先にプレイヤー名を入力してください'); try { $('myName').focus(); } catch (e) { } return null; }
  if (!$('deckText').value.trim()) { say('デッキ欄が空です。デッキを選ぶか、デッキ作成で組んでください'); return null; }
  const r = parseDeck($('deckText').value, { fill: DEV && $('fillDummy').checked });
  if (r.err) { say(r.err); return null; }
  try { localStorage.setItem('bs-deck', $('deckText').value); } catch (e) { }
  if (r.warn.length) say('注意: ' + r.warn.join(' / '));
  return r;
}

/* --- 接続(PeerJS: 合言葉 → 部屋ID) --- */
async function roomId() {
  const p = $('pass').value.trim();
  if (p.length < 4) { say('合言葉は4文字以上にしてください'); return null; }
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bs-practice-v1:' + p));
  return 'bsprac-' + [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}
function setupDC() {
  const c0 = dc;
  dc.on('open', () => {
    if (c0 !== dc) return;
    lastRx = Date.now(); rcBusy = false; showGame();
    if (!isHost) {
      // 同じカードは1回だけ送る(40枚分まるごと送ると50KB前後になり、接続先によっては途中で止まるため)
      const u = [], ix = myDefs.map(d => { let i = u.findIndex(x => x === d || (x.id && x.id === d.id && x.name === d.name)); if (i < 0) { i = u.length; const L = CARD_LIST.find(c => c.def.id === d.id); u.push(L && d.id && JSON.stringify(L.def) === JSON.stringify(d) ? { id: d.id } : d); } return i; });
      if (wantSpec || SPEC) { dsend({ t: 'spec', name: getName() }); $('side').textContent = '観戦の準備をしています…'; if (SPEC) toast('再接続しました'); }
      else if (guestStarted) { dsend({ t: 'resync' }); toast('再接続しました'); }
      else { if (!dsend({ t: 'deck', u, ix, name: getName() })) say('デッキの送信に失敗しました'); $('side').textContent = 'ホストの開始を待っています…(通信v25)'; }
    } else if (G) { pushState(); toast('相手が再接続しました'); }
    else $('side').textContent = '相手のデッキを受信中…(通信v25)';
  });
  dc.on('data', m => { if (c0 !== dc) return; lastRx = Date.now(); try { if (m && m.t === 'chunk') { const b = (chunkBuf[m.id] = chunkBuf[m.id] || { n: m.n, p: [], k: 0 }); if (!b.p[m.i]) { b.p[m.i] = m.d; b.k++; } if (b.k < b.n) return; delete chunkBuf[m.id]; const arrs = b.p.map(x => Uint8Array.from(atob(x), ch => ch.charCodeAt(0))), all = new Uint8Array(arrs.reduce((a, x) => a + x.length, 0)); let off = 0; arrs.forEach(x => { all.set(x, off); off += x.length; }); m = JSON.parse(new TextDecoder().decode(all)); } if (m && m.t === 'ping') return; if (m && m.t === 'state' && m.pk) m.v = unpackDefs(m.v); onDcData(m); } catch (e) { const t = '受信処理でエラー: ' + (e && e.message || e); try { $('side').textContent = t; } catch (e2) { } toast(t); } });
  dc.on('error', e => { try { $('side').textContent = '通信エラー: ' + (e && (e.type || e.message) || e); } catch (e2) { } });
  const onDcData = m => {
    if (!m || typeof m !== 'object') return;
    if (specMsg(m)) return;
    if (m.t === 'deck' && isHost && Array.isArray(m.u) && Array.isArray(m.ix)) { const miss = []; guestDefs = m.ix.slice(0, 100).map(i => { const x = m.u[i]; if (x && x.id && Object.keys(x).length === 1) { const L = CARD_LIST.find(c => c.def.id === x.id); if (!L) { miss.push(x.id); return null; } return L.def; } return x; }).filter(Boolean).map(cleanDef); if (miss.length) toast('相手のカードがこちらに無いため外しました: ' + [...new Set(miss)].join(',')); guestName = str(m.name, 12).trim(); startGame(); }
    else if (m.t === 'deck' && isHost && Array.isArray(m.defs)) { guestDefs = m.defs.slice(0, 100).map(cleanDef); guestName = str(m.name, 12).trim(); startGame(); }
    else if (m.t === 'state' && !isHost) { guestStarted = true; if (SPEC) setSpecV(m.v); else setV(m.v); }
    else if (m.t === 'act' && isHost && G) hostAct(1, m.a);
    else if (m.t === 'rematch') { rematchOpp = true; if (isHost) tryRematch(); else renderResult(); }
    else if (m.t === 'rematchgo' && !isHost) resetForNew();
    else if (m.t === 'resync' && isHost && G) { pushState(); }
    else if (m.t === 'bye') resetToHome('相手が退出したため、ホームに戻りました');
  };
  dc.on('close', () => { if (c0 !== dc) return; connLost(); });
}
/* --- 通信の安定化: 大きい送信の分割 / 切れたら自動で再接続 / 生存確認 --- */
let lastRx = 0, rcBusy = false, guestStarted = false, lastRoom = null; const chunkBuf = {};
/* カードの中身(def)は両側が持っているので、番号だけ送って受け取り側で戻す。トークンなど無いものはそのまま送る */
