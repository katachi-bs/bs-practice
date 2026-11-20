$('devEnd').onclick = () => setDev(false);
setDev(true);   // 誰でも開ける(パスなし)
const admPC = () => { try { return window.matchMedia('(hover:hover) and (pointer:fine)').matches && window.innerWidth >= 900; } catch (e) { return false; } };
const ADM_HASH = 'b7e628a0cc99a4923ae886d33f88325e26f2f8dadcd66d2e10216178d6d7af9d';
function sha256hex(str) {
  const b = new TextEncoder().encode(str), l = b.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(b); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296));
  const K = []; { let c = 0, x = 2; while (c < 64) { let pr = true; for (let d = 2; d * d <= x; d++) if (x % d === 0) { pr = false; break; } if (pr) { K.push((Math.cbrt(x) % 1 * 4294967296) | 0); c++; } x++; } }
  const H = []; { let c = 0, x = 2; while (c < 8) { let pr = true; for (let d = 2; d * d <= x; d++) if (x % d === 0) { pr = false; break; } if (pr) { H.push((Math.sqrt(x) % 1 * 4294967296) | 0); c++; } x++; } }
  const rr = (v, k) => (v >>> k) | (v << (32 - k)), w = new Array(64);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], c = w[i - 2]; w[i] = (w[i - 16] + (rr(a, 7) ^ rr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rr(c, 17) ^ rr(c, 19) ^ (c >>> 10))) | 0; }
    let [a, b2, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b2) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
