function specFxEnter(id) {
  if (!V || !V.spec || fxOff) return; let k = null, p = 0;
  [V.you, V.opp].forEach((P, pi) => { const f = (P.field || []).find(x => x.iid === id); if (f) { k = f; p = pi === 0 ? V.me : 1 - V.me; } });
  if (!k || !k.def) return;
  if (specFieldSeen) specFieldSeen.add(id);   // 登場で表示済み。次のステップで『新しく出たカード』として二重に出さない
  const sk = V.turnNo + ':' + V.step; if (specFxRecent.sk !== sk) { for (const q in specFxRecent) delete specFxRecent[q]; specFxRecent.sk = sk; }
  const key = k.def.name; specFxRecent[key + ':' + p] = 1;   // 同じカードを続けて出したときも毎回表示する(効果側の二重表示だけをここで止める)
  specFxQ.unshift({ key, p, cid: k.def.id, name: k.def.name, label: k.def.type === 'nexus' ? '配置' : '召喚', text: '', def: k.def, enter: true });
  if (specFxBusy) { clearTimeout(specFxT); specFxBusy = false; } specFxNext();
}
function mgPlace(it, def) {   // マジック: 使った人の盤面の真ん中に重ねて置き、1.5秒ほどしたらトラッシュへ
  const key = it.p === V.me ? 'me' : 'opp', tgt = $(key); if (!tgt) return; const r = tgt.getBoundingClientRect(), sp = Math.max(1, RP ? Math.min(RP.speed, 6) : 1);
  const h = Math.max(110, r.height * (BC.on ? .62 : .5)), w = h * .69, art = artOf(String(def.id));
  const el = document.createElement('div'); el.className = 'mgp'; el.style.cssText = 'left:' + (r.left + r.width / 2 - w / 2) + 'px;top:' + (r.top + r.height / 2 - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;--tint:' + (COLOR_HEX[def.color] || '#6a7499') + (art ? ';background-image:url(' + art + ')' : '');
  if (!art) el.textContent = def.name; document.body.appendChild(el);
  if (isSecretId(String(def.id)) && !fxOff) setTimeout(() => shineAt(el.getBoundingClientRect()), 300 / sp);
  const rot = !BC.on && key === 'opp' ? ' rotate(180deg)' : '';
  el.animate([{ transform: 'scale(.4)' + rot, opacity: 0 }, { transform: 'scale(1.06)' + rot, opacity: 1, offset: .7 }, { transform: 'scale(1)' + rot, opacity: 1 }], { duration: 300 / sp, easing: 'ease-out', fill: 'both' });
  setTimeout(() => { const tp = trashPt(key), rc = el.getBoundingClientRect(); if (!tp) { el.remove(); return; } el.animate([{ transform: 'none' + rot, opacity: 1 }, { transform: 'translate(' + (tp.x - rc.left - rc.width / 2) + 'px,' + (tp.y - rc.top - rc.height / 2) + 'px) scale(.18)' + rot, opacity: .25 }], { duration: 650 / sp, easing: 'ease-in', fill: 'forwards' }); }, 1500 / sp);
  setTimeout(() => { try { el.remove(); } catch (e) { } }, 2250 / sp);
}
function specFxNext() {
  if (fxOff) { specFxQ.length = 0; return; }
  if (specFxBusy || !specFxQ.length) return;
  const it = specFxQ.shift(), box = $('specfx'); if (!box || !V) { return; }
  const def = it.def || (it.cid && defOfId(it.cid)) || (it.name && (CARD_LIST.find(c => c.def.name === it.name) || {}).def); if (!def) { specFxNext(); return; }
  specFxBusy = true;
  const isMg = false, onBottom = it.p === V.me, target = $(isMg ? (onBottom ? 'me' : 'opp') : (onBottom ? 'opp' : 'me')), r = target ? target.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  let h = Math.max(120, r.height * .96), w = h * .69; if (w > r.width * .92) { w = r.width * .92; h = w / .69; } const _u = 0, art = artOf(String(def.id));
  box.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;--tint:' + (COLOR_HEX[def.color] || '#6a7499');
  const txt = (it.text || '').replace(/\n/g, ' ');
  box.innerHTML = '<div class="sfc" style="height:' + h + 'px;width:' + w + 'px">' + (art ? '<img src="' + art + '" alt="">' : '<div class="artph2">' + esc(def.name) + '</div>') + '</div>' + (BC.on || it.enter ? '' : '<div class="sfm"><div class="sfl">' + absName(it.p) + 'の' + esc(it.label) + '</div><div class="sfn">' + esc(def.name) + '</div>' + (txt ? '<div class="sft">' + rich(esc(txt.length > 140 ? txt.slice(0, 140) + '…' : txt)) + '</div>' : '') + '</div>');
  if (def.type === 'magic') { try { mgPlace(it, def); } catch (e) { } }
  box.classList.toggle('mg', isMg); box.classList.toggle('ent', !!it.enter && !V.spec);
  box.hidden = false; box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
  if (isMg) {   // マジック: 自分のフィールドの真ん中に置き、1.5秒ほどしたらトラッシュへ
    const sc = box.querySelector('.sfc'), key = onBottom ? 'me' : 'opp', sp = Math.max(1, RP ? Math.min(RP.speed, 6) : 1);
    if (sc) {
      sc.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300 / sp, easing: 'ease-out', fill: 'both' });
      setTimeout(() => { const tp = trashPt(key), rc = sc.getBoundingClientRect(); if (!tp) return; sc.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (tp.x - rc.left - rc.width / 2) + 'px,' + (tp.y - rc.top - rc.height / 2) + 'px) scale(.18) rotate(' + (key === 'me' ? 40 : -40) + 'deg)', opacity: .25 }], { duration: 650 / sp, easing: 'ease-in', fill: 'forwards' }); }, 1500 / sp);
    }
    clearTimeout(specFxT); specFxT = setTimeout(() => { box.hidden = true; box.classList.remove('mg'); specFxBusy = false; specFxNext(); }, 2200 / sp); return;
  }
  const dur = (RP ? 2400 / Math.max(1, Math.min(RP.speed, 6)) : 2300) * (BC.on ? .65 : 1) * (it.enter && !V.spec ? .55 : 1);
  clearTimeout(specFxT); specFxT = setTimeout(() => { box.hidden = true; specFxBusy = false; specFxNext(); }, dur);
}

