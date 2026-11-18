$('heTs').addEventListener('contextmenu', e => {
  const m = e.target.closest('.hemk'), rul = e.target.closest('#heRul');
  if (rul) {
    e.preventDefault(); const r = $('heTin').getBoundingClientRect(), T = Math.max(0, Math.round((e.clientX - r.left) / HE.zoom * 1000));
    hePopOpen(e.clientX, e.clientY, [{ t: heFmt(T) + ' の位置' }, { l: 'ここを範囲の開始(I)にする', fn: () => { HE.inT = T; heTL(); } }, { l: 'ここを範囲の終了(O)にする', fn: () => { HE.outT = T; heTL(); } }, { l: '範囲をクリア', fn: () => { HE.inT = HE.outT = null; heTL(); } }, { t: 'ここ以降の印をずらす' }, ...[[100, '+0.1秒'], [500, '+0.5秒'], [1000, '+1秒'], [-100, '-0.1秒'], [-500, '-0.5秒'], [-1000, '-1秒']].map(a => ({ l: a[1], fn: () => heShift(T, a[0]) }))]);
    return;
  }
  if (!m) {
    if (!e.target.closest('#heTin')) return; e.preventDefault(); const r = $('heTin').getBoundingClientRect(), T = Math.max(0, Math.round((e.clientX - r.left) / HE.zoom * 1000));
    hePopOpen(e.clientX, e.clientY, [{ t: heFmt(T) + ' の位置' }, { l: 'カード画像を表示(配信モードのように相手盤面へ)…', fn: () => heCardPick(T) }]); return;
  }
  const o = HE.ops.find(x => x.id === +m.dataset.id); if (!o) return;
  if (!HE.sel.has(o.g)) { HE.sel = new Set([o.g]); heTL(); }
  const it = [{ t: heLab(o) + ' ' + heFmt(o.t) }, { l: '削除', fn: () => heDelSel() }, { l: 'コピー', fn: heCopy }, { l: 'ここに再生位置を合わせる', fn: () => heSeek(o.t) }, { l: '時刻を数字で入力…', fn: () => { const v = prompt('時刻(秒)', (o.t / 1000).toFixed(3)); if (v == null) return; const n = Math.round(parseFloat(v) * 1000); if (isNaN(n) || n < 0) return; heSnap(); const d = n - o.t; heSelOps().forEach(x => { x.t = Math.max(0, x.t + d); }); heTL(); heSync(); } }];
  if (o.k === 'put') it.push({ t: '相手側へのカード画像' }, { l: o.show ? '表示しない' : '表示する', fn: () => heMod(o, x => { x.show = x.show ? 0 : 1; }) }, ...[0.5, 1, 2, 3, 5].map(n => ({ l: '表示時間 ' + n + '秒', fn: () => heMod(o, x => { x.show = 1; x.dur = n * 1000; }) })), { l: '表示時間 +0.5秒', fn: () => heMod(o, x => { x.show = 1; x.dur = (x.dur || 2000) + 500; }) }, { l: '表示時間 -0.5秒', fn: () => heMod(o, x => { x.show = 1; x.dur = Math.max(100, (x.dur || 2000) - 500); }) });
  { const mc = o.k !== 'cshow' ? heMkCard(o) : null; if (mc) { let sd = o.s; if (sd == null) { const f = o.u ? heSide(heScene(o.t, true).S, o.u) : null; sd = f ? f.i : 0; } const mk = t => heGrp([{ k: 'cshow', s: sd, c: mc, dur: HE.showDur || 2000 }], t);
    it.push({ t: 'このカードの画像を表示(情報を引き継ぐ)' }, { l: 'この時刻に表示', fn: () => mk(o.t) }, { l: '再生位置に表示', fn: () => mk(HE.t) }); } }
  if (o.k === 'cshow') it.push({ t: 'カード画像の表示時間' }, ...[0.5, 1, 2, 3, 5, 8].map(n => ({ l: n + '秒' + ((o.dur || 2000) === n * 1000 ? ' ✓' : ''), fn: () => heMod(o, x => { x.dur = n * 1000; }) })), { l: '+0.5秒', fn: () => heMod(o, x => { x.dur = (x.dur || 2000) + 500; }) }, { l: '-0.5秒', fn: () => heMod(o, x => { x.dur = Math.max(300, (x.dur || 2000) - 500); }) }, { l: o.s ? '出す側をAにする' : '出す側をBにする', fn: () => heMod(o, x => { x.s = x.s ? 0 : 1; }) }, { l: 'カードを変える…', fn: () => heCardPick(o.t, o) });
  hePopOpen(e.clientX, e.clientY, it);
});
function heCardPick(T, edit) {
  let box = $('heCS'); if (box) box.remove();
  box = document.createElement('div'); box.id = 'heCS'; box.style.cssText = 'position:fixed;inset:0;z-index:3000;background:#000a;display:flex;align-items:center;justify-content:center';
  const sc = heScene(T, true), seen = new Set(), ids = [];
  const add = c => { if (c && !seen.has(c)) { seen.add(c); ids.push(c); } };
  sc.S.forEach(q => { q.field.forEach(f => add(f.c)); q.hand.forEach(h => add(h.c)); q.trash.forEach(c => add(c)); });
  const all = loadDecks(); ['A', 'B'].forEach(x => { const d = all[$('hePd' + x).value]; if (d) (d.cards || []).forEach(([id]) => add(id)); });
  let side = edit ? (edit.s || 0) : 0, dur = edit ? (edit.dur || 2000) : (HE.showDur || 2000);
  box.innerHTML = '<div style="background:#141c3c;border:1px solid #5a7ad8;border-radius:10px;padding:12px;width:min(760px,94vw);max-height:86vh;display:flex;flex-direction:column;gap:8px;color:#dfe8ff"><b>' + heFmt(T) + ' にカード画像を表示</b><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><label>出す側 <select id="heCSs"><option value="0">A側のカード(Bの盤面に表示)</option><option value="1">B側のカード(Aの盤面に表示)</option></select></label><label>表示秒 <input id="heCSd" type="number" step="0.5" min="0.3" value="' + dur / 1000 + '" style="width:70px"></label><input id="heCSq" placeholder="カード名で検索" style="flex:1;min-width:140px"><button id="heCSx">閉じる</button></div><div id="heCSg" style="overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px"></div></div>';
  document.body.appendChild(box); $('heCSs').value = side;
  const draw = () => {
    const q = $('heCSq').value.trim(), list = q ? CARD_LIST.filter(c => c.def.name.includes(q)).slice(0, 60).map(c => c.raw.id) : ids;
    $('heCSg').innerHTML = list.map(id => '<div data-c="' + esc(id) + '" style="cursor:pointer;font-size:10px;text-align:center"><img draggable="false" src="' + esc(artSm(id) || artOf(id) || '') + '" style="width:100%;border-radius:4px;display:block">' + esc(heNm(id).slice(0, 10)) + '</div>').join('') || '<div>見つかりません</div>';
  };
  draw(); $('heCSq').oninput = draw; $('heCSx').onclick = () => box.remove();
  box.onclick = e => { if (e.target === box) box.remove(); };
  $('heCSg').onclick = e => {
    const t = e.target.closest('[data-c]'); if (!t) return; const c = t.dataset.c, sd = +$('heCSs').value, du = Math.max(300, Math.round((parseFloat($('heCSd').value) || 2) * 1000));
    box.remove(); if (edit) heMod(edit, x => { x.c = c; x.s = sd; x.dur = du; }); else heGrp([{ k: 'cshow', s: sd, c, dur: du }], T);
  };
}
document.addEventListener('keydown', e => {
  if ($('hedit').hidden || e.target.closest('input,select,textarea')) return;
  const k = e.key, c = e.ctrlKey || e.metaKey;
  if (k === ' ') { e.preventDefault(); hePlay(!HE.playing); }
  else if (k === 'ArrowLeft') { e.preventDefault(); hePlay(false); heSeek(HE.t - (e.shiftKey ? 1000 : 33)); }
  else if (k === 'ArrowRight') { e.preventDefault(); hePlay(false); heSeek(HE.t + (e.shiftKey ? 1000 : 33)); }
  else if (k === 'ArrowUp') { e.preventDefault(); heJump(-1); }
  else if (k === 'ArrowDown') { e.preventDefault(); heJump(1); }
  else if (k === 'Home') { e.preventDefault(); hePlay(false); heSeek(0); }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); heDelSel(); }
  else if (c && k.toLowerCase() === 'z') { e.preventDefault(); heUndo(); }
  else if (c && k.toLowerCase() === 'c') { e.preventDefault(); heCopy(); }
  else if (c && k.toLowerCase() === 'v') { e.preventDefault(); hePaste(); }
  else if (c && k.toLowerCase() === 'a') { e.preventDefault(); HE.sel = new Set(HE.ops.map(o => o.g)); heTL(); }
  else if (!c && k.toLowerCase() === 'j') { hePlay(false); heSeek(HE.t - 1000); }
  else if (!c && k.toLowerCase() === 'k') hePlay(false);
  else if (!c && k.toLowerCase() === 'l') hePlay(true);
  else if (!c && k.toLowerCase() === 'i') { HE.inT = HE.t; heTL(); }
  else if (!c && k.toLowerCase() === 'o') { HE.outT = HE.t; heTL(); }
  else if (k === 'n' || k === 'N' || k === 'Enter') { e.preventDefault(); heStepAdd(); }
  else if (k === '?') heHelp(innerWidth / 2 - 150, 120);
});
$('heSave').onclick = () => {
  const o = { format: 'bsp-edit2', ops: HE.ops, nid: HE.nid, uid: HE.uid, dur: HE.dur, names: HE.names, off: HE.vids.map(v => [v.name, v.off]) };
  heDl(new Blob([JSON.stringify(o)], { type: 'application/json' }), 'bsp-edit.json');
};
$('heLoad').onchange = e => {
  const f = e.target.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { try { const o = JSON.parse(r.result); if (o.format !== 'bsp-edit2') throw 0; heSnap(); HE.ops = o.ops || []; HE.nid = o.nid || 1; HE.uid = o.uid || 1; HE.dur = o.dur || 20000; HE.names = o.names || ['A', 'B']; HE.sel = new Set(); heTL(); heSync(true); toast('プロジェクトを開きました'); } catch (er) { toast('このファイルは開けませんでした'); } };
  r.readAsText(f); e.target.value = '';
};
function heDl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
const heIc = new Map();
async function heData(u) {
  if (heIc.has(u)) return heIc.get(u);
  let r = u; try { const b = await (await fetch(u)).blob(); r = await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }); } catch (e) { }
  if (heIc.size > 400) heIc.clear(); heIc.set(u, r); return r;
}
async function heRaster(scale) {
  const d = $('heFr').contentDocument, cl = d.documentElement.cloneNode(true);
  cl.querySelectorAll('script,iframe,video,audio,link,#hedit,#bcbar,#connbar,#side').forEach(n => n.remove()); cl.querySelectorAll('.hehl').forEach(n => n.classList.remove('hehl'));
  const all = [...cl.querySelectorAll('*')];
  for (const el of all) {
    const st = el.getAttribute && el.getAttribute('style');
    if (st && st.indexOf('url(') >= 0) { let ns = st; for (const m of [...st.matchAll(/url\(["']?([^"')]+)["']?\)/g)]) { if (m[1].startsWith('data:')) continue; ns = ns.split(m[1]).join(await heData(m[1])); } el.setAttribute('style', ns); }
    if (el.tagName === 'IMG') { const u = el.getAttribute('src'); if (u && !u.startsWith('data:')) el.setAttribute('src', await heData(u)); }
  }
  const css = d.createElement('style'); css.textContent = '*{animation-duration:.001s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important}'; cl.querySelector('body').appendChild(css);
  const xml = new XMLSerializer().serializeToString(cl), W = 1920 * scale, H = 1080 * scale;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 1920 1080"><foreignObject width="1920" height="1080">' + xml + '</foreignObject></svg>';
  const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(img, 0, 0); return cv;
}
async function heRasterOv(sc, scale) {
  if (!(sc.shows && sc.shows.length) && !(sc.ov && sc.ov.opens && sc.ov.opens.length)) return null;
  const w = $('heFr').contentWindow; try { w.heOnly(true); return await heRaster(scale); } catch (e) { return null; } finally { try { w.heOnly(false); } catch (e) { } }
}
function heRects() {
  const d = $('heFr').contentDocument, g = s => { const e = d.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)), w: Math.round(Math.min(r.width, 1920 - Math.max(0, r.left))), h: Math.round(Math.min(r.height, 1080 - Math.max(0, r.top))) }; };
  return { A: g('#hand'), B: g('#oppHand'), C: g('#mat'), all: { x: 0, y: 0, w: 1920, h: 1080 } };
}
async function heExport() {
  if (HE.busyExp) return; HE.busyExp = true; hePlay(false);
  const prog = $('heProg'), fmt = $('heFmt').value, mode = $('heOut').value;
  const t0 = Math.round((parseFloat($('heR0').value) || 0) * 1000), t1 = Math.round((parseFloat($('heR1').value) || 0) * 1000);
  try {
    if (t1 <= t0) throw new Error('範囲が正しくありません');
    if (!HE.lay.reg) heLayDef();
    const sc = mode === 'compose' ? (HE.lay.w >= 3840 ? 2 : 1) : +$('heSc').value;
    const times = [...new Set([t0, ...HE.ops.flatMap(o => (o.k === 'put' && o.show) || o.k === 'cshow' ? [o.t, o.t + (o.dur || 2000)] : o.k === 'open' ? [o.t, o.end] : o.k === 'oact' ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => o.t + i * 66) : [o.t]).filter(t => t > t0 && t < t1)])].sort((a, b) => a - b);
    const outs = mode === 'three' ? ['A', 'B', 'C'] : [mode];
    const nm = { A: 'handA', B: 'handB', C: 'board', all: 'all', compose: 'youtube' };
    const frames = []; let rects = null;
    for (let i = 0; i < times.length; i++) {
      prog.textContent = '画面を作っています ' + (i + 1) + '/' + times.length;
      const s = heScene(times[i], true); await $('heFr').contentWindow.heDraw(s);
      if (!rects) rects = heRects();
      frames.push({ t: times[i], cv: await heRaster(sc), ov: (mode === 'compose' && HE.lay.fsrc === 'ref') ? await heRasterOv(s, sc) : null });
    }
    const end = t1, crop = (cv, k) => { const r = rects[k], c = document.createElement('canvas'); c.width = r.w * sc; c.height = r.h * sc; c.getContext('2d').drawImage(cv, r.x * sc, r.y * sc, r.w * sc, r.h * sc, 0, 0, c.width, c.height); return c; };
    const mk = (k, f) => { if (k === 'all') return f.cv; if (k === 'compose') { const c = document.createElement('canvas'); c.width = HE.lay.w; c.height = HE.lay.h; heCompose(c.getContext('2d'), c.width, c.height, f.cv, sc, rects, null); return c; } return crop(f.cv, k); };
    if (fmt === 'zip') {
      for (const k of outs) {
        const files = [], enc = new TextEncoder(); let list = 'ffconcat version 1.0\n';
        for (let i = 0; i < frames.length; i++) {
          const c = mk(k, frames[i]), blob = await new Promise(r => c.toBlob(r, 'image/png')), nmf = 'f' + String(i).padStart(4, '0') + '.png';
          files.push({ name: nmf, data: new Uint8Array(await blob.arrayBuffer()) });
          const dur = ((i + 1 < frames.length ? frames[i + 1].t : end) - frames[i].t) / 1000; list += "file '" + nmf + "'\nduration " + dur.toFixed(3) + '\n';
        }
        list += "file 'f" + String(frames.length - 1).padStart(4, '0') + ".png'\n";
        files.push({ name: 'list.txt', data: enc.encode(list) }, { name: 'README.txt', data: enc.encode('ffmpeg -f concat -safe 0 -i list.txt -vsync vfr -pix_fmt yuv420p out.mp4\n' + (k === 'compose' && HE.lay.fsrc === 'ref' ? '参考Fの動画の部分は、PNG連番には入りません(WebM書き出しで入ります)。\n' : '')) });
        heDl(heZip(files), 'bsp-' + nm[k] + '.zip'); await heSleep(300);
      }
      prog.textContent = '書き出しました'; HE.busyExp = false; heSync(true); return;
    }
    const fvv = mode === 'compose' ? heFVid() : null;
    const rec = outs.map(k => { const cv = k === 'all' ? document.createElement('canvas') : k === 'compose' ? document.createElement('canvas') : crop(frames[0].cv, k); if (k === 'all') { cv.width = 1920 * sc; cv.height = 1080 * sc; } if (k === 'compose') { cv.width = HE.lay.w; cv.height = HE.lay.h; } return { k, cv, ctx: cv.getContext('2d') }; });
    const aid = $('heAud2').value === 'last' ? (HE.vids.length ? HE.vids[HE.vids.length - 1].id : null) : $('heAud2').value === 'none' ? null : +$('heAud2').value, av = aid != null ? HE.vids.find(v => v.id === aid) : null;
    let ac = null, adest = null;
    if (av) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); adest = ac.createMediaStreamDestination(); if (!av.src) av.src = ac.createMediaElementSource(av.el); av.src.connect(adest); } catch (e) { ac = null; } }
    const draw = (r, t) => { let f = frames[0]; for (const x of frames) if (x.t <= t) f = x; const k = r.k; if (k === 'all') r.ctx.drawImage(f.cv, 0, 0); else if (k === 'compose') heCompose(r.ctx, r.cv.width, r.cv.height, f.cv, sc, rects, fvv && fvv.el.readyState >= 2 ? fvv.el : null, f.ov); else { const q = rects[k]; r.ctx.drawImage(f.cv, q.x * sc, q.y * sc, q.w * sc, q.h * sc, 0, 0, r.cv.width, r.cv.height); } };
    const mimes = ['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'], mt = mimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
    rec.forEach(r => { draw(r, t0); const st = r.cv.captureStream(30); if (adest) adest.stream.getAudioTracks().forEach(tr => st.addTrack(tr)); r.mr = new MediaRecorder(st, mt ? { mimeType: mt, videoBitsPerSecond: Math.min(60000000, Math.round(r.cv.width * r.cv.height * 30 * 0.3)) } : {}); r.ch = []; r.mr.ondataavailable = e => { if (e.data.size) r.ch.push(e.data); }; r.done = new Promise(res => { r.mr.onstop = res; }); });
    const vs = [av, fvv].filter((v, i, a) => v && a.indexOf(v) === i).map(v => ({ v, started: false }));
    for (const q of vs) { q.v.el.muted = q.v !== av; const tg = t0 / 1000 + q.v.off; if (tg >= 0) q.v.el.currentTime = tg; }
    if (vs.length) await heSleep(300);
    rec.forEach(r => r.mr.start(100)); const T0 = performance.now();
    await new Promise(res => {
      const loop = () => {
        const t = t0 + (performance.now() - T0);
        vs.forEach(q => { if (q.started) return; const tg = t / 1000 + q.v.off; if (tg >= 0) { q.started = true; if (Math.abs(q.v.el.currentTime - tg) > 0.05) q.v.el.currentTime = tg; q.v.el.play().catch(() => { }); } });
        rec.forEach(r => draw(r, Math.min(t, end))); prog.textContent = '録画中 ' + heFmt(Math.min(t, end)) + ' / ' + heFmt(end);
        if (t >= end) { res(); return; } requestAnimationFrame(loop);
      }; loop();
    });
    rec.forEach(r => r.mr.stop()); await Promise.all(rec.map(r => r.done));
    vs.forEach(q => q.v.el.pause()); if (av) { try { av.src.disconnect(); av.src.connect(ac.destination); } catch (e) { } }
    for (const r of rec) { const mp = /mp4/.test(mt); heDl(new Blob(r.ch, { type: mp ? 'video/mp4' : 'video/webm' }), 'bsp-' + nm[r.k] + (mp ? '.mp4' : '.webm')); await heSleep(300); }
    prog.textContent = '書き出しました' + (av ? '(音声あり)' : '');
  } catch (e) { prog.textContent = '書き出しに失敗しました: ' + (e && e.message ? e.message : ''); }
  HE.busyExp = false; heSync(true);
}
HE.lay = { w: 1920, h: 1080, fsrc: 'edit', fv: null, reg: null };
function heLayDef(preset) {
  const r = HE.rects || { A: { w: 116, h: 1030 }, B: { w: 116, h: 1030 }, C: { w: 1676, h: 1030 } }, subH = 180, H = 1080 - subH, ma = H / r.A.h, mb = H / r.B.h, wa = Math.round(r.A.w * ma * (preset === 'wide' ? 1.8 : 1)), wb = Math.round(r.B.w * mb * (preset === 'wide' ? 1.8 : 1));
  HE.lay.reg = { A: { x: 0, y: 0, w: wa, h: H, fill: 0 }, B: { x: 1920 - wb, y: 0, w: wb, h: H, fill: 0 }, F: { x: wa, y: 0, w: 1920 - wa - wb, h: H, fill: 0 }, S: { x: 0, y: H, w: 1920, h: subH } };
}
function heCompose(ctx, W, H, srcCv, sc, rects, ve, ovCv) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); const k = W / 1920;
  ['A', 'B', 'F'].forEach(id => {
    const r = HE.lay.reg[id]; if (!r) return; let src = srcCv, sx, sy, sw, sh;
    if (id === 'F' && ve) { src = ve; sx = 0; sy = 0; sw = ve.videoWidth; sh = ve.videoHeight; } else { const q = id === 'F' ? rects.C : rects[id]; sx = q.x * sc; sy = q.y * sc; sw = q.w * sc; sh = q.h * sc; }
    if (!sw || !sh) return; let x = r.x * k, y = r.y * k, w = r.w * k, h = r.h * k;
    if (!r.fill) { const m = Math.min(w / sw, h / sh), dw = sw * m, dh = sh * m; x += (w - dw) / 2; y += (h - dh) / 2; w = dw; h = dh; }
    try { ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h); } catch (e) { }
    if (id === 'F' && ve && ovCv && rects.C) { const q = rects.C, ow = q.w * sc, oh = q.h * sc; let X = r.x * k, Y = r.y * k, Wd = r.w * k, Ht = r.h * k; if (!r.fill) { const m = Math.min(Wd / ow, Ht / oh), dw = ow * m, dh = oh * m; X += (Wd - dw) / 2; Y += (Ht - dh) / 2; Wd = dw; Ht = dh; } try { ctx.drawImage(ovCv, q.x * sc, q.y * sc, ow, oh, X, Y, Wd, Ht); } catch (e) { } }
  });
}
function heFVid() { if (HE.lay.fsrc !== 'ref') return null; return HE.vids.find(v => v.id === HE.lay.fv) || null; }
async function heLaySnap() {
  $('heLayMsg').textContent = '画面を作っています…';
  try { await new Promise(r => { const w = () => { if (!HE.busy && !HE.want) r(); else setTimeout(w, 60); }; w(); }); { const cvv = await heRaster(1), sc0 = heScene(HE.t, true); HE.snap = { cv: cvv, rects: heRects(), ov: HE.lay.fsrc === 'ref' ? await heRasterOv(sc0, 1) : null }; } HE.rects = HE.snap.rects; if (!HE.lay.reg) heLayDef(); } catch (e) { $('heLayMsg').textContent = '画面を作れませんでした'; return; }
  $('heLayMsg').textContent = ''; heLayDraw();
}
function heLayDraw() {
  const cv = $('heLayCv'); if (!cv || $('heLay').hidden) return; const W = HE.lay.w, H = HE.lay.h, bx = $('heLayWrap'), s = Math.min((bx.clientWidth - 8) / W, (bx.clientHeight - 8) / H);
  cv.width = W; cv.height = H; cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px'; HE.layS = s * (W / 1920);
  const ctx = cv.getContext('2d'); if (HE.snap && HE.lay.reg) { const ve = heFVid(); heCompose(ctx, W, H, HE.snap.cv, 1, HE.snap.rects, ve && ve.el.readyState >= 2 ? ve.el : null, HE.snap.ov); } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  const box = $('heLayBox'); box.style.width = cv.style.width; box.style.height = cv.style.height;
  box.innerHTML = ['A', 'B', 'F', 'S'].map(id => { const r = HE.lay.reg[id], k = HE.layS; return '<div class="hlb' + (HE.laySel === id ? ' sel' : '') + '" data-r="' + id + '" style="left:' + r.x * k + 'px;top:' + r.y * k + 'px;width:' + r.w * k + 'px;height:' + r.h * k + 'px"><span>' + { A: '手札A', B: '手札B', F: HE.lay.fsrc === 'ref' ? '参考F' : '盤面', S: '字幕' }[id] + '</span><i></i></div>'; }).join('');
  const r = HE.lay.reg[HE.laySel || 'F']; ['X', 'Y', 'W', 'H'].forEach(a => { $('heL' + a).value = Math.round(r[a.toLowerCase()]); }); $('heLFill').checked = !!r.fill; $('heLSel').textContent = { A: '手札A', B: '手札B', F: HE.lay.fsrc === 'ref' ? '参考F' : '盤面', S: '字幕' }[HE.laySel || 'F'];
}
function heLayOpen() {
  $('heLay').hidden = false; $('heLSize').value = HE.lay.w + 'x' + HE.lay.h; $('heLHs').value = HE.hs; HE.laySel = HE.laySel || 'F';
  $('heLFs').innerHTML = '<option value="edit">盤面(編集F)</option>' + HE.vids.map(v => '<option value="' + v.id + '">参考F: ' + esc(v.name.slice(0, 20)) + '</option>').join(''); $('heLFs').value = HE.lay.fsrc === 'ref' ? String(HE.lay.fv) : 'edit';
  if (!HE.lay.reg) heLayDef(); heLaySnap().then(() => { if (!HE.rects) return; });
}
$('heLayBtn').onclick = heLayOpen; $('heLClose').onclick = () => { $('heLay').hidden = true; heLaySave(); };
$('heLRef').onclick = heLaySnap;
$('heLSize').onchange = () => { const [w, h] = $('heLSize').value.split('x').map(Number); HE.lay.w = w; HE.lay.h = h; heLayDraw(); };
$('heLPre').onchange = () => { heLayDef($('heLPre').value); heLayDraw(); };
$('heLFs').onchange = () => { const v = $('heLFs').value; HE.lay.fsrc = v === 'edit' ? 'edit' : 'ref'; HE.lay.fv = v === 'edit' ? null : +v; if (v !== 'edit') { const x = HE.vids.find(q => q.id === +v); if (x) { x.el.currentTime = Math.max(0, HE.t / 1000 + x.off); } } heLayDraw(); setTimeout(heLayDraw, 300); };
$('heLHs').oninput = () => { HE.hs = +$('heLHs').value; clearTimeout(HE.hsT); HE.hsT = setTimeout(async () => { heSync(true); await heLaySnap(); heLayAfterHs(); }, 350); };
function heLayAfterHs() { if (HE.snap && HE.lay.reg && HE.lay.auto !== false) { } }
['X', 'Y', 'W', 'H'].forEach(a => { $('heL' + a).onchange = () => { const r = HE.lay.reg[HE.laySel || 'F']; r[a.toLowerCase()] = Math.max(0, +$('heL' + a).value || 0); heLayDraw(); }; });
$('heLFill').onchange = () => { HE.lay.reg[HE.laySel || 'F'].fill = $('heLFill').checked ? 1 : 0; heLayDraw(); };
$('heLayBox').addEventListener('pointerdown', e => {
  const b = e.target.closest('.hlb'); if (!b) return; e.preventDefault(); const id = b.dataset.r, r = HE.lay.reg[id], rs = !!e.target.closest('i'), k = HE.layS, x0 = e.clientX, y0 = e.clientY, o = Object.assign({}, r); HE.laySel = id;
  const sn = (v, arr) => { for (const a of arr) if (Math.abs(a - v) < 8) return a; return v; };
  const mv = q => {
    const dx = (q.clientX - x0) / k, dy = (q.clientY - y0) / k, ed = ['A', 'B', 'F', 'S'].filter(z => z !== id).flatMap(z => [HE.lay.reg[z].x, HE.lay.reg[z].x + HE.lay.reg[z].w]).concat([0, 1920]), ey = ['A', 'B', 'F', 'S'].filter(z => z !== id).flatMap(z => [HE.lay.reg[z].y, HE.lay.reg[z].y + HE.lay.reg[z].h]).concat([0, 1080]);
    if (rs) { r.w = Math.max(20, Math.round(sn(o.x + o.w + dx, ed) - o.x)); r.h = Math.max(20, Math.round(sn(o.y + o.h + dy, ey) - o.y)); }
    else { let nx = o.x + dx, ny = o.y + dy; nx = sn(nx, ed); nx = sn(nx + o.w, ed) - o.w; ny = sn(ny, ey); ny = sn(ny + o.h, ey) - o.h; r.x = Math.round(nx); r.y = Math.round(ny); }
    heLayDraw();
  };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); heLayDraw();
});
function heLaySave() { try { localStorage.setItem('bs-he-lay', JSON.stringify({ w: HE.lay.w, h: HE.lay.h, reg: HE.lay.reg, hs: HE.hs })); } catch (e) { } }
function heLayLoad() { try { const a = JSON.parse(localStorage.getItem('bs-he-lay') || 'null'); if (a && a.reg) { HE.lay.w = a.w; HE.lay.h = a.h; HE.lay.reg = a.reg; HE.hs = a.hs || 0.57; } } catch (e) { } }