function setAdm(on) {
  if (on && !window.ADMIN_ED) on = false;   // 一般向けのアプリには、管理者モードはない(BSP ADMIN だけ)
  document.body.classList.toggle('adm', on); $('admBox').hidden = !on; $('vidBox').hidden = !on; if (on) admNtFill();
  try { localStorage.setItem('bs-adm', on ? '1' : ''); } catch (e) { }
  if (on) admFill();
}
function admFill() {
  const all = loadDecks(), names = Object.keys(all).sort((x, y) => (all[y].t || 0) - (all[x].t || 0));
}
function admDeckInfo(role, name) {
  const d = loadDecks()[name]; if (!d) return null;
  const cards = (d.cards || []).map(([id, n]) => { const c = cardById(id); return { id: id, name: c ? c.def.name : '', color: c ? c.def.color : '', cost: c ? c.def.cost : '', type: c ? c.def.type : '', count: n }; });
  return { role: role, name: name, total: cards.reduce((a, c) => a + c.count, 0), cards: cards };
}
function admOut(title, fn, text, mime) {
  sheetActs = [];
  showSheet('<h3>' + esc(title) + '</h3><div class="acts">' +
    sbtn('ファイルで保存', () => { try { const blob = new Blob([text], { type: mime }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('ファイルを保存しました'); } catch (e) { toast('保存に失敗しました'); } }) +
    sbtn('コピー', async () => { try { await navigator.clipboard.writeText(text); toast('コピーしました'); } catch (e) { toast('コピーできませんでした'); } }, 1) +
    '<button class="sub" data-close="1">閉じる</button></div>');
}
$('admCards').onclick = () => {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = ['id,name,color,cost,type'].concat(CARD_LIST.map(c => [c.raw.id, c.def.name, c.def.color, c.def.cost, c.def.type].map(q).join(',')));
  admOut('カード一覧(CSV)', 'bsp-cards.csv', '\ufeff' + rows.join('\n'), 'text/csv');
};
$('admEnd').onclick = () => setAdm(false);
/* ===== カード所持管理(管理者用): R/M/X とシークレット、プロモの所持枚数 ===== */
const COLK = 'bs-col-v1';
let COL = { own: {}, fav: {}, extra: {} }, COLR = null, COLV = { vw: 'g', tab: 'img', set: '', rar: '', q: '', only: '' };
try { const j = JSON.parse(localStorage.getItem(COLK) || 'null'); if (j && j.own) COL = { own: j.own || {}, fav: j.fav || {}, extra: j.extra || {} }; } catch (e) { }
const colSave = () => { try { localStorage.setItem(COLK, JSON.stringify(COL)); } catch (e) { toast('この端末に保存できませんでした'); } };
const colN = id => COL.own[id] || 0;
function colSet(id, n) { n = Math.max(0, Math.min(99, n | 0)); if (n) COL.own[id] = n; else delete COL.own[id]; colSave(); }
async function colLoadRar() {
  if (COLR) return COLR;
  try { const r = await fetch('cards/rarity.json', { cache: 'no-cache' }); COLR = await r.json(); } catch (e) { COLR = {}; toast('レアリティの表を読み込めませんでした'); }
  return COLR;
}
let _colRows = null;
function colRows() {
  if (_colRows) return _colRows;
  const vs = new Map(); CARD_LIST.forEach(c => { if (c.raw.altOf) { const k = String(c.raw.altOf); (vs.get(k) || vs.set(k, []).get(k)).push(c); } });
  const rows = [];
  CARD_LIST.forEach(c => {
    if (c.raw.altOf) return;
    const id = String(c.raw.id), rar = COLR[id] || '', arts = vs.get(id) || [];
    const sec = arts.filter(x => /-S\d+$/.test(String(x.raw.id))), pro = arts.filter(x => !/-S\d+$/.test(String(x.raw.id)));
    const promoOnly = rar === 'CP' || rar === 'PX';
    if (!(rar === 'R' || rar === 'M' || rar === 'X' || promoOnly || sec.length || pro.length || COL.extra[id] || colN(id) > 0)) return;
    const hideN = rar === 'C' && !COL.extra[id] && colN(id) === 0;   // 通常のCは出さない(シークレット・プロモだけ)
    rows.push({ id, name: c.def.name, set: c.set, rar: rar || '?', promoOnly, ids: { n: promoOnly || hideN ? [] : [id], s: sec.map(x => String(x.raw.id)), p: promoOnly ? [id].concat(pro.map(x => String(x.raw.id))) : pro.map(x => String(x.raw.id)) } });
  });
  return (_colRows = rows);
}
const colSum = ids => ids.reduce((a, i) => a + colN(i), 0);
const colCnt = r => { const n = colSum(r.ids.n), s = colSum(r.ids.s), p = colSum(r.ids.p); return { n, s, p, t: n + s + p }; };
const colTarget = r => (COL.fav[r.id] && COL.fav[r.id].t) || 3;
const colArtLabel = id => { const v = VARIANTS.find(x => x.id === id); if (/-S\d+$/.test(id)) return 'シークレット' + (v && v.tier >= 3 ? '★★' : v && v.tier === 2 ? '★' : '') + ' ' + id.match(/-S(\d+)$/)[1]; const m = id.match(/-P(\d+)$/); return m ? 'プロモ ' + m[1] : (/^RP/.test(id) || /CP/.test(id) ? 'プロモ' : '別絵'); };
function colFiltered() {
  const q = COLV.q.trim().toLowerCase();
  return colRows().filter(r => {
    if (COLV.set && r.set !== COLV.set) return false;
    if (COLV.rar === 'S') { if (!r.ids.s.length) return false; } else if (COLV.rar === 'P') { if (!r.ids.p.length) return false; } else if (COLV.rar && r.rar !== COLV.rar) return false;
    if (q && !(r.name + ' ' + r.id).toLowerCase().includes(q)) return false;
    const k = colCnt(r); if (COLV.only === 'none' && k.t > 0) return false; if (COLV.only === 'have' && k.t === 0) return false;
    return true;
  });
}
const colImg = id => { const u = thumbOf(id) || artQ(id); return u ? '<img loading="lazy" src="' + esc(u) + '" alt="">' : ''; };
function colHead() {
  const sets = [...new Set(colRows().map(r => r.set))];
  const T = [['img', '確認'], ['miss', '未所持'], ['fav', '★'], ['add', '＋追加']], VW = COLV.tab === 'img' || COLV.tab === 'miss';
  return '<div class="coltop"><b>カード所持管理</b><button class="sub" data-cx="close">閉じる</button></div>' +
    '<div class="coltabs">' + T.map(t => '<button class="' + (COLV.tab === t[0] ? 'on' : 'sub') + '" data-cx="tab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '<button class="sub" data-cx="out">Excel</button>' + (VW ? '<span class="cvw"><button class="' + (COLV.vw === 'g' ? 'on' : 'sub') + '" data-cx="vw" data-v="g">画像</button><button class="' + (COLV.vw === 't' ? 'on' : 'sub') + '" data-cx="vw" data-v="t">表</button></span>' : '') + '</div>' +
    '<div class="colflt"><select data-cf="set"><option value="">全収録</option>' + sets.map(s => '<option' + (COLV.set === s ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select>' +
    '<select data-cf="rar">' + [['', '全レア'], ['R', 'R'], ['M', 'M'], ['X', 'X'], ['S', 'シークレットあり'], ['P', 'プロモあり']].map(o => '<option value="' + o[0] + '"' + (COLV.rar === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
    (COLV.tab === 'img' ? '<select data-cf="only">' + [['', 'すべて'], ['have', '持っている'], ['none', '持っていない']].map(o => '<option value="' + o[0] + '"' + (COLV.only === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' : '') +
    '<input data-cf="q" placeholder="カード名・番号" value="' + esc(COLV.q) + '"></div>';
}
function colBody() {
  const rows = colFiltered(), tab = COLV.tab;
  if (tab === 'img' && COLV.vw !== 't') { const cell = r => { const k = colCnt(r); return '<div class="colc' + (k.t ? ' has' : '') + '" data-cx="ed" data-v="' + esc(r.id) + '">' + colImg(r.id) + (COL.fav[r.id] ? '<i class="colcf">★</i>' : '') + '<span class="colct">' + k.t + '</span><span class="colcn">' + esc(r.name) + '</span><span class="colcs">' + r.rar + (k.n || k.s || k.p ? ' 通' + k.n + (r.ids.s.length ? ' S' + k.s : '') + (r.ids.p.length ? ' P' + k.p : '') : '') + '</span></div>'; };
    let h = '', cur = null, buf = ''; rows.forEach(r => { if (r.set !== cur) { if (cur !== null) h += '<div class="colset">' + esc(cur) + '</div><div class="colgrid">' + buf + '</div>'; cur = r.set; buf = ''; } buf += cell(r); }); if (cur !== null) h += '<div class="colset">' + esc(cur) + '</div><div class="colgrid">' + buf + '</div>';
    return '<div class="colinfo">' + rows.length + '種類(元のカードの収録弾ごと)</div>' + h; }
  if (tab === 'img' && COLV.vw === 't') return '<div class="colinfo">' + rows.length + '種類(タップで編集)</div><table class="coltb"><tr><th>カード名</th><th>所持</th><th>通常</th><th>シークレット</th><th>プロモ</th></tr>' + (() => { let h = '', cur = null; rows.forEach(r => { if (r.set !== cur) { cur = r.set; h += '<tr class="colsetr"><td colspan="5">' + esc(cur) + '</td></tr>'; } const k = colCnt(r); h += '<tr data-cx="ed" data-v="' + esc(r.id) + '"><td>' + esc(r.name) + '<small> ' + r.rar + '</small></td><td>' + k.t + '</td><td' + (r.ids.n.length ? '>' + k.n : ' class="na">') + '</td><td' + (r.ids.s.length ? '>' + k.s : ' class="na">') + '</td><td' + (r.ids.p.length ? '>' + k.p : ' class="na">') + '</td></tr>'; }); return h; })() + '</table>';
  if (tab === 'miss') {
    const L = rows.filter(r => !r.promoOnly && (r.rar === 'R' || r.rar === 'M' || r.rar === 'X' || COL.extra[r.id])).map(r => ({ r, k: colCnt(r), need: colTarget(r) - colCnt(r).t })).filter(x => x.need > 0);
    const hd = '<div class="colinfo">あと足りないカード ' + L.length + '種類・計' + L.reduce((a, x) => a + x.need, 0) + '枚(目標は基本3枚。★で個別に変えられます)</div>';
    if (COLV.vw === 't') return hd + '<table class="coltb"><tr><th>カード名</th><th>所持</th><th>目標</th><th>あと</th><th></th></tr>' + (() => { let h = '', cur = null; L.forEach(x => { if (x.r.set !== cur) { cur = x.r.set; h += '<tr class="colsetr"><td colspan="5">' + esc(cur) + '</td></tr>'; } h += '<tr data-cx="ed" data-v="' + esc(x.r.id) + '"><td>' + esc(x.r.name) + '<small> ' + x.r.rar + '</small></td><td>' + x.k.t + '</td><td>' + colTarget(x.r) + '</td><td><b>' + x.need + '</b></td><td><button class="sub" data-cx="inc" data-v="' + esc(x.r.id) + '">＋1</button></td></tr>'; }); return h; })() + '</table>';
    if (COLV.vw === 'g') { let h = '', cur = null, buf = ''; L.forEach(x => { if (x.r.set !== cur) { if (cur !== null) h += '<div class="colset">' + esc(cur) + '</div><div class="colgrid">' + buf + '</div>'; cur = x.r.set; buf = ''; } buf += '<div class="colc" data-cx="ed" data-v="' + esc(x.r.id) + '">' + colImg(x.r.id) + '<span class="colct">あと' + x.need + '</span><span class="colcn">' + esc(x.r.name) + '</span><span class="colcs">' + x.r.rar + ' 所持' + x.k.t + '/' + colTarget(x.r) + '</span></div>'; }); if (cur !== null) h += '<div class="colset">' + esc(cur) + '</div><div class="colgrid">' + buf + '</div>'; return hd + h; }
    return '<div class="colinfo">あと足りないカード ' + L.length + '種類・計' + L.reduce((a, x) => a + x.need, 0) + '枚(目標は基本3枚。★で個別に変えられます)</div>' + colGrp(L.map(x => x.r), r => { const x = L.find(y => y.r === r); return '<div class="colrow" data-cx="ed" data-v="' + esc(x.r.id) + '"><div class="cth">' + colImg(x.r.id) + '</div><div class="cmid"><b>' + esc(x.r.name) + '</b><small>' + x.r.rar + ' / ' + esc(x.r.id) + ' / 所持' + x.k.t + '・目標' + colTarget(x.r) + '</small></div><div class="cneed">あと<b>' + x.need + '</b>枚</div><button class="sub" data-cx="inc" data-v="' + esc(x.r.id) + '">＋1</button></div>'; });
  }
  if (tab === 'add') return colAddBody();
  const F = colRows().filter(r => COL.fav[r.id]);
  return '<div class="colinfo">お気に入り ' + F.length + '種類(カードを開いて ☆ を押すと入ります。目標枚数も決められます)</div>' + colGrp(F, r => { const k = colCnt(r), t = colTarget(r); return '<div class="colrow" data-cx="ed" data-v="' + esc(r.id) + '"><div class="cth">' + colImg(r.id) + '</div><div class="cmid"><b>' + esc(r.name) + '</b><small>' + r.rar + ' / 通常' + k.n + (r.ids.s.length ? ' ・シークレット' + k.s : '') + (r.ids.p.length ? ' ・プロモ' + k.p : '') + '</small></div><div class="cneed">' + k.t + '/' + t + '<br><small>' + (t - k.t > 0 ? 'あと' + (t - k.t) : '達成') + '</small></div></div>'; });
}
function colAddBody() {
  const q = COLV.q.trim().toLowerCase(), have = new Set(colRows().map(r => r.id));
  const L = CARD_LIST.filter(c => !c.raw.altOf && !have.has(String(c.raw.id)) && (!COLV.set || c.set === COLV.set) && (!q || (c.def.name + ' ' + c.raw.id + ' ' + (c.def.reading || '')).toLowerCase().includes(q)));
  const show = L.slice(0, 120);
  return '<div class="colinfo">表にないカード(C・汎用カードなど)を足します。タップすると一覧に入って、そのまま枚数を入れられます。' + (L.length > 120 ? '(' + L.length + '件中、先頭120件。名前で絞ってください)' : '(' + L.length + '件)') + '</div><div class="colgrid">' + show.map(c => '<div class="colc" data-cx="addc" data-v="' + esc(String(c.raw.id)) + '">' + colImg(String(c.raw.id)) + '<span class="colcn">' + esc(c.def.name) + '</span><span class="colcs">' + esc(String(c.raw.id)) + '</span></div>').join('') + '</div>';
}
const colGrp = (rows, fn) => { let out = '', cur = null, buf = ''; const flush = () => { if (cur !== null) out += '<div class="colset">' + esc(cur) + '</div>' + buf; buf = ''; }; rows.forEach(r => { if (r.set !== cur) { flush(); cur = r.set; } buf += fn(r); }); flush(); return out; };
function colRender(keep) {
  const ov = $('colOv'); if (!ov) return; const sc = ov.querySelector('.colmain') ? ov.querySelector('.colmain').scrollTop : 0;
  const act = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.cf === 'q';
  if (keep) { ov.querySelector('.colmain').innerHTML = colBody(); return; }
  ov.innerHTML = '<div class="colhd">' + colHead() + '</div><div class="colmain">' + colBody() + '</div>'; ov.querySelector('.colmain').scrollTop = sc;
}
function colEdit(id) {
  const r = colRows().find(x => x.id === id); if (!r) return;
  const row = (aid, lab) => '<div class="ered"><div class="cth">' + colImg(aid) + '</div><div class="cmid"><b>' + lab + '</b><small>' + esc(aid) + '</small></div><span class="cstp"><b data-cx="dec" data-v="' + esc(aid) + '">－</b><i>' + colN(aid) + '</i><b data-cx="inc2" data-v="' + esc(aid) + '">＋</b></span></div>';
  const k = colCnt(r), f = COL.fav[id];
  const el = $('colEd') || (() => { const d = document.createElement('div'); d.id = 'colEd'; $('colOv').appendChild(d); return d; })();
  el.dataset.id = id; el.hidden = false;
  el.innerHTML = '<div class="edp"><div class="edh"><b>' + esc(r.name) + '</b><small>' + r.rar + ' / ' + esc(id) + '</small><button class="sub" data-cx="edclose">閉じる</button></div>' +
    '<div class="edsum">所持 <b>' + k.t + '</b>枚(通常' + k.n + (r.ids.s.length ? ' ・シークレット' + k.s : '') + (r.ids.p.length ? ' ・プロモ' + k.p : '') + ')</div>' +
    '<div class="edfav"><button class="' + (f ? 'on' : 'sub') + '" data-cx="fav" data-v="' + esc(id) + '">' + (f ? '★ お気に入り' : '☆ お気に入りに入れる') + '</button>' +
    '<span class="cstp' + (f ? '' : ' dim') + '">目標 <b data-cx="tdec" data-v="' + esc(id) + '">－</b><i>' + colTarget(r) + '</i><b data-cx="tinc" data-v="' + esc(id) + '">＋</b></span></div>' +
    (COL.extra[id] && !colCnt(r).t ? '<button class="sub" data-cx="unx" data-v="' + esc(id) + '" style="margin-bottom:6px">この追加を取り消す</button>' : '') + '<div class="edlist">' + r.ids.n.map(a => row(a, '通常')).join('') + r.ids.s.map(a => row(a, colArtLabel(a))).join('') + r.ids.p.map(a => row(a, colArtLabel(a))).join('') + '</div></div>';
}
function colSheets() {
  const rows = colRows().slice().sort((a, b) => a.set.localeCompare(b.set, 'ja') || a.id.localeCompare(b.id));
  const A = [['収録', '番号', 'レア', 'カード名', '所持枚数', '通常', 'シークレット', 'プロモ']].concat(rows.map(r => { const k = colCnt(r); return [r.set, r.id, r.rar, r.name, k.t, r.ids.n.length ? k.n : null, r.ids.s.length ? k.s : null, r.ids.p.length ? k.p : null]; }));
  const B = [['収録', '番号', 'レア', 'カード名', '所持枚数', '目標', 'あと']].concat(rows.filter(r => !r.promoOnly && ('RMX'.includes(r.rar) || COL.extra[r.id])).map(r => { const k = colCnt(r), t = colTarget(r); return [r.set, r.id, r.rar, r.name, k.t, t, Math.max(0, t - k.t)]; }).filter(x => x[6] > 0));
  const C = [['収録', '番号', 'レア', 'カード名', '所持枚数', '通常', 'シークレット', 'プロモ', '目標']].concat(rows.filter(r => COL.fav[r.id]).map(r => { const k = colCnt(r); return [r.set, r.id, r.rar, r.name, k.t, r.ids.n.length ? k.n : null, r.ids.s.length ? k.s : null, r.ids.p.length ? k.p : null, colTarget(r)]; }));
  return [['所持一覧', A], ['未所持(あと何枚)', B], ['お気に入り', C]];
}
/* 最小のxlsx(zipを無圧縮で組む。外部ライブラリなし) */
function xlsxBuild(sheets) {
  const enc = new TextEncoder(), X = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const col = i => String.fromCharCode(65 + i);
  const sh = rows => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="6" customWidth="1"/><col min="4" max="4" width="26" customWidth="1"/><col min="5" max="9" width="12" customWidth="1"/></cols><sheetData>' + rows.map((r, y) => '<row r="' + (y + 1) + '">' + r.map((v, x) => { const ref = col(x) + (y + 1), st = y === 0 ? ' s="1"' : v === null ? ' s="2"' : ''; if (v === null) return '<c r="' + ref + '"' + st + '/>'; return typeof v === 'number' ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"' + st + '><is><t>' + X(v) + '</t></is></c>'; }).join('') + '</row>').join('') + '</sheetData></worksheet>';
  const F = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + X(s[0]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Meiryo"/></font><font><b/><sz val="11"/><name val="Meiryo"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDE6FF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs></styleSheet>']
  ].concat(sheets.map((s, i) => ['xl/worksheets/sheet' + (i + 1) + '.xml', sh(s[1])]));
  const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const parts = [], cen = []; let off = 0;
  const w16 = (a, v) => a.push(v & 255, v >> 8 & 255), w32 = (a, v) => a.push(v & 255, v >> 8 & 255, v >> 16 & 255, v >>> 24 & 255);
  F.forEach(([nm, txt]) => {
    const nb = enc.encode(nm), d = enc.encode(txt), c = crc(d), h = [];
    w32(h, 0x04034b50); w16(h, 20); w16(h, 0x0800); w16(h, 0); w16(h, 0); w16(h, 0x21); w32(h, c); w32(h, d.length); w32(h, d.length); w16(h, nb.length); w16(h, 0);
    parts.push(new Uint8Array(h), nb, d);
    const z = []; w32(z, 0x02014b50); w16(z, 20); w16(z, 20); w16(z, 0x0800); w16(z, 0); w16(z, 0); w16(z, 0x21); w32(z, c); w32(z, d.length); w32(z, d.length); w16(z, nb.length); w16(z, 0); w16(z, 0); w16(z, 0); w16(z, 0); w32(z, 0); w32(z, off);
    cen.push(new Uint8Array(z), nb); off += h.length + nb.length + d.length;
  });
  const cl = cen.reduce((a, b) => a + b.length, 0), e = []; w32(e, 0x06054b50); w16(e, 0); w16(e, 0); w16(e, F.length); w16(e, F.length); w32(e, cl); w32(e, off); w16(e, 0);
  return new Blob(parts.concat(cen, [new Uint8Array(e)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function colOut() {
  const S = colSheets(), tsv = S[0][1].map(r => r.join('\t')).join('\n');
  const el = $('colEd') || (() => { const d = document.createElement('div'); d.id = 'colEd'; $('colOv').appendChild(d); return d; })(); el.hidden = false; el.dataset.id = '';
  el.innerHTML = '<div class="edp"><div class="edh"><b>Excelに書き出す</b><button class="sub" data-cx="edclose">閉じる</button></div><div class="edlist" style="padding:6px 2px"><p class="note">3つのシート(所持一覧・未所持・お気に入り)が入ったExcelファイルを保存します。</p><div class="row"><button data-cx="xlsx">Excelファイル(.xlsx)を保存</button></div><p class="note">表をそのままコピーして、スプレッドシートに貼り付けることもできます(所持一覧)。</p><div class="row"><button class="sub" data-cx="tsv">表をコピー</button></div><p class="note">この端末に保存してあるデータです。念のため、バックアップを取っておけます。</p><div class="row"><button class="sub" data-cx="bk">バックアップをコピー</button></div><textarea id="colBk" rows="3" placeholder="バックアップを貼り付けて、下のボタンで復元" style="width:100%"></textarea><div class="row"><button class="sub" data-cx="rs">貼り付けた内容で復元</button></div></div></div>';
  el._tsv = tsv;
}
function colOpen() {
  colLoadRar().then(() => {
    let ov = $('colOv'); if (!ov) { ov = document.createElement('div'); ov.id = 'colOv'; document.body.appendChild(ov); ov.addEventListener('click', colClick); ov.addEventListener('input', colInput); ov.addEventListener('change', colInput); }
    _colRows = null; ov.hidden = false; colRender();
  });
}
function colInput(e) { const f = e.target.dataset && e.target.dataset.cf; if (!f) return; COLV[f] = e.target.value; if (f === 'q' && e.type === 'change') return; colRender(true); }
function colClick(e) {
  const t = e.target.closest('[data-cx]'); if (!t) return; const a = t.dataset.cx, v = t.dataset.v, ed = $('colEd'), cur = ed && !ed.hidden ? ed.dataset.id : '';
  if (a === 'close') { $('colOv').hidden = true; return; }
  if (a === 'tab') { COLV.tab = v; colRender(); return; }
  if (a === 'vw') { COLV.vw = v; colRender(); return; }
  if (a === 'ed') { colEdit(v); return; }
  if (a === 'addc') { COL.extra[v] = 1; colSave(); _colRows = null; colEdit(v); colRender(true); return; }
  if (a === 'unx') { delete COL.extra[v]; delete COL.fav[v]; colSave(); _colRows = null; ed.hidden = true; colRender(true); return; }
  if (a === 'edclose') { ed.hidden = true; _colRows = null; colRender(true); return; }
  if (a === 'out') { colOut(); return; }
  if (a === 'inc') { const r = colRows().find(x => x.id === v); if (r) { colSet(r.ids.n[0] || r.ids.p[0], colN(r.ids.n[0] || r.ids.p[0]) + 1); colRender(true); } return; }
  if (a === 'inc2' || a === 'dec') { colSet(v, colN(v) + (a === 'dec' ? -1 : 1)); colEdit(cur); return; }
  if (a === 'fav') { if (COL.fav[v]) delete COL.fav[v]; else COL.fav[v] = { t: 3 }; colSave(); colEdit(v); return; }
  if (a === 'tinc' || a === 'tdec') { const f = COL.fav[v] || (COL.fav[v] = { t: 3 }); f.t = Math.max(1, Math.min(20, (f.t || 3) + (a === 'tdec' ? -1 : 1))); colSave(); colEdit(v); return; }
  if (a === 'xlsx') { const b = xlsxBuild(colSheets()), u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'bsp-cards-' + new Date().toISOString().slice(0, 10) + '.xlsx'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(u); l.remove(); }, 1500); toast('保存しました'); return; }
  if (a === 'tsv') { navigator.clipboard.writeText(ed._tsv).then(() => toast('コピーしました'), () => toast('コピーできませんでした')); return; }
  if (a === 'bk') { navigator.clipboard.writeText(JSON.stringify(COL)).then(() => toast('コピーしました'), () => toast('コピーできませんでした')); return; }
  if (a === 'rs') { try { const j = JSON.parse($('colBk').value); if (!j || !j.own) throw 0; COL = { own: j.own, fav: j.fav || {}, extra: j.extra || {} }; colSave(); toast('復元しました'); ed.hidden = true; colRender(); } catch (x) { toast('読み込めませんでした'); } return; }
}
$('admCol').onclick = colOpen;
/* ===== 効果の照合(管理者): 公式テキストと、実装の読み戻しを並べて、合っているか確認する ===== */
const RVK = 'bs-rv-v1';
let RV = {}, RVD = null, RVV = { set: '', st: '', q: '', n: 40 };
try { RV = JSON.parse(localStorage.getItem(RVK) || '{}') || {}; } catch (e) { RV = {}; }
const rvSave = () => { try { localStorage.setItem(RVK, JSON.stringify(RV)); } catch (e) { toast('この端末に保存できませんでした'); } };
const rvSt = id => (RV[id] && RV[id].s) || '';
async function rvOpen() {
  if (!RVD) { try { const r = await fetch('cards/review.json', { cache: 'no-cache' }); RVD = await r.json(); } catch (e) { toast('照合データを読み込めませんでした'); return; } }
  let ov = $('rvOv'); if (!ov) { ov = document.createElement('div'); ov.id = 'rvOv'; document.body.appendChild(ov); ov.addEventListener('click', rvClick); ov.addEventListener('input', rvInput); ov.addEventListener('change', rvInput); }
  ov.hidden = false; rvRender();
}
function rvList() {
  const q = RVV.q.trim().toLowerCase();
  return RVD.filter(c => (!RVV.set || c.set === RVV.set) && (!RVV.st || (RVV.st === 'none' ? !rvSt(c.id) : rvSt(c.id) === RVV.st)) && (!q || (c.name + ' ' + c.id + ' ' + c.text).toLowerCase().includes(q)));
}
function rvRender(keep) {
  const ov = $('rvOv'), L = rvList(), done = RVD.filter(c => rvSt(c.id)).length, ng = RVD.filter(c => rvSt(c.id) === 'ng').length;
  const sets = [...new Set(RVD.map(c => c.set))];
  const head = '<div class="rvhd"><div class="rvtop"><b>効果の照合</b><span class="note">確認済 ' + done + '/' + RVD.length + ' ・ 違う ' + ng + '</span><button class="sub" data-rx="close" type="button">閉じる</button></div>' +
    '<div class="colflt"><select data-rf="set"><option value="">全収録</option>' + sets.map(x => '<option' + (RVV.set === x ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' +
    '<select data-rf="st">' + [['', 'すべて'], ['none', '未確認'], ['ok', '合っている'], ['ng', '違う'], ['hold', '保留']].map(o => '<option value="' + o[0] + '"' + (RVV.st === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
    '<input data-rf="q" placeholder="カード名・番号・テキスト" value="' + esc(RVV.q) + '"></div>' +
    '<div class="row" style="margin:0"><button class="sub" data-rx="copyng" type="button">「違う」をコピー</button><button class="sub" data-rx="xlsx" type="button">Excelに書き出す</button></div></div>';
  const body = '<div class="rvmain">' + '<div class="colinfo">' + L.length + '枚</div>' + L.slice(0, RVV.n).map(rvCard).join('') + (L.length > RVV.n ? '<div class="row"><button type="button" data-rx="more">さらに表示(残り' + (L.length - RVV.n) + '枚)</button></div>' : '') + '</div>';
  if (keep) { ov.querySelector('.rvmain').outerHTML = body; ov.querySelector('.rvtop .note').textContent = '確認済 ' + done + '/' + RVD.length + ' ・ 違う ' + ng; return; }
  ov.innerHTML = head + body;
}
function rvCard(c) {
  const s = rvSt(c.id), m = (RV[c.id] && RV[c.id].m) || '', u = (typeof thumbOf === 'function' && (thumbOf(c.id) || artQ(c.id))) || '';
  const btn = (k, t) => '<button type="button" class="' + (s === k ? 'on' : 'sub') + '" data-rx="mk" data-id="' + esc(c.id) + '" data-v="' + k + '">' + t + '</button>';
  return '<div class="rvc ' + (s || '') + '" id="rv-' + esc(c.id) + '"><div class="rvh">' + (u ? '<img loading="lazy" src="' + esc(u) + '" alt="">' : '') + '<div><b>' + esc(c.name) + '</b><small>' + esc(c.id) + ' / ' + esc(c.type) + ' / ' + esc(c.color) + ' / コスト' + c.cost + '</small>' + (c.meta.length ? '<small>' + c.meta.map(esc).join(' ・ ') + '</small>' : '') + '</div></div>' +
    '<div class="rvtx"><span>公式テキスト</span>' + esc(c.text).replace(/\n/g, '<br>') + '</div>' +
    '<div class="rvim"><span>実装(読み戻し)</span>' + (c.impl.length ? c.impl.map(l => '<div>' + esc(l) + '</div>').join('') : '<div class="note">効果の処理はありません(' + (c.noImpl ? '効果なし/バニラ' : '') + ')</div>') + '</div>' +
    '<div class="row">' + btn('ok', '合っている') + btn('ng', '違う') + btn('hold', '保留') + '</div>' +
    ((s === 'ng' || s === 'hold' || m) ? '<input class="rvm" data-rm="' + esc(c.id) + '" placeholder="どう違うか(メモ)" value="' + esc(m) + '">' : '') + '</div>';
}
function rvInput(e) {
  const t = e.target, f = t.dataset && t.dataset.rf, rm = t.dataset && t.dataset.rm;
  if (rm) { (RV[rm] = RV[rm] || {}).m = t.value.slice(0, 200); rvSave(); return; }
  if (!f) return; RVV[f] = t.value; RVV.n = 40; if (f === 'q' && e.type === 'change') return; const q = f === 'q'; rvRender(true); if (q) { /* 入力中の欄は残す */ }
}
function rvClick(e) {
  const t = e.target.closest('[data-rx]'); if (!t) return; const a = t.dataset.rx;
  if (a === 'close') $('rvOv').hidden = true;
  else if (a === 'more') { RVV.n += 40; rvRender(true); }
  else if (a === 'mk') { const id = t.dataset.id, v = t.dataset.v, o = RV[id] = RV[id] || {}; o.s = o.s === v ? '' : v; o.t = Date.now(); rvSave(); const el = $('rv-' + id); if (el) { const w = document.createElement('div'); w.innerHTML = rvCard(RVD.find(x => x.id === id)); el.replaceWith(w.firstElementChild); } $('rvOv').querySelector('.rvtop .note').textContent = '確認済 ' + RVD.filter(c => rvSt(c.id)).length + '/' + RVD.length + ' ・ 違う ' + RVD.filter(c => rvSt(c.id) === 'ng').length; }
  else if (a === 'copyng') { const L = RVD.filter(c => rvSt(c.id) === 'ng').map(c => c.id + ' ' + c.name + ((RV[c.id] && RV[c.id].m) ? ' … ' + RV[c.id].m : '')).join('\n'); navigator.clipboard.writeText(L || '(なし)').then(() => toast('コピーしました'), () => toast('コピーできませんでした')); }
  else if (a === 'xlsx') { const J = { ok: '合っている', ng: '違う', hold: '保留' }; const rows = [['収録', '番号', 'カード名', '公式テキスト', '実装(読み戻し)', '確認', 'メモ']].concat(RVD.map(c => [c.set, c.id, c.name, c.text, c.impl.join('\n'), J[rvSt(c.id)] || '', (RV[c.id] && RV[c.id].m) || ''])); const b = xlsxBuild([['効果の照合', rows]]), u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'bsp-review-' + new Date().toISOString().slice(0, 10) + '.xlsx'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(u); l.remove(); }, 1500); }
}
$('admRv').onclick = rvOpen;

/* ===== 設定(通知のオン・オフ / データの移行・共有) — 全ユーザー向け ===== */
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { toast('この端末に保存できませんでした'); } };
const migGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
function migPack() {
  return { format: 'bsp-data', version: 1, t: Date.now(), name: migGet('bs-name') || '', decks: userDecks(), raw: { 'bs-deck-order': migGet('bs-deck-order'), 'bs-del-samples': migGet('bs-del-samples') }, col: COL };
}
function migApply(j) {
  if (!j || j.format !== 'bsp-data') throw new Error('形式が違います');
  const un = userDecks(); let nd = 0;
  Object.keys(j.decks || {}).forEach(k => { const r = j.decks[k]; if (!r || r.sample || !Array.isArray(r.cards) || !r.cards.length) return; const l = un[k]; if (!l || (r.t || 0) > (l.t || 0)) { un[k] = { cards: r.cards.map(c => [String(c[0]), c[1] | 0]), t: r.t || Date.now(), cover: r.cover || undefined }; nd++; } });
  try { localStorage.setItem('bs-decks', JSON.stringify(un)); } catch (e) { }
  if (j.name && !migGet('bs-name')) { try { localStorage.setItem('bs-name', String(j.name).slice(0, 12)); } catch (e) { } }
  Object.keys(j.raw || {}).forEach(k => { if (j.raw[k] && !migGet(k)) { try { localStorage.setItem(k, j.raw[k]); } catch (e) { } } });
  const c = j.col || {}; let nc = 0;
  Object.keys(c.own || {}).forEach(id => { if ((c.own[id] | 0) > colN(id)) { COL.own[id] = c.own[id] | 0; nc++; } });
  Object.keys(c.fav || {}).forEach(id => { if (!COL.fav[id]) COL.fav[id] = c.fav[id]; });
  Object.keys(c.extra || {}).forEach(id => { COL.extra[id] = 1; });
  colSave();
  return { nd, nc };
}
function setOpen() {
  let ov = $('setOv');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'setOv'; document.body.appendChild(ov);
    ov.innerHTML = '<div class="setp"><div class="seth"><b>設定</b><button class="sub" data-sx="close" type="button">閉じる</button></div>' +
      '<div class="admsec setsec"><div class="admin"><h4 class="admh4">プレイヤー名</h4><div class="row"><input id="setName" maxlength="12" placeholder="名前を入力(最大12文字)" autocomplete="off" style="max-width:220px"></div><p class="note">対戦の相手や、掲示板の投稿に表示されます。</p><h4 class="admh4">アイコン</h4><div class="row" style="align-items:center"><span id="setIco"></span><label class="sub filebtn">画像を選ぶ<input type="file" id="setIcoF" accept="image/*" hidden></label><button type="button" class="sub" data-sx="icodel">削除</button></div><p class="note">正方形に切り抜いて、小さくして使います。名前の横・部屋の一覧・対戦画面に表示され、オンラインの相手にも見えます。選ばないときは、名前の頭文字になります。</p><h4 class="admh4">通知</h4><label class="ck"><input type="checkbox" id="setNt"> 部屋ができたときの通知を受け取る</label><p class="note" id="setNtMsg"></p>' +
      '<h4 class="admh4">効果音</h4><label class="ck"><input type="checkbox" id="setSnd"> 効果音を鳴らす</label><div class="row"><label class="ck">音量 <input type="range" id="setVol" min="0" max="100" style="width:160px"></label><button type="button" class="sub" data-sx="sndtest">試し聞き</button></div><p class="note">召喚・アタック・ブロック・破壊・ライフ・ターンの変わり目などで鳴ります。端末がマナーモードのときは鳴りません。</p>' +
      '<h4 class="admh4">コアの色</h4><div class="row" id="setCore"></div>' +
      '<h4 class="admh4">カードの裏面(スリーブ)</h4><p class="note">好きな画像を選ぶと、この端末のカードの裏面が変わります(オンライン対戦の相手には、相手側の画面で見えます)。' + SLV_MAX + '枚まで保存でき、増えると古いものから消えます。</p><div class="row"><label class="sub filebtn">画像を追加<input type="file" id="setSlv" accept="image/*" hidden></label><button type="button" class="sub" data-sx="slvreset">標準に戻す</button></div><div class="row" id="setSlvList"></div>' +
      '<h4 class="admh4">データの移行・共有</h4><p class="note">端末を変えるときや、スマホとパソコンで同じデータを使いたいときに使います。デッキ・プレイヤー名・カードの所持データを、ファイル(またはテキスト)にして書き出し、別の端末で読み込みます。自動では同期されません。変更したら、また書き出して読み込んでください。</p>' +
      '<div class="row"><button type="button" data-sx="save">ファイルで書き出す</button><button type="button" class="sub" data-sx="copy">テキストをコピー</button></div>' +
      '<p class="note" style="margin-top:12px">別の端末で、書き出したファイルかテキストを読み込みます。同じ名前のデッキは、保存日時が新しいほうが残ります。所持枚数は、多いほうが残ります。</p>' +
      '<div class="row"><label class="sub filebtn">ファイルを選ぶ<input type="file" id="setFile" accept=".json,application/json,text/plain" hidden></label></div>' +
      '<textarea id="setTxt" rows="3" placeholder="コピーしたテキストを貼り付け" style="width:100%;box-sizing:border-box"></textarea><div class="row"><button type="button" class="sub" data-sx="load">貼り付けたテキストを読み込む</button></div>' +
      '<p class="note">保存済みのリプレイは含まれません。</p><p class="note" id="setMsg"></p></div></div></div>';
    ov.addEventListener('click', e => {
      const t = e.target.closest('[data-sx],[data-core],[data-slv],[data-slvdel]'), a = t && t.dataset.sx; if (e.target === ov) { ov.hidden = true; return; } if (!t) return;
      if (a === 'close') ov.hidden = true;
      else if (a === 'save') { const u = URL.createObjectURL(new Blob([JSON.stringify(migPack())], { type: 'application/json' })), l = document.createElement('a'); l.href = u; l.download = 'bsp-data-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(l); l.click(); setTimeout(() => { URL.revokeObjectURL(u); l.remove(); }, 1500); toast('書き出しました'); }
      else if (a === 'copy') navigator.clipboard.writeText(JSON.stringify(migPack())).then(() => toast('コピーしました'), () => toast('コピーできませんでした'));
      else if (a === 'load') setImport($('setTxt').value);
      else if (a === 'sndtest') { sndCtx(); ['put', 'attack', 'break', 'life', 'turn'].forEach((k, i) => setTimeout(() => sndPlay(k), i * 450)); }
      else if (a === 'icodel') { lsSet('bs-icon', ''); hdrIconUpd(); setIcoFill(); icsRefresh(); iconSend(); }
      else if (a === 'slvreset') { lsSet('bs-sleeve', ''); slvApply(); setSlvFill(); sleeveSend(); }
      else if (t.dataset.core != null) { lsSet('bs-core', t.dataset.core); coreApply(t.dataset.core); setCoreFill(); }
      else if (t.dataset.slv) { lsSet('bs-sleeve', t.dataset.slv); slvApply(); setSlvFill(); sleeveSend(); }
      else if (t.dataset.slvdel) { slvSave(slvList().filter(x => x.id !== t.dataset.slvdel)); if (lsGet('bs-sleeve', '') === t.dataset.slvdel) lsSet('bs-sleeve', ''); slvApply(); setSlvFill(); sleeveSend(); }
    });
    $('setFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setImport(String(r.result || '')); r.readAsText(f); e.target.value = ''; };
    $('setName').oninput = () => { const v = $('setName').value.trim().slice(0, 12); $('myName').value = v; $('myName').dispatchEvent(new Event('input')); };
    $('setIcoF').onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; try { lsSet('bs-icon', await icoMake(f, 96, .8)); hdrIconUpd(); setIcoFill(); icsRefresh(); iconSend(); } catch (x) { toast('画像を読み込めませんでした'); } };
    $('setSnd').onchange = () => { SND.on = $('setSnd').checked; lsSet('bs-snd', SND.on ? '1' : '0'); if (SND.on) sndCtx(); };
    $('setVol').oninput = () => { SND.vol = +$('setVol').value / 100; lsSet('bs-snd-vol', $('setVol').value); };
    $('setSlv').onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; try { const u = await slvMake(f), a = slvList(), id = 's' + Date.now(); a.push({ id, t: Date.now(), u }); if (slvSave(a)) { lsSet('bs-sleeve', id); slvApply(); setSlvFill(); sleeveSend(); } } catch (x) { toast('画像を読み込めませんでした'); } };
    $('setNt').onchange = async () => {
      try { localStorage.setItem('bs-nt-off', $('setNt').checked ? '' : '1'); } catch (x) { }
      if ($('setNt').checked && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (x) { } }
      try { pushSync(); } catch (x) { } setNtMsg();
    };
  }
  $('setName').value = ($('myName').value || '').trim(); $('setNt').checked = ntPref(); $('setSnd').checked = SND.on; $('setVol').value = Math.round(SND.vol * 100); setNtMsg(); setCoreFill(); setSlvFill(); setIcoFill(); ov.hidden = false;
}
function setIcoFill() { $('setIco').innerHTML = iconSpan(myIcon(), ($('myName').value || '').trim() || '?', 56); }
function setCoreFill() { const cur = lsGet('bs-core', ''); $('setCore').innerHTML = CORE_COL.map(o => '<button type="button" class="' + (cur === o[0] ? 'on' : 'sub') + '" data-core="' + o[0] + '" style="padding:6px 10px;font-size:13px">' + o[1] + '</button>').join(''); }
function setSlvFill() { const cur = lsGet('bs-sleeve', ''), L = slvList(); $('setSlvList').innerHTML = L.length ? L.slice().reverse().map(x => '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><img src="' + x.u + '" data-slv="' + x.id + '" style="width:62px;border-radius:5px;cursor:pointer;border:2px solid ' + (cur === x.id ? 'var(--acc)' : 'transparent') + '"><button type="button" class="sub" data-slvdel="' + x.id + '" style="padding:2px 8px;font-size:11px">削除</button></div>').join('') : '<span class="note">まだありません</span>'; }
function setNtMsg() {
  const el = $('setNtMsg'); if (!el) return; const p = 'Notification' in window ? Notification.permission : 'none';
  el.textContent = !ntPref() ? '通知はオフです。' : p === 'granted' ? '通知はオンです。' : p === 'denied' ? '通知はオンですが、端末(ブラウザ)の設定で通知が許可されていないため、届きません。' : p === 'none' ? 'この端末(ブラウザ)は通知に対応していません。' : 'オンにしました。許可の確認が出たら「許可」を選んでください。';
}
function setImport(txt) {
  const m = $('setMsg');
  try { const r = migApply(JSON.parse(txt)); m.textContent = '読み込みました(デッキ ' + r.nd + '個、カード ' + r.nc + '種の所持枚数)。画面を更新します…'; toast('読み込みました'); setTimeout(() => location.reload(), 900); }
  catch (e) { m.textContent = '読み込めませんでした。書き出したファイルか、コピーしたテキストをそのまま入れてください。'; }
}
$('setBtn').onclick = setOpen;
/* ===== プレイヤー名: 設定に移動。初回はポップで入力 / ヘッダーに表示 ===== */
const hdrNameUpd = () => { const v = ($('myName').value || '').trim(); $('hdrName').textContent = v; };
$('myName').addEventListener('input', hdrNameUpd); hdrNameUpd();
(function () {
  if (nameOk()) return;
  const ov = document.createElement('div'); ov.id = 'nameOv'; ov.hidden = true;
  ov.innerHTML = '<div class="namep"><b>プレイヤー名を入力してください</b><p class="note">対戦の相手や、掲示板の投稿に表示されます。あとから設定で変えられます。</p><input id="nameIn" maxlength="12" placeholder="名前(最大12文字)" autocomplete="off"><button type="button" id="nameGo" disabled>決定</button></div>';
  document.body.appendChild(ov);
  const inp = ov.querySelector('#nameIn'), go = ov.querySelector('#nameGo');
  inp.oninput = () => { go.disabled = !inp.value.trim(); };
  const ok = () => { const v = inp.value.trim().slice(0, 12); if (!v) return; $('myName').value = v; $('myName').dispatchEvent(new Event('input')); ov.remove(); };
  go.onclick = ok; inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
  const t = setInterval(() => { if (!document.body.contains(ov) || nameOk()) { clearInterval(t); ov.remove(); return; } if (!document.documentElement.classList.contains('tklock') && !document.body.classList.contains('tklock')) { ov.hidden = false; clearInterval(t); setTimeout(() => inp.focus(), 100); } }, 400);
})();
/* ===== スリーブをオンラインの相手にも見せる ===== */
let _back0 = null;
function oppBackDefault() { if (_back0 == null) _back0 = (getComputedStyle(document.documentElement).getPropertyValue('--back') || '').trim(); document.documentElement.style.setProperty('--back-opp', _back0); }
function slvSmall() {   // 送る用に小さくした自分のスリーブ(なければ空)
  return new Promise(res => { const id = lsGet('bs-sleeve', ''), x = slvList().find(o => o.id === id); if (!x) { res(''); return; } const im = new Image(); im.onerror = () => res(''); im.onload = () => { const c = document.createElement('canvas'); c.width = 168; c.height = 234; c.getContext('2d').drawImage(im, 0, 0, 168, 234); res(c.toDataURL('image/jpeg', .7)); }; im.src = x.u; });
}
async function sleeveSend() { try { if (!dc || !dc.open) return; const u = await slvSmall(); dsend({ t: 'sleeve', u }); } catch (e) { } }
function sleeveRecv(m) { const u = m && typeof m.u === 'string' ? m.u : ''; if (u && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]{20,}$/.test(u) && u.length < 80000) document.documentElement.style.setProperty('--back-opp', 'url("' + u + '")'); else oppBackDefault(); }
oppBackDefault();
/* ===== アイコン(プロフィール画像): 設定・部屋の一覧・対戦画面・ゲートオープンに表示 ===== */
const ICO_COL = ['#e0526b', '#e08a3c', '#b8921f', '#3fae6a', '#2f9fb8', '#4f7be0', '#8a5fe0', '#c35fb0'];
const icoOk = u => typeof u === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]{20,}$/.test(u) && u.length < 30000;
const myIcon = () => { const u = lsGet('bs-icon', ''); return icoOk(u) ? u : ''; };
let OPPIC = '';
function iconSpan(u, name, px) {
  px = px || 22; const st = 'width:' + px + 'px;height:' + px + 'px';
  if (icoOk(u)) return '<span class="ico" style="' + st + '"><img src="' + u + '" alt=""></span>';
  const n = String(name || '?'), ch = [...n][0] || '?'; let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return '<span class="ico ini" style="' + st + ';font-size:' + Math.round(px * .5) + 'px;background:' + ICO_COL[h % ICO_COL.length] + '">' + esc(ch) + '</span>';
}
function icoMake(file, px, q) {   // 正方形に切り抜いて、小さくする
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = () => rej(); fr.onload = () => { const im = new Image(); im.onerror = () => rej(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = px; const s = Math.min(im.naturalWidth, im.naturalHeight), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, px, px); x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, px, px); res(c.toDataURL('image/jpeg', q)); }; im.src = String(fr.result); }; fr.readAsDataURL(file); });
}
function icoSmall() {   // 部屋の一覧に載せる、さらに小さいアイコン
  return new Promise(res => { const u = myIcon(); if (!u) { res(''); return; } const im = new Image(); im.onerror = () => res(''); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 36; c.getContext('2d').drawImage(im, 0, 0, 36, 36); res(c.toDataURL('image/jpeg', .55)); }; im.src = u; });
}
let MYICS = ''; const icsRefresh = async () => { MYICS = await icoSmall(); if (free && free.mine) { free.mine.ic = MYICS; try { freeRender(); freeReg(); } catch (e) { } } };
const hdrIconUpd = () => { const e = $('hdrIcon'); if (e) e.innerHTML = iconSpan(myIcon(), ($('myName').value || '').trim() || '?', 34); };
$('myName').addEventListener('input', hdrIconUpd); hdrIconUpd(); icsRefresh();
$('hdrName').onclick = () => $('setBtn').click();
function iconSend() { try { if (dc && dc.open) dsend({ t: 'icon', u: myIcon() }); } catch (e) { } }
function iconRecv(m) { OPPIC = m && icoOk(m.u) ? m.u : ''; try { if (V) render(); } catch (e) { } }
function gateFill() {
  try {
    const nm = V && V.names, a = nm ? nm[V.me] : getName(), b = nm ? nm[1 - V.me] : '', real = !RP && !(V && V.spec);
    const side = (u, n) => '<div class="gp">' + iconSpan(u, n, 72) + '<b>' + esc(String(n || '').slice(0, 12)) + '</b></div>';
    $('gate').innerHTML = (a && b ? '<div class="gvs">' + side(real ? myIcon() : '', a) + '<span class="gv">VS</span>' + side(real && inMatch() ? OPPIC : '', b) + '</div>' : '') + '<div class="gt">ゲートオープン、界放</div>';
  } catch (e) { }
}

/* ===== 効果音・コアの色・スリーブ(設定) ===== */
/* --- 効果音(音声ファイルなし。ブラウザで合成する) --- */
const SND = { ac: null, on: lsGet('bs-snd', '1') !== '0', vol: +lsGet('bs-snd-vol', '60') / 100, n: 0, last: {} };
function sndCtx() { if (!SND.ac) { try { SND.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (SND.ac.state === 'suspended') SND.ac.resume().catch(() => { }); return SND.ac; }
function sndTone(ac, t0, f0, f1, dur, type, g) { const o = ac.createOscillator(), v = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g * SND.vol, t0 + 0.008); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(v); v.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02); }
function sndNoise(ac, t0, dur, g, hp) { const n = Math.max(1, Math.floor(ac.sampleRate * dur)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(); f.type = 'highpass'; f.frequency.value = hp; v.gain.value = g * SND.vol; s.buffer = b; s.connect(f); f.connect(v); v.connect(ac.destination); s.start(t0); }
const SND_FX = {
  put: (a, t) => { sndTone(a, t, 420, 700, .13, 'triangle', .5); sndTone(a, t + .05, 840, 840, .1, 'sine', .25); },
  attack: (a, t) => { sndNoise(a, t, .22, .5, 900); sndTone(a, t + .12, 180, 70, .2, 'sine', .7); },
  block: (a, t) => { sndTone(a, t, 330, 300, .09, 'square', .22); sndTone(a, t + .09, 260, 240, .12, 'square', .22); },
  break: (a, t) => { sndNoise(a, t, .3, .7, 500); sndTone(a, t, 260, 60, .3, 'sawtooth', .35); },
  life: (a, t) => { sndTone(a, t, 880, 660, .18, 'sine', .5); sndTone(a, t + .14, 660, 440, .3, 'sine', .5); },
  draw: (a, t) => { sndTone(a, t, 1300, 1700, .05, 'sine', .3); },
  core: (a, t) => { sndTone(a, t, 1500, 2000, .09, 'sine', .3); },
  turn: (a, t) => { sndTone(a, t, 660, 660, .14, 'sine', .45); sndTone(a, t + .13, 880, 880, .22, 'sine', .45); },
  win: (a, t) => { [523, 659, 784, 1047].forEach((f, i) => sndTone(a, t + i * .11, f, f, .3, 'triangle', .5)); },
  lose: (a, t) => { [392, 330, 262].forEach((f, i) => sndTone(a, t + i * .18, f, f * .98, .4, 'sine', .5)); }
};
function sndPlay(k) { if (!SND.on || SND.vol <= 0) return; const a = sndCtx(); if (!a || a.state !== 'running') return; const now = Date.now(); if (now - (SND.last[k] || 0) < 90) return; SND.last[k] = now; try { SND_FX[k](a, a.currentTime + 0.005); } catch (e) { } }
function sndKind(m) {
  if (/ゲーム開始$|ゲーム開始:/.test(m)) return 'turn';
  if (/敗北|ライフが0になりました/.test(m)) return /相手のライフ/.test(m) ? 'win' : 'lose';
  if (/でアタック!/.test(m)) return 'attack';
  if (/でブロック|ブロック宣言/.test(m)) return 'block';
  if (/が破壊された|が消滅/.test(m)) return 'break';
  if (/ライフで受けた/.test(m)) return 'life';
  if (/を召喚|を配置|を使用$/.test(m)) return 'put';
  if (/^スタートステップ/.test(m)) return 'turn';
  if (/^コアステップ|リザーブにコア|^コア\d+個を/.test(m)) return 'core';
  if (/ドロー/.test(m)) return 'draw';
  return '';
}
function sndScan() {
  try {
    const g = G; if (!g || !g.log) return; const n = g.log.length;
    if (SND.g !== g || n < SND.n) { SND.g = g; SND.n = n; return; }   // 新しい対戦(や巻き戻し)では鳴らさない
    const from = Math.max(SND.n, n - 8); SND.n = n; if (n === from) return;
    const ks = []; for (let i = from; i < n; i++) { const k = sndKind((g.log[i] && g.log[i].m) || ''); if (k && !ks.includes(k)) ks.push(k); }
    ks.slice(0, 3).forEach((k, i) => setTimeout(() => sndPlay(k), i * 120));
  } catch (e) { }
}
const _render0 = render; render = function () { _render0(); sndScan(); };
document.addEventListener('pointerdown', () => { if (SND.on) sndCtx(); }, { once: true, capture: true });
/* --- コアの色(画像の色相をずらして作る) --- */
const CORE_COL = [['', '青(標準)', null], ['red', '赤', 0]];
let _hex0 = null;
function hexImg() { return new Promise(res => { if (!_hex0) { const v = getComputedStyle(document.documentElement).getPropertyValue('--hex'), m = /url\(["']?(.*?)["']?\)/.exec(v); _hex0 = m ? m[1] : ''; } if (!_hex0) { res(null); return; } const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = _hex0; }); }
async function coreTint(deg) {
  const im = await hexImg(); if (!im) return '';
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const dd = mx - mn; s = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn); h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; } return [h, s, l]; };
  const rgb = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; if (!s) { const v = l * 255; return [v, v, v]; } const q = l < .5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q, f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? pp + (q - pp) * 6 * t : t < .5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp); }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; };
  let sh = 0, sw = 0, bx = 0, by = 0; for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 200) continue; const [h, s] = hsl(p[i], p[i + 1], p[i + 2]); if (s > .3) { sh += Math.cos(h * Math.PI / 180) * s; sw += Math.sin(h * Math.PI / 180) * s; } }
  const base = (Math.atan2(sw, sh) * 180 / Math.PI + 360) % 360;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; let [h, s, l] = hsl(p[i], p[i + 1], p[i + 2]); if (deg < 0) { s *= .08; l = Math.min(1, l * .75 + .3); } else h += deg - base; const o = rgb(h, s, l); p[i] = o[0]; p[i + 1] = o[1]; p[i + 2] = o[2]; }
  x.putImageData(d, 0, 0); return c.toDataURL('image/png');
}
async function coreApply(key) {
  const e = CORE_COL.find(o => o[0] === key) || CORE_COL[0]; if (e[2] == null) { document.documentElement.style.removeProperty('--hex'); return; }
  const u = await coreTint(e[2]); if (u) document.documentElement.style.setProperty('--hex', 'url("' + u + '")');
}
const CORE_KEY = lsGet('bs-core', ''); if (CORE_KEY) coreApply(CORE_KEY);
/* --- スリーブ(カードの裏面): 自分の端末だけに反映。5枚まで、古いものから消える --- */
const SLV_MAX = 5;
const slvList = () => { try { const a = JSON.parse(localStorage.getItem('bs-sleeves') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
function slvSave(a) { while (a.length > SLV_MAX) { const i = a.findIndex(x => x.id !== lsGet('bs-sleeve', '')); a.splice(i < 0 ? 0 : i, 1); } try { localStorage.setItem('bs-sleeves', JSON.stringify(a)); return true; } catch (e) { toast('保存できませんでした(容量不足)'); return false; } }
function slvApply() { const id = lsGet('bs-sleeve', ''), s = slvList().find(x => x.id === id); if (s) document.documentElement.style.setProperty('--back', 'url("' + s.u + '")'); else document.documentElement.style.removeProperty('--back'); }
function slvMake(file) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = () => rej(); fr.onload = () => { const im = new Image(); im.onerror = () => rej(); im.onload = () => { const W = 252, H = 352, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), k = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); res(c.toDataURL('image/jpeg', .82)); }; im.src = String(fr.result); }; fr.readAsDataURL(file); });
}
slvApply();



