
/* ================= 画面と通信 ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let peer, dc, isHost = false, G = null, V = null, myDefs = null, guestDefs = null, solo = false, viewer = 0;
let sel = new Set(), sheetActs = [];
const say = t => { $('conn').textContent = t; };

const BUILTIN_CARDS = [{"id": "26RSD09-002", "name": "マルグリース", "type": "spirit", "color": "red", "family": ["紅雲", "風炎"], "cost": 2, "reduction": 0, "symbols": {"normal": 0, "ex": true}, "levels": [{"lv": 1, "core": 1, "bp": 3000}, {"lv": 2, "core": 3, "bp": 6000}], "vanilla": true, "text": "", "reading": "まるぐりーす"}, {"id": "26RSD09-004", "name": "ファルテックス", "type": "spirit", "color": "red", "family": ["煉翼"], "cost": 3, "reduction": 2, "symbols": {"normal": 0, "ex": true}, "keywords": ["shinkai"], "levels": [{"lv": 1, "core": 1, "bp": 3000}, {"lv": 2, "core": 3, "bp": 4000}], "effects": [{"levels": [1, 2], "timing": {"kind": "static", "when": "attacking"}, "ops": [{"op": "bp", "target": "self", "amount": 2000}], "text": "このスピリットをBP+2000する。"}, {"levels": [2], "shinkai": true, "timing": {"kind": "trigger", "event": "attack"}, "cond": {"handCount": {"of": "you", "lte": 5}}, "ops": [{"op": "draw", "who": "you", "n": 1}], "text": "自分の手札が5枚以下なら、1枚ドローする。"}], "text": "Lv1-2『アタック中』\nこのスピリットをBP+2000する。\nLv2《真界放》『アタック時』\n自分の手札が5枚以下なら、1枚ドローする。", "reading": "ふぁるてっくす"}, {"id": "26RSD09-011", "name": "豪風の渓谷", "reading": "ごうふうのけいこく", "type": "nexus", "color": "red", "family": ["煉翼"], "cost": 4, "reduction": 2, "symbols": {"normal": 1, "ex": false}, "levels": [{"lv": 1, "core": 0, "bp": 0}, {"lv": 2, "core": 2, "bp": 0}], "effects": [{"levels": [1, 2], "timing": {"kind": "static", "when": "step", "step": "attack", "turn": "you"}, "ops": [{"op": "bp", "target": {"who": "you", "type": "spirit", "color": "red", "state": "attacking", "all": true}, "amount": 2000}], "text": "アタックしている自分の赤のスピリットすべてをBP+2000する。"}, {"levels": [2], "timing": {"kind": "trigger", "event": "destroyed", "of": "self"}, "ops": [{"op": "destroy", "target": {"who": "opp", "type": "spirit", "bpMax": 5000, "count": 1, "choose": true}}], "text": "BP5000以下の相手のスピリット1体を指定する。それを破壊する。"}], "text": "Lv1-2『自分のアタックステップ』\nアタックしている自分の赤のスピリットすべてをBP+2000する。\nLv2『破壊時』\nBP5000以下の相手のスピリット1体を指定する。それを破壊する。"}, {"id": "26RSD01-014", "name": "フレイムハリケーン", "type": "magic", "color": "red", "family": ["風牙"], "cost": 6, "reduction": 3, "symbols": {"normal": 0, "ex": true}, "soulMagic": true, "effects": [{"levels": [], "timing": {"kind": "keyword"}, "keyword": "soulmagic", "ops": [], "text": "自分の赤シンボルがあれば[ソウルコア]だけで使用できる。"}, {"levels": [], "timing": {"kind": "flash"}, "ops": [{"op": "destroy", "target": {"who": "opp", "type": "spirit", "count": 1, "choose": true, "bpMax": 7000}, "replace": {"cond": {"lifeLost": {"of": "you", "gte": 1}}, "set": {"bpMax": 10000}}}], "text": "BP7000以下の相手のスピリット1体を指定する。それを破壊する。\nこのターンに自分のライフが減っていたなら、かわりに指定するBPを10000以下にする。"}], "text": "《ソウルマジック：[赤]》\n自分の赤シンボルがあれば[ソウルコア]だけで使用できる。\nフラッシュ：\nBP7000以下の相手のスピリット1体を指定する。それを破壊する。\nこのターンに自分のライフが減っていたなら、かわりに指定するBPを10000以下にする。", "reading": "ふれいむはりけーん"}, {"id": "26RSD09-X02", "name": "煉凰ゼクーガ・イグネイト", "reading": "れんおうぜくーが・いぐねいと", "type": "spirit", "color": "red", "family": ["煉翼"], "cost": 8, "reduction": 4, "symbols": {"normal": 1, "ex": false}, "keywords": ["inheritance"], "levels": [{"lv": 1, "core": 1, "bp": 8000}, {"lv": 2, "core": 3, "bp": 10000}], "effects": [{"levels": [], "timing": {"kind": "keyword"}, "keyword": "inheritance", "ops": [], "text": "トラッシュのEXシンボルを除外し軽減できる。"}, {"levels": [1, 2], "timing": {"kind": "trigger", "event": "summon"}, "ops": [{"op": "destroy", "target": {"who": "opp", "type": "spirit", "bpMax": 6000, "count": 1, "choose": true}, "replace": {"cond": {"paidWithSoulCore": true}, "set": {"count": 2}}}], "text": "BP6000以下の相手のスピリット1体を指定する。それを破壊する。\n召喚コストの支払いに[ソウルコア]を使用していたなら、かわりに指定する体数を2体にする。"}, {"levels": [2], "timing": {"kind": "trigger", "event": "battleEnd", "when": "attacking"}, "ops": [{"op": "moveCores", "from": "self", "max": 2, "optional": true, "to": {"who": "you", "type": "spirit", "family": "煉翼", "excludeSelf": true, "count": 1, "choose": true, "optional": true}}], "text": "バトル終了時、このスピリット以外の系統:「煉翼」を持つ自分のスピリット1体を指定できる。このスピリットのコア2個までをそれに置く。"}], "text": "《継召》\nトラッシュのEXシンボルを除外し軽減できる。\nLv1-2『召喚時』\nBP6000以下の相手のスピリット1体を指定する。それを破壊する。\n召喚コストの支払いに[ソウルコア]を使用していたなら、かわりに指定する体数を2体にする。\nLv2『アタック中』\nバトル終了時、このスピリット以外の系統:「煉翼」を持つ自分のスピリット1体を指定できる。このスピリットのコア2個までをそれに置く。"}];
/* --- サンプルデッキ(架空のカード) --- */
function sampleDeck() {
  const d = []; let n = 1; const id = () => 'TEST-' + String(n++).padStart(2, '0');
  for (let c = 1; c <= 8; c++) {
    const cost = Math.min(c, 6);
    d.push({ id: id(), name: 'テストスピリット' + c, type: 'spirit', color: 'red', family: ['試作'], cost, reduction: Math.min(2, Math.ceil(cost / 3)), symbols: { normal: 1, ex: false }, levels: [{ lv: 1, core: 1, bp: 1000 * c }, { lv: 2, core: 3, bp: 1000 * c + 2000 }], text: '(サンプル)', count: 3 });
  }
  for (let c = 1; c <= 2; c++) d.push({ id: id(), name: '真界放テスト' + c, type: 'spirit', color: 'red', family: ['試作'], cost: 4, reduction: 2, symbols: { normal: 1, ex: false }, keywords: ['shinkai'], levels: [{ lv: 1, core: 1, bp: 3000 }, { lv: 2, core: 3, bp: 6000 }], text: '【Lv2】真界放: アタック時(サンプル)', count: 3 });
  for (let c = 1; c <= 2; c++) d.push({ id: id(), name: '継承テスト' + c, type: 'spirit', color: 'red', family: ['試作'], cost: 6, reduction: 2, symbols: { normal: 1, ex: true }, keywords: ['inheritance'], levels: [{ lv: 1, core: 1, bp: 5000 }, { lv: 2, core: 3, bp: 8000 }], text: '継承(サンプル)', count: 3 });
  for (let c = 1; c <= 2; c++) d.push({ id: id(), name: 'テストネクサス' + c, type: 'nexus', color: 'red', cost: 2, reduction: 1, symbols: { normal: 1, ex: false }, text: '(サンプル)', count: 3 });
  for (let c = 1; c <= 2; c++) d.push({ id: id(), name: 'テストマジック' + c, type: 'magic', color: 'red', cost: 3, reduction: 1, text: '(サンプル)', count: 3 });
  d.push({ id: id(), name: 'テストソウルマジック', type: 'magic', color: 'red', cost: 5, reduction: 2, soulMagic: true, text: '(サンプル)', count: 2 });
  return JSON.stringify(d, null, 1);
}
/* ===== カードデータの管理(フォルダ構成: cards/収録弾/カード情報・カード画像) ===== */
let CARD_LIST = [], SET_NAMES = [];
const PACKS = {};              // 読み込んだ収録弾(IndexedDB): name -> {name, cards, images:{id:Blob}}
const BLOB_URLS = [];
const VARIANTS = [   // イラスト違い(カード番号は仮。正式な番号と画像が分かったら差し替え)
  { id: '26RBS01-004-S01', of: '26RBS01-004', set: '26RBS01 創世の鼓動' },   // ククルアカトル(シークレット) 画像は 26RBS01-004-S01.jpg
  { id: '26RSD09-V01', of: '26RSD01-014', set: '26RSD09' },   // フレイムハリケーン(RSD09) 画像は 26RSD09-V01.png
  { id: '26RSD10-V01', of: '26RSD03-014', set: '26RSD10' },   // テンタクルアタック(RSD10)
  { id: '26RBS02-CP01-V01', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V02', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V03', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V04', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V05', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V06', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V07', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V08', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V09', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V10', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V11', of: '26RBS02-CP01', set: 'プロモカード' },
  { id: '26RBS02-CP01-V12', of: '26RBS02-CP01', set: 'プロモカード' }   // ゲートオープン、界放(プロモ・別絵)
];
const SET_TITLE = { '26RSD01': 'エントリーデッキ【赫焔ノ風牙】', '26RSD02': 'エントリーデッキ【紫幻ノ血醒】', '26RSD03': 'エントリーデッキ【翆海ノ甲魚】', '26RSD04': 'エントリーデッキ【白命ノ鉱人】', '26RSD05': 'エントリーデッキ【煌陽ノ雷竜】', '26RSD06': 'エントリーデッキ【蒼淵ノ凶獣】', '26RSD09': 'アニメスターター【覚醒の煉凰】', '26RSD10': 'アニメスターター【深淵の怪鯨】', '26RSD11': 'アニメスターター【蒼風ノ剣豪】', '26RBS01': 'ブースター【創世の鼓動】', '26RBS02': 'ブースター【幻惑の翔風】', '26RBS03': 'ブースター【絶界の覇者】' };
const setLabel = n => { n = String(n); { const m = n.match(/^(26R[A-Z]{2}\d{2})/); if (m && SET_TITLE[m[1]]) return m[1] + ' ' + SET_TITLE[m[1]]; } if (/^BS0[13]/.test(n)) return SET_RBS02(); return n; };
let _rbs02 = '26RBS02 ブースター【幻惑の翔風】';
const SET_RBS02 = () => _rbs02;
function rebuildCards() {
  BLOB_URLS.splice(0).forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { } });
  Object.keys(ART_URL).forEach(k => delete ART_URL[k]);
  const map = new Map();
  const add = (raw, set) => { if (!raw || typeof raw !== 'object' || !raw.id) return; try { map.set(String(raw.id), { raw, def: cleanDef(raw), set }); } catch (e) { } };
  BUILTIN_CARDS.forEach(c => add(c, String(c.id).split('-')[0]));
  (Array.isArray(window.CARD_DB) ? window.CARD_DB : []).forEach(st => { (st.cards || []).forEach(c => add(c, st.name)); Object.keys(st.images || {}).forEach(id => { ART_URL[id] = encodeURI(st.images[id]).replace(/[()']/g, ch => '%' + ch.charCodeAt(0).toString(16)); }); });
  Object.assign(ART_URL, window.EXTRA_ART || {}, window.EXTRA_ART2 || {}); ['RP26-06', 'RPX26-01'].forEach(id => { ART_URL[id] = encodeURI('cards/プロモカード/カード画像/' + id + '.jpg'); });   /* プロモ画像の差し替え */   /* 公開版用: 画像を別ファイルにまとめたもの(無ければ何もしない) */
  Object.values(PACKS).forEach(st => { (st.cards || []).forEach(c => add(c, st.name)); Object.keys(st.images || {}).forEach(id => { try { const u = URL.createObjectURL(st.images[id]); BLOB_URLS.push(u); ART_URL[id] = u; } catch (e) { } }); });
  /* イラスト違い: 同じ効果で別のカード番号(画像は cards/収録弾/カード画像/<番号>.png を置けば差し替わる) */
  VARIANTS.forEach(v => { const b = map.get(v.of); if (!b || map.has(v.id)) return; const raw = Object.assign({}, b.raw, { id: v.id, altOf: v.of }); try { map.set(v.id, { raw, def: cleanDef(raw), set: v.set }); } catch (e) { } });
  map.forEach(c => { c.set = /-CP\d+/.test(String(c.raw.id)) ? 'プロモカード' : setLabel(c.set); });
  CARD_LIST = [...map.values()].sort((a, b) => a.set.localeCompare(b.set, 'ja') || String(a.raw.id).localeCompare(String(b.raw.id)));
  SET_NAMES = [...new Set(CARD_LIST.map(c => c.set))];
}
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('bs-practice', 1); r.onupgradeneeded = () => r.result.createObjectStore('packs', { keyPath: 'name' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function loadPacks() {
  try {
    const db = await idb();
    const all = await new Promise((res, rej) => { const q = db.transaction('packs').objectStore('packs').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    all.forEach(x => { PACKS[x.name] = x; });
  } catch (e) { }
  rebuildCards();
}
async function importFolder(fileList) {
  const sets = {}, errs = [];
  for (const f of fileList) {
    const parts = (f.webkitRelativePath || f.name).split('/');
    const iI = parts.indexOf('カード情報'), iG = parts.indexOf('カード画像'), i = iI >= 0 ? iI : iG;
    if (i < 1) continue;
    const S = sets[parts[i - 1]] = sets[parts[i - 1]] || { name: parts[i - 1], cards: [], images: {} };
    if (iI >= 0 && /\.json$/i.test(f.name)) {
      try { const d = JSON.parse(await f.text()); (Array.isArray(d) ? d : [d]).forEach(c => S.cards.push(c)); } catch (e) { errs.push(f.name); }
    } else if (iG >= 0 && /\.(jpe?g|png|webp)$/i.test(f.name)) S.images[f.name.replace(/\.[^.]+$/, '')] = new Blob([f], { type: f.type || 'image/jpeg' });
  }
  const names = Object.keys(sets);
  if (!names.length) return { err: '「カード情報」「カード画像」フォルダが見つかりません。cards フォルダ(または収録弾のフォルダ)を選んでください' };
  try {
    const db = await idb(); const tx = db.transaction('packs', 'readwrite'), st = tx.objectStore('packs');
    names.forEach(n => { st.put(sets[n]); PACKS[n] = sets[n]; });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  } catch (e) { names.forEach(n => { PACKS[n] = sets[n]; }); }
  rebuildCards();
  return { names, n: names.reduce((a, n) => a + sets[n].cards.length, 0), img: names.reduce((a, n) => a + Object.keys(sets[n].images).length, 0), errs };
}

/* ===== デッキ構築 ===== */
const B = { name: '', cover: '', deck: new Map(), q: '', color: '', type: '', cost: '', set: '26RBS01 ブースター【創世の鼓動】', ex: false };
const SAMPLES = () => { const o = {}; (window.SAMPLE_DECKS || []).forEach((d, i) => { o[d.name] = { t: 100 - i, cards: d.cards, cover: d.cover, sample: true }; }); return o; };
const loadDecks = () => { let u = {}; try { u = JSON.parse(localStorage.getItem('bs-decks') || '{}') || {}; } catch (e) { } const sm = SAMPLES(); let gone = []; try { gone = JSON.parse(localStorage.getItem('bs-del-samples') || '[]') || []; } catch (e) { } gone.forEach(k => { if (!u[k]) delete sm[k]; }); return Object.assign(sm, u); };
const userDecks = () => { try { return JSON.parse(localStorage.getItem('bs-decks') || '{}') || {}; } catch (e) { return {}; } };
const saveDecks = o => { try { const u = {}; const sm = SAMPLES(); Object.keys(o).forEach(k => { if (!(sm[k] && o[k] && o[k].sample)) u[k] = o[k]; }); localStorage.setItem('bs-decks', JSON.stringify(u)); return true; } catch (e) { return false; } };
const cardById = id => CARD_LIST.find(c => String(c.raw.id) === id);
function coverOf(d) {
  if (!d) return null;
  if (d.cover && cardById(String(d.cover))) return cardById(String(d.cover));
  const arr = (d.cards || []).map(([id, n]) => cardById(id)).filter(Boolean).sort((a, b) => (b.def.type === 'spirit') - (a.def.type === 'spirit') || b.def.cost - a.def.cost);
  return arr[0] || null;
}
function coverStyle(c) { if (!c) return ''; const art = artOf(String(c.raw.id)); return '--cc:' + (COLOR_HEX[c.def.color] || '#6a7499') + (art ? ';background-image:url(' + art + ')' : ''); }
let dragSuppress = false;
function loadDeckOrder() { try { const a = JSON.parse(localStorage.getItem('bs-deck-order') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
(function () {
  let tm = null, drag = null, sx = 0, sy = 0, cand = null, mouse = false;
  const box = () => $('deckPick');
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('.dp'); if (!el || !box() || !box().contains(el)) return;
    sx = e.clientX; sy = e.clientY; clearTimeout(tm); mouse = e.pointerType === 'mouse'; cand = el;
    if (mouse) { if (e.button !== 0) return; cand = el; return; }
    tm = setTimeout(() => { drag = el; el.classList.add('lift'); try { navigator.vibrate && navigator.vibrate(25); } catch (x) { } toast('ドラッグして並べ替えできます'); }, 450);
  });
  document.addEventListener('pointermove', e => {
    if (!drag) { const mv = Math.hypot(e.clientX - sx, e.clientY - sy); if (mouse && cand && (e.buttons & 1) && mv > 6) { drag = cand; drag.classList.add('lift'); } else { if (mv > 8) clearTimeout(tm); return; } }
    const t = document.elementFromPoint(e.clientX, e.clientY), o = t && t.closest && t.closest('.dp');
    if (o && o !== drag && box().contains(o)) { const kids = [...box().children]; if (kids.indexOf(o) > kids.indexOf(drag)) o.after(drag); else o.before(drag); }
  });
  const end = () => {
    clearTimeout(tm); cand = null;
    if (!drag) return;
    const names = [...box().children].map(x => x.dataset.dpick).filter(Boolean);
    try { localStorage.setItem('bs-deck-order', JSON.stringify(names)); } catch (e) { }
    drag.classList.remove('lift'); drag = null; dragSuppress = true; setTimeout(() => { dragSuppress = false; }, 120); renderDeckPick();
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.dp')) e.preventDefault(); });
})();
function renderDeckPick() {
  const el = $('deckPick'); if (!el) return;
  const all = loadDecks(), ord = loadDeckOrder(), names = Object.keys(all).sort((a, b) => { const ia = ord.indexOf(a), ib = ord.indexOf(b); if (ia >= 0 && ib >= 0) return ia - ib; if (ia >= 0) return -1; if (ib >= 0) return 1; return (all[b].t || 0) - (all[a].t || 0); }), cur = $('lobbyDeck').value;
  el.innerHTML = names.length ? names.map(n => {
    const d = all[n], c = coverOf(d), tot = (d.cards || []).reduce((a, [id, k]) => a + (cardById(id) ? k : 0), 0);
    return '<div class="dp' + (n === cur ? ' on' : '') + '" data-dpick="' + esc(n) + '"><span class="dpm" data-dmenu="' + esc(n) + '" title="編集・複製・削除">！</span><div class="dpt" style="' + coverStyle(c) + '">' + (c && artOf(String(c.raw.id)) ? '' : esc(c ? c.def.name : n.slice(0, 4))) + '</div><div class="dpi"><div class="dpn">' + esc(n) + '</div><div class="dpc' + (tot < 40 ? ' ng' : '') + '">' + tot + '枚' + (tot < 40 ? '(40枚未満)' : '') + '</div></div></div>';
  }).join('') : '<span class="note">保存済みのデッキがありません。「デッキ作成」で作ってください。</span>';
}
document.addEventListener('click', e => { const vi = e.target.closest && e.target.closest('[data-vinfo]'); if (vi) { const c = cardById(vi.dataset.vinfo); if (c) showSheet(detailHTML({ def: c.def, cores: [], iid: '' }) + '<div class="acts"><button class="sub" data-close="1">閉じる</button></div>'); return; }
  if (dragSuppress) return;
  const dm = e.target.closest && e.target.closest('[data-dmenu]'); if (dm) { deckMenu(dm.dataset.dmenu); return; } const b = e.target.closest && e.target.closest('[data-dpick]'); if (b) { $('lobbyDeck').value = b.dataset.dpick; lobbyApply(b.dataset.dpick); } const st = e.target.closest && e.target.closest('[data-bcover]'); if (st) { e.stopPropagation(); B.cover = st.dataset.bcover; bRender(); } });
function deckMenu(n) {
  const all = loadDecks(); if (!all[n]) return;
  sheetActs = [];
  showSheet('<h3>' + esc(n) + '</h3><div class="note">' + (all[n].cards || []).reduce((a, [, c]) => a + c, 0) + '枚</div><div class="elist">' +
    sbtn('編集', () => openBuilder(false, n), 1) + sbtn('複製', () => deckCopy(n), 1) + sbtn('削除', () => deckDelAsk(n), 1) + '</div><div class="acts"><button class="sub" data-close="1">閉じる</button></div>');
}
function deckCopy(n) {
  const all = loadDecks(); if (!all[n]) return;
  let nn = n + 'のコピー', k = 2; while (all[nn]) nn = n + 'のコピー' + (k++);
  all[nn] = JSON.parse(JSON.stringify(all[n])); delete all[nn].sample; all[nn].t = Date.now(); all[nn].ord = true; saveDecks(all);
  const o = loadDeckOrder(); if (!o.includes(n)) o.push(n); o.splice(o.indexOf(n) + 1, 0, nn); try { localStorage.setItem('bs-deck-order', JSON.stringify(o)); } catch (e) { }
  bRefreshSelects(); toast('「' + nn + '」を作りました');
}
function deckDelAsk(n) {
  sheetActs = [];
  showSheet('<h3>「' + esc(n) + '」を削除しますか?</h3><div class="note">元に戻せません。</div><div class="acts">' + sbtn('削除する', () => {
    const all = loadDecks(); delete all[n]; saveDecks(all); if (SAMPLES()[n]) { let g = []; try { g = JSON.parse(localStorage.getItem('bs-del-samples') || '[]') || []; } catch (e) { } if (!g.includes(n)) g.push(n); try { localStorage.setItem('bs-del-samples', JSON.stringify(g)); } catch (e) { } }
    try { localStorage.setItem('bs-deck-order', JSON.stringify(loadDeckOrder().filter(x => x !== n))); } catch (e) { }
    if ($('lobbyDeck').value === n) { $('lobbyDeck').value = ''; try { localStorage.removeItem('bs-deck-sel'); } catch (e) { } }
    bRefreshSelects(); toast('削除しました');
  }) + sbtn('やめる', () => { }, 1) + '</div>');
}
const deckTotal = () => [...B.deck.values()].reduce((a, b) => a + b, 0);
const nameCount = nm => [...B.deck].reduce((a, [id, n]) => { const c = cardById(id); return a + (c && c.def.name === nm ? n : 0); }, 0);
function deckToJSON(deckObj) {   // [[id,count],...] -> 対戦用のJSON
  return JSON.stringify(deckObj.map(([id, n]) => { const c = cardById(id); return c ? Object.assign({}, c.raw, { count: n }) : null; }).filter(Boolean), null, 1);
}
function bAdd(id, d) {
  const c = cardById(id); if (!c) return;
  const cur = B.deck.get(id) || 0, next = cur + d;
  if (d > 0 && nameCount(c.def.name) >= 3) { return; }
  if (next <= 0) B.deck.delete(id); else B.deck.set(id, next);
  bRender();
}
/* イラスト違い(隠し操作): 同じカードの別イラスト(VARIANTS)があるとき、デッキ一覧のカードをクリックすると、裏返って次のイラストに切り替わる。別のイラストがなければ何もしない */
function artGroup(id) {
  const c = cardById(id); if (!c) return [id]; const base = String(c.raw.altOf || id);
  return [base].concat(VARIANTS.filter(v => v.of === base).map(v => v.id)).filter(x => cardById(x));
}
let _bFlipId = '';
function bFlip(id, el) {
  const g = artGroup(id); if (g.length < 2 || !B.deck.has(id)) return;
  const nx = g[(g.indexOf(id) + 1) % g.length]; if (nx === id) return;
  const go = () => {
    const m = new Map(); [...B.deck].forEach(([k, n]) => { if (k === id) m.set(nx, (m.get(nx) || 0) + n); else m.set(k, (m.get(k) || 0) + n); });   // 同じ位置で入れ替え(すでに入っていれば、まとめる)
    B.deck = m; if (B.cover === id) B.cover = nx; _bFlipId = nx; bRender(); setTimeout(() => { _bFlipId = ''; }, 400);
  };
  if (el && el.animate && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    el.style.pointerEvents = 'none';
    const a = el.animate([{ transform: 'perspective(700px) rotateY(0deg)' }, { transform: 'perspective(700px) rotateY(90deg)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = go; a.oncancel = go;
  } else go();
}
function thumbHTML(c, mode, nOverride) {
  const id = String(c.raw.id), art = artQ(id), au = art ? (thumbOf(id) || art) : '', n = nOverride != null ? nOverride : (B.deck.get(id) || 0), d = c.def;
  const act = mode === 'view' ? '' : mode === 'deck' ? ' data-bid="' + esc(id) + '" data-bdrag="' + esc(id) + '"' : ' draggable="true" data-badd="' + esc(id) + '"';
  return '<div class="bc' + (art ? ' hasimg' : '') + (mode === 'deck' && nameCount(d.name) > 3 ? ' over' : '') + (mode === 'deck' && _bFlipId === id ? ' flipin' : '') + '"' + act + (mode === 'view' ? ' data-vinfo="' + esc(id) + '"' : '') + ' style="--cc:' + (COLOR_HEX[d.color] || '#6a7499') + (art && mode !== 'pool' ? ';background-image:url(' + au + ')' : '') + '"' + (art && mode === 'pool' ? ' data-bg="' + au + '"' : '') + '>' +
    '<span class="bcost">' + d.cost + '</span><span class="bn">' + esc(d.name) + '</span><span class="bid">' + esc(c.raw.altOf || d.id) + ' / ' + TYPE_JP[d.type] + (c.raw.altOf ? ' <b class="balt">別絵</b>' : '') + '</span>' +
    (n ? (mode === 'deck' ? '<span class="bcnt bstep"><b data-bdec="' + esc(id) + '" title="1枚減らす">－</b><i>' + n + '</i><b data-binc="' + esc(id) + '" title="1枚増やす">＋</b></span>' : '<span class="bcnt">' + n + '</span>') : '') + (mode === 'deck' ? '<span class="bstar' + (B.cover === id ? ' on' : '') + '" data-bcover="' + esc(id) + '" title="表紙にする">' + (B.cover === id ? '★表紙' : '☆') + '</span>' : '') + (mode === 'view' ? '' : '<span class="bi" data-binfo="' + esc(id) + '">i</span>' + (n ? '<span class="bdel" data-bdelall="' + esc(id) + '">削除</span>' : '')) + '</div>';
}
function bFiltered() {
  const q = B.q.trim().toLowerCase();
  return CARD_LIST.filter(c => {
    const d = c.def;
    if (B.color && d.color !== B.color) return false;
    if (B.type && d.type !== B.type) return false;
    if (B.set && c.set !== B.set) return false;
    if (B.ex && !(d.symbols && d.symbols.ex)) return false;
    if (B.cost !== '') { if (B.cost === '9') { if (d.cost < 9) return false; } else if (d.cost !== +B.cost) return false; }
    if (q) { const hay = (d.name + ' ' + d.id + ' ' + (c.raw.altOf || '') + ' ' + (c.raw.altOf ? '別絵 イラスト違い ' : '') + ' ' + (d.reading || '') + ' ' + d.family.join(' ') + ' ' + (d.text || '') + ' ' + d.effects.map(e => e.text).join(' ')).toLowerCase(); if (!hay.includes(q)) return false; }
    return true;
  });
}
/* 一覧は100枚ずつ作る(収録を選ばずに検索しても、全件を一度に作らない)。下へスクロールすると続きを足す */
const B_CHUNK = 100; let _bShown = B_CHUNK, _bKey = '', _bPool = [];
let _bSentIO = null;
const bRoot = () => { const g = $('bGrid'); return g && g.scrollHeight > g.clientHeight + 2 ? g : null; };   // 画面が狭いときは、一覧ではなく画面全体がスクロールする
function bSentinel() {
  const g = $('bGrid'); if (_bSentIO) { _bSentIO.disconnect(); _bSentIO = null; } if (!g) return;
  const old = g.querySelector('.bsent'); if (old) old.remove();
  if (_bShown >= _bPool.length || !window.IntersectionObserver) return;
  g.insertAdjacentHTML('beforeend', '<div class="bsent" style="grid-column:1/-1;height:2px"></div>');
  _bSentIO = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) bMore(); }, { root: bRoot(), rootMargin: '700px' });
  _bSentIO.observe(g.querySelector('.bsent'));
}
function bMore() {
  const g = $('bGrid'); if (!g || _bShown >= _bPool.length) return;
  const from = _bShown; _bShown = Math.min(_bPool.length, _bShown + B_CHUNK);
  const old = g.querySelector('.bsent'); if (old) old.remove();
  g.insertAdjacentHTML('beforeend', _bPool.slice(from, _bShown).map(c => thumbHTML(c, 'pool')).join('')); lazyBg(); bSentinel();
}
