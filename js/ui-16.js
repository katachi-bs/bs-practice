HE.hs = 0.57; heLayLoad();
$('heExpBtn').onclick = () => { $('heR0').value = ((HE.inT || 0) / 1000).toFixed(3); $('heR1').value = ((HE.outT != null ? HE.outT : HE.ops.reduce((m, o) => Math.max(m, o.t), 0) + 1000) / 1000).toFixed(3); $('heExp').hidden = false; };
$('heExpClose').onclick = () => { $('heExp').hidden = true; };
$('heGo').onclick = heExport;
const heCrcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function heCrc(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = heCrcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function heZip(files) {
  const parts = [], cen = []; let off = 0; const enc = new TextEncoder();
  files.forEach(f => {
    const nm = enc.encode(f.name), crc = heCrc(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(h.buffer, nm, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, off, true);
    cen.push(c.buffer, nm); off += 30 + nm.length + f.data.length;
  });
  let cs = 0; cen.forEach(p => { cs += p.byteLength !== undefined ? p.byteLength : p.length; });
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, e.buffer], { type: 'application/zip' });
}
try { $('admNcK').value = localStorage.getItem('bs-adm-key') || ''; } catch (e) { }
$('admNcS').onclick = () => { $('admNcT').value = '【お知らせ】アプリのURLが新しくなりました。保存したデッキ・設定・リプレイは新しいURLに自動では引き継がれないため、今のうちに「デッキを書き出す」で文字を保存し、新しいURLで読み込んでください(ホーム画面のアプリも入れ直しが必要です)。'; };
async function admNotice(on) {
  const key = $('admNcK').value.trim(); if (!key) { toast('合言葉を入力してください'); return; } try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
  try { const r = await fetch(API + '/admin/notice', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: JSON.stringify({ on, text: $('admNcT').value, url: $('admNcU').value.trim(), label: $('admNcL').value.trim() }) }); const j = await r.json().catch(() => ({})); if (!r.ok) { toast(r.status === 401 ? '合言葉が違います' : 'うまくいきませんでした'); return; } toast(on ? 'お知らせを表示しました' : 'お知らせを消しました'); try { localStorage.removeItem('bs-notice-x'); } catch (e) { } showNotice(on ? j.v : null); } catch (e) { toast('通信できませんでした'); }
}
$('admNcP').onclick = () => admNotice(true); $('admNcD').onclick = () => admNotice(false);
function admNtFill() { const t = ntTpl(); $('admNtT').value = t.title; $('admNtB').value = t.body; $('admNtO').value = ntOnly().join('\n'); }
const admNtOnlyVal = () => $('admNtO').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
$('admNtS').onclick = () => { try { localStorage.setItem('bs-nt-tpl', JSON.stringify({ title: $('admNtT').value || NT_DEF.title, body: $('admNtB').value, only: admNtOnlyVal() })); } catch (e) { } toast('通知文を保存しました'); };
$('admNtR').onclick = () => { try { localStorage.removeItem('bs-nt-tpl'); } catch (e) { } window.__ntFile = null; admNtFill(); toast('初期に戻しました'); };
$('admNtX').onclick = () => { const b = new Blob([JSON.stringify({ title: $('admNtT').value || NT_DEF.title, body: $('admNtB').value, only: admNtOnlyVal() }, null, 2)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'notify.json'; a.click(); };
/* 管理者: サンプルデッキの管理(サーバーに保存して全員に配信) */
let admSm = [];
function admSmLoad() { admSm = JSON.parse(JSON.stringify(window.SAMPLE_DECKS || [])); admSmRender(); }
function admSmRender() {
  const box = $('admSmList'); if (!box) return; box.textContent = '';
  admSm.forEach((d, i) => {
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:4px;align-items:center;margin:3px 0;flex-wrap:wrap';
    const mk = (t, f, dis) => { const b = document.createElement('button'); b.className = 'sub'; b.style.cssText = 'padding:3px 9px'; b.textContent = t; b.disabled = !!dis; b.onclick = f; return b; };
    row.appendChild(mk('↑', () => { [admSm[i - 1], admSm[i]] = [admSm[i], admSm[i - 1]]; admSmRender(); }, i === 0));
    row.appendChild(mk('↓', () => { [admSm[i + 1], admSm[i]] = [admSm[i], admSm[i + 1]]; admSmRender(); }, i === admSm.length - 1));
    const inp = document.createElement('input'); inp.value = d.name; inp.maxLength = 40; inp.style.width = '210px'; inp.oninput = () => { d.name = inp.value; }; row.appendChild(inp);
    const n = (d.cards || []).reduce((a, c) => a + (c[1] | 0), 0), sp = document.createElement('span'); sp.className = 'note'; sp.textContent = n + '枚'; row.appendChild(sp);
    row.appendChild(mk('削除', () => { admSm.splice(i, 1); admSmRender(); }));
    box.appendChild(row);
  });
  if (!admSm.length) box.textContent = '(サンプルデッキがありません)';
  try { const sel = $('admSmSrc'), all = loadDecks(); sel.textContent = ''; Object.keys(all).filter(k => !all[k].sample).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o); }); } catch (e) { }
}
$('admSmLoad').onclick = admSmLoad;
$('admSmAdd').onclick = () => {
  const k = $('admSmSrc').value, all = loadDecks(); if (!k || !all[k]) { toast('追加するデッキを選んでください(この端末に保存したデッキから選びます)'); return; }
  let nm = ($('admSmName').value || '').trim() || k; if (!/^【サンプル】/.test(nm) && !($('admSmName').value || '').trim()) nm = '【サンプル】' + nm;
  admSm.push({ name: nm.slice(0, 40), cards: JSON.parse(JSON.stringify(all[k].cards || [])), cover: all[k].cover || undefined }); $('admSmName').value = ''; admSmRender();
};
async function admSmCall(method, body) {
  const key = ($('admNcK').value || '').trim(), msg = $('admSmMsg'); if (!key) { toast('「① 管理用の合言葉」を入力してください'); return null; } try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
  try { const r = await fetch(API + '/admin/samples', { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({}));
    if (!r.ok) { msg.textContent = r.status === 401 ? '合言葉が違います' : '失敗しました(' + r.status + ' ' + (j.err || '') + ')'; return null; } return j; } catch (e) { msg.textContent = '通信エラー'; return null; }
}
$('admSmPut').onclick = async () => {
  if (!admSm.length) { toast('サンプルデッキがありません'); return; } if (admSm.some(d => !(d.name || '').trim())) { toast('名前が空のデッキがあります'); return; }
  const out = admSm.map(d => { const o = { name: d.name.trim(), cards: d.cards }; if (d.cover) o.cover = d.cover; return o; });
  const j = await admSmCall('PUT', out); if (!j) return;
  window.SAMPLE_DECKS = out; window.__srvSamples = true; try { bRefreshSelects(); } catch (e) { } $('admSmMsg').textContent = out.length + '個を配信しました(全員の次の起動から反映されます)';
};
$('admSmDel').onclick = async () => { const j = await admSmCall('DELETE'); if (j) $('admSmMsg').textContent = '配信をやめました(ページを開き直すと、アプリ内蔵の内容に戻ります)'; };
setTimeout(() => { try { admSmLoad(); } catch (e) { } }, 1800);
/* 管理者: 最近のログイン一覧 */
$('admSeenGo').onclick = async (quiet) => {
  const key = ($('admNcK').value || '').trim(), box = $('admSeenList'), msg = $('admSeenMsg');
  if (!key) { toast('「① 管理用の合言葉」を入力してください'); return; } try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
  if (quiet !== true) msg.textContent = '読み込み中…';
  try {
    const r = await fetch(API + '/admin/seen', { headers: { authorization: 'Bearer ' + key } });
    if (!r.ok) { msg.textContent = r.status === 401 ? '合言葉が違います' : '読み込めませんでした(' + r.status + ')'; return; }
    const j = await r.json(), now = j.now || Date.now(), by = new Map();
    (j.seen || []).forEach(x => { if (!by.has(x.name)) by.set(x.name, []); by.get(x.name).push(x); });
    const ago = t => { const m = Math.max(0, Math.round((now - t) / 60000)); return m < 1 ? 'いま' : m < 60 ? m + '分前' : m < 1440 ? Math.floor(m / 60) + '時間前' : Math.floor(m / 1440) + '日前'; };
    const dt = t => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const rows = [...by.entries()].map(([name, a]) => ({ name, a, last: Math.max(...a.map(x => x.t)) })).sort((p, q) => q.last - p.last);
    const ON = 3 * 60000, onl = rows.filter(g => now - g.last <= ON).length;
    msg.textContent = 'オンライン ' + onl + '人 / 記録 ' + rows.length + '人(' + (j.seen || []).length + '台)';
    box.textContent = '';
    rows.forEach(g => {
      const d = document.createElement('div'); d.style.cssText = 'padding:5px 0;border-bottom:1px solid #334';
      const b = document.createElement('b'); b.textContent = (now - g.last <= ON ? '● ' : '○ ') + (g.a.length > 1 ? '⚠ ' : '') + g.name; if (now - g.last <= ON) b.style.color = '#6fe39a'; d.appendChild(b);
      d.appendChild(document.createTextNode((now - g.last <= ON ? '  オンライン' : '  最終 ' + ago(g.last) + '(' + dt(g.last) + ')') + '  端末' + g.a.length + '台'));
      g.a.sort((p, q) => q.t - p.t).forEach(x => { const l = document.createElement('div'); l.className = 'note'; l.style.margin = '0 0 0 14px'; l.textContent = (x.plat || '不明') + ' ・ ID ' + x.dev + ' ・ 最終 ' + ago(x.t) + ' ・ 初回 ' + dt(x.t0) + ' ・ ' + x.n + '回'; d.appendChild(l); });
      box.appendChild(d);
    });
    if (!rows.length) box.textContent = 'まだ記録がありません。';
  } catch (e) { msg.textContent = '通信エラー'; }
};
setInterval(() => { try { if (document.body.classList.contains('adm') && !document.hidden && $('admSeenList').childNodes.length && ($('admNcK').value || '').trim()) $('admSeenGo').onclick(true); } catch (e) { } }, 30000);
$('admNtPush').onclick = async () => {
  const key = ($('admNcK').value || '').trim(), nm = (($('admNtTo').value || '').trim() || (($('myName') && $('myName').value) || '').trim()).slice(0, 12);
  if (!key) { toast('「① 管理用の合言葉」を入力してください'); return; } if (!nm) { toast('送り先のプレイヤー名を入れてください'); return; }
  try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
  try { const r = await fetch(API + '/admin/test', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: JSON.stringify({ name: nm }) }); const j = await r.json().catch(() => ({}));
    if (!r.ok) { toast(r.status === 401 ? '合言葉が違います' : '送れませんでした(' + r.status + ')'); return; }
    toast(j.targets ? '「' + nm + '」の ' + j.targets + '台に送りました(届いた: ' + j.sent + '台)' : '「' + nm + '」で登録された端末がありません(通知を許可して、名前を入れた端末で一度アプリを開いてください)'); } catch (e) { toast('送れませんでした(通信エラー)'); }
};
$('admNtTest').onclick = () => { $('admNtS').onclick(); const t = ntTpl(); toast(t.title.replace(/\{name\}/g, getName() || 'プレイヤー').replace(/\{msg\}/g, 'テスト')); };
function admGateOpen() { $('admPass').value = ''; $('admMsg').textContent = ''; $('admGate').hidden = false; $('admGate').style.display = 'flex'; setTimeout(() => $('admPass').focus(), 30); }
function admGateClose() { $('admGate').hidden = true; $('admGate').style.display = 'none'; }
$('admCancel').onclick = admGateClose;
$('admGo').onclick = () => {
  if (sha256hex($('admPass').value) === ADM_HASH) { admGateClose(); setAdm(true); toast('管理者モードに入りました'); try { $('admBox').scrollIntoView({ block: 'center' }); } catch (e) { } }
  else { $('admPass').value = ''; $('admMsg').textContent = '違います'; }
};
$('admPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('admGo').click(); if (e.key === 'Escape') admGateClose(); });
{
  const t = document.querySelector('.hrow h1'), ck = [];
  const hr = t.parentNode; [t, hr].forEach(x => { x.style.userSelect = 'none'; x.style.webkitUserSelect = 'none'; });
  hr.addEventListener('mousedown', e => { if (e.detail > 1) e.preventDefault(); });
  hr.addEventListener('selectstart', e => e.preventDefault());
  t.addEventListener('click', () => {
    if (!admPC()) return;
    const now = Date.now(); ck.push(now); if (ck.length > 6) ck.shift();
    if (ck.length < 6) return;
    const d = ck.slice(1).map((v, i) => v - ck[i]);
    if (d[0] < 1000 && d[1] < 1000 && d[2] >= 1000 && d[2] <= 5000 && d[3] < 1000 && d[4] < 1000) { ck.length = 0; admGateOpen(); }
  });
}
try { if (localStorage.getItem('bs-adm') === '1' && admPC()) setAdm(true); } catch (e) { }
/* カードタイルの行の高さ(縦横比1:1.4)を列幅から決める */
function fixRows(el) {
  const cols = getComputedStyle(el).gridTemplateColumns.split(' ').map(parseFloat).filter(x => x > 0);
  if (cols.length) el.style.gridAutoRows = Math.round(cols[0] * 1.4) + 'px';
}
['bGrid', 'bList', 'lobbyDeckList'].forEach(id => { const el = $(id); if (!el) return; const f = () => fixRows(el); new ResizeObserver(f).observe(el); new MutationObserver(f).observe(el, { childList: true }); f(); });
rebuildCards(); bRefreshSelects();
if (!$('lobbyDeck').value && $('lobbyDeck').options.length > 1) { $('lobbyDeck').selectedIndex = 1; try { lobbyApply($('lobbyDeck').value); } catch (e) { } }
loadPacks().then(() => { bRefreshSelects(); if (!$('builder').hidden) bRender(); setTimeout(preloadDeckArt, 0); });
if ($('lobbyDeck').value) lobbyApply($('lobbyDeck').value);
