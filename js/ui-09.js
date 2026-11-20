const ART_URL = {};
const pn = p => { if (!V) return p === 0 ? 'あなた' : '相手'; if (V.spec) { const n = V.names && V.names[p]; return n ? esc(n) : 'プレイヤー' + (p + 1); } if (p === V.me) return 'あなた'; const n = V.names && V.names[p]; return n ? esc(n) : '相手'; };
const vsLine = () => (V && V.names && V.names[0] && V.names[1]) ? '<div class="vsname">' + iconSpan(!RP ? myIcon() : '', V.names[V.me], 18) + '<b>' + esc(V.names[V.me]) + '</b> vs ' + iconSpan(!RP && inMatch() ? OPPIC : '', V.names[1 - V.me], 18) + '<b>' + esc(V.names[1 - V.me]) + '</b></div>' : '';
const TOKEN_ART = { 'TOKEN-ソーディッシュ': '26RSD10-T001' };
const _artBlob = {};
// 画像(data:)は描き直すたびに読み込み直されてチカチカするので、短いURL(blob)にして一度だけ読み込む
function artBlob(id, u) {
  if (!u || u.slice(0, 5) !== 'data:') return u; if (_artBlob[id]) return _artBlob[id];
  try { const i = u.indexOf(','), m = /data:([^;,]+)/.exec(u.slice(0, i)), bin = atob(u.slice(i + 1)), a = new Uint8Array(bin.length); for (let j = 0; j < bin.length; j++) a[j] = bin.charCodeAt(j); const url = URL.createObjectURL(new Blob([a], { type: m ? m[1] : 'image/jpeg' })); _artBlob[id] = url; const im = new Image(); im.src = url; if (im.decode) im.decode().catch(() => { }); return url; } catch (e) { return u; }
}
/* カード画像は、使うたびにデコードし直されると一瞬消えて見える(特にスマホ)。使った画像は読み込み済みのまま保持しておく */
const _artKeep = new Map();
function keepArt(u) {
  if (!u || _artKeep.has(u)) { if (u && _artKeep.has(u)) { const v = _artKeep.get(u); _artKeep.delete(u); _artKeep.set(u, v); } return; }
  try {
    const im = new Image(); im.decoding = 'async';
    if (!_artSeen.has(u)) { _artSeen.set(u, Date.now()); if (u.slice(0, 5) !== 'data:') setTimeout(() => { if (!_artOk.has(u)) artRerender(); }, ART_WAIT + 60); }   // 2秒たっても出ていなければ描き直して、カード名を出す
    im.onload = () => { const was = _artSeen.has(u) && Date.now() - _artSeen.get(u) > ART_WAIT; _artOk.add(u); if (was) artRerender(); };
    im.onerror = () => {
      if (u.slice(0, 5) === 'blob:' || u.slice(0, 5) === 'data:') return;
      _artBad.add(u); _artKeep.delete(u); artRerender(); artRetry(u, 0);   // 読み込めないあいだはカード名で表示し、あきらめずに読み込み直す
    };
    im.src = u; if (im.decode) im.decode().catch(() => { }); _artKeep.set(u, im); if (_artKeep.size > 600) { _artKeep.delete(_artKeep.keys().next().value); }
  } catch (e) { }
}
const ART_WAIT = 2000, _artSeen = new Map(), _artOk = new Set();
const artLate = u => !!u && !_artOk.has(u) && _artSeen.has(u) && Date.now() - _artSeen.get(u) > ART_WAIT;
let _artRT = 0;
function artRerender() { clearTimeout(_artRT); _artRT = setTimeout(() => { try { if (typeof G !== 'undefined' && G && document.body.classList.contains('ingame')) render(); else if (typeof V !== 'undefined' && V && document.body.classList.contains('ingame')) render(); } catch (e) { } }, 250); }
function artRetry(u, n) {
  const wait = Math.min(30000, 2000 * Math.pow(2, n));
  setTimeout(() => {
    const t = new Image(); t.decoding = 'async';
    t.onload = () => { _artBad.delete(u); _artOk.add(u); _artKeep.delete(u); keepArt(u); artRerender(); };
    t.onerror = () => artRetry(u, n + 1);
    t.src = u + (u.indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now();   // 失敗した結果を覚えていることがあるので、毎回別のURLで試す
  }, wait);
}
const _artBad = new Set(); let _badT = 0;
const artOf = id => { const u = artOf0(id); if (!u || _artBad.has(u)) return ''; keepArt(u); return u; };
/* 小さく表示するカードは、元画像(縦約1000px)を縮めて使う。大きな画像を8分の1ほどに縮めて表示するとギザギザ(ガビガビ)に見えるため、
   あらかじめ段階的に縮小した画像(幅320px)を作って差し替える */
const _thumb = new Map();
const artQ = id => { const u = artOf0(id); return u && !_artBad.has(u) ? u : ''; };
/* 小さいカード画像(cards/thumbs/)があれば、それを使う。大きな元画像を何十枚も同時に表示すると、スマホでは画像が黒くなることがあるため */
let _thumbSet = null;
function thumbOf(id) {
  try {
    if (!_thumbSet) _thumbSet = new Set(window.THUMB_IDS || []); if (!_thumbSet.size) return '';
    const id2 = TOKEN_ART[id] || id, v = VARIANTS.find(x => x.id === id2);
    const key = ART_EMBED[id2] ? '' : (ART_URL[id2] ? id2 : (v && !ART_EMBED[v.of] && ART_URL[v.of] ? v.of : ''));
    if (!key || !_thumbSet.has(key) || String(ART_URL[key]).slice(0, 5) === 'blob:') return '';
    const tu = 'cards/thumbs/' + encodeURIComponent(key) + '.jpg';
    return _artBad.has(tu) ? '' : tu;
  } catch (e) { return ''; }
}
function artSm(id) {
  const u = artQ(id); if (!u) return u;
  { const tu = thumbOf(id); if (tu) { keepArt(tu); return tu; } }
  const t = _thumb.get(u);
  if (t && t.url) { keepArt(t.url); return t.url; }
  if (!t) mkThumb(u);
  keepArt(u);
  return u;
}
let _thBusy = 0; const _thWait = [];
function _thDone() { _thBusy = Math.max(0, _thBusy - 1); const f = _thWait.shift(); if (f) f(); }
function _thRun(f) { if (_thBusy >= 2) { _thWait.push(() => { _thBusy++; f(); }); return; } _thBusy++; f(); }
const _cvFree = c => { try { c.width = 0; c.height = 0; } catch (e) { } };
// 端末のメモリが足りないと、真っ黒な画像ができることがある。真っ黒なときは使わない(元の画像を使う)
function _cvBlack(c) {
  try { const t = document.createElement('canvas'); t.width = 8; t.height = 8; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]; _cvFree(t); return sum < 64 * 3 * 4; } catch (e) { return false; }
}
function mkThumb(u) {
  const rec = { url: '' }; _thumb.set(u, rec);
  let fin = false; const done = () => { if (fin) return; fin = true; _thDone(); };
  _thRun(() => {
    try {
      const im = new Image(); im.decoding = 'async';
      im.onerror = done;
      im.onload = () => {
        try {
          let w = im.naturalWidth, h = im.naturalHeight; if (!w || w <= 440) { done(); return; }
          const tw = 420, th = Math.round(h * tw / w);
          let src = im, cw = w, ch = h;
          while (cw / 2 > tw) { const nw = Math.round(cw / 2), nh = Math.round(ch / 2), c = document.createElement('canvas'); c.width = nw; c.height = nh; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, nw, nh); if (src !== im) _cvFree(src); src = c; cw = nw; ch = nh; }
          const c = document.createElement('canvas'); c.width = tw; c.height = th; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, tw, th);
          if (src !== im) _cvFree(src);
          if (_cvBlack(c)) { _cvFree(c); done(); return; }
          c.toBlob(b => { _cvFree(c); done(); if (!b) return; const bu = URL.createObjectURL(b), t2 = new Image(); t2.decoding = 'async'; t2.onload = () => { rec.url = bu; keepArt(bu); }; t2.src = bu; }, 'image/jpeg', .9);
        } catch (e) { done(); }
      };
      im.src = u;
    } catch (e) { done(); }
  });
}
const artOf0 = id => { id = TOKEN_ART[id] || id; const v = VARIANTS.find(x => x.id === id); if (ART_EMBED[id]) return artBlob(id, ART_EMBED[id]); if (ART_URL[id]) return ART_URL[id]; return v ? (ART_EMBED[v.of] ? artBlob(v.of, ART_EMBED[v.of]) : (ART_URL[v.of] || '')) : ''; };
const artCls = k => { if (!artQ(k.def.id)) return ''; return artLate(artSm(k.def.id)) ? ' hasart artwait' : ' hasart'; };
const cardAttr = (k, own, zone) => 'style="--cc:' + (COLOR_HEX[k.def.color] || '#6a7499') + (artQ(k.def.id) ? ';background-image:url(' + artSm(k.def.id) + ')' : '') + '" data-card="' + k.iid + '" data-zone="' + zone + '" data-own="' + (own ? 1 : 0) + '"';
function cardHTML(k, own, zone) {
  return '<div class="card' + artCls(k) + '" ' + cardAttr(k, own, zone) + '>' + cardInner(k.def, '') + '</div>';
}
// 場のカード(縦長・疲労で横向き・下にコア表示)
// レベルの色分け: Lv1=青 / Lv2=橙 / 真界放(ソウルコア、またはLv2のコア数)=紫
function lvKind(k) {
  const li = lvInfo(k); if (!li) return '';
  if (li.lv >= 2 && isShin(k)) return 's';
  return li.lv >= 2 ? '2' : '1';
}
function fieldCardHTML(k, own) {
  const hd = coreHoldN[k.iid], held = hd && hd.until > Date.now() ? Math.min(hd.n, k.cores.length) : 0;
  if (held) k = Object.assign({}, k, { cores: k.cores.slice(0, k.cores.length - held) });
  const d = k.def, li = lvInfo(k);
  const bp = li && !held && V.bps && V.bps[k.iid] != null ? V.bps[k.iid] : (li ? li.bp : 0);
  const kind = lvKind(k), lvb = li ? (kind === 's' ? '' : '<span class="lvb">Lv' + li.lv + '</span>') + (kind === 's' ? '<span class="lvb shin">真界放</span>' : '') : '';
  const bpc = li && bp > li.bp ? 'up' : li && bp < li.bp ? 'dn' : '';
  const sx = (k.symx || []).reduce((n, x) => n + x.n, 0) + ((V.symDyn || {})[k.iid] || 0), sxb = sx ? '<br><span class="symx">シンボル+' + sx + '</span>' : '';
  const low = d.type === 'spirit' ? (li ? lvb + sxb + '<br><span class="bp ' + bpc + '" title="素のBP ' + li.bp + '">' + (bpc === 'up' ? '▲' : bpc === 'dn' ? '▼' : '') + bp + '</span>' : '') : (li ? lvb : 'ネクサス');
  return '<div class="slot" data-slot="' + k.iid + '" data-own="' + (own ? 1 : 0) + '"><div class="sin' + (own ? '' : ' opp') + (k.tapped ? (k.heavy ? ' tp hv' : ' tp') : '') + '">' + coresHTML(k.cores, 'card:' + k.iid, own) + '<div class="cardbox lvk' + kind + (k.asSp ? ' nxsp' : '') + (k.tapped ? ' tapped' : '') + (k.heavy ? ' heavy' : '') + (V.battle && V.battle.iid === k.iid ? ' atking' : '') + (V.battle && V.battle.blocker === k.iid ? ' blking' : '') + '"><div class="card' + artCls(k) + '" ' + cardAttr(k, own, 'field') + '>' + cardInner(d, low) + '</div></div></div></div>';
}
// 1人分の盤面。左列=ライフ/リザーブ、中央=フィールド、右列=デッキ/トラッシュ(相手側はCSSで上下左右を反転して対面にする)
const mobP = () => !document.body.classList.contains('fw') && window.matchMedia('(max-width:899px) and (orientation:portrait)').matches;
let SG = null;   // 1人分の盤面を作る間だけ有効: ソウルコアは1人に1個だけ表示する
function sideHTML(P, own) {
  SG = { n: 0 };
  const o = own ? 1 : 0, dz = own && sel.size && !pay ? ' drop' : '';
  const colA = '<div class="col ca">' +
    '<div class="zone lifez"' + (own ? ' data-nodrop="life"' : '') + '><div class="zt">ライフ</div>' + lifeHTML(lifeShown(own ? 'me' : 'opp', P.life), own) + '<div class="lifenum"><small>LIFE ●</small><b>' + lifeShown(own ? 'me' : 'opp', P.life).length + '</b></div></div>' +
    '<div class="lifemid"><div><small>LIFE</small><b>' + lifeShown(own ? 'me' : 'opp', P.life).length + '</b></div></div>' +
    '<div class="zone' + dz + (own && V.pending && V.pending.altFree && V.pending.pi === V.me ? ' altz' : '') + '"' + (own ? ' data-dest="reserve"' : '') + (own && V.pending && V.pending.altFree && V.pending.pi === V.me ? ' data-altz="1"' : '') + '><div class="zt">リザーブ' + (own && V.pending && V.pending.altFree && V.pending.pi === V.me ? '(ここをタップで置く)' : '') + '</div>' + (BC.on ? (() => { const so = Math.min(1, P.reserve.filter(c => c.soul).length), nn = parseInt(holdVal(own ? 'me' : 'opp', P.reserve.length - so), 10) || 0; const ic = id => '<svg class="ric" viewBox="0 0 64 64"><use href="#' + id + '"/></svg>'; return '<div class="rtot">' + (so ? ic('soul-sym') + so + '\u2002' : '') + ic('core-sym') + nn + '</div>'; })() : '') + coresHTML(P.reserve, 'reserve', own) + '</div></div>';
  const hold = millHold[own ? 'me' : 'opp'], TR = hold && Date.now() < hold.until ? P.trash.filter(k => !hold.ids.has(k.iid)) : P.trash;
  const top = TR.length ? TR[TR.length - 1] : null;
  const pile = top ? '<div class="pile"><div class="card tface' + artCls({ def: top.def }) + '" style="--cc:' + (COLOR_HEX[top.def.color] || '#6a7499') + (artQ(top.def.id) ? ';background-image:url(' + artSm(top.def.id) + ')' : '') + '">' + cardInner(top.def, '') + '</div><span class="pn">' + TR.length + '</span></div>' : '<div class="pile empty">なし</div>';
  const colB = '<div class="col cb">' +
    '<div class="deck"' + (own && V.test ? ' data-deck="1"' : '') + '><b>' + P.deckN + '</b><span>デッキ</span></div>' +
    '<div class="zone trash" data-list="trash" data-own="' + o + '" title="クリックで一覧"><div class="zt">トラッシュ</div>' + pile + '</div>' +
    '<div class="zsub cores' + dz + '"' + '><span>コア</span>' + coresHTML(ctShown(own ? 'me' : 'opp', P.coreTrash), 'coreTrash', own) + '</div>' +
    '<a class="lk rm" data-list="removed" data-own="' + o + '">除外 <b>' + P.removed.length + '</b></a></div>';
  // スピリットは上の段、ネクサスは下の段(相手側は上下が反転)。多いときは、段からはみ出して相手の領域に入ってよい
  const sp = P.field.filter(k => k.def.type === 'spirit'), nx = P.field.filter(k => k.def.type !== 'spirit');
  // 1段に並べる枚数は8枚まで。スピリットが9枚以上なら下の段の左から、ネクサスが9枚以上なら上の段の右から詰める。合計が17枚以上なら全体を小さくして収める
  let K = 8; const S = sp.length, N = nx.length;
  while (K < S + N && !(Math.min(S, K) + Math.max(0, N - K) <= K && Math.max(0, S - K) + Math.min(N, K) <= K)) K++;
  let field;
  if (mobP()) field = '<div class="field mb"><div class="lane sp" style="--n:' + S + '">' + sp.map(k => fieldCardHTML(k, own)).join('') + '</div><div class="lane nx" style="--n:' + N + '">' + nx.map(k => fieldCardHTML(k, own)).join('') + '</div></div>';
  else if (BC.on) {   // 配信モード: 中央側から 1〜4列目。スピリットは1列目から(最低2列ぶん)、ネクサスはその次(基本3列目)から。各列は中央から広がる
    const K = (BC.plan && BC.plan.K) || 4, mk = arr => arr.map(k => fieldCardHTML(k, own)).join(''), spC = Math.max(2, Math.ceil(S / K)), nxC = Math.ceil(N / K);
    const T = Math.max(3, spC + nxC), lanes = [];
    for (let i = 0; i < T; i++) {
      const isSp = i < spC, arr = isSp ? sp.slice(i * K, (i + 1) * K) : nx.slice((i - spC) * K, (i - spC + 1) * K);
      lanes.push('<div class="lane ' + (isSp ? 'sp' : 'nx') + (i === 0 && S > 0 && S <= K ? ' sh' : '') + ' dn" style="--n:' + arr.length + '">' + mk(arr) + '</div>');
    }
    field = '<div class="field">' + lanes.join('') + '</div>';
  }
  else if (S <= 8 && N <= 8) field = '<div class="field"><div class="lane sp" style="--n:' + S + '">' + sp.map(k => fieldCardHTML(k, own)).join('') + '</div><div class="lane nx" style="--n:' + N + '">' + nx.map(k => fieldCardHTML(k, own)).join('') + '</div></div>';
  else {
    const mk = a => a.map(k => fieldCardHTML(k, own)).join(''), rgt = h => h ? '<span class="dnr"></span>' + h : '';
    field = '<div class="field"><div class="lane sp dn" style="--n:' + K + '">' + mk(sp.slice(0, K)) + rgt(mk(nx.slice(K))) + '</div><div class="lane nx dn" style="--n:' + K + '">' + mk(sp.slice(K)) + rgt(mk(nx.slice(0, K))) + '</div></div>';
  }
  return colA + field + colB;
}