const HE = { t: 0, dur: 20000, zoom: 70, ops: [], nid: 1, uid: 1, sel: new Set(), inT: null, outT: null, rate: 1, loop: false, snap: true, clip: null, pk: null, vids: [], audio: 'last', playing: false, names: ['A', 'B'], undo: [], ready: false, busy: false, want: null, key: '', sc: 1, drag: null, raf: 0, t0: 0, tb: 0, busyExp: false, showNew: false, showDur: 2000 };
function heLastTurn(T) { let r = null; HE.ops.forEach(o => { if (o.k === 'turn' && o.t <= T && (!r || o.t > r.t || (o.t === r.t && o.id > r.id))) r = o; }); return r; }
function heNextStep(T) {
  const l = heLastTurn(T); if (!l || STEPS.indexOf(l.step) < 0) return { s: l ? l.s : 0, no: l ? l.no : 1, step: 'start' };
  const i = STEPS.indexOf(l.step); if (i < STEPS.length - 1) return { s: l.s, no: l.no, step: STEPS[i + 1] };
  return { s: 1 - l.s, no: l.no + 1, step: 'start' };
}
function heStepAdd(n) {
  n = n || heNextStep(HE.t); heSnap(); HE.ops = HE.ops.filter(o => !(o.k === 'turn' && o.t === HE.t)); const g = HE.nid++; HE.ops.push({ k: 'turn', s: n.s, no: n.no, step: n.step, t: HE.t, g, id: HE.nid++ }); HE.sel = new Set([g]); heTL(); heSync();
}
function heStLab() { const b = $('heStNm'); if (!b) return; const n = heNextStep(HE.t); b.textContent = '→ ' + (n.step === 'start' ? n.no + 'ターン(' + (n.s ? 'B' : 'A') + ')の' : '') + STEP_JP[n.step]; }
const heNm = id => { const c = cardById(id); return c ? c.def.name : String(id); };
const heDef = id => { const c = cardById(id); return c ? c.def : null; };
const heFmt = ms => { const m = Math.floor(ms / 60000), s = (ms - m * 60000) / 1000; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3); };
const heSleep = ms => new Promise(r => setTimeout(r, ms));
const heUid = () => 'e' + (HE.uid++);
function heSnap() { HE.undo.push(JSON.stringify({ ops: HE.ops, nid: HE.nid, uid: HE.uid })); if (HE.undo.length > 80) HE.undo.shift(); }
function heUndo() { const s = HE.undo.pop(); if (!s) return; const o = JSON.parse(s); HE.ops = o.ops; HE.nid = o.nid; HE.uid = o.uid; HE.sel = new Set(); heTL(); heSync(); }
function heGrp(list, t) { heSnap(); const g = HE.nid++; list.forEach(o => { o.t = t == null ? HE.t : t; o.g = g; o.id = HE.nid++; HE.ops.push(o); }); HE.sel = new Set([g]); heTL(); heSync(); }
const heSide = (S, u) => { for (let i = 0; i < 2; i++) { const k = S[i].field.find(x => x.u === u); if (k) return { i, k }; } return null; };
function heScene(T, noHl) {
  const S = [0, 1].map(() => ({ hand: [], field: [], life: 5, res: 3, ct: 0, trash: [], deck: 20 }));
  let tu = { s: 0, no: 1, step: 'none' };
  const shows = [], opens = new Map();
  HE.ops.filter(o => o.t <= T).sort((a, b) => a.t - b.t || a.id - b.id).forEach(o => {
    const s = S[o.s || 0];
    switch (o.k) {
      case 'hadd': s.hand.push({ u: o.u, c: o.c, mo: o.mo ? 1 : 0 }); break;
      case 'hdel': { const i = s.hand.findIndex(x => x.u === o.u); if (i >= 0) s.hand.splice(i, 1); break; }
      case 'cshow': { if (T < o.t + (o.dur || 2000)) shows.push({ c: o.c, s: o.s || 0 }); break; }
      case 'put': { s.field.push({ u: o.u, c: o.c, n: o.n || 0, tp: 0, mo: 0 }); if (o.show && T < o.t + (o.dur || 2000)) shows.push({ c: o.c, s: o.s || 0 }); break; }
      case 'rm': { const f = heSide(S, o.u); if (!f) break; const q = S[f.i]; q.field.splice(q.field.indexOf(f.k), 1); if (o.to === 'trash') q.trash.push(f.k.c); else if (o.to === 'deck') q.deck++; else if (o.to === 'hand') q.hand.push({ u: o.hu, c: f.k.c, mo: f.k.mo }); break; }
      case 'mono': { const f = heSide(S, o.u); if (f) { f.k.mo = o.v != null ? o.v : (f.k.mo ? 0 : 1); break; } for (const q of S) { const h = q.hand.find(x => x.u === o.u); if (h) { h.mo = o.v != null ? o.v : (h.mo ? 0 : 1); break; } } break; }
      case 'core': { const f = heSide(S, o.u); if (!f) break; const q = S[f.i]; f.k.n = Math.max(0, f.k.n + o.d); break; }
      case 'tap': { const f = heSide(S, o.u); if (f) f.k.tp = o.v != null ? o.v : (f.k.tp ? 0 : 1); break; }
      case 'life': s.life = Math.max(0, s.life + o.d); break;
      case 'res': s.res = Math.max(0, s.res + o.d); break;
      case 'ct': s.ct = Math.max(0, s.ct + o.d); break;
      case 'ttdel': s.trash.pop(); break;
      case 'ttrash': s.trash.push(o.c); break;
      case 'open': opens.set(o.oid, { oid: o.oid, s: o.s || 0, n: o.n, cards: o.cards.slice(), mo: (o.mo || []).slice(), t: o.t, end: o.end, acts: {} }); break;
      case 'oact': { const q = opens.get(o.og); if (!q || q.acts[o.i]) break; q.acts[o.i] = { to: o.to, t: o.t }; const c = q.cards[o.i], pu = 'o' + o.og + '_' + o.i, mo = q.mo[o.i] ? 1 : 0; if (o.to === 'deck') s.deck++; else if (c && o.to === 'hand') s.hand.push({ u: pu, c, mo }); else if (c && o.to === 'trash') s.trash.push(c); else if (c && o.to === 'field') s.field.push({ u: pu, c, n: 0, tp: 0, mo }); break; }
      case 'turn': tu = { s: o.s, no: o.no, step: o.step }; break;
    }
  });
  const hl = []; if (!noHl) HE.ops.forEach(o => { if (HE.sel.has(o.g) && o.u) hl.push(o.u); });
  const ov = { opens: [], fly: [] };
  opens.forEach(q => {
    if (T >= q.end) return; const gone = []; let left = 0;
    for (let i = 0; i < q.n; i++) { const a = q.acts[i]; if (a && T >= a.t) { gone.push(i); if (T - a.t < 450 && q.cards[i]) ov.fly.push({ oid: q.oid, s: q.s, i, c: q.cards[i], mo: q.mo[i] ? 1 : 0, to: a.to, p: (T - a.t) / 450 }); else if (T - a.t < 450 || !q.cards[i]) { } } else left++; }
    if (left || ov.fly.some(f => f.oid === q.oid)) ov.opens.push({ oid: q.oid, s: q.s, n: q.n, cards: q.cards, mo: q.mo, gone });
  });
  return { S, tu, names: HE.names, shows, hl, ov, hs: HE.hs };
}
function heSrcLoad() {
  return new Promise(async res => {
    if (HE.ready) { res(); return; }
    let src = ''; try { const r = await fetch(location.href); if (r.ok) src = await r.text(); } catch (e) { }
    if (!src || src.indexOf('id="hedit"') < 0) src = '<!doctype html>' + document.documentElement.outerHTML;
    src = src.replace(/<head[^>]*>/i, m => m + '<script>window.__HEF=1<\/script><style>#bcbar,#hedit,#connbar,#toast,#side,.specbadge,#bctop .n s{display:none!important}body.henost #bctop .stp{visibility:hidden}html.heonly,html.heonly body{background:transparent!important}html.heonly body>*:not(.heshow):not(.heopen):not(.heopf){visibility:hidden!important}.hehl{outline:6px solid #ffe36e!important;outline-offset:3px;box-shadow:0 0 40px 12px #ffe36e!important;border-radius:8px}</style>');
    const fr = $('heFr'); fr.onload = async () => { for (let n = 0; n < 200 && !(fr.contentWindow && fr.contentWindow.heDraw); n++) await heSleep(50); HE.ready = !!(fr.contentWindow && fr.contentWindow.heDraw); res(); };
    fr.srcdoc = src;
  });
}
if (window.__HEF) {
  const heOvRects = (r, ov) => ov.opens.map((o, k) => {
    const n = ov.opens.length, h = r.height / n, top = r.top + k * h, ch = Math.min(h * 0.8, (r.width * 0.94 / o.n) / 0.714), cw = ch * 0.714, gap = Math.min(18, cw * 0.08), tw = o.n * cw + (o.n - 1) * gap, x0 = r.left + (r.width - tw) / 2, y0 = top + (h - ch) / 2;
    return { x0, y0, cw, ch, gap, top, h };
  });
  window.heOnly = on => document.documentElement.classList.toggle('heonly', !!on);
  window.heOv = ov => {
    document.querySelectorAll('.heopen,.heopf').forEach(e => e.remove());
    if (!ov || !ov.opens.length) return;
    const mat = document.getElementById('mat'); if (!mat) return; const r = mat.getBoundingClientRect(), rc = heOvRects(r, ov);
    ov.opens.forEach((o, k) => {
      const q = rc[k], d = document.createElement('div'); d.className = 'heopen'; d.dataset.oid = o.oid;
      d.style.cssText = 'position:fixed;z-index:70;left:' + r.left + 'px;top:' + q.top + 'px;width:' + r.width + 'px;height:' + q.h + 'px;background:rgba(6,12,34,.9);border:3px solid #7aa8ff;border-radius:14px;box-sizing:border-box';
      for (let i = 0; i < o.n; i++) {
        if (o.gone.includes(i)) continue;
        const c = document.createElement('div'); c.className = 'heopc'; c.dataset.i = i; c.dataset.oid = o.oid;
        c.style.cssText = 'position:absolute;box-sizing:border-box;border-radius:10px;overflow:hidden;left:' + (q.x0 + i * (q.cw + q.gap) - r.left) + 'px;top:' + (q.y0 - q.top) + 'px;width:' + q.cw + 'px;height:' + q.ch + 'px;' + (o.cards[i] ? 'box-shadow:0 6px 24px #000c;background:#111' : 'border:4px dashed #9fc0ff;background:#2a3a6a;color:#cfe0ff;display:flex;align-items:center;justify-content:center;font:900 ' + (q.cw * 0.4) + 'px sans-serif');
        if (o.cards[i]) { const im = document.createElement('img'); im.src = artOf(o.cards[i]); im.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;' + (o.mo[i] ? 'filter:grayscale(1)' : ''); c.appendChild(im); } else c.textContent = '?';
        d.appendChild(c);
      }
      document.body.appendChild(d);
    });
    ov.fly.forEach(f => {
      const k = ov.opens.findIndex(o => o.oid === f.oid); if (k < 0) return; const q = rc[k], x = q.x0 + f.i * (q.cw + q.gap), y = q.y0;
      const half = document.querySelector(f.s ? '.half.opp' : '.half.me'), hb = document.getElementById(f.s ? 'oppHand' : 'hand');
      let tg = null; if (f.to === 'hand' && hb) tg = hb.getBoundingClientRect(); else if (f.to === 'deck' && half && half.querySelector('.deck')) tg = half.querySelector('.deck').getBoundingClientRect(); else if (f.to === 'trash' && half && half.querySelector('.zone.trash')) tg = half.querySelector('.zone.trash').getBoundingClientRect(); else if (half) tg = half.getBoundingClientRect();
      if (!tg) return; const e = f.p < 0.5 ? 2 * f.p * f.p : 1 - Math.pow(-2 * f.p + 2, 2) / 2, tx = tg.left + tg.width / 2, ty = tg.top + tg.height / 2, w = q.cw + (60 - q.cw) * e, hh = q.ch + (84 - q.ch) * e, cx = x + q.cw / 2 + (tx - x - q.cw / 2) * e, cy = y + q.ch / 2 + (ty - y - q.ch / 2) * e;
      const d = document.createElement('div'); d.className = 'heopf'; d.style.cssText = 'position:fixed;z-index:80;pointer-events:none;left:' + (cx - w / 2) + 'px;top:' + (cy - hh / 2) + 'px;width:' + w + 'px;height:' + hh + 'px;border-radius:8px;overflow:hidden;box-shadow:0 6px 24px #000c;opacity:' + (1 - 0.5 * e);
      d.innerHTML = '<img src="' + artOf(f.c) + '" style="width:100%;height:100%;object-fit:cover;' + (f.mo ? 'filter:grayscale(1)' : '') + '">'; document.body.appendChild(d);
    });
  };
  window.heDraw = async sc => {
    const dm = defById(), L = CARD_LIST.filter(c => c.def.type === 'spirit').slice(0, 40).map(c => c.def);
    const g = newGame(L.slice(), L.slice(), { first: 'host', mulligan: false, norec: true });
    g.names = [sc.names[0], sc.names[1]]; g.turn = sc.tu.s; g.turnNo = sc.tu.no; g.step = STEPS.includes(sc.tu.step) ? sc.tu.step : 'main'; document.body.classList.toggle('henost', !STEPS.includes(sc.tu.step)); g.noAttack = false; g.log = []; g.evs = []; g.battle = null; g.queue = []; g.pending = null; g.winner = null; g.pick = null; g.mull = null; g.trace = []; g.fx = [];
    sc.S.forEach((q, i) => {
      const P = g.p[i];
      P.deck = Array.from({ length: q.deck }, () => mkInst(L[0]));
      P.hand = q.hand.map(h => { const k = mkInst(dm.get(h.c)); k.iid = h.u; return k; });
      P.field = q.field.map(f => { const k = mkInst(dm.get(f.c)); k.iid = f.u; k.cores = Array.from({ length: f.n }, () => mkCore(false)); k.tapped = !!f.tp; return k; });
      P.life = Array.from({ length: q.life }, () => mkCore(false));
      P.reserve = [mkCore(true), ...Array.from({ length: q.res }, () => mkCore(false))];
      P.coreTrash = Array.from({ length: q.ct }, () => mkCore(false));
      P.trash = q.trash.map(c => mkInst(dm.get(c))); P.removed = []; P.void = [];
    });
    document.querySelectorAll('.heshow').forEach(e => e.remove()); clearTimeout(animTimer); window.__HESHOW = sc.hs || 0.57; specReset(); BC.autoDone = true; document.body.classList.add('adm'); SPEC = true; showGame(); setSpecV(viewSpec(g)); bcOn();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await heSleep(260);
    sc.shows.forEach(x => { const hf = document.querySelector(x.s ? '.half.me' : '.half.opp'); if (!hf) return; const r = hf.getBoundingClientRect(), d = document.createElement('div'); d.className = 'heshow'; d.style.cssText = 'position:fixed;z-index:50;pointer-events:none;display:flex;align-items:center;justify-content:center;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px'; d.innerHTML = '<img src="' + artOf(x.c) + '" style="height:78%;max-width:90%;object-fit:contain;border-radius:10px;box-shadow:0 8px 40px #000c">'; document.body.appendChild(d); });
    sc.S.forEach((q, i) => { q.field.forEach(f => { if (!f.mo) return; const e = document.querySelector('.slot[data-slot="' + f.u + '"]'); if (e) { const c = e.querySelector('.card') || e; c.style.filter = 'grayscale(1)'; } }); q.hand.forEach(h => { if (!h.mo) return; const e = document.querySelector('.card[data-card="' + h.u + '"]'); if (e) e.style.filter = 'grayscale(1)'; }); });
    (sc.hl || []).forEach(u => { const e = document.querySelector('.slot[data-slot="' + u + '"]') || document.querySelector('.card[data-card="' + u + '"]'); if (e) e.classList.add('hehl'); });
    window.heOv(sc.ov);
    for (let n = 0; n < 60 && ![...document.images].every(i => i.complete); n++) await heSleep(50);
    await heSleep(60);
  };
}
function heSync(force) {
  if (!HE.ready) return;
  const sc = heScene(HE.t), ov = sc.ov; sc.ov = null; const key = JSON.stringify(sc), ok = JSON.stringify(ov);
  if (!force && key === HE.key) { if (ok !== HE.ovKey && !HE.busy) { HE.ovKey = ok; try { $('heFr').contentWindow.heOv(ov); } catch (e) { } } return; }
  HE.key = key; HE.ovKey = ok; sc.ov = ov; HE.want = sc; if (!HE.busy) heFlush();
}
async function heFlush() {
  HE.busy = true;
  try { while (HE.want) { const sc = HE.want; HE.want = null; await $('heFr').contentWindow.heDraw(sc); } } catch (e) { }
  HE.busy = false;
}
function heFit() {
  const w = $('heWrap'), W = w.clientWidth, H = w.clientHeight; if (!W || !H) return;
  const s = Math.min(W / 1920, H / 1080); HE.sc = s; const st = $('heStage');
  st.style.transform = 'scale(' + s + ')'; st.style.left = Math.max(0, (W - 1920 * s) / 2) + 'px'; st.style.top = Math.max(0, (H - 1080 * s) / 2) + 'px';
}
function hePdFill() {
  const all = loadDecks(), names = Object.keys(all).sort((x, y) => (all[y].t || 0) - (all[x].t || 0));
  ['A', 'B'].forEach((s, k) => { const el = $('hePd' + s), cur = el.value; el.innerHTML = names.map(n => '<option>' + esc(n) + '</option>').join(''); el.value = names.includes(cur) ? cur : (names[k] || names[0] || ''); });
}
function hePool() {
  const q = $('heQ').value.trim(), box = $('hePool'), all = loadDecks();
  const tile = (id, n) => '<div class="hetile' + (HE.pk === id ? ' pk' : '') + '" data-cid="' + esc(id) + '"><img draggable="false" src="' + esc(artOf(id) || '') + '" alt="">' + esc(heNm(id).slice(0, 12)) + (n ? ' ×' + n : '') + '</div>';
  let h = '';
  ['A', 'B'].forEach(s => { const d = all[$('hePd' + s).value]; if (d) h += '<h4>デッキ' + s + 'のカード</h4><div class="hegrid">' + (d.cards || []).map(([id, n]) => tile(id, n)).join('') + '</div>'; });
  if (q) { const r = CARD_LIST.filter(c => c.def.name.includes(q)).slice(0, 60); h += '<h4>検索結果</h4><div class="hegrid">' + r.map(c => tile(c.raw.id)).join('') + '</div>'; }
  box.innerHTML = h;
}
function heStageXY(ev) { const r = $('heStage').getBoundingClientRect(); return { x: (ev.clientX - r.left) / HE.sc, y: (ev.clientY - r.top) / HE.sc, in: ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom }; }
function heWhat(ev) {
  const p = heStageXY(ev); if (!p.in || !HE.ready) return null;
  const d = $('heFr').contentDocument, el = d.elementFromPoint(p.x, p.y); if (!el) return { p };
  const op = el.closest('.heopen'); if (op) { const oc = el.closest('.heopc'); return { p, z: 'open', oid: op.dataset.oid, oc: oc ? +oc.dataset.i : null, s: null }; }
  const hb = el.closest('#hand,#oppHand'), half = el.closest('.half'), sl = el.closest('.slot[data-slot]'), hc = el.closest('.card[data-card]');
  const s = hb ? (hb.id === 'hand' ? 0 : 1) : half ? (half.classList.contains('me') ? 0 : 1) : null;
  let z = null;
  if (hb) z = 'hand'; else if (el.closest('.lifez')) z = 'life'; else if (el.closest('[data-zloc="reserve"],.rtot')) z = 'res'; else if (el.closest('[data-zloc="coreTrash"]')) z = 'ct'; else if (el.closest('.zone.trash,.pile')) z = 'trash'; else if (half) z = 'field';
  return { p, s, z, u: sl ? sl.dataset.slot : null, hu: hb && hc ? hc.dataset.card : null, top: !!el.closest('#bctop') };
}
function hePopOpen(x, y, items) {
  const pop = $('hePop'); HE.menu = items.filter(i => i.fn || i.t);
  pop.innerHTML = HE.menu.map((it, i) => it.t ? '<div class="hpt">' + esc(it.t) + '</div>' : '<button data-mi="' + i + '">' + esc(it.l) + '</button>').join('');
  pop.hidden = false; pop.style.left = Math.min(x, innerWidth - 260) + 'px'; pop.style.top = Math.max(4, Math.min(y, innerHeight - pop.offsetHeight - 6)) + 'px';
}
function heNs(l, fn) { return [1, 2, 3].map(n => ({ l: l + n, fn: () => fn(n) })); }
function heZoneItems(s, z, sc) {
  const it = [], nm = s ? 'B' : 'A', ad = (k, d, extra) => heGrp([Object.assign({ k, s, d }, extra || {})]);
  const nn = (t, k, sg, extra) => { it.push({ t }); [1, 2, 3].forEach(n => it.push({ l: t.replace(/ .*/, '') + (sg > 0 ? '+' : '-') + n, fn: () => ad(k, sg * n, extra) })); };
  if (!z || z === 'life' || z === 'field') { nn(nm + 'のライフ 増', 'life', 1); nn(nm + 'のライフ 減', 'life', -1); it.push({ l: 'ライフ-1 と リザーブ+1 を同時に', fn: () => heGrp([{ k: 'life', s, d: -1 }, { k: 'res', s, d: 1 }]) }); }
  if (!z || z === 'res' || z === 'field') { nn(nm + 'のリザーブ 増', 'res', 1); nn(nm + 'のリザーブ 減', 'res', -1); }
  if (!z || z === 'ct' || z === 'field') { nn(nm + 'のコアトラッシュ 増', 'ct', 1); nn(nm + 'のコアトラッシュ 減', 'ct', -1); }
  if (!z || z === 'trash' || z === 'field') { it.push({ t: nm + 'のトラッシュ' }, { l: 'カード+1(一覧で選んだカード)', fn: () => { if (!HE.pk) { toast('左の一覧でカードをクリックして選んでください'); return; } heGrp([{ k: 'ttrash', s, c: HE.pk }]); } }, { l: 'カード-1(最後の1枚)', fn: () => heGrp([{ k: 'ttdel', s }]) }); }
  it.push({ t: nm + 'のデッキをオープン' }, ...[1, 2, 3, 4, 5, 6, 7].map(n => ({ l: n + '枚オープン', fn: () => heOpenMake(s, n) })), { l: '枚数を入力…', fn: () => { const v = parseInt(prompt('オープンする枚数', '3'), 10); if (v > 0 && v <= 12) heOpenMake(s, v); } });
  it.push({ t: nm + 'の手札' }, { l: '手札増加(一覧で選んだカード)', fn: () => { if (!HE.pk) { toast('左の一覧でカードをクリックして選んでください'); return; } heGrp([{ k: 'hadd', s, c: HE.pk, u: heUid() }]); } });
  return it;
}
function heOpenMake(s, n) { heGrp([{ k: 'open', s, n, cards: Array(n).fill(null), mo: Array(n).fill(0), end: HE.t + 8000, oid: heUid() }]); }
const heOpOf = oid => HE.ops.find(o => o.k === 'open' && o.oid === oid);
function heOpAct(op, i, to) {
  if (!op) return; if (!op.cards[i] && (to === 'hand' || to === 'trash' || to === 'field')) { toast('先にカードを入れてください(一覧で選んで「カードを入れる」)'); return; }
  heSnap(); HE.ops = HE.ops.filter(o => !(o.k === 'oact' && o.og === op.oid && o.i === i)); const g = HE.nid++; HE.ops.push({ k: 'oact', s: op.s, og: op.oid, i, to, t: HE.t, g, id: HE.nid++ }); if (HE.t + 800 > op.end) op.end = HE.t + 800; HE.sel = new Set([g]); heTL(); heSync(true);
}
function heCtx(ev) {
  const w = heWhat(ev); if (!w || !w.p) return; ev.preventDefault();
  const sc = heScene(HE.t), it = [];
  if (w.z === 'open') {
    const op = heOpOf(w.oid), i = w.oc;
    if (i != null && op) {
      it.push({ t: 'オープンしたカード' }, { l: 'カードを入れる(一覧で選んだカード)', fn: () => { if (!HE.pk) { toast('左の一覧でカードをクリックして選んでください'); return; } heMod(op, x => { x.cards[i] = HE.pk; }); } }, { l: 'カードを空白に戻す', fn: () => heMod(op, x => { x.cards[i] = null; }) }, { l: 'モノクロ ON/OFF', fn: () => heMod(op, x => { x.mo[i] = x.mo[i] ? 0 : 1; }) });
      it.push({ t: '処理(いまの時刻で確定)' }, { l: '手札に加える', fn: () => heOpAct(op, i, 'hand') }, { l: 'デッキの下に戻す', fn: () => heOpAct(op, i, 'deck') }, { l: 'トラッシュする', fn: () => heOpAct(op, i, 'trash') }, { l: '盤面に出す', fn: () => heOpAct(op, i, 'field') }, { l: 'そのまま消す(何も加えない)', fn: () => heOpAct(op, i, 'none') });
    }
    if (op) it.push({ t: 'このオープン' }, { l: '終了時刻をいまにする', fn: () => heMod(op, x => { x.end = Math.max(x.t + 100, HE.t); }) }, { l: 'このオープンを消す', fn: () => { heSnap(); HE.ops = HE.ops.filter(o => !(o.g === op.g || (o.k === 'oact' && o.og === op.oid))); HE.sel = new Set(); heTL(); heSync(true); } });
    heMenuShow(ev, it); return;
  }
  if (w.top) {
    const lt = heLastTurn(HE.t) || { s: 0, no: 1 };
    it.push({ t: 'ステップ(いまの時刻に入れる)' });
    STEPS.forEach(st => it.push({ l: STEP_JP[st], fn: () => heStepAdd({ s: lt.s, no: lt.no, step: st }) }));
    it.push({ t: 'ターンを変えて入れる' });
    [0, 1].forEach(s => it.push({ l: (s ? 'B' : 'A') + 'の番のスタート(次のターン数)', fn: () => heStepAdd({ s, no: lt.no + (s !== lt.s ? 1 : 0), step: 'start' }) }));
    heMenuShow(ev, it); return;
  }
  if (w.u) {
    const f = heSide(sc.S, w.u), side = f ? f.i : 0, c = f ? f.k.c : null, po = HE.ops.find(o => o.k === 'put' && o.u === w.u), pt = po ? po.t : HE.t;
    it.push({ t: c ? heNm(c) : 'カード' });
    it.push({ l: '疲労 / 回復', fn: () => heGrp([{ k: 'tap', s: side, u: w.u }]) }, { l: 'モノクロ ON/OFF', fn: () => heGrp([{ k: 'mono', s: side, u: w.u }]) }, { l: '破壊(トラッシュへ)', fn: () => heGrp([{ k: 'rm', s: side, u: w.u, to: 'trash' }]) }, { l: '消滅(盤面から消す)', fn: () => heGrp([{ k: 'rm', s: side, u: w.u }]) }, { l: '手札に戻す', fn: () => heGrp([{ k: 'rm', s: side, u: w.u, to: 'hand', hu: heUid() }]) }, { l: 'デッキの下に戻す', fn: () => heGrp([{ k: 'rm', s: side, u: w.u, to: 'deck' }]) });
    it.push({ t: 'カードのコア(いまの時刻)' });
    [1, 2, 3].forEach(n => it.push({ l: 'コア+' + n, fn: () => heGrp([{ k: 'core', s: side, u: w.u, d: n }]) }));
    [1, 2, 3].forEach(n => it.push({ l: 'コア-' + n, fn: () => heGrp([{ k: 'core', s: side, u: w.u, d: -n }]) }));
    if (po) {
      it.push({ t: '召喚と同時に払う(出した時刻 ' + heFmt(pt) + ')' });
      [1, 2, 3, 4, 5].forEach(n => it.push({ l: 'コア' + n + '個を置き、リザーブ-' + n, fn: () => heGrp([{ k: 'core', s: side, u: w.u, d: n }, { k: 'res', s: side, d: -n }], pt) }));
      [1, 2, 3, 4, 5].forEach(n => it.push({ l: 'コア' + n + '個を置くだけ', fn: () => heGrp([{ k: 'core', s: side, u: w.u, d: n }], pt) }));
      [1, 2, 3].forEach(n => it.push({ l: 'リザーブ-' + n + ' かつ コアトラッシュ+' + n, fn: () => heGrp([{ k: 'res', s: side, d: -n }, { k: 'ct', s: side, d: n }], pt) }));
    }
    heMenuShow(ev, it); return;
  }
  if (w.z === 'hand' && w.hu) {
    const side = w.s, c = (sc.S[side].hand.find(h => h.u === w.hu) || {}).c;
    it.push({ t: c ? heNm(c) : '手札' }, { l: '手札減少(このカード)', fn: () => heGrp([{ k: 'hdel', s: side, u: w.hu }]) }, { l: 'モノクロ ON/OFF', fn: () => heGrp([{ k: 'mono', s: side, u: w.hu, h: 1 }]) }, { l: '盤面に出す', fn: () => hePutFrom(side, c, w.hu) }, { l: 'トラッシュへ', fn: () => heGrp([{ k: 'hdel', s: side, u: w.hu }, { k: 'ttrash', s: side, c }]) });
    heMenuShow(ev, it); return;
  }
  if (w.s != null) { heZoneItems(w.s, w.z === 'hand' ? 'hand' : w.z, sc).forEach(x => it.push(x)); heMenuShow(ev, it); }
}