/* ---------- 視点・向き ---------- */
function specView() { VP = 1 - VP; if (lastRaw) { const raw = lastRaw; const save = { fx: raw.fx, evs: raw.evs, trace: raw.trace, cast: raw.cast }; setV(flipV(Object.assign({}, raw, { fx: [], evs: [], trace: [], cast: null }))); Object.assign(raw, save); } }
function specOri(m) { if (BC.on) bcOff(); orient = m; if (m === 'land' && innerWidth <= innerHeight) toast('端末を横向きにすると、横向きの画面になります'); specBody(); render(); }
function openRoster() {
  const pl = ROSTER.pl.length ? ROSTER.pl : (V && V.names || []);
  const me = getName();
  showSheet('<h3>👥 名簿</h3><div class="ros"><div class="rh">対戦者</div>' + pl.map(n => '<div>🎴 ' + esc(n) + '</div>').join('') + '<div class="rh">観戦者(' + (ROSTER.sp || []).length + '人)</div>' + ((ROSTER.sp || []).length ? ROSTER.sp.map(n => '<div>👁 ' + esc(n) + (SPEC && n === me ? ' <span class="dim">(あなた)</span>' : '') + '</div>').join('') : '<div class="dim">いまは誰もいません</div>') + '</div><div class="acts"><button class="sub" data-close="1">閉じる</button></div>');
}
function openSpecStamps() {
  const pal = $('specPal'); if (!pal) return; pal.hidden = !pal.hidden;
  pal.innerHTML = SPEC_STAMPS.map(e => '<button data-sstamp="' + e + '">' + e + '</button>').join('');
}

