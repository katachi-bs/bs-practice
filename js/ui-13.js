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
  ['admDeckA', 'admDeckB'].forEach((id, k) => { const el = $(id), cur = el.value; el.innerHTML = names.map(n => '<option>' + esc(n) + '</option>').join(''); el.value = names.includes(cur) ? cur : (names[k] || names[0] || ''); });
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
$('admExp2').onclick = () => {
  const a = admDeckInfo('A', $('admDeckA').value), b = admDeckInfo('B', $('admDeckB').value);
  if (!a || !b) { toast('デッキを選んでください'); return; }
  admOut('デッキ情報(2人分)', 'bsp-decks-AB.json', JSON.stringify({ format: 'bsp-decks', version: 1, decks: [a, b] }, null, 1), 'application/json');
};
$('admExpAll').onclick = () => {
  const names = Object.keys(loadDecks()), arr = names.map(n => admDeckInfo('', n)).filter(Boolean);
  admOut('保存済みの全デッキ', 'bsp-decks-all.json', JSON.stringify({ format: 'bsp-decks', version: 1, decks: arr }, null, 1), 'application/json');
};
$('admCards').onclick = () => {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = ['id,name,color,cost,type'].concat(CARD_LIST.map(c => [c.raw.id, c.def.name, c.def.color, c.def.cost, c.def.type].map(q).join(',')));
  admOut('カード一覧(CSV)', 'bsp-cards.csv', '\ufeff' + rows.join('\n'), 'text/csv');
};
$('admEnd').onclick = () => setAdm(false);
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
