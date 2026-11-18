function heMenuShow(ev, it) { hePopOpen(ev.clientX, ev.clientY, it); }
function hePutFrom(side, c, hu) {
  const d = heDef(c), ops = []; if (hu) ops.push({ k: 'hdel', s: side, u: hu });
  if (d && d.type === 'magic') ops.push({ k: 'ttrash', s: side, c }); else ops.push({ k: 'put', s: side, c, u: heUid(), n: 0, show: HE.showNew ? 1 : 0, dur: HE.showDur });
  heGrp(ops);
}
function heDropDo(src, w) {
  if (w && w.z === 'open' && w.oc != null && src.type === 'pool') { const op = heOpOf(w.oid); if (op) heMod(op, x => { x.cards[w.oc] = src.c; }); return; }
  if (!w || w.s == null) return;
  const s = w.s, z = w.z;
  if (src.type === 'pool') {
    if (z === 'hand') heGrp([{ k: 'hadd', s, c: src.c, u: heUid() }]);
    else if (z === 'trash') heGrp([{ k: 'ttrash', s, c: src.c }]);
    else hePutFrom(s, src.c, null);
  } else if (src.type === 'hand') {
    if (z === 'hand') { if (s === src.s) return; heGrp([{ k: 'hdel', s: src.s, u: src.u }, { k: 'hadd', s, c: src.c, u: heUid() }]); }
    else if (z === 'trash') heGrp([{ k: 'hdel', s: src.s, u: src.u }, { k: 'ttrash', s, c: src.c }]);
    else { const d = heDef(src.c), ops = [{ k: 'hdel', s: src.s, u: src.u }]; if (d && d.type === 'magic') ops.push({ k: 'ttrash', s, c: src.c }); else ops.push({ k: 'put', s, c: src.c, u: heUid(), n: 0, show: HE.showNew ? 1 : 0, dur: HE.showDur }); heGrp(ops); }
  } else if (src.type === 'field') {
    if (z === 'hand') heGrp([{ k: 'rm', s: src.s, u: src.u, to: 'hand', hu: heUid() }]);
    else if (z === 'trash') heGrp([{ k: 'rm', s: src.s, u: src.u, to: 'trash', cr: 'ct' }]);
    else if (s !== src.s) { const d = heDef(src.c); heGrp([{ k: 'rm', s: src.s, u: src.u }, { k: 'put', s, c: src.c, u: heUid(), n: 0, show: HE.showNew ? 1 : 0, dur: HE.showDur }]); }
  }
}
function heGhost(on, x, y, url) {
  let g = document.querySelector('#hedit .heghost');
  if (!on) { if (g) g.remove(); return; }
  if (!g) { g = document.createElement('div'); g.className = 'heghost'; $('hedit').appendChild(g); }
  if (url) g.style.backgroundImage = 'url("' + url + '")'; g.style.left = x + 'px'; g.style.top = y + 'px';
}
function heDragStart(ev, src, url) {
  HE.drag = { src, url, x0: ev.clientX, y0: ev.clientY, on: false };
  const mv = e => { const d = HE.drag; if (!d) return; if (!d.on && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.on = true; if (d.on) heGhost(true, e.clientX, e.clientY, d.url); };
  const up = e => {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
    const d = HE.drag; HE.drag = null; heGhost(false); if (!d || !d.on) return;
    heDropDo(d.src, heWhat(e));
  };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
}
$('hePool').addEventListener('pointerdown', e => {
  const t = e.target.closest('.hetile'); if (!t) return; e.preventDefault();
  const c = t.dataset.cid; HE.pk = c; document.querySelectorAll('#hePool .hetile').forEach(x => x.classList.toggle('pk', x.dataset.cid === c));
  heDragStart(e, { type: 'pool', c }, artSm(c) || artOf(c));
});
$('heOv').addEventListener('pointerdown', e => {
  if (e.button !== 0) return; $('hePop').hidden = true;
  const w = heWhat(e); if (!w) return;
  const sc = heScene(HE.t);
  if (w.u) { const f = heSide(sc.S, w.u); if (f) { e.preventDefault(); heDragStart(e, { type: 'field', s: f.i, u: w.u, c: f.k.c }, artSm(f.k.c) || artOf(f.k.c)); } }
  else if (w.z === 'hand' && w.hu) { const c = (sc.S[w.s].hand.find(h => h.u === w.hu) || {}).c; if (c) { e.preventDefault(); heDragStart(e, { type: 'hand', s: w.s, u: w.hu, c }, artSm(c) || artOf(c)); } }
});
$('heOv').addEventListener('contextmenu', heCtx);
$('hePop').addEventListener('click', e => { const b = e.target.closest('button[data-mi]'); if (!b) return; const it = HE.menu[+b.dataset.mi]; $('hePop').hidden = true; if (it && it.fn) it.fn(); });
document.addEventListener('pointerdown', e => { if (!$('hePop').hidden && !e.target.closest('#hePop') && !e.target.closest('#heOv')) $('hePop').hidden = true; });
const heRow = o => ({ cshow: 2, hadd: 0, hdel: 0, put: 2, rm: 2, core: 2, tap: 2, mono: 2, open: 4, oact: 4, life: 4, res: 4, ct: 4, ttdel: 4, ttrash: 4, turn: 6 }[o.k]) + (o.k === 'turn' ? 0 : (o.s || 0)) + (o.k === 'mono' && o.h ? -2 : 0);
function heLab(o) {
  const sg = d => (d > 0 ? '+' : '') + d;
  switch (o.k) {
    case 'cshow': return '画像表示 ' + ((o.dur || 2000) / 1000) + 's'; case 'hadd': return '手札+'; case 'hdel': return '手札-'; case 'put': return '召喚' + (o.show ? ' 👁' + ((o.dur || 2000) / 1000) + 's' : '');
    case 'rm': return o.to === 'trash' ? '破壊' : o.to === 'hand' ? '手札へ' : o.to === 'deck' ? 'デッキ下' : '消滅';
    case 'core': return 'コア' + sg(o.d); case 'tap': return o.v === 0 ? '回復' : o.v === 1 ? '疲労' : '疲労/回復'; case 'mono': return 'モノクロ'; case 'life': return 'ライフ' + sg(o.d);
    case 'res': return 'リザーブ' + sg(o.d); case 'ct': return 'コアトラッシュ' + sg(o.d); case 'ttdel': return 'トラッシュ-'; case 'ttrash': return 'トラッシュ+';
    case 'open': return 'オープン' + o.n + '枚'; case 'oact': return { hand: '手札へ', deck: 'デッキ下', trash: 'トラッシュ', field: '盤面へ', none: 'そのまま' }[o.to] || o.to;
    case 'turn': return (o.step === 'start' ? o.no + 'T ' + (o.s ? 'B' : 'A') + ' ' : '') + (STEP_JP[o.step] || '表示なし');
  }
  return o.k;
}
function heTL() {
  const tin = $('heTin'), z = HE.zoom / 1000, last = HE.ops.reduce((m, o) => Math.max(m, o.t), 0), dur = Math.max(HE.dur, last + 4000);
  $('heDur').value = Math.round(dur / 1000); tin.style.width = (dur * z + 120) + 'px';
  let h = '<div class="herul" id="heRul">';
  const stp = HE.zoom >= 300 ? 100 : HE.zoom >= 120 ? 250 : HE.zoom >= 40 ? 1000 : 5000;
  for (let t = 0; t <= dur; t += stp) h += '<div class="hetick' + (t % 1000 ? ' f' : '') + '" style="left:' + t * z + 'px">' + (t % 1000 === 0 ? (t / 1000) + 's' : '') + '</div>';
  if (HE.inT != null || HE.outT != null) { const a = HE.inT != null ? HE.inT : 0, b = HE.outT != null ? HE.outT : dur; h += '<div class="heio" style="left:' + a * z + 'px;width:' + Math.max(2, (b - a) * z) + 'px"></div>'; }
  h += '</div>';
  for (let r = 0; r < 7; r++) h += '<div class="herow" style="top:' + (22 + r * 24) + 'px"></div>';
  h += '<div class="herow" style="top:190px;height:40px"></div><canvas id="heWav" style="position:absolute;left:0;top:190px;height:40px;pointer-events:none"></canvas>';
  const tops = HE.ops.filter(o => o.k === 'turn').sort((a, b) => a.t - b.t || a.id - b.id);
  HE.ops.forEach(o => { const bw = o.k === 'turn' ? Math.max(24, ((tops[tops.indexOf(o) + 1] || { t: dur }).t - o.t) * z - 2) : o.k === 'open' ? Math.max(40, (o.end - o.t) * z) : 0; h += '<div class="hemk k-' + o.k + (o.k === 'turn' ? ' st-' + o.step : '') + (HE.sel.has(o.g) ? ' sel' : '') + '" data-id="' + o.id + '" style="left:' + o.t * z + 'px;' + (bw ? 'width:' + bw + 'px;' : '') + 'top:' + (22 + heRow(o) * 24 + 2) + 'px" title="' + esc(heLab(o) + ' @' + heFmt(o.t)) + '">' + (heMkCard(o) && artSm(heMkCard(o)) ? '<img class="mkt" draggable="false" src="' + esc(artSm(heMkCard(o))) + '">' : '') + esc(heLab(o)) + (o.k === 'open' ? '<i class="herz"></i>' : '') + '</div>'; });
  h += '<div class="heph" id="hePh" style="left:' + HE.t * z + 'px"></div>';
  tin.innerHTML = h; heWaveDraw(); heAuto(); heSync();
}
function heMkCard(o) {
  if (o.c) return o.c; if (o.u) { const q = HE.ops.find(x => x.u === o.u && x.c); if (q) return q.c; }
  if (o.k === 'oact') { const op = HE.ops.find(x => x.k === 'open' && x.oid === o.og); if (op && op.cards && op.cards[o.i]) return op.cards[o.i]; } return null;
}
(function () {
  let hv = null;
  const hide = () => { if (hv) hv.style.display = 'none'; };
  document.addEventListener('mouseover', e => {
    const m = e.target.closest && e.target.closest('#heTin .hemk'); if (!m) { hide(); return; }
    const o = HE.ops.find(x => x.id === +m.dataset.id); const c = o && heMkCard(o); const u = c ? (artSm(c) || artOf(c)) : null; if (!u) { hide(); return; }
    if (!hv) { hv = document.createElement('div'); hv.style.cssText = 'position:fixed;z-index:2000;pointer-events:none;border:2px solid #ffe36e;border-radius:6px;background:#000;box-shadow:0 4px 18px #000a'; hv.innerHTML = '<img style="display:block;width:150px;border-radius:4px">'; document.body.appendChild(hv); }
    hv.firstChild.src = u; hv.style.display = 'block';
    const r = m.getBoundingClientRect(); hv.style.left = Math.max(4, Math.min(innerWidth - 120, r.left)) + 'px'; hv.style.top = Math.max(4, r.top - 215) + 'px';
  });
  document.addEventListener('mouseleave', hide, true); document.addEventListener('scroll', hide, true);
})();
function heWaveDraw() {
  const cv = $('heWav'); if (!cv) return; const id = heAudId(), v = HE.vids.find(x => x.id === id);
  const z = HE.zoom / 1000, W = Math.min(16000, Math.round($('heTin').clientWidth)); cv.width = W; cv.style.width = W + 'px'; cv.height = 40;
  if (!v || !v.wave) return; const c = cv.getContext('2d'); c.fillStyle = '#5fe3a1'; const pk = v.wave.pk;
  for (let x = 0; x < W; x++) { const t0 = x / z / 1000 + v.off, t1 = (x + 1) / z / 1000 + v.off; if (t1 < 0) continue; let m = 0; for (let i = Math.max(0, Math.floor(t0 * 100)); i <= Math.floor(t1 * 100) && i < pk.length; i++) if (pk[i] > m) m = pk[i]; const hh = Math.min(20, m * 20); if (hh > 0.3) c.fillRect(x, 20 - hh, 1, hh * 2); }
}
async function heWaveMake(v) {
  if (v.file.size > 400 * 1048576) { toast('動画が大きすぎて波形は作れません(400MBまで)'); return; }
  try {
    toast('波形を作っています…'); const ac = new (window.AudioContext || window.webkitAudioContext)(), buf = await ac.decodeAudioData(await v.file.arrayBuffer()), ch = buf.getChannelData(0), n = Math.ceil(buf.duration * 100), pk = new Float32Array(n), sp = Math.max(1, Math.floor(buf.sampleRate / 100));
    for (let i = 0; i < n; i++) { let m = 0; const e = Math.min(ch.length, (i + 1) * sp); for (let j = i * sp; j < e; j += 4) { const a = Math.abs(ch[j]); if (a > m) m = a; } pk[i] = m; }
    ac.close(); v.wave = { pk }; heWaveDraw(); toast('波形を表示しました');
  } catch (e) { toast('この動画の音声から波形を作れませんでした'); }
}
let heAutoT = 0;
function heAuto() { clearTimeout(heAutoT); heAutoT = setTimeout(() => { try { localStorage.setItem('bs-he-auto', JSON.stringify({ ops: HE.ops, nid: HE.nid, uid: HE.uid, dur: HE.dur, names: HE.names })); } catch (e) { } }, 600); }
function heSeek(ms) {
  HE.t = Math.max(0, Math.round(ms)); $('heTin2').value = (HE.t / 1000).toFixed(3); $('heTime').textContent = heFmt(HE.t) + '  F' + Math.round(HE.t * 30 / 1000);
  const ph = $('hePh'); if (ph) ph.style.left = HE.t * HE.zoom / 1000 + 'px'; heStLab();
  heSync(); heVsync(true);
}
function hePlay(on) {
  if (on === HE.playing) return; HE.playing = on; $('hePlay').textContent = on ? '⏸ 停止' : '▶ 再生'; $('hePlay').classList.toggle('on', on);
  if (on) {
    HE.t0 = performance.now(); HE.tb = HE.t; heVsync(true);
    const loop = () => {
      if (!HE.playing) return;
      let t = HE.tb + (performance.now() - HE.t0) * HE.rate;
      const lo = HE.inT != null ? HE.inT : 0, hi = HE.outT != null ? HE.outT : HE.ops.reduce((m, o) => Math.max(m, o.t), 0) + 1000;
      if (HE.loop && t >= hi) { HE.tb = lo; HE.t0 = performance.now(); t = lo; heSeek(t); heVsync(true); }
      else heSeek(t);
      const sc = $('heTs'), x = HE.t * HE.zoom / 1000; if (x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = x - 60;
      HE.raf = requestAnimationFrame(loop);
    };
    HE.raf = requestAnimationFrame(loop);
  } else { cancelAnimationFrame(HE.raf); heVsync(true); }
}
function heVsync(force) {
  HE.vids.forEach(v => {
    const tg = HE.t / 1000 + v.off, el = v.el; el.muted = !(heAudId() === v.id) || !HE.playing; el.playbackRate = HE.rate;
    if (tg < 0) { if (!el.paused) el.pause(); if (force && Math.abs(el.currentTime) > 0.03) el.currentTime = 0; return; }
    if (HE.playing) { if (el.paused) { el.currentTime = tg; el.play().catch(() => { }); } else if (Math.abs(el.currentTime - tg) > 0.3) el.currentTime = tg; }
    else { if (!el.paused) el.pause(); if (force && Math.abs(el.currentTime - tg) > 0.02) el.currentTime = tg; }
  });
}
function heAudId() { const v = $('heAud').value; if (v === 'last') return HE.vids.length ? HE.vids[HE.vids.length - 1].id : null; return v === 'none' ? null : +v; }
function heAudFill() {
  ['heAud', 'heAud2'].forEach(id => { const el = $(id), cur = el.value || 'last'; el.innerHTML = '<option value="last">最後に入れた動画</option><option value="none">なし</option>' + HE.vids.map(v => '<option value="' + v.id + '">' + esc(v.name.slice(0, 24)) + '</option>').join(''); el.value = [...el.options].some(o => o.value === cur) ? cur : 'last'; });
  $('heVidBar').innerHTML = HE.vids.map(v => '<button data-vid="' + v.id + '" class="' + (v.win.hidden ? '' : 'on') + '">参考:' + esc(v.name.slice(0, 10)) + '</button>').join('');
}
function heVidAdd(f) {
  const id = HE.vids.length ? HE.vids[HE.vids.length - 1].id + 1 : 1, n = HE.vids.length;
  const win = document.createElement('div'); win.className = 'hewin'; win.style.left = (240 + n * 28) + 'px'; win.style.top = (110 + n * 28) + 'px'; win.style.width = '400px'; win.style.height = '270px';
  win.innerHTML = '<div class="wh"><span>' + esc(f.name) + '</span><label title="動画の時刻 = 編集の時刻 + この値">ずれ(秒)<input type="number" step="0.001" value="0"></label><button data-a="wave" title="音声の波形をタイムラインに出します(動画は400MBまで)">波形</button><button data-a="sync" title="この動画をいまの位置で止めてから押すと、編集の現在時刻にここを合わせます">いまに合わせる</button><button data-a="hide">×</button></div><video controls playsinline preload="auto"></video>';
  const el = win.querySelector('video'); el.src = URL.createObjectURL(f); el.muted = true;
  const v = { id, name: f.name, el, win, off: 0, file: f, wave: null }; HE.vids.push(v); $('heWins').appendChild(win);
  const inp = win.querySelector('input'); inp.onchange = () => { v.off = parseFloat(inp.value) || 0; heVsync(true); heWaveDraw(); };
  win.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b) return; if (b.dataset.a === 'hide') { win.hidden = true; heAudFill(); } else if (b.dataset.a === 'wave') { heWaveMake(v); } else { v.off = el.currentTime - HE.t / 1000; inp.value = v.off.toFixed(3); heWaveDraw(); } });
  const hd = win.querySelector('.wh');
  hd.addEventListener('pointerdown', e => { if (e.target.closest('input,button,label')) return; const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; const mv = q => { win.style.left = Math.max(0, q.clientX - dx) + 'px'; win.style.top = Math.max(0, q.clientY - dy) + 'px'; }; const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); }; document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); });
  heAudFill(); $('heAud').value = 'last'; $('heAud2').value = 'last';
}
$('heTile').onclick = () => { const ws = HE.vids.filter(v => !v.win.hidden); if (!ws.length) { toast('参考動画を追加してください'); return; } const w = Math.min(420, Math.floor((innerWidth - 40) / ws.length) - 8), h = Math.round(w * 0.62) + 28; ws.forEach((v, i) => { v.win.style.width = w + 'px'; v.win.style.height = h + 'px'; v.win.style.left = (20 + i * (w + 8)) + 'px'; v.win.style.top = (innerHeight - h - 20) + 'px'; }); };
$('heVidIn').onchange = e => { [...e.target.files].forEach(heVidAdd); e.target.value = ''; };
$('heVidBar').onclick = e => { const b = e.target.closest('button[data-vid]'); if (!b) return; const v = HE.vids.find(x => x.id === +b.dataset.vid); if (!v) return; v.win.hidden = !v.win.hidden; heAudFill(); };
function heOpen() {
  if (!admPC()) return; $('hedit').hidden = false; hePdFill(); hePool(); if (!HE.ops.length) { try { const a = JSON.parse(localStorage.getItem('bs-he-auto') || 'null'); if (a && a.ops && a.ops.length) { HE.ops = a.ops; HE.nid = a.nid || 1; HE.uid = a.uid || 1; HE.dur = a.dur || 20000; HE.names = a.names || ['A', 'B']; toast('前回の編集を復元しました'); } } catch (e) { } } heTL(); $('heStS').innerHTML = STEPS.map(s => '<option value="' + s + '">' + STEP_JP[s] + '</option>').join(''); $('heStS').value = 'main'; heStLab(); heAudFill();
  requestAnimationFrame(async () => { heFit(); await heSrcLoad(); heFit(); heSync(true); heSeek(HE.t); });
}
function heClose() { hePlay(false); $('hedit').hidden = true; $('hePop').hidden = true; HE.vids.forEach(v => { v.el.pause(); v.win.hidden = true; }); heAudFill(); }
$('heOpen').onclick = heOpen; $('heClose').onclick = heClose;
window.addEventListener('resize', () => { if (!$('hedit').hidden) heFit(); });
$('hePoolT').onclick = () => { $('hedit').classList.toggle('nopool'); setTimeout(heFit, 30); };
$('hePdA').onchange = $('hePdB').onchange = hePool; $('heQ').oninput = hePool;
$('hePlay').onclick = () => hePlay(!HE.playing);
$('heTo0').onclick = () => { hePlay(false); heSeek(0); };
$('hePrev').onclick = () => { hePlay(false); heSeek(HE.t - 33); };
$('heNext').onclick = () => { hePlay(false); heSeek(HE.t + 33); };
$('heM100').onclick = () => { hePlay(false); heSeek(HE.t - 100); };
$('heP100').onclick = () => { hePlay(false); heSeek(HE.t + 100); };
$('heTin2').onchange = () => { hePlay(false); heSeek((parseFloat($('heTin2').value) || 0) * 1000); };
$('heDur').onchange = () => { HE.dur = Math.max(1000, (parseFloat($('heDur').value) || 20) * 1000); heTL(); };
$('heZoom').oninput = () => { HE.zoom = +$('heZoom').value; heTL(); };
$('heUndo').onclick = heUndo;
$('hePv').onclick = () => heJump(-1); $('heNx').onclick = () => heJump(1);
$('heIn').onclick = () => { HE.inT = HE.t; heTL(); }; $('heOut2').onclick = () => { HE.outT = HE.t; heTL(); }; $('heRc').onclick = () => { HE.inT = HE.outT = null; heTL(); };
$('heLoop').onchange = () => { HE.loop = $('heLoop').checked; }; $('heSnapC').onchange = () => { HE.snap = $('heSnapC').checked; };
$('heSpd').onchange = () => { HE.rate = +$('heSpd').value; if (HE.playing) { HE.tb = HE.t; HE.t0 = performance.now(); } heVsync(true); };
$('heCp').onclick = heCopy; $('hePs').onclick = hePaste; $('heDl2').onclick = heDelSel;
$('heHelpB').onclick = e => heHelp(e.clientX, e.clientY - 260);
$('heFit2').onclick = () => { const dur = Math.max(HE.dur, HE.ops.reduce((m, o) => Math.max(m, o.t), 0) + 4000); HE.zoom = Math.max(20, Math.min(600, ($('heTs').clientWidth - 140) / dur * 1000)); $('heZoom').value = HE.zoom; heTL(); };
{ let nt = 0; $('heNew').onclick = () => { if (!nt) { $('heNew').textContent = '本当に消す?'; nt = setTimeout(() => { nt = 0; $('heNew').textContent = '新規'; }, 3000); return; } clearTimeout(nt); nt = 0; $('heNew').textContent = '新規'; heSnap(); HE.ops = []; HE.sel = new Set(); HE.inT = HE.outT = null; heTL(); heSync(true); }; }
$('heStN').onclick = () => heStepAdd(); $('heStA').onclick = () => { const l = heLastTurn(HE.t) || { s: 0, no: 1 }; heStepAdd({ s: l.s, no: l.no, step: $('heStS').value }); };
$('heShowNew').onchange = () => { HE.showNew = $('heShowNew').checked; };
$('heShowDur').onchange = () => { HE.showDur = Math.max(100, Math.round((parseFloat($('heShowDur').value) || 2) * 1000)); };
function heSnapT(t, skip) {
  if (!HE.snap) return t;
  const th = 8 / HE.zoom * 1000; let best = t, bd = th;
  const c = [0, HE.t]; if (HE.inT != null) c.push(HE.inT); if (HE.outT != null) c.push(HE.outT);
  HE.ops.forEach(o => { if (!skip.has(o.g)) c.push(o.t); });
  c.forEach(x => { const d = Math.abs(x - t); if (d < bd) { bd = d; best = x; } });
  return best;
}
$('heTs').addEventListener('pointerdown', e => {
  const m = e.target.closest('.hemk');
  if (m && e.target.closest('.herz')) {
    e.preventDefault(); const o = HE.ops.find(x => x.id === +m.dataset.id); if (!o) return; heSnap(); const r = $('heTin').getBoundingClientRect();
    const mv = q => { o.end = Math.max(o.t + 100, Math.round(heSnapT((q.clientX - r.left) / HE.zoom * 1000, new Set([o.g])))); heTL(); }, up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); heSync(true); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); return;
  }
  if (m) {
    e.preventDefault(); const o = HE.ops.find(x => x.id === +m.dataset.id); if (!o) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) { if (HE.sel.has(o.g)) HE.sel.delete(o.g); else HE.sel.add(o.g); heTL(); return; }
    if (!HE.sel.has(o.g)) HE.sel = new Set([o.g]); heTL();
    const sel = HE.sel, grp = HE.ops.filter(x => sel.has(x.g)), orig = grp.map(x => x.t), x0 = e.clientX; let moved = false;
    const mv = q => {
      if (!moved && Math.abs(q.clientX - x0) < 3) return; if (!moved) { heSnap(); moved = true; }
      let dt = Math.round((q.clientX - x0) / HE.zoom * 1000); const st = heSnapT(orig[grp.indexOf(o)] + dt, sel); dt = st - orig[grp.indexOf(o)];
      const mn = Math.min(...orig); if (mn + dt < 0) dt = -mn; grp.forEach((x, i) => { x.t = orig[i] + dt; }); heTL();
    };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (moved) heSync(); else heSeek(o.t); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); return;
  }
  const rul = e.target.closest('#heRul'); if (rul) {
    hePlay(false); const r = $('heTin').getBoundingClientRect(); const at = q => heSeek(heSnapT((q.clientX - r.left) / HE.zoom * 1000, new Set()));
    at(e);
    const mv = q => at(q), up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); return;
  }
  if (!e.shiftKey && !e.ctrlKey) { HE.sel = new Set(); heTL(); }
});
$('heTs').addEventListener('wheel', e => {
  if (!e.ctrlKey && !e.metaKey) return; e.preventDefault();
  const sc = $('heTs'), r = sc.getBoundingClientRect(), tAt = (sc.scrollLeft + e.clientX - r.left) / HE.zoom * 1000;
  HE.zoom = Math.max(20, Math.min(600, HE.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); $('heZoom').value = HE.zoom; heTL(); sc.scrollLeft = tAt * HE.zoom / 1000 - (e.clientX - r.left);
}, { passive: false });
function heMod(o, fn) { heSnap(); fn(o); heTL(); heSync(true); }
function heSelOps() { return HE.ops.filter(o => HE.sel.has(o.g)); }
function heDelSel() { if (!HE.sel.size) return; heSnap(); HE.ops = HE.ops.filter(o => !HE.sel.has(o.g)); HE.sel = new Set(); heTL(); heSync(); }
function heCopy() { const l = heSelOps(); if (!l.length) return; const t0 = Math.min(...l.map(o => o.t)); HE.clip = l.map(o => Object.assign({}, o, { t: o.t - t0 })); toast(new Set(l.map(o => o.g)).size + '個をコピーしました'); }
function hePaste() {
  if (!HE.clip || !HE.clip.length) return; heSnap(); const gm = new Map(), um = new Map(), ns = new Set();
  HE.clip.forEach(o => { if ((o.k === 'put' || o.k === 'hadd') && !um.has(o.u)) um.set(o.u, heUid()); if (o.k === 'open' && !um.has(o.oid)) um.set(o.oid, heUid()); });
  HE.clip.forEach(o => { if (!gm.has(o.g)) { gm.set(o.g, HE.nid++); ns.add(gm.get(o.g)); } const n = Object.assign({}, o, { t: HE.t + o.t, g: gm.get(o.g), id: HE.nid++ }); if (n.u && um.has(n.u)) n.u = um.get(n.u); if (n.hu && um.has(n.hu)) n.hu = um.get(n.hu); if (n.oid && um.has(n.oid)) n.oid = um.get(n.oid); if (n.og && um.has(n.og)) n.og = um.get(n.og); if (n.k === 'open') { n.end = n.end - o.t + n.t; n.cards = n.cards.slice(); n.mo = n.mo.slice(); } HE.ops.push(n); });
  HE.sel = ns; heTL(); heSync();
}
function heJump(dir) {
  const ts = [...new Set(HE.ops.map(o => o.t))].sort((a, b) => a - b), t = HE.t;
  const n = dir > 0 ? ts.find(x => x > t) : [...ts].reverse().find(x => x < t); if (n != null) { hePlay(false); heSeek(n); const sc = $('heTs'), x = n * HE.zoom / 1000; if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = Math.max(0, x - 80); }
}
function heShift(from, d) { heSnap(); HE.ops.forEach(o => { if (o.t >= from) o.t = Math.max(0, o.t + d); }); heTL(); heSync(); }
function heHelp(x, y) {
  hePopOpen(x, y, [{ t: '操作一覧' }, { t: 'Space 再生/停止 ・ ←→ コマ送り(Shiftで1秒)' }, { t: '↑↓ 前/次の印へ ・ J 1秒戻る ・ K 停止 ・ L 再生' }, { t: 'I / O 範囲の開始/終了(書き出し・ループ)' }, { t: 'Ctrl+C/V 印のコピー/貼り付け(再生位置へ)' }, { t: 'Shift/Ctrl+クリック 複数選択 ・ Ctrl+A 全選択' }, { t: 'Delete 削除 ・ Ctrl+Z 元に戻す' }, { t: 'Ctrl+ホイール 拡大縮小 ・ 目盛りを右クリックで「以降をずらす」' }, { t: '右クリック: 盤面・手札・ゾーン・タイムラインの印' }]);
}