/* ---------- リプレイ: 保存 ---------- */
function rpLoad() { try { const a = JSON.parse(localStorage.getItem(RPKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function rpSaveAll(a) {
  for (;;) { try { localStorage.setItem(RPKEY, JSON.stringify(a)); return true; } catch (e) { if (a.length <= 1) return false; let k = a.length - 1; while (k > 0 && a[k].fav) k--; a.splice(k, 1); } }
}
function rpMake(G0) {
  const r = RECDB[G0.rid]; if (!r) return null;
  return { v: 1, ver: APP_VER, turns: G0.turnNo, ts: Date.now(), names: (G0.names || []).slice(0, 2), winner: G0.winner == null ? null : G0.winner, why: G0.loseWhy || '', seed: r.seed, s: r.s, acts: r.acts.slice(), defs: packDefs([r.defs[0].map(d => ({ def: d })), r.defs[1].map(d => ({ def: d }))]) };
}
function rpAdd(e) {
  if (!e || !Array.isArray(e.acts) || e.acts.length < 8 || !e.defs) return false;
  const a = rpLoad(), key = e.seed + ':' + e.acts.length;
  if (a.some(x => x.seed + ':' + x.acts.length === key)) return false;
  a.unshift(e); let nf = a.filter(x => !x.fav).length; while (nf > RPMAX) { let k = a.length - 1; while (k >= 0 && a[k].fav) k--; if (k < 0) break; a.splice(k, 1); nf--; }
  return rpSaveAll(a);
}
function finishRec() {
  if (!G || !G.rid || G.winner == null || recDone.has(G.rid)) return; recDone.add(G.rid);
  const e = rpMake(G); if (!e) return;
  rpAdd(e);
  if (isHost && !solo && !cpu) { const m = { t: 'rec', rec: e }; specBroadcast(m, true); }
  const testM = !!(G.settings && G.settings.test);
  if (isHost && !solo && !cpu && !testM) uploadRec(e, { mode: 'pvp' });                              // 合言葉対戦・フリー対戦
  else if (cpu && !solo && !testM && SRV_FLAGS.cpuRec !== false) uploadRec(e, { mode: 'cpu', hs: 0 });   // CPU対戦(テストモードは除く。人間は席0)
}
// 対人戦の記録を、匿名でサーバーへ送る(プレイヤー名は含めない。設定でオフにできる)
async function uploadRec(e, meta) {
  try {
    let on = true; try { on = localStorage.getItem('bs-share') !== '0'; } catch (x) { }
    if (!on || !e || !Array.isArray(e.acts) || e.acts.length < 8) return;
    const d = unpackDefs(cl(e.defs)), ids = d.map(a => a.map(x => x.def.id));
    await apiPost('/rec', { ver: e.ver, seed: e.seed, s: e.s, acts: e.acts, defs: ids, winner: e.winner, turns: e.turns, why: e.why, mode: (meta && meta.mode) || 'pvp', hs: meta && meta.hs != null ? meta.hs : undefined });
  } catch (x) { }
}
function rpEntryDefs(e) {
  try { const d = unpackDefs(cl(e.defs)); return [d[0].map(x => x.def), d[1].map(x => x.def)]; } catch (x) { return null; }
}
/* ---------- リプレイ: 書き出し・取り込み ---------- */
async function gzB64(str) {
  const cs = new CompressionStream('gzip'), w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close();
  const buf = new Uint8Array(await new Response(cs.readable).arrayBuffer()); let b = ''; for (let i = 0; i < buf.length; i += 3000) b += String.fromCharCode.apply(null, buf.subarray(i, i + 3000)); return btoa(b);
}
async function ungzB64(b64) {
  const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), ds = new DecompressionStream('gzip'), w = ds.writable.getWriter(); w.write(u); w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}
async function rpEncode(e) {
  const j = JSON.stringify(e);
  if (typeof CompressionStream !== 'undefined') { try { return 'BSRP1:' + await gzB64(j); } catch (x) { } }
  const bytes = new TextEncoder().encode(j); let b = ''; for (let i = 0; i < bytes.length; i += 3000) b += String.fromCharCode.apply(null, bytes.subarray(i, i + 3000)); return 'BSRP0:' + btoa(b);
}
async function rpDecode(t) {
  t = String(t || '').trim().replace(/\s+/g, '');
  let j;
  if (t.startsWith('BSRP1:')) j = await ungzB64(t.slice(6));
  else if (t.startsWith('BSRP0:')) { const u = Uint8Array.from(atob(t.slice(6)), c => c.charCodeAt(0)); j = new TextDecoder().decode(u); }
  else if (t.startsWith('{')) j = t;
  else throw new Error('形式が違います');
  const e = JSON.parse(j); if (!e || !Array.isArray(e.acts) || !e.defs || !e.seed && e.seed !== 0) throw new Error('リプレイのデータではありません'); return e;
}
const rpTitle = e => (e.names && e.names[0] || 'P1') + ' vs ' + (e.names && e.names[1] || 'P2');
const rpDate = e => { try { const d = new Date(e.ts); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (x) { return ''; } };
let rpTab = 'all';
const rpKey = e => e.seed + ':' + e.acts.length;
function rpPatch(e, patch) { const a = rpLoad(), k = rpKey(e), x = a.find(y => rpKey(y) === k); if (!x) return; Object.assign(x, patch); Object.assign(e, patch); rpSaveAll(a); }
function rpList() {
  const a = rpLoad(), box = $('rpList'); if (!box) return;
  const nfav = a.filter(e => e.fav).length;
  const tabs = '<div class="rptabs"><button class="' + (rpTab === 'all' ? 'on' : '') + '" data-rptab="all">すべて(' + a.length + ')</button><button class="' + (rpTab === 'fav' ? 'on' : '') + '" data-rptab="fav">★ お気に入り(' + nfav + ')</button></div>';
  const rows = a.map((e, i) => ({ e, i })).filter(x => rpTab === 'all' || x.e.fav);
  box.innerHTML = tabs + (rows.length ? rows.map(({ e, i }) => '<div class="rpi"><div class="rpt"><b><button class="rpstar' + (e.fav ? ' on' : '') + '" data-rpfav="' + i + '" title="お気に入り">' + (e.fav ? '★' : '☆') + '</button>' + esc(rpTitle(e)) + '</b><span class="rpn' + (e.note ? '' : ' empty') + '" data-rpn="' + i + '" title="ダブルクリックで編集">' + (e.note ? esc(e.note) : 'ダブルクリックで説明を追加') + '</span><span class="dim">' + esc(rpDate(e)) + ' ・ ' + (e.turns ? e.turns + 'ターン' : 'ターン数 不明(一度見ると表示)') + (e.winner != null ? ' ・ 勝者: ' + esc((e.names || [])[e.winner] || '') : ' ・ 途中まで') + '</span></div><div class="row"><button data-rpplay="' + i + '">▶ 見る</button><button class="sub" data-rpexp="' + i + '">書き出し</button><button class="sub" data-rpdel="' + i + '">削除</button></div></div>').join('') : '<p class="note">まだリプレイがありません。対戦(またはCPU戦・観戦)が終わると、直近' + RPMAX + '件がこの端末に自動で保存されます。★をつけると、件数に関係なく残ります。</p>');
}
function rpOpenList() { $('lobby').hidden = true; $('replay').hidden = false; rpList(); window.scrollTo(0, 0); }
function rpCloseList() { $('replay').hidden = true; $('lobby').hidden = false; }
function rpExport(i) {
  const e = rpLoad()[i]; if (!e) return; sheetActs = [];
  showSheet('<h3>リプレイを書き出す</h3><p class="note">' + esc(rpTitle(e)) + '</p><div class="acts">' + sbtn('📄 ファイルで保存', async () => { try { const t = await rpEncode(e), blob = new Blob([t], { type: 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'replay-' + (e.names || []).join('-vs-').replace(/[\\/:*?"<>|\s]/g, '') + '-' + rpDate(e).replace(/[\/: ]/g, '') + '.bsrp'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('ファイルを保存しました'); } catch (x) { toast('保存に失敗しました'); } }) +
    sbtn('📋 文字列をコピー', async () => { try { const t = await rpEncode(e); try { await navigator.clipboard.writeText(t); toast('文字列をコピーしました(' + t.length + '文字)'); } catch (x) { showSheet('<h3>文字列</h3><p class="note">下の文字列を全部コピーして保管してください</p><textarea readonly style="width:100%;height:160px" onfocus="this.select()">' + esc(t) + '</textarea><div class="acts"><button class="sub" data-close="1">閉じる</button></div>'); } } catch (x) { toast('失敗しました'); } }) + '<button class="sub" data-close="1">閉じる</button></div>');
}
async function rpImportText(t) { try { const e = await rpDecode(t); if (rpAdd(e)) { toast('取り込みました'); rpList(); } else toast('すでにあるか、手数が少ないため取り込めませんでした'); } catch (x) { toast('取り込めませんでした: ' + (x && x.message || x)); } }
function rpImportDialog() {
  sheetActs = [];
  showSheet('<h3>リプレイを取り込む</h3><p class="note">書き出した文字列を貼り付けるか、ファイルを選んでください。</p><textarea id="rpTxt" placeholder="BSRP1:… から始まる文字列" style="width:100%;height:110px"></textarea><div class="acts">' + sbtn('文字列を取り込む', () => rpImportText(($('rpTxt') || {}).value)) + '' + sbtn('ファイルを選ぶ', () => $('rpFile').click(), 1) + '<button class="sub" data-close="1">閉じる</button></div>');
}

/* ---------- リプレイ: 再生 ---------- */
function rpStep() { const x = RP.rec.acts[RP.i]; act(RP.G, x[0], cl(x[1])); RP.i++; }
function rpShow(anim) {
  const v = viewSpec(RP.G); if (!anim) { v.fx = []; v.evs = []; v.trace = []; v.cast = null; }
  if (!anim) { specFieldSeen = null; specFxSeq = null; specFxQ.length = 0; const sf = $('specfx'); if (sf) sf.hidden = true; specFxBusy = false; specCastSeen = RP.G.cast ? RP.G.cast.n : 0; }
  setSpecV(v); specBody(); const sl = $('rpSlider'); if (sl && document.activeElement !== sl) sl.value = RP.i;
}
function rpGoto(n, anim) {
  if (!RP) return; n = Math.max(0, Math.min(RP.n, n | 0));
  if (anim && RP.G) specCastSeen = RP.G.cast ? RP.G.cast.n : 0;
  if (RP.G && n >= RP.i && n - RP.i <= 40) { while (RP.i < n) rpStep(); }
  else { const base = Math.floor(n / 25) * 25, cp = RP.cps.get(base); RP.G = cpLoad(cp); RP.i = base; while (RP.i < n) rpStep(); }
  rpShow(!!anim && RP.i === n && anim);
}
function rpStart(e) {
  const defs = rpEntryDefs(e); if (!defs) { toast('カードデータを読み込めませんでした'); return; }
  const rec = { defs, s: e.s, seed: e.seed, names: e.names || ['P1', 'P2'], acts: e.acts };
  specReset(); toast('リプレイを準備しています…');
  setTimeout(() => {
    try {
      const G0 = replayBuild(rec, 0), cps = new Map(), turnAt = [G0.turnNo]; cps.set(0, cpSave(G0));
      for (let i = 0; i < rec.acts.length; i++) { const x = rec.acts[i]; act(G0, x[0], cl(x[1])); turnAt[i + 1] = G0.turnNo; if ((i + 1) % 25 === 0) cps.set(i + 1, cpSave(G0)); }
      if (!e.turns) { try { rpPatch(e, { turns: turnAt[turnAt.length - 1] }); } catch (x) { } }
      RP = { entry: e, rec, G: null, i: 0, n: rec.acts.length, cps, turnAt, playing: false, dir: 1, speed: 1, timer: null };
      VP = 0; orient = 'auto'; sideOpen = false; menuOpen = false; logOpen = false; isHost = false; solo = false; cpu = false; G = null;
      $('replay').hidden = true; $('lobby').hidden = true; $('game').hidden = false; document.body.classList.add('ingame');
      resetForNew(); lastSeq = null; snap = null; V = null; specFxSeq = null; specCastSeen = 0;
      RP.G = cpLoad(cps.get(0)); RP.i = 0; rpShow(false); { const t = $('toast'); if (t) t.hidden = true; }
      if (e.ver && e.ver !== APP_VER) toast('このリプレイは ' + e.ver + ' で保存されました。更新後は、カード効果の変更で再現がずれることがあります');
    } catch (x) { RP = null; toast('リプレイを再生できませんでした: ' + (x && x.message || x)); $('replay').hidden = false; }
  }, 30);
}
let fxOff = false;
const fxScale = () => RP ? Math.max(1, RP.speed) : 1;
function rpDelay() {
  const sp = RP.speed, G0 = RP.G;
  if (RP.dir < 0) return 450 / sp;
  if (G0.fx && G0.fx.length || (G0.evs || []).some(e => e.t === 'attack' || e.t === 'life')) return (fxOff ? 1800 : 3600) / sp;
  return (G0.evs && G0.evs.length || G0.trace && G0.trace.length) ? 1700 / sp : 220 / sp;
}
function rpTick() {
  if (!RP || !RP.playing) return;
  if (RP.dir > 0) { if (RP.i >= RP.n) { RP.playing = false; specBody(); return; } rpGoto(RP.i + 1, true); }
  else { if (RP.i <= 0) { RP.playing = false; specBody(); return; } rpGoto(RP.i - 1, false); }
  specBody(); RP.timer = setTimeout(rpTick, rpDelay());
}
function rpPlay(dir) {
  if (!RP) return; clearTimeout(RP.timer);
  if (RP.playing && RP.dir === dir) { RP.playing = false; specBody(); return; }
  if (dir > 0 && RP.i >= RP.n) rpGoto(0, false);
  RP.playing = true; RP.dir = dir; specBody(); RP.timer = setTimeout(rpTick, 80);
}
function rpPause() { if (RP) { clearTimeout(RP.timer); RP.playing = false; } }
function rpTurnJump(d) {
  if (!RP) return; rpPause(); const cur = RP.turnAt[RP.i]; let t = RP.i;
  if (d > 0) { while (t < RP.n && RP.turnAt[t] <= cur) t++; }
  else { while (t > 0 && RP.turnAt[t] >= cur) t--; while (t > 0 && RP.turnAt[t - 1] === RP.turnAt[t]) t--; }
  rpGoto(t, false); specBody();
}
function rpBarHTML() {
  const sp = RP.speed, curT = RP.turnAt[RP.i];
  return '<div class="rpr"><button data-rp="start" title="最初へ">⏮</button><button data-rp="tprev" title="前のターン">⏪T</button><button data-rp="rev" class="' + (RP.playing && RP.dir < 0 ? 'on' : '') + '" title="巻き戻し再生">◀◀</button><button data-rp="back" title="一手戻る">◀|</button><button data-rp="play" class="pp' + (RP.playing && RP.dir > 0 ? ' on' : '') + '" title="再生/一時停止">' + (RP.playing && RP.dir > 0 ? '⏸' : '▶') + '</button><button data-rp="fwd" title="一手進む">|▶</button><button data-rp="speed" title="早送り(再生速度)">⏩ ×' + sp + '</button><button data-rp="fxoff" class="' + (fxOff ? 'on' : '') + '" title="効果のポップなどを出さない">詳細' + (fxOff ? '非表示中' : '表示') + '</button><button data-rp="tnext" title="次のターン">T⏩</button><button data-rp="end" title="最後へ">⏭</button></div>' +
    '<div class="rps"><input type="range" id="rpSlider" min="0" max="' + RP.n + '" value="' + RP.i + '"><span class="rpl">' + curT + ' / ' + RP.turnAt[RP.n] + ' ターン目</span></div>';
}
function rpClick(t) {
  const b = t.closest('[data-rp]'); if (!b || !RP) return false; const k = b.dataset.rp;
  if (k === 'start') { rpPause(); rpGoto(0, false); }
  else if (k === 'end') { rpPause(); rpGoto(RP.n, false); }
  else if (k === 'back') { rpPause(); rpGoto(RP.i - 1, false); }
  else if (k === 'fwd') { rpPause(); if (RP.i < RP.n) rpGoto(RP.i + 1, true); }
  else if (k === 'play') rpPlay(1);
  else if (k === 'rev') rpPlay(-1);
  else if (k === 'speed') { RP.speed = RP.speed >= 8 ? 1 : RP.speed * 2; }
  else if (k === 'fxoff') { fxOff = !fxOff; if (fxOff) { const f = $('fx'); if (f) f.hidden = true; fxQ = []; } }
  else if (k === 'tprev') rpTurnJump(-1);
  else if (k === 'tnext') rpTurnJump(1);
  specBody(); return true;
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'rpSlider' && RP) { rpPause(); const v = +e.target.value; if (RP._raf) cancelAnimationFrame(RP._raf); RP._raf = requestAnimationFrame(() => { rpGoto(v, false); const l = document.querySelector('.rpl'); if (l) l.textContent = RP.turnAt[RP.i] + ' / ' + RP.turnAt[RP.n] + ' ターン目'; }); } });

/* ===== 配信モード(v35.2) ===== 今の盤面のまま左VS右に並べる(録画向け)。上にカーソルを持っていくとメニューが出る */
var BC = { on: false, manual: false, q: [], hot: null, pend: null, dq: [], dqT: null, pendT: null };
const BC_STEP = { start: 'スタートステップ', core: 'コアステップ', draw: 'ドローステップ', refresh: 'リフレッシュステップ', main: 'メインステップ', attack: 'アタックステップ', main2: 'メインステップ', end: 'エンドステップ' };
/* 盤面をいっぱいに使う: カードをできるだけ大きくし、はみ出すときだけ少しずつ小さくする */
/* 場のカードの大きさ: 疲労(横向き)で4枚並べられる大きさを最大にし、入らなくなったらその分だけ小さくする(入る一番大きいサイズ)。入りきらないぶんは反対の段へ */
function bcPlan() {
  const L = BC.L || 800, H = BC.H || 800, g = 0.5, cap = cw => Math.max(1, Math.floor((L - 0.4 * cw + g * cw) / ((1 + g) * cw)));   // 疲労(横向き)は場所はcw幅のまま見た目だけ1.4cw(両端に0.2cwはみ出す)。隙間0.5cwで、K枚が見切れず入る
  const cnt = [V.you, V.opp].map(P => [P.field.filter(k => k.def.type === 'spirit').length, P.field.filter(k => k.def.type !== 'spirit').length]);
  const tot = (n, cw) => n * (cw * 1.4 + 8) + (n - 1) * 6;   // n列ぶんの高さ
  const cols = (s, n, K) => Math.max(3, Math.max(2, Math.ceil(s / K)) + Math.ceil(n / K));
  let cw = Math.min(Math.floor(L / (4 + 3 * g + 0.4)), Math.floor(((H - 12) / 3 - 14) / 1.4));   // 基本=3列ぶんが入る大きさ
  for (; cw > 24; cw--) { const K = cap(cw); if (cnt.every(([s, n]) => { const c = cols(s, n, K); return c <= 4 && tot(c, cw) <= H; })) break; }
  return { cw, K: cap(cw) };
}
/* 手札: 名前の見える所までを見せ、効果の部分は画面の端で見切れる。多いときは、実際のカードのように重ねて詰め、1列に収める */
function bcHands(baseV) {
  const st = $('stage'), bw = st.clientWidth - 12, cwh = baseV * 0.72, ch = cwh * 1.4, p = ch * (window.__HESHOW || 0.57);
  ['hand', 'oppHand'].forEach(id => {
    const e = $(id); if (!e) return; const row = e.querySelector('.handrow'); if (!row) return; const cards = [...row.querySelectorAll('.card')], n = cards.length;
    e.style.setProperty('--hcw', cwh + 'px'); const step = n > 1 ? Math.min(cwh * 1.04, (bw - cwh) / (n - 1)) : 0, left = (bw - ((n - 1) * step + cwh)) / 2;
    row.style.height = p + 'px';
    cards.forEach((c, i) => { c.style.left = (left + i * step) + 'px'; c.style.top = '0px'; c.style.zIndex = String(1 + i); });
  });
}
function bcFit() {
  const st = $('stage'); if (!st || !BC.on) return;
  const baseV = (innerHeight - 46 - 24) / 5, f0 = st.querySelector('.field');
  if (f0 && f0.clientWidth > 100 && !BC.busy) { const cs = getComputedStyle(f0), L = f0.clientWidth - 16, H = f0.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - 2; if (Math.abs(L - (BC.L || 0)) > 2 || Math.abs(H - (BC.H || 0)) > 2) { BC.L = L; BC.H = H; BC.busy = true; try { render0(); } finally { BC.busy = false; } } }
  bcHands(baseV);
  const cw = (BC.plan && BC.plan.cw) || baseV * 0.7; st.style.setProperty('--cwb', cw + 'px'); st.style.setProperty('--cw', cw + 'px');
}
