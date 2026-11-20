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
  const key = ($('admNcK').value || '').trim(), msg = $('admSmMsg'); if (!key) { toast('「合言葉」を入力してください'); return null; } try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
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
/* 管理者: デッキの預かり(サーバーのデッキ置き場と、この端末のデッキを同じにする) */
async function admDkApi(method, body) {
  const key = ($('admNcK').value || '').trim(); if (!key) { toast('「合言葉」を入力してください'); return null; } try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
  try { const r = await fetch(API + '/admin/decks', { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); const j = await r.json().catch(() => ({}));
    if (!r.ok) { $('admDkMsg').textContent = r.status === 401 ? '合言葉が違います' : r.status === 429 ? '試行が多すぎます。しばらくしてからやり直してください' : '失敗しました(' + r.status + ')'; return null; } return j; } catch (e) { $('admDkMsg').textContent = '通信エラー'; return null; }
}
function admDkNorm(d) { return d && Array.isArray(d.cards) ? { cards: d.cards.map(c => [String(c[0]), c[1] | 0]).filter(c => c[0] && c[1] > 0), t: +d.t || 0, cover: typeof d.cover === 'string' ? d.cover : undefined } : null; }
async function admDkGet(quiet) {
  const j = await admDkApi('GET'); if (!j) return; const un = userDecks(); let n = 0;
  Object.keys(j.decks || {}).forEach(k => { const r = admDkNorm(j.decks[k]); if (!r || !r.cards.length) return; const l = un[k]; if (!l || (r.t || 0) > (l.t || 0)) { un[k] = Object.assign({}, l || {}, { t: r.t || Date.now(), cards: r.cards }); if (r.cover) un[k].cover = r.cover; delete un[k].sample; n++; } });
  if (n) { try { localStorage.setItem('bs-decks', JSON.stringify(un)); } catch (e) { } try { bRefreshSelects(); } catch (e) { } }
  $('admDkMsg').textContent = n ? n + '個のデッキを取り込みました' : '取り込むデッキはありませんでした(この端末のほうが新しい、または預かりが空です)'; if (n || !quiet) toast($('admDkMsg').textContent);
}
async function admDkPut() {
  const un = userDecks(), cur = await admDkApi('GET'); if (!cur) return; const m = cur.decks || {}; let n = 0;
  Object.keys(un).forEach(k => { const l = un[k]; if (!l || l.sample || !Array.isArray(l.cards) || !l.cards.length) return; const r = m[k]; if (!r || (l.t || 0) >= (r.t || 0)) { m[k] = { cards: l.cards.map(c => [String(c[0]), c[1] | 0]), t: l.t || Date.now(), cover: l.cover || undefined }; n++; } });
  const j = await admDkApi('PUT', { decks: m }); if (j) { $('admDkMsg').textContent = n + '個を送りました(預かりは合計 ' + j.n + '個)'; toast($('admDkMsg').textContent); }
}
$('admDkGet').onclick = () => admDkGet(); $('admDkPut').onclick = admDkPut;
try { $('admDkAuto').checked = localStorage.getItem('bs-dk-auto') !== '0'; } catch (e) { }
$('admDkAuto').onchange = () => { try { localStorage.setItem('bs-dk-auto', $('admDkAuto').checked ? '1' : '0'); } catch (e) { } };
setTimeout(() => { try { if (window.ADMIN_ED && $('admDkAuto').checked && ($('admNcK').value || '').trim()) admDkGet(true); } catch (e) { } }, 2500);
/* 初回画面: アプリとして入れることをすすめる(入れていない端末だけ。「あとで」で14日間は出さない) */
(function () {
  const box = $('instBox'); if (!box) return;
  const KEY = 'bs-inst-later'; let dp = null;
  const standalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const later = () => { try { const t = +localStorage.getItem(KEY) || 0; return t > 0 && Date.now() - t < 14 * 864e5; } catch (e) { return false; } };
  const ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /Line\/|FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(ua);
  const why = '部屋ができたときの通知が届き、全画面で遊べます。';
  function render() {
    if (standalone() || later()) { box.hidden = true; return; }
    $('instGo').hidden = !dp;
    $('instTx').textContent = dp ? why
      : inApp ? 'いま開いているのはアプリ内のブラウザです。SafariかChromeで開き直して、「ホーム画面に追加」をしてください。' + why
      : ios ? 'Safariの共有ボタン(四角から矢印が出ているマーク)を押して、「ホーム画面に追加」を選んでください。iPhoneでは、ホーム画面に追加しないと、通知が届きません。'
      : 'ブラウザのメニュー(︙)から、「アプリをインストール」または「ホーム画面に追加」を選んでください。' + why;
    box.hidden = false;
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dp = e; render(); });
  window.addEventListener('appinstalled', () => { dp = null; box.hidden = true; });
  $('instGo').onclick = async () => { if (!dp) return; try { dp.prompt(); await dp.userChoice; } catch (e) { } dp = null; render(); };
  $('instLater').onclick = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { } box.hidden = true; };
  render();
})();
/* BSP ADMIN: 合言葉の確認(サーバーの合言葉と合うまで、全体をロックする)。見た目のロックなので、サーバー側の確認(401)が本当の守り */
(function () {
  if (!window.ADMIN_ED) return;
  const root = document.documentElement; let busy = false, lastOk = 0;
  const msg = t => { $('tkMsg').textContent = t; };
  async function verify(key, quiet) {
    if (busy) return; busy = true;
    try {
      if (!quiet) msg('確認しています…');
      const r = await fetch(API + '/admin/notify', { headers: { authorization: 'Bearer ' + key }, cache: 'no-store' });
      if (r.ok) { lastOk = Date.now(); try { localStorage.setItem('bs-adm-key', key); } catch (e) { } $('admNcK').value = key; root.classList.remove('tklock'); $('tkIn').value = ''; return; }
      root.classList.add('tklock');
      if (r.status === 401) { try { localStorage.removeItem('bs-adm-key'); } catch (e) { } $('admNcK').value = ''; msg('合言葉が違います。'); }
      else if (r.status === 429) msg('間違いが続いたため、しばらく入力できません(約10分)。');
      else msg('確認に失敗しました(' + r.status + ')。もう一度試してください。');
    } catch (e) { root.classList.add('tklock'); msg('サーバーに接続できません。通信を確認して、もう一度「開く」を押してください。'); }
    finally { busy = false; }
  }
  const go = () => { const k = $('tkIn').value.trim(); if (!k) { msg('合言葉を入力してください。'); return; } verify(k); };
  $('tkGo').onclick = go; $('tkIn').onkeydown = e => { if (e.key === 'Enter') go(); };
  let saved = ''; try { saved = localStorage.getItem('bs-adm-key') || ''; } catch (e) { }
  if (saved) verify(saved); else msg('合言葉を入力してください。サーバーの合言葉と合わないと、使えません。');
  const again = () => { let k = ''; try { k = localStorage.getItem('bs-adm-key') || ''; } catch (e) { } if (k && !root.classList.contains('tklock')) verify(k, true); };
  setInterval(again, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastOk > 2 * 60 * 1000) again(); });
})();
function admTrend(el, g, now) {   // 名前をタップ: 直近7日の使用推移(日ごとに、30分以上あけて開いた回数)
  const devs = new Set(g.a.map(x => x.dev)), days = [], jst = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
  for (let i = 6; i >= 0; i--) days.push(jst(now - i * 864e5));
  const by = {}; (window._seenDays || []).forEach(x => { if (devs.has(x.dev)) { const o = by[x.day] || (by[x.day] = { n: 0, m: 0 }); o.n += x.n; o.m += x.m; } });
  const has = (window._seenDays || []).length > 0, mx = Math.max(1, ...days.map(d => (by[d] || { n: 0 }).n));
  el.style.cssText = 'margin:6px 0 4px 14px;padding:8px;background:#ffffff0a;border-radius:8px';
  el.innerHTML = '<div class="note" style="margin:0 0 6px">直近7日の使用(30分以上あけて開いた回数)' + (has ? '' : ' — 日ごとの記録は、サーバーを更新したあとから貯まります') + '</div>' + days.map(d => { const o = by[d] || { n: 0, m: 0 }; return '<div style="display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.7"><span style="width:44px;color:var(--sub)">' + d.slice(5).replace('-', '/') + '</span><span style="flex:1;height:10px;background:#ffffff10;border-radius:5px;overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(o.n / mx * 100) + '%;background:var(--acc)"></i></span><span style="width:28px;text-align:right">' + (has ? o.n : '-') + '</span></div>'; }).join('') +
    '<div class="note" style="margin:6px 0 0">全期間: ' + g.a.reduce((a, x) => a + (x.n || 0), 0) + '回 / 初回 ' + new Date(Math.min(...g.a.map(x => x.t0 || x.t)) + 0).toLocaleDateString('ja-JP') + '</div>';
}
$('admSeenGo').onclick = async (quiet) => {
  const key = ($('admNcK').value || '').trim(), box = $('admSeenList'), msg = $('admSeenMsg');
  if (!key) { toast('「合言葉」を入力してください'); return; } try { localStorage.setItem('bs-adm-key', key); } catch (e) { }
  if (quiet !== true) msg.textContent = '読み込み中…';
  try {
    const r = await fetch(API + '/admin/seen', { headers: { authorization: 'Bearer ' + key } });
    if (!r.ok) { msg.textContent = r.status === 401 ? '合言葉が違います' : '読み込めませんでした(' + r.status + ')'; return; }
    const j = await r.json(), now = j.now || Date.now(), by = new Map(); window._seenDays = j.days || [];
    const dv = new Map(); (j.seen || []).forEach(x => { const k = x.dev || (x.name + '|' + x.plat), o = dv.get(k); if (!o) dv.set(k, Object.assign({}, x)); else { const nw = x.t > o.t ? Object.assign({}, x) : o; nw.t0 = Math.min(o.t0 || o.t, x.t0 || x.t); nw.n = Math.max(o.n || 0, x.n || 0); dv.set(k, nw); } });   // 同じIDは1件にまとめる(いちばん新しい名前・時刻で上書き)
    const seen1 = [...dv.values()]; seen1.forEach(x => { if (!by.has(x.name)) by.set(x.name, []); by.get(x.name).push(x); });
    const ago = t => { const m = Math.max(0, Math.round((now - t) / 60000)); return m < 1 ? 'いま' : m < 60 ? m + '分前' : m < 1440 ? Math.floor(m / 60) + '時間前' : Math.floor(m / 1440) + '日前'; };
    const dt = t => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const rows = [...by.entries()].map(([name, a]) => ({ name, a, last: Math.max(...a.map(x => x.t)) })).sort((p, q) => q.last - p.last);
    const ON = 3 * 60000, onl = rows.filter(g => now - g.last <= ON).length;
    msg.textContent = 'オンライン ' + onl + '人 / 記録 ' + rows.length + '人(' + seen1.length + '台)';
    box.textContent = '';
    rows.forEach(g => {
      const d = document.createElement('div'); d.style.cssText = 'padding:5px 0;border-bottom:1px solid #334';
      const b = document.createElement('b'); b.textContent = (now - g.last <= ON ? '● ' : '○ ') + (g.a.length > 1 ? '⚠ ' : '') + g.name; if (now - g.last <= ON) b.style.color = '#6fe39a'; b.style.cursor = 'pointer'; b.style.textDecoration = 'underline dotted'; b.title = 'タップで使用推移'; d.appendChild(b);
      const tr = document.createElement('div'); tr.hidden = true; tr.className = 'admtr'; b.onclick = () => { if (tr.hidden) admTrend(tr, g, now); tr.hidden = !tr.hidden; };
      d.appendChild(document.createTextNode((now - g.last <= ON ? '  オンライン' : '  最終 ' + ago(g.last) + '(' + dt(g.last) + ')') + '  端末' + g.a.length + '台'));
      g.a.sort((p, q) => q.t - p.t).forEach(x => { const l = document.createElement('div'); l.className = 'note'; l.style.margin = '0 0 0 14px'; l.textContent = (x.plat || '不明') + ' ・ ID ' + x.dev + ' ・ 最終 ' + ago(x.t) + ' ・ 初回 ' + dt(x.t0) + ' ・ ' + x.n + '回'; d.appendChild(l); });
      d.appendChild(tr); box.appendChild(d);
    });
    if (!rows.length) box.textContent = 'まだ記録がありません。';
  } catch (e) { msg.textContent = '通信エラー'; }
};
setInterval(() => { try { if (document.body.classList.contains('adm') && !document.hidden && $('admSeenList').childNodes.length && ($('admNcK').value || '').trim()) $('admSeenGo').onclick(true); } catch (e) { } }, 30000);
$('admNtPush').onclick = async () => {
  const key = ($('admNcK').value || '').trim(), nm = (($('admNtTo').value || '').trim() || (($('myName') && $('myName').value) || '').trim()).slice(0, 12);
  if (!key) { toast('「合言葉」を入力してください'); return; } if (!nm) { toast('送り先のプレイヤー名を入れてください'); return; }
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
    if (!window.ADMIN_ED) return;
    const now = Date.now(); ck.push(now); if (ck.length > 6) ck.shift();
    if (ck.length < 6) return;
    const d = ck.slice(1).map((v, i) => v - ck[i]);
    if (d[0] < 1000 && d[1] < 1000 && d[2] >= 1000 && d[2] <= 5000 && d[3] < 1000 && d[4] < 1000) { ck.length = 0; admGateOpen(); }
  });
}
try { if (window.ADMIN_ED) { setAdm(true); document.title = 'BSP ADMIN'; } else localStorage.removeItem('bs-adm'); } catch (e) { }
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