/* --- コスト支払いモード(カードを出す・使う) --- */
function payState() {
  if (!pay || !V) return null;
  const k = V.you.hand.find(x => x.iid === pay.iid) || V.you.trash.find(x => x.iid === pay.iid); if (!k) return null;
  const d = k.def, info = payRequirement(V.you, d, { ex: pay.ex, soulMagic: pay.soulMagic, puppet: !!V.you.trash.find(x => x.iid === pay.iid) });
  const need = info.ok ? info.need : d.cost, minPlace = minPlaceOf(d);
  const nPay = pay.pay.size, nPlace = pay.place.size;
  const cores = allCores(V.you), isSoul = id => { const c = cores.find(x => x.id === id); return !!(c && c.soul); };
  let payOk = info.ok && nPay === need;
  if (info.soul) payOk = payOk && [...pay.pay].every(isSoul);
  const placeOk = d.type === 'magic' || nPlace >= minPlace;
  return { k, d, info, need, minPlace, nPay, nPlace, payOk, placeOk, over: info.ok && nPay > need };
}
// 自動で選ぶ: 支払いはリザーブの通常コアから、置くコアは残りから。ソウルコアは極力温存する
// 場のコアを n 個、できるだけスピリットを消滅させないように選ぶ(コアが多いスピリットから1個ずつ。どうしても足りないときだけ最後の1個も使う)
function pickFieldCores(n, skip, soulOk) {
  const out = [], left = new Map(V.you.field.map(k => [k, k.cores.filter(c => !skip.has(c.id) && (soulOk || !c.soul)).slice()]));
  const total = k => k.cores.filter(c => !out.includes(c)).length;
  while (out.length < n) {
    let best = null;
    left.forEach((arr, k) => { if (!arr.length || k.def.type !== 'nexus') return; if (!best || total(k) > total(best)) best = k; });
    if (best) { out.push(left.get(best).pop()); continue; }
    left.forEach((arr, k) => { if (!arr.length) return; const t = total(k); if (t > 1 && (!best || t > total(best))) best = k; });   // 2個以上残るスピリットを優先
    if (!best) left.forEach((arr, k) => { if (!arr.length) return; if (!best || (k.def.cost || 0) < (best.def.cost || 0)) best = k; });   // 最後の1個を使うなら、コストの低いスピリットから
    if (!best) break;
    out.push(left.get(best).pop());
  }
  return out;
}
function autoPay() {
  const st = payState(); if (!st) return;
  pay.pay = new Set(); pay.place = new Set();
  const R = V.you.reserve, norm = R.filter(c => !c.soul).map(c => c.id), soul = R.filter(c => c.soul).map(c => c.id);
  if (st.info.soul) {
    const fs = allCores(V.you).find(c => c.soul && !R.includes(c));
    const s = soul[0] || (fs && fs.id); if (s) pay.pay.add(s);
    norm.concat(soul.filter(x => x !== s)).slice(0, st.minPlace).forEach(id => pay.place.add(id));
  } else {
    // 置くコアを残したうえで、支払いはリザーブから。足りない分は場のコアから(0になるスピリットは消滅する)
    // レベル2までリザーブのコアで届くなら、レベル2になる数を置く(真界放持ちでソウルコアがあれば、ソウルコア1個でLv2)
    const L2 = st.d.type === 'spirit' ? st.d.levels.find(l => l.lv === 2) : null;
    const shin = st.d.type === 'spirit' && st.d.keywords.includes('shinkai') && soul.length > 0;
    const want = L2 && !shin && R.length - st.need >= L2.core ? Math.max(st.minPlace, L2.core) : st.minPlace;
    const avail = Math.max(0, norm.length + soul.length - want);
    const nr = Math.min(st.need, norm.length, avail);
    norm.slice(0, nr).forEach(id => pay.pay.add(id));
    // 通常コアだけで足りないとき、場のコアを使う前に、リザーブのソウルコアで支払う(1・2ターン目にぴったり払う場合など)
    const ns = Math.min(st.need - nr, soul.length, Math.max(0, avail - nr));
    soul.slice(0, ns).forEach(id => pay.pay.add(id));
    let rest = st.need - nr - ns;
    if (rest > 0) {
      const fc = pickFieldCores(rest, new Set(), false);
      fc.forEach(c => pay.pay.add(c.id)); rest -= fc.length;
      if (rest > 0) V.you.field.flatMap(k => k.cores.filter(c => c.soul)).slice(0, rest).forEach(c => pay.pay.add(c.id));
    }
    // 置くコア: 真界放を持つスピリットには、まずソウルコアを置く(Lv2になる)。それ以外はソウルコアを温存する
    const soulLeft = soul.slice(ns), pool = st.d.type === 'spirit' && st.d.keywords.includes('shinkai') ? soulLeft.concat(norm.slice(nr)) : norm.slice(nr).concat(soulLeft);
    pool.slice(0, want).forEach(id => pay.place.add(id));
    if (pay.place.size < st.minPlace) {   // リザーブだけでは置けないとき、場のコアから(支払い済みは除く)
      pickFieldCores(st.minPlace - pay.place.size, pay.pay, true).forEach(c => pay.place.add(c.id));
    }
  }
  const s2 = payState();
  pay.bucket = s2 && s2.payOk && !s2.placeOk ? 'place' : 'pay';
}
// 迷彩の指定中は、リザーブ/場のコアをタップして「支払うコア」を選ぶ
const camoMode = () => !!(V && V.pending && V.pending.kind === 'act' && V.pending.pi === V.me && (V.pending.camo || V.pending.place));
function startPay(iid) {
  if (V && V.spec) return;
  const fromT = !!(V && V.pending && V.pending.kind === 'sumPay' && V.pending.pi === V.me && V.pending.cands.includes(iid));
  if (!V || !(fromT || V.you.hand.some(k => k.iid === iid))) return;
  if (!fromT) { const d0 = V.you.hand.find(k => k.iid === iid).def; if (V.step === 'attack' && !V.battle) { return; } }
  hideSheet(); sel.clear();
  const dd = (V.you.hand.find(k => k.iid === iid) || V.you.trash.find(k => k.iid === iid)).def;
  const hasSoul = V.you.reserve.some(c => c.soul) || V.you.field.some(k => k.cores.some(c => c.soul));
  // ソウルマジックは、ソウルコア1個での使用が初期設定
  pay = { iid, soulMagic: !!(dd.soulMagic && fieldSymbols(V.you, dd.color) > 0 && hasSoul), ex: [], pay: new Set(), place: new Set(), bucket: 'pay' };
  autoPay(); render();
}
function cancelPay() { pay = null; render(); }
// 支払いで場のスピリットのコアが0になって消滅してしまう場合、リザーブに余っている通常コアを1個ずつ載せて、消滅を防ぐ
function payFill() {
  const vanish = V.you.field.filter(k => k.def.type === 'spirit' && k.cores.length && k.cores.every(c => pay.pay.has(c.id) || pay.place.has(c.id)));
  const spare = V.you.reserve.filter(c => !c.soul && !pay.pay.has(c.id) && !pay.place.has(c.id));
  return vanish.map((k, i) => ({ k, c: spare[i] || null }));
}
function confirmPay() {
  const st = payState(); if (!st || !st.payOk || !st.placeOk) return;
  const a = { k: 'play', iid: pay.iid, pay: [...pay.pay], place: [...pay.place], fill: payFill().filter(x => x.c).map(x => ({ iid: x.k.iid, id: x.c.id })), ex: pay.ex.slice(), soulMagic: pay.soulMagic, mode: pay.mode === 'flash' ? 'flash' : 'main' };
  pay = null;
  doAct(a);
}
// コアをタップして、今選んでいる枠(支払い/置く)に入れる
function payTap(loc, soulId) {
  const st = payState(); if (!st) return;
  const b = pay.bucket, mine = pay[b], other = b === 'pay' ? pay.place : pay.pay;
  const okLoc = loc === 'reserve' || loc.indexOf('card:') === 0;
  if (!okLoc) { return; }
  if (!soulId && b === 'pay' && st.info.soul) { return; }
  if (soulId) { if (mine.has(soulId)) mine.delete(soulId); else { other.delete(soulId); payRoom(st, b, soulId); mine.add(soulId); } }
  else {
    const cand = coresAt(loc).filter(c => !c.soul && !other.has(c.id)), inB = cand.filter(c => mine.has(c.id));
    if (inB.length < cand.length) { const nid = cand.find(c => !mine.has(c.id)).id; payRoom(st, b, nid); mine.add(nid); } else inB.forEach(c => mine.delete(c.id));
  }
  if (b === 'pay' && soulId) fillPlace();
  const s2 = payState();
  if (s2 && b === 'pay' && s2.payOk && !s2.placeOk) pay.bucket = 'place';
  render();
}
function plvBtns(st) {
  if ((st.d.levels || []).length < 2) return '';
  const v = plvOf(st.d), act = plvActive(st), b = (m, label) => '<button class="plv' + (act === m ? ' on' : '') + '" data-plv="' + m + '"' + (plvFeasible(st, m) ? '' : ' disabled') + '>' + label + '</button>';
  const hasSoul = usableCores().some(c => c.soul);
  return '<div class="plvs">' + b('1', 'Lv1') + b('2', 'Lv2') + (v.shin && hasSoul ? b('s', '真界放(ソウルコア)') : '') + '</div>';
}
function payHTML() {
  const st = payState(); if (!st) return '';
  const { d, info, need, minPlace, nPay, nPlace, payOk, placeOk, over } = st;
  const cls = over ? 'bad' : (payOk && placeOk ? 'ok' : 'need');
  let msg;
  if (!info.ok) msg = '条件を満たしていません';
  else if (over) msg = (nPay - need) + '個多いです';
  else if (nPay < need) msg = 'あと' + (need - nPay) + '個、コアを「支払い」へ(ドラッグかタップ)';
  else if (!placeOk) msg = '「置くコア」をあと' + (minPlace - nPlace) + '個';
  else msg = '決定できます';
  const cores0 = allCores(V.you);
  let a = '<div class="pc"><div class="pt">「' + esc(d.name) + '」を' + VERB[d.type] + '</div>';
  { const effs = (d.effects || []).filter(e => V.battle ? (e.timing.kind === 'flash' || e.keyword === 'flashSummon' || e.keyword === 'flash') : (d.type === 'magic' ? (pay.mode === 'flash' ? e.timing.kind === 'flash' : e.timing.kind !== 'flash') : e.timing.kind !== 'keyword')).filter(e => e.text);
    a += '<div class="pfx"><button class="sub pdet" data-pdetail="1">カード詳細</button>' + effs.map(e => '<div>' + rich(esc(e.text).replace(/\n/g, '<br>')) + '</div>').join('') + '</div>'; }
  if (info.soul) a += '<div>ソウルマジック: <b>[ソウルコア]1個</b>で使用</div>';
  else a += '<div>コスト' + d.cost + ' − 軽減' + info.applied + '(場の同色シンボル' + info.fs + (info.exCards.length ? ' + EX' + info.exCards.length : '') + ') = <b>' + need + '</b></div>';
  if (d.keywords.includes('inheritance') && !pay.soulMagic) {
    const ex = V.you.trash.filter(k => (k.def.symbols.ex && k.def.color === d.color) || (V.you.exIid === k.iid && k.def.color === d.color));
    if (ex.length) {
      a += '<div class="exwrap"><div class="exh">継召: 除外するEXシンボルのカードを選択 (' + pay.ex.length + '/' + d.reduction + ')' + (ex.length > 3 ? '<br>←→ 横にスクロール' : '') + '</div><div class="exrow">' + ex.map(k => { const art = artOf(String(k.def.id)); return '<div class="exc' + (art ? ' hasart' : '') + (pay.ex.includes(k.iid) ? ' on' : '') + '" data-pex="' + k.iid + '" style="--cc:' + (COLOR_HEX[k.def.color] || '#6a7499') + (art ? ';background-image:url(' + art + ')' : '') + '"><b>' + esc(k.def.name) + '</b><span>' + esc((k.def.family || []).join('・')) + '</span><em>' + esc(k.def.id) + '</em></div>'; }).join('') + '</div></div>';
    } else a += '<div class="dim">継召: 除外できるEXシンボルなし</div>';
  }
  if (!info.soul && need > 0 && (V.you.reserve.some(c => c.soul) || V.you.field.some(k => k.cores.some(c => c.soul)))) {
    const on = [...pay.pay].some(id => { const c = cores0.find(x => x.id === id); return c && c.soul; });
    a += '<div class="chips"><button class="chip soulc' + (on ? ' on' : '') + '" data-psoulc="1">★ ソウルコアで支払う: ' + (on ? 'ON(外す)' : 'OFF') + '</button></div>';
  }
  if (d.type === 'magic' && !V.battle && d.effects.some(e => e.timing.kind === 'main') && d.effects.some(e => e.timing.kind === 'flash')) a += '<div class="chips"><button class="chip' + (pay.mode !== 'flash' ? ' on' : '') + '" data-pmode="main">メイン効果を使う</button><button class="chip' + (pay.mode === 'flash' ? ' on' : '') + '" data-pmode="flash">フラッシュ効果を使う</button></div>';
  if (info.soulAvail) a += '<div class="chips"><button class="chip soulc' + (pay.soulMagic ? ' on' : '') + '" data-psoul="1">★ ソウルコア1個で使用</button><button class="chip' + (!pay.soulMagic ? ' on' : '') + '" data-psoul="0">通常コアで支払う</button></div>';
  const vf = payFill(), vSave = vf.filter(x => x.c), vGone = vf.filter(x => !x.c).map(x => x.k);
  vSave.forEach(x => { const sm = x.k.cores.some(c => c.soul && (pay.pay.has(c.id) || pay.place.has(c.id))), n = esc(x.k.def.name); a += '<div class="warnl okl">ℹ ' + (sm ? 'フィールドの「' + n + '」からソウルコアを移動します。<b>代わりにリザーブのコアを1個「' + n + '」に置き</b>、消滅を防ぎます' : '「' + n + '」はコアが0になるため、<b>かわりにリザーブのコア1個を載せて消滅を防ぎます</b>') + '</div>'; });
  vGone.forEach(k => { const sm = k.cores.some(c => c.soul && (pay.pay.has(c.id) || pay.place.has(c.id))); a += '<div class="warnl">⚠ ' + (sm ? 'フィールドの「' + esc(k.def.name) + '」からソウルコアを移動すると、' : '「' + esc(k.def.name) + '」は') + 'コアが0になり、決定すると<b>消滅</b>します(破壊ではありません)。リザーブに余っているコアがないため、防げません</div>'; });
  a += '<div class="msg">' + msg + '</div></div>';
  const cores = allCores(V.you);
  const toks = set => [...set].map(id => { const c = cores.find(x => x.id === id); return '<span class="tok' + (c && c.soul ? ' soul' : '') + '" data-prm="' + id + '" title="タップで外す">' + (c && c.soul ? '★' : '●') + '</span>'; }).join('');
  let z = '<div class="pc"><div class="pzs"><div class="pz' + (pay.bucket === 'pay' ? ' on' : '') + (payOk ? ' ok' : over ? ' bad' : '') + '" data-pzone="pay" data-ptab="pay"><span class="pzt">支払い(トラッシュへ) ' + nPay + '/' + need + '</span><div class="toks">' + toks(pay.pay) + '</div></div>';
  if (d.type !== 'magic') z += '<div class="pz' + (pay.bucket === 'place' ? ' on' : '') + (placeOk ? ' ok' : '') + '" data-pzone="place" data-ptab="place"><span class="pzt">置くコア ' + nPlace + (minPlace ? '/' + minPlace + '以上' : '(任意)') + '</span>' + plvBtns(st) + '<div class="toks">' + toks(pay.place) + '</div></div>';
  z += '</div><div class="dim">リザーブ・場のコアを枠へドラッグ(タップでも可)。決定すると支払います</div></div>';
  const b = '<div class="bt"><button data-pok="1"' + (payOk && placeOk ? '' : ' disabled') + '>決定</button><button class="sub" data-pauto="1">自動で選ぶ</button><button class="sub" data-payreset="1">リセット</button><button class="sub" data-pcancel="1">やめる</button></div>';
  return '<div class="paywrap ' + cls + '" data-keepsel="1">' + a + z + b + '</div>';
}
